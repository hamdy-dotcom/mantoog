import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClientIp, getIpCountry } from '@/lib/analytics/server'
import type { OrderAttributionPayload } from '@/lib/analytics/attribution'

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

    // Check credits after order — send warning email if exactly 10 remain
    if (orderFields.merchant_id) {
      const { data: credits } = await supabase
        .from('order_credits')
        .select('credits_remaining')
        .eq('merchant_id', orderFields.merchant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (credits?.credits_remaining === 10) {
        const { data: { user: merchantUser } } = await supabase.auth.admin.getUserById(orderFields.merchant_id)
        const merchantEmail = merchantUser?.email
        if (merchantEmail && process.env.RESEND_API_KEY) {
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'Mantoog <noreply@mantoog.com>',
              to: merchantEmail,
              subject: '⚠️ تبقى لك 10 طلبات فقط | Only 10 Orders Left',
              html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;padding:0 16px;">

  <!-- Card -->
  <div style="background:#0f1117;border:1px solid #2a2d35;border-radius:20px;overflow:hidden;">

    <!-- Top accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,#f59e0b,#ef4444);"></div>

    <!-- Header -->
    <div style="padding:32px 32px 0;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#3a2800;border:1px solid #f59e0b33;border-radius:50%;margin-bottom:20px;">
        <span style="font-size:28px;">⚠️</span>
      </div>
      <!-- Arabic -->
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#fff;">رصيدك على وشك النفاد</h1>
      <!-- English -->
      <h2 style="margin:0 0 24px;font-size:15px;font-weight:400;color:#8b8fa8;letter-spacing:0.3px;">Your credits are running low</h2>
    </div>

    <!-- Balance badge -->
    <div style="margin:0 32px 28px;background:#3a280033;border:1px solid #f59e0b44;border-radius:14px;padding:20px;text-align:center;">
      <div style="font-size:13px;color:#8b8fa8;margin-bottom:6px;">الرصيد المتبقي · Remaining Credits</div>
      <div style="font-size:48px;font-weight:800;color:#fbbf24;line-height:1;">10</div>
      <div style="font-size:13px;color:#f59e0b;margin-top:4px;">طلب · orders</div>
    </div>

    <!-- Body — Arabic -->
    <div style="padding:0 32px 24px;border-bottom:1px solid #1e2130;">
      <p style="margin:0 0 10px;color:#c0c4d8;font-size:15px;line-height:1.7;text-align:right;">
        تبقى لك <strong style="color:#fff;">10 طلبات فقط</strong> في رصيدك الحالي على منصة Mantoog.
      </p>
      <p style="margin:0;color:#8b8fa8;font-size:13px;line-height:1.7;text-align:right;">
        عند نفاد الرصيد الكامل وتجاوز الحد المسموح به، سيتم <strong style="color:#f87171;">تعليق الوصول</strong> إلى صفحة الطلبات وخاصية التصدير. احرص على شحن رصيدك مسبقاً لتجنب أي انقطاع.
      </p>
    </div>

    <!-- Body — English -->
    <div style="padding:24px 32px 28px;border-bottom:1px solid #1e2130;">
      <p style="margin:0 0 10px;color:#c0c4d8;font-size:15px;line-height:1.7;text-align:left;direction:ltr;">
        You have <strong style="color:#fff;">only 10 orders left</strong> in your current Mantoog credit balance.
      </p>
      <p style="margin:0;color:#8b8fa8;font-size:13px;line-height:1.7;text-align:left;direction:ltr;">
        Once your balance is fully exhausted and the allowed threshold is exceeded, <strong style="color:#f87171;">access to your orders page and export features will be suspended.</strong> Top up now to avoid any disruption.
      </p>
    </div>

    <!-- CTA -->
    <div style="padding:28px 32px;text-align:center;">
      <a href="https://mantoog.com/dashboard/billing"
         style="display:inline-block;background:#3b82f6;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.2px;">
        شحن الرصيد الآن &nbsp;·&nbsp; Top Up Now
      </a>
    </div>

  </div>

  <!-- Footer -->
  <p style="text-align:center;color:#4a4e60;font-size:12px;margin:20px 0 40px;">
    Mantoog &nbsp;·&nbsp; لا تحتاج للرد على هذا البريد · No need to reply
  </p>

</div>
</body>
</html>
              `,
            }),
          }).catch(() => {}) // fire-and-forget — never blocks the order response
        }
      }
    }

    return NextResponse.json({ success: true, orderId: orderData?.id ?? null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
