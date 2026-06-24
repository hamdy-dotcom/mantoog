import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tune these without touching anything else ────────────────
const DRAIN_CONFIG = {
  windowMinutes:   10,   // count orders placed in the last N minutes
  threshold:       50,   // alert when a single merchant exceeds this count
  cooldownMinutes: 60,   // suppress repeat alerts for the same merchant within this period
}
// ─────────────────────────────────────────────────────────────

const RESEND_API = 'https://api.resend.com/emails'
const FROM       = 'Mantoog Alerts <noreply@mantoog.com>'
const ADMIN_URL  = 'https://mantoog.com/admin'

async function sendDrainAlertEmail(
  to: string,
  merchantEmail: string,
  merchantId: string,
  ordersCount: number,
): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return

  const { windowMinutes, threshold } = DRAIN_CONFIG
  const subject = `🚨 Credit Drain Alert — ${ordersCount} orders/${windowMinutes}min (merchant: ${merchantEmail})`

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;padding:0 16px;">
  <div style="background:#0f1117;border:1px solid #ef444433;border-radius:20px;overflow:hidden;">
    <div style="height:4px;background:linear-gradient(90deg,#ef4444,#f97316);"></div>
    <div style="padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:64px;height:64px;background:#3a1414;border:1px solid #ef444433;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:28px;">🚨</span>
        </div>
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Credit Drain Detected</h1>
        <p style="margin:6px 0 0;color:#8b8fa8;font-size:14px;">Abnormal order volume on a merchant account</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:#1a1d24;border:1px solid #ef444422;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:11px;color:#4a4e60;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Orders in ${windowMinutes} min</div>
          <div style="font-size:40px;font-weight:800;color:#f87171;line-height:1;">${ordersCount}</div>
        </div>
        <div style="background:#1a1d24;border:1px solid #f59e0b22;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:11px;color:#4a4e60;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Alert Threshold</div>
          <div style="font-size:40px;font-weight:800;color:#fbbf24;line-height:1;">${threshold}</div>
        </div>
      </div>

      <div style="background:#1a1d24;border:1px solid #2a2d35;border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="font-size:11px;color:#4a4e60;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Merchant</div>
        <div style="font-size:14px;color:#e2e8f0;margin-bottom:4px;">${merchantEmail}</div>
        <div style="font-size:11px;color:#4a4e60;font-family:monospace;">${merchantId}</div>
      </div>

      <div style="background:#0f2010;border:1px solid #4ade8022;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#86efac;line-height:1.7;">
          <strong>No orders were blocked.</strong> This is detect-and-notify only.<br>
          If it's an attack, refund the merchant and block the source manually.<br>
          A viral campaign spike may also trigger this — check before acting.
        </p>
      </div>

      <div style="text-align:center;">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#3b82f6;color:#fff;font-weight:700;font-size:14px;padding:12px 32px;border-radius:10px;text-decoration:none;">
          Open Admin Dashboard
        </a>
      </div>
    </div>
  </div>
  <p style="text-align:center;color:#4a4e60;font-size:11px;margin:20px 0 40px;">
    Mantoog Alert System · Auto-generated — do not reply
  </p>
</div>
</body></html>`

  await fetch(RESEND_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  }).catch(() => {}) // fire-and-forget, never throw
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { windowMinutes, threshold, cooldownMinutes } = DRAIN_CONFIG
  const windowCutoff   = new Date(Date.now() - windowMinutes   * 60 * 1000).toISOString()
  const cooldownCutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString()

  // 1. Fetch orders in the window — small dataset even during a spike
  const { data: recentOrders, error: ordersErr } = await supabase
    .from('orders')
    .select('merchant_id')
    .gte('created_at', windowCutoff)

  if (ordersErr) {
    return NextResponse.json({ error: ordersErr.message }, { status: 500 })
  }

  if (!recentOrders || recentOrders.length === 0) {
    return NextResponse.json({ checked: 0, alerts: 0 })
  }

  // 2. Group by merchant in JS
  const counts: Record<string, number> = {}
  for (const { merchant_id } of recentOrders) {
    if (!merchant_id) continue
    counts[merchant_id] = (counts[merchant_id] || 0) + 1
  }

  const suspects = Object.entries(counts)
    .filter(([, n]) => n > threshold)
    .map(([merchantId, n]) => ({ merchantId, count: n }))

  if (suspects.length === 0) {
    return NextResponse.json({ checked: Object.keys(counts).length, alerts: 0 })
  }

  // 3. Suppress merchants already alerted within the cooldown window
  const suspectIds = suspects.map(s => s.merchantId)
  const { data: recentAlerts } = await supabase
    .from('credit_drain_alerts')
    .select('merchant_id')
    .in('merchant_id', suspectIds)
    .gte('alerted_at', cooldownCutoff)

  const alreadyAlerted = new Set((recentAlerts ?? []).map(a => a.merchant_id))
  const toAlert = suspects.filter(s => !alreadyAlerted.has(s.merchantId))

  if (toAlert.length === 0) {
    return NextResponse.json({ checked: Object.keys(counts).length, alerts: 0, suppressed: suspects.length })
  }

  // 4. Get admin emails from admins table
  const { data: admins } = await supabase.from('admins').select('email')
  const adminEmails = (admins ?? []).map(a => a.email).filter(Boolean)

  // 5. Alert each suspect: insert flag + email admins
  const results = await Promise.all(
    toAlert.map(async ({ merchantId, count }) => {
      // Look up merchant email for the alert
      const { data: { user: merchantUser } } = await supabase.auth.admin.getUserById(merchantId)
      const merchantEmail = merchantUser?.email ?? 'unknown'

      // Insert dashboard flag (resolved_at=null = unresolved)
      await supabase.from('credit_drain_alerts').insert({
        merchant_id:      merchantId,
        merchant_email:   merchantEmail,
        orders_in_window: count,
        window_minutes:   windowMinutes,
        threshold,
      })

      // Email all admins
      for (const adminEmail of adminEmails) {
        await sendDrainAlertEmail(adminEmail, merchantEmail, merchantId, count)
      }

      return { merchantId, count, merchantEmail }
    })
  )

  return NextResponse.json({
    checked:  Object.keys(counts).length,
    alerts:   results.length,
    fired:    results,
    suppressed: suspects.length - toAlert.length,
  })
}
