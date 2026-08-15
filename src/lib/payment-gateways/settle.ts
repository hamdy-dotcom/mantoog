import { supabaseAdmin } from '@/lib/tiktok/server'
import type { GatewayId, PaymentOutcome } from './types'

/** The single place a payment's final outcome is recorded.
 *
 *  Everything that learns an outcome comes through here — today the gateway
 *  webhook, later the reconciliation sweep for payments whose webhook never
 *  arrived. Keeping it in one function is what makes the "exactly once"
 *  guarantee possible: providers redeliver webhooks routinely (retries after a
 *  timeout, plain duplicates), and the side effects must not run twice.
 */

export type SettleOutcome = Exclude<PaymentOutcome, 'pending'>

export type SettleInput = {
  orderId: string
  gateway: GatewayId
  outcome: SettleOutcome
  /** Provider's transaction reference, stored for support and refunds. */
  txnId?: string
  /** Provider payload, kept verbatim for disputes. Never read by logic. */
  raw?: unknown
  /** Human-readable decline reason, when the provider gives one. */
  error?: string
}

/** The slice of the order the hooks need. */
export type SettledOrder = {
  id: string
  store_id: string
  merchant_id: string
  product_id: string
  total_price: number
  currency: string
  customer_name: string
  customer_phone: string
  payment_status: string
}

const COLUMNS =
  'id, store_id, merchant_id, product_id, total_price, currency, customer_name, customer_phone, payment_status'

export async function applyPaymentOutcome(
  input: SettleInput,
): Promise<{ settled: boolean; order?: SettledOrder }> {
  const { orderId, gateway, outcome, txnId, raw, error } = input
  const now = new Date().toISOString()

  const patch: Record<string, unknown> = {
    payment_status: outcome,
    payment_txn_id: txnId ?? null,
    payment_raw: (raw as Record<string, unknown>) ?? null,
    payment_error: error ?? null,
    paid_at: outcome === 'paid' ? now : null,
  }

  // A payment that failed or was abandoned is not something the merchant should
  // see sitting in their fulfilment queue. A successful one leaves `status`
  // alone: it is paid, but nobody has packed it yet.
  if (outcome !== 'paid') patch.status = 'cancelled'

  // The write IS the lock. Postgres evaluates the WHERE and the update in one
  // statement, so of two racing callers exactly one gets a row back. A
  // read-then-write here would let both pass the check and fire side effects.
  //
  // The `payment_method` clause is not redundant: `payment_status` defaults to
  // 'pending' in the database and predates online payments, so every legacy COD
  // order matches the status filter. Without it, a forged reference naming a
  // cash order could flip it to 'paid' or cancel it outright.
  const { data: order, error: dbError } = await supabaseAdmin
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .eq('payment_status', 'pending')
    .neq('payment_method', 'cod')
    .select(COLUMNS)
    .maybeSingle<SettledOrder>()

  if (dbError) {
    // Surfacing this matters: the caller must NOT 200 a webhook it failed to
    // record, or the provider will stop retrying and the payment is lost.
    throw new Error(`Settlement write failed for ${orderId}: ${dbError.message}`)
  }

  if (!order) {
    // Already settled, or never pending. Either way there is nothing to do —
    // this is the normal path for a redelivered webhook, not an error.
    console.log('[payments/settle] no-op, already settled', { orderId, gateway, outcome })
    return { settled: false }
  }

  // Hooks are best-effort. They must never fail the settlement: the money state
  // is already committed, and throwing here would make the provider retry a
  // webhook whose claim can no longer succeed.
  try {
    if (outcome === 'paid') await onPaymentSuccess(order, gateway)
    else await onPaymentFailure(order, gateway, outcome)
  } catch (hookError) {
    console.error('[payments/settle] hook failed', {
      orderId,
      outcome,
      message: hookError instanceof Error ? hookError.message : 'unknown',
    })
  }

  return { settled: true, order }
}

/** Money confirmed. Merchant notification, fulfilment triggers and server-side
 *  conversion events belong here. */
async function onPaymentSuccess(order: SettledOrder, gateway: GatewayId): Promise<void> {
  console.log('[payments/settle] paid', {
    orderId: order.id,
    gateway,
    amount: order.total_price,
    currency: order.currency,
  })
}

/** Declined, errored or abandoned. `outcome` distinguishes a dead card from a
 *  change of mind — they share this hook because the handling is the same, but
 *  the stored value differs so follow-up can tell them apart. */
async function onPaymentFailure(
  order: SettledOrder,
  gateway: GatewayId,
  outcome: SettleOutcome,
): Promise<void> {
  console.log('[payments/settle] not paid', { orderId: order.id, gateway, outcome })
}
