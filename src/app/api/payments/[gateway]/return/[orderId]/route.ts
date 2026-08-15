import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { getGateway, isGatewayId } from '@/lib/payment-gateways/registry'
import { resolveConfig } from '@/lib/payment-gateways/store'
import { getProductLandingUrl, getSiteOrigin } from '@/lib/site-url'
import type { PaymentOutcome } from '@/lib/payment-gateways/types'

export const runtime = 'nodejs'

// Where the customer's browser lands when the provider is done with them.
//
// PRESENTATIONAL ONLY — the webhook owns payment state. A customer can type
// this URL by hand with any query string they like, so it asks the provider
// directly (read-only) which message to show.
//
// POST as well as GET: PayTabs returns by submitting a form.

type RouteCtx = { params: Promise<{ gateway: string; orderId: string }> }

type OrderRow = {
  id: string
  store_id: string
  product_id: string
  payment_status: string | null
  payment_checkout_id: string | null
  /** PostgREST embeds a relation as an object or an array depending on whether
   *  it can infer to-one cardinality from the FK. Accept both. */
  stores: { slug: string | null } | { slug: string | null }[] | null
}

function storeSlugOf(order: OrderRow): string | null {
  const stores = Array.isArray(order.stores) ? order.stores[0] : order.stores
  return stores?.slug ?? null
}

/** Fall back to the store home rather than 404ing a paying customer. */
function safeRedirect(url: string) {
  return NextResponse.redirect(url, { status: 303 })
}

async function handle(req: NextRequest, ctx: RouteCtx) {
  const { gateway, orderId } = await ctx.params
  const origin = getSiteOrigin()

  if (!isGatewayId(gateway)) return safeRedirect(origin)

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, store_id, product_id, payment_status, payment_checkout_id, stores(slug)')
    .eq('id', orderId)
    .maybeSingle<OrderRow>()

  const slug = order ? storeSlugOf(order) : null
  if (!order || !slug) return safeRedirect(origin)

  const landing = getProductLandingUrl(slug, order.product_id)

  // If the webhook already landed, that answer is authoritative.
  let outcome: PaymentOutcome =
    order.payment_status === 'paid' ||
    order.payment_status === 'failed' ||
    order.payment_status === 'cancelled'
      ? order.payment_status
      : 'pending'

  if (outcome === 'pending' && order.payment_checkout_id) {
    const mod = getGateway(gateway)
    const cfg = mod.adapter ? await resolveConfig(order.store_id, gateway) : null

    if (mod.adapter && cfg) {
      try {
        outcome = await mod.adapter.verifyStatus(cfg, order.payment_checkout_id)
      } catch (err) {
        // A lookup failure is not a payment failure — stay on 'pending' and let
        // the webhook decide.
        console.error('[payments/return] status lookup failed', {
          gateway,
          orderId,
          message: err instanceof Error ? err.message : 'unknown',
        })
      }
    }
  }

  // `?o=` from the provider is ignored — it rides on a URL the customer edits.
  const param = outcome === 'paid' ? 'success' : outcome === 'pending' ? 'pending' : 'failed'

  const target = new URL(landing)
  target.searchParams.set('payment', param)
  target.searchParams.set('order', order.id)

  return safeRedirect(target.toString())
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx)
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx)
}
