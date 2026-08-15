import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { getGateway, isGatewayId } from '@/lib/payment-gateways/registry'
import { resolveConfig } from '@/lib/payment-gateways/store'
import { applyPaymentOutcome } from '@/lib/payment-gateways/settle'

export const runtime = 'nodejs'

// The ONLY writer of payment state.
//
// The browser return URL is customer-controlled and proves nothing, so it stays
// read-only. This endpoint is server-to-server and signed, which is why it is
// trusted to move money state.
//
// There is no store id in the path: every session is created with our order id
// as the provider's merchant reference, so the payload identifies the order and
// the order carries the store. Reading that reference out of an unverified body
// is safe — it only selects which secret to check the signature against, and a
// forged reference still fails that check.

/** Providers disable endpoints that keep failing, and a retry cannot fix a
 *  payload we will never understand. So anything we cannot act on is 200'd and
 *  logged; only a genuine write failure returns non-2xx, because that IS worth
 *  retrying. */
function ack(reason: string, detail: Record<string, unknown> = {}) {
  console.log('[payments/webhook]', reason, detail)
  return NextResponse.json({ ok: true, received: true })
}

type RouteCtx = { params: Promise<{ gateway: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { gateway } = await ctx.params

  if (!isGatewayId(gateway)) return ack('unknown gateway', { gateway })

  const mod = getGateway(gateway)
  if (!mod.adapter) return ack('gateway has no adapter', { gateway })

  // Must be the raw bytes: signatures are computed over the body as sent, and
  // re-serialising parsed JSON reorders keys and breaks the comparison.
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
    .select('id, store_id, payment_status')
    .eq('id', parsed.reference)
    .maybeSingle<{ id: string; store_id: string; payment_status: string | null }>()

  if (!order) return ack('unknown order', { gateway, reference: parsed.reference })

  const cfg = await resolveConfig(order.store_id, gateway)
  if (!cfg) return ack('gateway not enabled for store', { gateway, storeId: order.store_id })

  // Nothing above this line acted on the payload — it only located the secret.
  if (!mod.adapter.verifyWebhook(cfg, rawBody, req.headers)) {
    console.warn('[payments/webhook] BAD SIGNATURE', { gateway, orderId: order.id })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (parsed.status === 'pending') {
    return ack('still pending, nothing to settle', { gateway, orderId: order.id })
  }

  try {
    const { settled } = await applyPaymentOutcome({
      orderId: order.id,
      gateway,
      outcome: parsed.status,
      txnId: parsed.txnId,
      raw: JSON.parse(rawBody),
    })
    return NextResponse.json({ ok: true, settled })
  } catch (err) {
    // Genuine write failure — 500 so the provider retries. Acking here would
    // lose the payment silently.
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
