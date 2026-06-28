import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClientIp, getIpCountry } from '@/lib/analytics/server'
import type { OrderAttributionPayload } from '@/lib/analytics/attribution'
import { sendCreditsWarningEmail } from '@/lib/email/credits-warning'
import { orderLimiter, checkLimit } from '@/lib/ratelimit'

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
    const attribution = parseAttribution(rawAttribution)

    // Validate required IDs
    if (!orderFields.store_id || !orderFields.merchant_id || !orderFields.product_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch authoritative product and store data; verify ownership chain
    const [{ data: product, error: productErr }, { data: store, error: storeErr }] =
      await Promise.all([
        supabase
          .from('products')
          .select('id, price, shipping_cost, offers, upsell, store_id')
          .eq('id', orderFields.product_id)
          .single(),
        supabase
          .from('stores')
          .select('id, merchant_id, shipping_type, static_shipping_cost, currency')
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

    const { data: orderData, error } = await supabase.from('orders').insert({
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
      payment_method: 'cod',
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
    }).select('id').single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
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
