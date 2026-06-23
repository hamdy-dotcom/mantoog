const RESEND_API = 'https://api.resend.com/emails'
const FROM = 'Mantoog <noreply@mantoog.com>'
const BILLING_URL = 'https://mantoog.com/dashboard/billing'

function buildHtml(remaining: number) {
  const isZero = remaining <= 0
  const accentColor = isZero ? '#ef4444' : '#f59e0b'
  const badgeBg = isZero ? '#3a141433' : '#3a280033'
  const badgeBorder = isZero ? '#ef444444' : '#f59e0b44'
  const countColor = isZero ? '#f87171' : '#fbbf24'
  const icon = isZero ? '🚫' : '⚠️'
  const iconBg = isZero ? '#3a1414' : '#3a2800'
  const iconBorder = isZero ? '#ef444433' : '#f59e0b33'

  const arTitle = isZero ? 'نفد رصيدك بالكامل' : 'رصيدك على وشك النفاد'
  const enTitle = isZero ? 'Your credits have run out' : 'Your credits are running low'

  const arBody = isZero
    ? 'نفد رصيدك على منصة Mantoog. تم تعليق الوصول إلى صفحة الطلبات وخاصية التصدير. اشحن رصيدك فوراً لاستعادة الوصول الكامل.'
    : `تبقى لك <strong style="color:#fff;">${remaining} طلبات فقط</strong> في رصيدك الحالي على منصة Mantoog. عند نفاد الرصيد الكامل وتجاوز الحد المسموح به، سيتم <strong style="color:#f87171;">تعليق الوصول</strong> إلى صفحة الطلبات وخاصية التصدير.`

  const enBody = isZero
    ? 'Your Mantoog credit balance has reached zero. Access to your orders page and export features has been suspended. Top up immediately to restore full access.'
    : `You have <strong style="color:#fff;">only ${remaining} orders left</strong> in your current Mantoog credit balance. Once fully exhausted, <strong style="color:#f87171;">access to your orders page and export features will be suspended.</strong>`

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;padding:0 16px;">
  <div style="background:#0f1117;border:1px solid #2a2d35;border-radius:20px;overflow:hidden;">
    <div style="height:4px;background:linear-gradient(90deg,${accentColor},#3b82f6);"></div>
    <div style="padding:32px 32px 0;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:${iconBg};border:1px solid ${iconBorder};border-radius:50%;margin-bottom:20px;">
        <span style="font-size:28px;">${icon}</span>
      </div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#fff;">${arTitle}</h1>
      <h2 style="margin:0 0 24px;font-size:15px;font-weight:400;color:#8b8fa8;letter-spacing:0.3px;">${enTitle}</h2>
    </div>
    <div style="margin:0 32px 28px;background:${badgeBg};border:1px solid ${badgeBorder};border-radius:14px;padding:20px;text-align:center;">
      <div style="font-size:13px;color:#8b8fa8;margin-bottom:6px;">الرصيد المتبقي · Remaining Credits</div>
      <div style="font-size:48px;font-weight:800;color:${countColor};line-height:1;">${remaining}</div>
      <div style="font-size:13px;color:${accentColor};margin-top:4px;">طلب · orders</div>
    </div>
    <div style="padding:0 32px 24px;border-bottom:1px solid #1e2130;">
      <p style="margin:0 0 10px;color:#c0c4d8;font-size:15px;line-height:1.7;text-align:right;" dir="rtl">${arBody}</p>
    </div>
    <div style="padding:24px 32px 28px;border-bottom:1px solid #1e2130;">
      <p style="margin:0;color:#c0c4d8;font-size:15px;line-height:1.7;text-align:left;direction:ltr;">${enBody}</p>
    </div>
    <div style="padding:28px 32px;text-align:center;">
      <a href="${BILLING_URL}" style="display:inline-block;background:#3b82f6;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">
        شحن الرصيد الآن &nbsp;·&nbsp; Top Up Now
      </a>
    </div>
  </div>
  <p style="text-align:center;color:#4a4e60;font-size:12px;margin:20px 0 40px;">
    Mantoog &nbsp;·&nbsp; لا تحتاج للرد على هذا البريد · No need to reply
  </p>
</div>
</body>
</html>`
}

export async function sendCreditsWarningEmail(to: string, remaining: number): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false

  const isZero = remaining <= 0
  const subject = isZero
    ? '🚫 نفد رصيدك — Your credits have run out'
    : `⚠️ تبقى لك ${remaining} طلبات فقط | Only ${remaining} Orders Left`

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: FROM, to, subject, html: buildHtml(remaining) }),
    })
    return res.ok
  } catch {
    return false
  }
}
