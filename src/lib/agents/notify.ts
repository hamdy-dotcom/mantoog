const RESEND_API = 'https://api.resend.com/emails'
const FROM = 'Mantoog Agents <noreply@mantoog.com>'

// Minimal dark-theme agent email: a title, a list of lines, an optional CTA link.
function buildHtml(title: string, lines: string[], accent: string) {
  const rows = lines.map(l => `<p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#c9cdda;">${l}</p>`).join('')
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;padding:0 16px;">
  <div style="background:#0f1117;border:1px solid #2a2d35;border-radius:20px;overflow:hidden;">
    <div style="height:4px;background:linear-gradient(90deg,${accent},#6366f1);"></div>
    <div style="padding:28px 28px 8px;">
      <h1 style="margin:0 0 18px;font-size:19px;font-weight:700;color:#fff;">${title}</h1>
      ${rows}
    </div>
    <div style="padding:8px 28px 24px;">
      <a href="https://ads.tiktok.com/i18n/manage/campaign" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 22px;border-radius:999px;">فتح TikTok Ads Manager</a>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #1c1f27;">
      <p style="margin:0;font-size:11px;color:#6b7080;">رسالة آلية من وكلاء Mantoog — كل إجراء مسجّل في سجل الوكلاء.</p>
    </div>
  </div>
</div>
</body></html>`
}

export async function sendAgentEmail(
  to: string,
  subject: string,
  lines: string[],
  kind: 'alert' | 'report' = 'alert'
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key || !to) return false
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html: buildHtml(subject, lines, kind === 'alert' ? '#ef4444' : '#4ade80'),
      }),
      signal: AbortSignal.timeout(15000),
    })
    return res.ok
  } catch { return false }
}
