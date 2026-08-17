import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { getGateway, isGatewayId } from '@/lib/payment-gateways/registry'
import { resolveConfig } from '@/lib/payment-gateways/store'
import { applyPaymentOutcome } from '@/lib/payment-gateways/settle'

export const runtime = 'nodejs'

// The ONLY writer of payment state — server-to-server and signed, unlike the
// customer-controlled return URL, which stays read-only.
//
// No store id in the path: the payload carries our order id, and the order
// carries the store. Reading that reference out of an unverified body only
// selects which secret to check the signature against.

/** Anything we cannot act on is 200'd and logged, since providers disable
 *  endpoints that keep failing and a retry cannot fix a payload we will never
 *  understand. Only a genuine write failure returns non-2xx. */
function ack(reason: string, detail: Record<string, unknown> = {}) {
  console.log('[payments/webhook]', reason, detail)
  return NextResponse.json({ ok: true, received: true })
}

type RouteCtx = { params: Promise<{ gateway: string }> }

type OrderRow = {
  id: string
  store_id: string
  payment_status: string | null
  /** Provider reference from session creation — what `finalize` reads back. */
  payment_checkout_id: string | null
  total_price: number
  currency: string
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { gateway } = await ctx.params

  if (!isGatewayId(gateway)) return ack('unknown gateway', { gateway })

  const mod = getGateway(gateway)
  if (!mod.adapter) return ack('gateway has no adapter', { gateway })

  // Must be the raw bytes: re-serialising parsed JSON reorders keys and breaks
  // the signature comparison.
  const rawBody = await req.text().catch(() => '')
  if (!rawBody) return ack('empty body', { gateway })

  let parsed
  try {
    parsed = mod.adapter.parseWebhook(rawBody)
  } catch {
    // Test pings and account-level events land here — they are not orders.
    return ack('unparseable payload', { gateway })
  }

  if (!parsed.reference) return ack('no order reference', { gateway })

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, store_id, payment_status, payment_checkout_id, total_price, currency')
    .eq('id', parsed.reference)
    .maybeSingle<OrderRow>()

  if (!order) return ack('unknown order', { gateway, reference: parsed.reference })

  const cfg = await resolveConfig(order.store_id, gateway)
  if (!cfg) return ack('gateway not enabled for store', { gateway, storeId: order.store_id })

  // Nothing above this line acted on the payload — it only located the secret.
  if (!mod.adapter.verifyWebhook(cfg, rawBody, req.headers)) {
    console.warn('[payments/webhook] BAD SIGNATURE', { gateway, orderId: order.id })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Where the signature covers the raw body (PayTabs), the delivered status IS
  // evidence. For the BNPL gateways it is not, so those adapters expose
  // `finalize`, which re-reads from the provider and authorises. Capture is
  // left to the merchant, so `paid` there means committed, not money received.
  let outcome = parsed.status
  let txnId = parsed.txnId

  // Redelivery is routine and `finalize` costs provider API calls. The real
  // idempotency guard is still the conditional write in applyPaymentOutcome.
  if (order.payment_status && order.payment_status !== 'pending') {
    return ack('already settled', {
      gateway,
      orderId: order.id,
      status: order.payment_status,
    })
  }

  if (mod.adapter.finalize) {
    let remote
    try {
      remote = await mod.adapter.finalize(cfg, {
        orderId: order.id,
        checkoutId: order.payment_checkout_id,
      })
    } catch (err) {
      // 500 so the provider retries. Acking could strand an approved order that
      // was never authorised, which then expires unpaid.
      console.error('[payments/webhook] finalize failed', {
        gateway,
        orderId: order.id,
        message: err instanceof Error ? err.message : 'unknown',
      })
      return NextResponse.json({ error: 'Could not confirm payment' }, { status: 500 })
    }

    // A payment authorised for less than we charged must never settle as paid.
    if (
      remote.status === 'paid' &&
      remote.amount !== null &&
      Math.round(remote.amount * 100) !== Math.round(Number(order.total_price) * 100)
    ) {
      console.error('[payments/webhook] AMOUNT MISMATCH, refusing to settle', {
        gateway,
        orderId: order.id,
        expected: order.total_price,
        remote: remote.amount,
      })
      // Acked, not retried: redelivery cannot fix a figure that differs.
      return ack('amount mismatch', { gateway, orderId: order.id })
    }

    outcome = remote.status
    txnId = remote.txnId ?? txnId

    console.log('[payments/webhook] finalized', {
      gateway,
      orderId: order.id,
      status: remote.status,
      amount: remote.amount,
      expected: order.total_price,
    })
  }

  if (outcome === 'pending') {
    return ack('still pending, nothing to settle', { gateway, orderId: order.id })
  }

  try {
    const { settled } = await applyPaymentOutcome({
      orderId: order.id,
      gateway,
      outcome,
      txnId,
      raw: JSON.parse(rawBody),
    })
    return NextResponse.json({ ok: true, settled })
  } catch (err) {
    // 500 so the provider retries — acking here would lose the payment.
    console.error('[payments/webhook] settle failed', {
      gateway,
      orderId: order.id,
      message: err instanceof Error ? err.message : 'unknown',
    })
    return NextResponse.json({ error: 'Settlement failed' }, { status: 500 })
  }
}

/** Some providers probe the endpoint with a GET before accepting it. */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { gateway } = await ctx.params
  if (!isGatewayId(gateway)) {
    return NextResponse.json({ error: 'Unknown gateway' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
