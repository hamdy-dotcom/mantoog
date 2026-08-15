import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClientIp, getIpCountry } from '@/lib/analytics/server'
import type { OrderAttributionPayload } from '@/lib/analytics/attribution'
import { sendCreditsWarningEmail } from '@/lib/email/credits-warning'
import { orderLimiter, checkLimit } from '@/lib/ratelimit'
import { sendSnapPurchase } from '@/lib/snapchat/capi'
import { getGateway, isGatewayId } from '@/lib/payment-gateways/registry'
import { getEnabledGateways, resolveConfig, returnUrlFor, webhookUrlFor } from '@/lib/payment-gateways/store'
import type { GatewayId } from '@/lib/payment-gateways/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function nullableString(value: unknown): string | null {
  if (value == null) return null
  const str = String(value).trim()
  return str || null
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function parseAttribution(raw: unknown): OrderAttributionPayload {
  if (!raw || typeof raw !== 'object') return {}
  const data = raw as Record<string, unknown>
  return {
    traffic_source: nullableString(data.traffic_source),
    utm_source: nullableString(data.utm_source),
    utm_medium: nullableString(data.utm_medium),
    utm_campaign: nullableString(data.utm_campaign),
    utm_content: nullableString(data.utm_content),
    utm_term: nullableString(data.utm_term),
    ttclid: nullableString(data.ttclid),
    fbclid: nullableString(data.fbclid),
    sccid: nullableString(data.sccid),
    referrer: nullableString(data.referrer),
    landing_page: nullableString(data.landing_page),
    session_seconds: nullableNumber(data.session_seconds),
    pages_viewed: nullableNumber(data.pages_viewed),
    device_type: nullableString(data.device_type),
    device_os: nullableString(data.device_os),
    device_browser: nullableString(data.device_browser),
    locale: nullableString(data.locale),
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? 'unknown'
  if (!(await checkLimit(orderLimiter, ip))) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { attribution: rawAttribution, ...orderFields } = body ?? {}
    // Keep sccid out of the DB insert so order creation never depends on a new
    // column — it's used transiently for the Snap CAPI call below.
    const { sccid: sccidValue, ...attribution } = parseAttribution(rawAttribution)

    // Validate required IDs
    if (!orderFields.store_id || !orderFields.merchant_id || !orderFields.product_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch authoritative product and store data; verify ownership chain
    const [{ data: product, error: productErr }, { data: store, error: storeErr }] =
      await Promise.all([
        supabase
          .from('products')
          .select('id, title, price, shipping_cost, offers, upsell, store_id')
          .eq('id', orderFields.product_id)
          .single(),
        supabase
          .from('stores')
          .select('id, merchant_id, shipping_type, static_shipping_cost, currency, snapchat_pixel_id')
          .eq('id', orderFields.store_id)
          .single(),
      ])

    if (productErr || !product || storeErr || !store) {
      return NextResponse.json({ success: false, error: 'Invalid product or store' }, { status: 400 })
    }

    if (product.store_id !== orderFields.store_id || store.merchant_id !== orderFields.merchant_id) {
      return NextResponse.json({ success: false, error: 'Relationship mismatch' }, { status: 400 })
    }

    // Quantity — must be a positive integer
    const qty = Math.max(1, Math.round(Number(orderFields.quantity) || 1))

    // Shipping — server governs; storefront uses store.shipping_type to pick source
    const shipping =
      store.shipping_type === 'static'
        ? store.static_shipping_cost || 0
        : product.shipping_cost || 0

    // Base price — validate applied offer against DB if provided
    let basePrice = product.price * qty
    let resolvedOffer: any = null
    if (orderFields.applied_offer != null) {
      const offerList: any[] = Array.isArray(product.offers) ? product.offers : []
      resolvedOffer = offerList.find(
        (o: any) =>
          o.id === orderFields.applied_offer.id &&
          o.quantity === orderFields.applied_offer.quantity &&
          Number(o.price) === Number(orderFields.applied_offer.price)
      )
      if (!resolvedOffer) {
        return NextResponse.json(
          { success: false, error: 'Invalid offer' },
          { status: 400 }
        )
      }
      basePrice = resolvedOffer.price
    }

    // Bump upsell — must be active in DB; silently clear invalid upsell_item
    let bumpAmt = 0
    let upsellItemToStore: any = null
    if (orderFields.upsell_item != null) {
      if (product.upsell?.type === 'bump' && product.upsell?.active) {
        bumpAmt = product.upsell.sale_price || 0
        upsellItemToStore = orderFields.upsell_item
      }
    }

    const computedTotal = basePrice + bumpAmt + shipping

    // The client's choice is a request, not an instruction: it is re-checked
    // against what this store offers, so a crafted POST cannot select a gateway
    // that is disabled, wrong-currency, or has no adapter behind it.
    const requestedMethod =
      typeof orderFields.payment_method === 'string'
        ? orderFields.payment_method.trim().toLowerCase()
        : 'cod'

    let gateway: GatewayId | null = null

    if (requestedMethod !== 'cod') {
      if (!isGatewayId(requestedMethod)) {
        return NextResponse.json(
          { success: false, error: 'Unsupported payment method' },
          { status: 400 }
        )
      }

      const offered = await getEnabledGateways(orderFields.store_id, store.currency)
      if (!offered.some(g => g.id === requestedMethod)) {
        return NextResponse.json(
          { success: false, error: 'Payment method unavailable' },
          { status: 400 }
        )
      }

      gateway = requestedMethod
    }

    const orderRow = {
      store_id: orderFields.store_id,
      merchant_id: orderFields.merchant_id,
      product_id: orderFields.product_id,
      customer_name: orderFields.customer_name,
      customer_phone: orderFields.customer_phone,
      address_governorate: orderFields.address_governorate ?? null,
      address_line1: orderFields.address_line1 ?? null,
      address_country: orderFields.address_country ?? null,
      quantity: qty,
      note: orderFields.note ?? null,
      unit_price: product.price,
      total_price: computedTotal,
      currency: store.currency,
      shipping_price: shipping,
      payment_method: gateway ?? 'cod',
      // NULL means "no online payment involved" — that is what keeps COD orders
      // out of every payment query and out of the abandoned-payment sweep.
      payment_status: gateway ? 'pending' : null,
      status: 'pending',
      lat: orderFields.lat ?? null,
      lng: orderFields.lng ?? null,
      map_link: orderFields.map_link ?? null,
      location_address: orderFields.location_address ?? null,
      applied_offer: resolvedOffer
        ? { id: resolvedOffer.id, quantity: resolvedOffer.quantity, price: resolvedOffer.price }
        : null,
      upsell_item: upsellItemToStore,
      ...attribution,
      ip_address: getClientIp(request),
      ip_country: getIpCountry(request),
    }

    // A customer whose card was declined and who fixes it is still ONE order,
    // so the row is reused rather than leaving a dead entry per attempt.
    //
    // `retry_order_id` comes from the browser, so the guards below decide which
    // rows it may touch: an unsettled online attempt for this store, from the
    // same phone. Drop the last two clauses and a stranger's cash order becomes
    // a valid target, since legacy rows also read `payment_status = 'pending'`.
    const retryId =
      gateway && typeof orderFields.retry_order_id === 'string'
        ? orderFields.retry_order_id
        : null

    let orderData: { id: string } | null = null
    let error: { message: string } | null = null

    if (retryId) {
      const retry = await supabase
        .from('orders')
        .update({
          ...orderRow,
          // Clear the previous attempt's outcome so the settlement claim
          // (`payment_status = 'pending'`) can fire again.
          payment_checkout_id: null,
          payment_txn_id: null,
          payment_error: null,
          payment_raw: null,
          paid_at: null,
        })
        .eq('id', retryId)
        .eq('store_id', orderFields.store_id)
        .eq('customer_phone', orderFields.customer_phone)
        .eq('payment_status', 'pending')
        .neq('payment_method', 'cod')
        .select('id')
        .maybeSingle()

      orderData = retry.data as { id: string } | null
      // No row matched — fall through to a fresh insert rather than failing the
      // customer's checkout.
    }

    if (!orderData) {
      const inserted = await supabase.from('orders').insert(orderRow).select('id').single()
      orderData = inserted.data as { id: string } | null
      error = inserted.error
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const orderId = orderData?.id ? String(orderData.id) : null

    // ── Online payment ─────────────────────────────────────────────────────
    // Nothing is confirmed yet, so the conversion side effects below are skipped
    // — they belong to the paid moment, which arrives on the webhook.
    if (gateway && orderId) {
      const mod = getGateway(gateway)
      const cfg = await resolveConfig(orderFields.store_id, gateway)

      if (!mod.adapter || !cfg) {
        return NextResponse.json(
          { success: false, error: 'Payment method unavailable' },
          { status: 400 }
        )
      }

      try {
        const session = await mod.adapter.createSession(cfg, {
          orderId,
          // Server-computed, never the client's number.
          amount: computedTotal,
          currency: store.currency,
          description: String(product.title ?? 'Order'),
          customer: {
            name: String(orderFields.customer_name ?? ''),
            phone: String(orderFields.customer_phone ?? ''),
          },
          returnUrl: returnUrlFor(gateway, orderId),
          callbackUrl: webhookUrlFor(gateway),
        })

        await supabase
          .from('orders')
          .update({ payment_checkout_id: session.reference })
          .eq('id', orderId)

        return NextResponse.json({ success: true, orderId, redirectUrl: session.redirectUrl })
      } catch (sessionError: unknown) {
        const message = sessionError instanceof Error ? sessionError.message : 'Unknown error'
        console.error('[orders/create] session creation failed', { gateway, orderId, message })

        // Leave the row settled rather than pending, so the abandoned-payment
        // sweep does not later chase a session that was never created.
        await supabase
          .from('orders')
          .update({ payment_status: 'failed', payment_error: message, status: 'cancelled' })
          .eq('id', orderId)

        return NextResponse.json(
          { success: false, error: 'Could not start payment' },
          { status: 502 }
        )
      }
    }

    // ── COD from here down ─────────────────────────────────────────────────
    // Snapchat Conversions API (server-side Purchase). Non-blocking on failure —
    // never let a CAPI hiccup break order creation. Deduplicated against the
    // browser Snap Pixel via a shared event_id (the DB order id). Uses the
    // customer's REAL ip + user-agent from this request (not the server's).
    // Snap Pixel IDs are UUIDs. The pixel-id field is a free multi-tag input, so
    // guard against stray non-UUID entries (e.g. an email typed by mistake)
    // being used as the CAPI pixel id and misrouting the request.
    const snapIds = (store.snapchat_pixel_id ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
    const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    const snapPixelId = snapIds.find(isUuid) ?? snapIds.find((id: string) => !id.includes('@'))
    if (orderId && snapPixelId) {
      try {
        const { data: snap } = await supabase
          .from('snapchat_capi')
          .select('capi_token, enabled, test_event_code')
          .eq('store_id', orderFields.store_id)
          .maybeSingle()
        if (snap?.enabled && snap.capi_token) {
          await sendSnapPurchase({
            pixelId: snapPixelId,
            token: snap.capi_token,
            eventId: orderId,
            value: computedTotal,
            currency: store.currency,
            orderId,
            numItems: qty,
            customerName: orderFields.customer_name,
            customerPhone: orderFields.customer_phone,
            country: orderFields.address_country,
            clientIp: getClientIp(request),
            userAgent: request.headers.get('user-agent'),
            sccid: sccidValue ?? null,
            eventSourceUrl: attribution.landing_page ?? null,
            testEventCode: snap.test_event_code ?? null,
          })
        }
      } catch {
        // swallow — CAPI is best-effort and must never fail the order
      }
    }

    // Mark any matching abandoned checkout as recovered (fire-and-forget)
    supabase
      .from('abandoned_checkouts')
      .update({ recovered: true })
      .eq('merchant_id', orderFields.merchant_id)
      .eq('product_id',  orderFields.product_id)
      .eq('customer_phone', String(orderFields.customer_phone ?? '').trim())
      .eq('recovered', false)
      .then(() => {})

    // Send credit warning emails at 10 and 0 remaining
    if (orderFields.merchant_id) {
      const { data: credits } = await supabase
        .from('order_credits')
        .select('credits_remaining')
        .eq('merchant_id', orderFields.merchant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const remaining = credits?.credits_remaining
      if (remaining === 10 || remaining === 0) {
        const { data: { user: merchantUser } } = await supabase.auth.admin.getUserById(
          orderFields.merchant_id
        )
        const merchantEmail = merchantUser?.email
        if (merchantEmail) {
          sendCreditsWarningEmail(merchantEmail, remaining) // fire-and-forget
        }
      }
    }

    return NextResponse.json({ success: true, orderId: orderData?.id ?? null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
