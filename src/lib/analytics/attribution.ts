const STORAGE_KEY = 'mantoog_attribution'

const FIRST_TOUCH_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ttclid',
  'fbclid',
] as const

type FirstTouchParam = (typeof FIRST_TOUCH_PARAMS)[number]

type AttributionSession = {
  startedAt: number
  pages_viewed: number
  referrer?: string | null
  landing_page?: string | null
} & Partial<Record<FirstTouchParam, string>>

export type OrderAttributionPayload = {
  traffic_source?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  ttclid?: string | null
  fbclid?: string | null
  referrer?: string | null
  landing_page?: string | null
  session_seconds?: number | null
  pages_viewed?: number | null
  device_type?: string | null
  device_os?: string | null
  device_browser?: string | null
  locale?: string | null
}

function loadSession(): AttributionSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AttributionSession
  } catch {
    return null
  }
}

function saveSession(session: AttributionSession): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // sessionStorage may be unavailable; attribution is best-effort
  }
}

function extractReferrerDomain(referrer?: string | null): string | null {
  if (!referrer) return null
  try {
    const host = new URL(referrer).hostname.replace(/^www\./i, '')
    return host || null
  } catch {
    return null
  }
}

export function deriveTrafficSource(data: {
  ttclid?: string | null
  fbclid?: string | null
  utm_source?: string | null
  referrer?: string | null
}): string {
  if (data.ttclid) return 'tiktok'
  if (data.fbclid) return 'facebook'
  if (data.utm_source) return data.utm_source
  const domain = extractReferrerDomain(data.referrer)
  if (domain) return domain
  return 'direct'
}

function parseDevice(ua: string): {
  device_type: string
  device_os: string
  device_browser: string
} {
  let device_type = 'desktop'
  if (/ipad|tablet|playbook|silk/i.test(ua)) device_type = 'tablet'
  else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) device_type = 'mobile'

  let device_os = 'unknown'
  if (/windows/i.test(ua)) device_os = 'Windows'
  else if (/mac os x/i.test(ua) && !/iphone|ipad/i.test(ua)) device_os = 'macOS'
  else if (/android/i.test(ua)) device_os = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) device_os = 'iOS'
  else if (/linux/i.test(ua)) device_os = 'Linux'

  let device_browser = 'unknown'
  if (/edg\//i.test(ua)) device_browser = 'Edge'
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) device_browser = 'Opera'
  else if (/firefox\//i.test(ua)) device_browser = 'Firefox'
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) device_browser = 'Chrome'
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) device_browser = 'Safari'

  return { device_type, device_os, device_browser }
}

/** Call on each landing/product page load — first-touch capture + page view count. */
export function initAttributionFromLanding(): void {
  if (typeof window === 'undefined') return

  const session: AttributionSession = loadSession() ?? {
    startedAt: Date.now(),
    pages_viewed: 0,
  }

  const params = new URLSearchParams(window.location.search)
  for (const key of FIRST_TOUCH_PARAMS) {
    const value = params.get(key)
    if (value && !session[key]) session[key] = value
  }

  if (!session.referrer) session.referrer = document.referrer || null
  if (!session.landing_page) session.landing_page = window.location.href

  session.pages_viewed = (session.pages_viewed || 0) + 1
  saveSession(session)
}

/** Build attribution payload to send with order creation. */
export function getOrderAttributionPayload(): OrderAttributionPayload {
  if (typeof window === 'undefined') return {}

  const session = loadSession()
  const ua = navigator.userAgent || ''
  const device = parseDevice(ua)

  const utm_source = session?.utm_source ?? null
  const utm_medium = session?.utm_medium ?? null
  const utm_campaign = session?.utm_campaign ?? null
  const utm_content = session?.utm_content ?? null
  const utm_term = session?.utm_term ?? null
  const ttclid = session?.ttclid ?? null
  const fbclid = session?.fbclid ?? null
  const referrer = session?.referrer ?? null
  const landing_page = session?.landing_page ?? null

  const session_seconds = session?.startedAt
    ? Math.round((Date.now() - session.startedAt) / 1000)
    : null

  return {
    traffic_source: deriveTrafficSource({ ttclid, fbclid, utm_source, referrer }),
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    ttclid,
    fbclid,
    referrer,
    landing_page,
    session_seconds,
    pages_viewed: session?.pages_viewed ?? null,
    device_type: device.device_type,
    device_os: device.device_os,
    device_browser: device.device_browser,
    locale: navigator.language || null,
  }
}

export const ORDER_ATTRIBUTION_FIELDS = [
  'traffic_source',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ttclid',
  'fbclid',
  'referrer',
  'landing_page',
  'session_seconds',
  'pages_viewed',
  'ip_address',
  'ip_country',
  'device_type',
  'device_os',
  'device_browser',
  'locale',
] as const

export const ORDER_ATTRIBUTION_LABELS: Record<(typeof ORDER_ATTRIBUTION_FIELDS)[number], string> = {
  traffic_source: 'Traffic Source',
  utm_source: 'UTM Source',
  utm_medium: 'UTM Medium',
  utm_campaign: 'UTM Campaign',
  utm_content: 'UTM Content',
  utm_term: 'UTM Term',
  ttclid: 'TTCLID',
  fbclid: 'FBCLID',
  referrer: 'Referrer',
  landing_page: 'Landing Page',
  session_seconds: 'Session Sec',
  pages_viewed: 'Pages Viewed',
  ip_address: 'IP Address',
  ip_country: 'IP Country',
  device_type: 'Device',
  device_os: 'OS',
  device_browser: 'Browser',
  locale: 'Locale',
}
