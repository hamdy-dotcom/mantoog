const RESEND_API = 'https://api.resend.com/emails'
const FROM = 'Mantoog Agents <noreply@mantoog.com>'

// ── shared shell (email-safe: tables + inline styles, RTL, dark brand theme) ──
const C = {
  bg: '#0a0d14', card: '#12141d', tile: '#181b26', border: '#252a38',
  text: '#f3f4f8', muted: '#8b91a7', faint: '#5d6375',
  indigo: '#6366f1', green: '#4ade80', red: '#f87171', amber: '#fbbf24',
}

function shell(inner: string, preheader: string) {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:36px 14px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
${inner}
<tr><td style="padding:18px 8px 0;text-align:center;">
  <p style="margin:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:11px;color:${C.faint};">
    رسالة آلية من وكلاء Mantoog — كل إجراء مسجّل في سجل الوكلاء
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

const font = `font-family:'Segoe UI',Tahoma,Arial,sans-serif;`

function header(badge: string, badgeColor: string, title: string, subtitle: string) {
  return `<tr><td style="background:${C.card};border:1px solid ${C.border};border-bottom:0;border-radius:20px 20px 0 0;overflow:hidden;">
  <div style="height:4px;background:linear-gradient(90deg,#e11d48,${C.indigo});"></div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="padding:24px 28px 20px;">
      <div style="${font}font-size:11px;font-weight:700;color:${badgeColor};letter-spacing:.4px;margin-bottom:8px;">${badge}</div>
      <div style="${font}font-size:21px;font-weight:800;color:${C.text};line-height:1.4;">${title}</div>
      <div style="${font}font-size:12.5px;color:${C.muted};margin-top:4px;">${subtitle}</div>
    </td>
    <td align="left" style="padding:24px 0 20px 28px;vertical-align:top;">
      <div style="${font}font-size:13px;font-weight:800;color:${C.text};">Mantoog<span style="color:${C.indigo};">·Agents</span></div>
    </td>
  </tr></table>
</td></tr>`
}

function section(label: string) {
  return `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:20px 28px 10px;">
    <div style="${font}font-size:11px;font-weight:700;color:${C.faint};letter-spacing:.4px;">${label}</div>
  </td></tr>`
}

function kpiRow(kpis: { label: string; value: string; unit?: string; color?: string }[]) {
  const cells = kpis.map(k => `
    <td width="${Math.floor(100 / kpis.length)}%" style="padding:0 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:${C.tile};border:1px solid ${C.border};border-radius:14px;padding:13px 8px;text-align:center;">
          <div style="${font}font-size:20px;font-weight:800;color:${k.color || C.text};line-height:1;" dir="ltr">${k.value}<span style="font-size:10px;font-weight:600;color:${C.muted};"> ${k.unit || ''}</span></div>
          <div style="${font}font-size:11px;color:${C.muted};margin-top:6px;">${k.label}</div>
        </td></tr>
      </table>
    </td>`).join('')
  return `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:6px 24px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
  </td></tr>`
}

function footerCta(label: string, url: string) {
  return `<tr><td style="background:${C.card};border:1px solid ${C.border};border-top:0;border-radius:0 0 20px 20px;padding:20px 28px 26px;text-align:center;">
    <a href="${url}" style="${font}display:inline-block;background:linear-gradient(90deg,#e11d48,${C.indigo});color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 30px;border-radius:999px;">${label}</a>
  </td></tr>`
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── Daily performance report (محلل الأداء) ────────────────────────────────────
export type ReportCampaign = { name: string; spend: number; conversions: number; cpa: number | null }
export type ReportAction = { agent: string; action: string; reason: string | null; time: string }
export type DailyReport = {
  date: string
  currency: string
  totalSpend: number
  totalConversions: number
  realOrders: number
  campaigns: ReportCampaign[]
  actions: ReportAction[]
  adsManagerUrl: string
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

function campaignRows(campaigns: ReportCampaign[], currency: string) {
  if (!campaigns.length) {
    return `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:6px 28px 14px;">
      <div style="${font}font-size:13px;color:${C.muted};">لا بيانات إنفاق للأمس.</div></td></tr>`
  }
  const rows = campaigns.map((c, i) => `
    <tr>
      <td style="padding:12px 2px;${i > 0 ? `border-top:1px solid ${C.border};` : ''}">
        <div style="${font}font-size:13px;font-weight:700;color:${C.text};line-height:1.5;">${esc(c.name)}</div>
        <div style="${font}font-size:11.5px;color:${C.muted};margin-top:3px;">
          الإنفاق <span style="color:${C.text};font-weight:700;" dir="ltr">${fmt(c.spend)} ${currency}</span>
          &nbsp;·&nbsp; التحويلات <span style="color:${C.text};font-weight:700;">${c.conversions}</span>
          ${c.cpa != null ? `&nbsp;·&nbsp; تكلفة التحويل <span style="color:${C.text};font-weight:700;" dir="ltr">${fmt(c.cpa)}</span>` : ''}
        </div>
      </td>
    </tr>`).join('')
  return `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:2px 28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>`
}

function actionRows(actions: ReportAction[]) {
  if (!actions.length) {
    return `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:6px 28px 20px;">
      <div style="${font}font-size:13px;color:${C.muted};">✓ لا إجراءات — كل شيء ضمن الحدود.</div></td></tr>`
  }
  const dot = (a: string) => a === 'pause' ? C.red : a === 'would_pause' ? C.amber : C.green
  const label = (a: string) => a === 'pause' ? 'أوقف حملة' : a === 'would_pause' ? 'تنبيه (وضع المراقبة)' : a === 'report' ? 'أرسل تقريرًا' : a
  const rows = actions.map((a, i) => `
    <tr><td style="padding:9px 2px;${i > 0 ? `border-top:1px solid ${C.border};` : ''}">
      <div style="${font}font-size:12.5px;color:${C.text};line-height:1.6;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:99px;background:${dot(a.action)};margin-left:8px;"></span>
        <strong>${label(a.action)}</strong>${a.reason ? ` — <span style="color:${C.muted};">${esc(a.reason)}</span>` : ''}
      </div>
    </td></tr>`).join('')
  return `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:2px 28px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>`
}

export function buildDailyReportHtml(r: DailyReport): string {
  const cpa = r.totalConversions > 0 ? r.totalSpend / r.totalConversions : null
  const inner =
    header('تقرير يومي · محلل الأداء', C.indigo, 'أداء حملاتك أمس', r.date) +
    kpiRow([
      { label: `الإنفاق (${r.currency})`, value: fmt(r.totalSpend) },
      { label: 'تحويلات TikTok', value: String(r.totalConversions) },
      { label: 'طلبات فعلية', value: String(r.realOrders), color: C.green },
      { label: `تكلفة التحويل`, value: cpa != null ? fmt(cpa) : '—' },
    ]) +
    section('الحملات المراقبة') +
    campaignRows(r.campaigns, r.currency) +
    section('إجراءات الوكلاء (آخر ٢٤ ساعة)') +
    actionRows(r.actions) +
    footerCta('فتح TikTok Ads Manager', r.adsManagerUrl)
  return shell(inner, `أمس: ${fmt(r.totalSpend)} ${r.currency} إنفاق · ${r.realOrders} طلب فعلي`)
}

// ── Guardian alert (مراقب الإنفاق) ────────────────────────────────────────────
export type GuardianAlert = {
  campaignName: string
  reason: string
  observing: boolean
  stats: { spend: number; conversions: number; cpa: number | null }
  currency: string
  adsManagerUrl: string
}

export function buildGuardianAlertHtml(a: GuardianAlert): string {
  const badge = a.observing ? 'تنبيه · وضع المراقبة' : 'إجراء · مراقب الإنفاق'
  const title = a.observing ? 'حملة تجاوزت الحدود (لم نوقفها)' : 'تم إيقاف حملة مؤقتًا'
  const inner =
    header(badge, a.observing ? C.amber : C.red, title, esc(a.campaignName)) +
    `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:8px 28px 4px;">
      <div style="background:${a.observing ? '#3a2800' : '#3a1414'};border:1px solid ${a.observing ? '#f59e0b44' : '#ef444444'};border-radius:12px;padding:14px 16px;">
        <div style="${font}font-size:13.5px;font-weight:700;color:${a.observing ? C.amber : C.red};line-height:1.7;">${esc(a.reason)}</div>
      </div>
    </td></tr>` +
    kpiRow([
      { label: `الإنفاق اليوم (${a.currency})`, value: fmt(a.stats.spend) },
      { label: 'تحويلات اليوم', value: String(a.stats.conversions) },
      { label: `تكلفة التحويل`, value: a.stats.cpa != null ? fmt(a.stats.cpa) : '—' },
    ]) +
    `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:12px 28px 6px;">
      <div style="${font}font-size:12.5px;color:${C.muted};line-height:1.8;">${
        a.observing
          ? 'الوكيل في وضع المراقبة (أول ٤٨ ساعة) — هذا تنبيه فقط ولم يتم أي إجراء. بعد انتهاء فترة المراقبة سيوقف الحملة تلقائيًا عند تكرار التجاوز.'
          : 'يمكنك إعادة تفعيل الحملة من TikTok Ads Manager في أي وقت. الإيقاف مسجّل في سجل الوكلاء.'
      }</div>
    </td></tr>` +
    footerCta('فتح TikTok Ads Manager', a.adsManagerUrl)
  return shell(inner, a.reason)
}

// ── Generic agent notice (scaler / pnl / auditor) ─────────────────────────────
export function buildSimpleAlertHtml(a: { badge: string; title: string; lines: string[]; ctaUrl?: string }): string {
  const body = a.lines.map(l => `<tr><td style="background:${C.card};border-right:1px solid ${C.border};border-left:1px solid ${C.border};padding:6px 28px;">
    <div style="${font}font-size:13.5px;color:${C.text};line-height:1.9;">${l}</div>
  </td></tr>`).join('')
  const inner =
    header('إشعار الوكلاء', C.green, a.title, esc(a.badge)) + body +
    footerCta('فتح TikTok Ads Manager', a.ctaUrl || 'https://ads.tiktok.com/i18n/manage/campaign')
  return shell(inner, a.title)
}

// ── send ──────────────────────────────────────────────────────────────────────
export async function sendEmailHtml(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key || !to) return false
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      signal: AbortSignal.timeout(15000),
    })
    return res.ok
  } catch { return false }
}
