import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClientIp, getIpCountry } from '@/lib/analytics/server'
import type { OrderAttributionPayload } from '@/lib/analytics/attribution'
import { sendCreditsWarningEmail } from '@/lib/email/credits-warning'

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
  try {
    const body = await request.json()
    const { attribution: rawAttribution, ...orderFields } = body ?? {}
    const attribution = parseAttribution(rawAttribution)

    const { data: orderData, error } = await supabase.from('orders').insert({
      store_id: orderFields.store_id,
      merchant_id: orderFields.merchant_id,
      product_id: orderFields.product_id,
      customer_name: orderFields.customer_name,
      customer_phone: orderFields.customer_phone,
      address_governorate: orderFields.address_governorate ?? null,
      address_line1: orderFields.address_line1 ?? null,
      address_country: orderFields.address_country ?? null,
      quantity: orderFields.quantity ?? 1,
      note: orderFields.note ?? null,
      unit_price: orderFields.unit_price,
      total_price: orderFields.total_price,
      currency: orderFields.currency,
      shipping_price: orderFields.shipping_price ?? null,
      payment_method: orderFields.payment_method ?? 'cod',
      status: orderFields.status ?? 'pending',
      lat: orderFields.lat ?? null,
      lng: orderFields.lng ?? null,
      map_link: orderFields.map_link ?? null,
      location_address: orderFields.location_address ?? null,
      applied_offer: orderFields.applied_offer ?? null,
      upsell_item: orderFields.upsell_item ?? null,
      ...attribution,
      ip_address: getClientIp(request),
      ip_country: getIpCountry(request),
    }).select('id').single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

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
        const { data: { user: merchantUser } } = await supabase.auth.admin.getUserById(orderFields.merchant_id)
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
