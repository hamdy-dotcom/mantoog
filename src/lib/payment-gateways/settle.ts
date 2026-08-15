import { supabaseAdmin } from '@/lib/tiktok/server'
import type { GatewayId, PaymentOutcome } from './types'

/** The single place a payment's final outcome is recorded. Funnelling every
 *  caller through one function is what makes the side effects run exactly once,
 *  since providers redeliver webhooks routinely. */

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

  // Keeps unpaid attempts out of the merchant's fulfilment queue. A paid order
  // leaves `status` alone — nobody has packed it yet.
  if (outcome !== 'paid') patch.status = 'cancelled'

  // The write IS the lock: of two racing callers exactly one gets a row back,
  // which a read-then-write would not guarantee.
  //
  // The `payment_method` clause is not redundant — legacy COD rows also carry
  // `payment_status = 'pending'`, so without it a forged reference naming a cash
  // order could flip it to 'paid'.
  const { data: order, error: dbError } = await supabaseAdmin
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .eq('payment_status', 'pending')
    .neq('payment_method', 'cod')
    .select(COLUMNS)
    .maybeSingle<SettledOrder>()

  if (dbError) {
    // The caller must NOT 200 a webhook it failed to record, or the provider
    // stops retrying and the payment is lost.
    throw new Error(`Settlement write failed for ${orderId}: ${dbError.message}`)
  }

  if (!order) {
    // Already settled, or never pending — the normal path for a redelivered
    // webhook, not an error.
    console.log('[payments/settle] no-op, already settled', { orderId, gateway, outcome })
    return { settled: false }
  }

  // Best-effort: the money state is already committed, so throwing here would
  // only make the provider retry a webhook that can no longer settle anything.
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

/** Declined, errored or abandoned — `outcome` tells a dead card from a change
 *  of mind. */
async function onPaymentFailure(
  order: SettledOrder,
  gateway: GatewayId,
  outcome: SettleOutcome,
): Promise<void> {
  console.log('[payments/settle] not paid', { orderId: order.id, gateway, outcome })
}
