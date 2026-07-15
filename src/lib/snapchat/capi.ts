import { createHash } from 'crypto'

// Snapchat Conversions API (server-side) — the Meta-aligned v3 schema.
// Endpoint: POST https://tr.snapchat.com/v3/{pixel_id}/events?access_token={token}
//
// Why this exists: the browser Snap Pixel alone loses events (ad blockers, iOS
// tracking prevention, tab closed before load) and can't attach hashed customer
// identifiers, which tanks Snap's Event Quality score and ad optimization.
// This sends Purchase events server-to-server with the checkout data we already
// collect (name, phone), the customer's REAL ip + user-agent (never the
// server's), and the Snap click id — deduplicated against the browser pixel via
// a shared event_id (the DB order id).

const SNAP_CAPI_ENDPOINT = 'https://tr.snapchat.com'

/** SHA-256 hex of a normalized string, or undefined if empty. */
function hash(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = String(value).trim().toLowerCase()
  if (!trimmed) return undefined
  return createHash('sha256').update(trimmed).digest('hex')
}

/**
 * Normalize a phone to digits with a country code (no leading +), per Snap's
 * hashing guidance. Local numbers (leading 0) are promoted using the order's
 * country so match quality stays high. Best-effort; returns null if unusable.
 */
function normalizePhone(phone: string | null | undefined, country?: string | null): string | null {
  if (!phone) return null
  let digits = String(phone).replace(/\D/g, '')
  if (!digits) return null

  const cc: Record<string, string> = { EG: '20', SA: '966', AE: '971' }
  const code = country ? cc[country.toUpperCase()] : undefined

  // Already has a known country code prefix → leave as-is.
  if (code && digits.startsWith(code)) return digits
  // Local format with a leading 0 → drop it and prepend the country code.
  if (code && digits.startsWith('0')) return code + digits.slice(1)
  // Local format without a leading 0 → prepend the country code.
  if (code && digits.length <= 10) return code + digits
  return digits
}

/** Split a full name into first / last for the fn / ln hashed fields. */
function splitName(fullName: string | null | undefined): { first?: string; last?: string } {
  if (!fullName) return {}
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return {}
  if (parts.length === 1) return { first: parts[0] }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export type SnapPurchaseInput = {
  pixelId: string
  token: string
  eventId: string            // dedup id shared with the browser pixel (DB order id)
  value: number
  currency: string
  orderId: string
  numItems?: number
  // Customer / request context
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  country?: string | null    // EG / SA / AE — improves phone normalization
  clientIp?: string | null
  userAgent?: string | null
  sccid?: string | null      // Snap click id from the landing URL
  scCookie?: string | null   // _scid cookie value, if available
  eventSourceUrl?: string | null
  testEventCode?: string | null
  eventTime?: number         // unix seconds; defaults to now
}

export type SnapPurchaseResult = { ok: boolean; status?: number; error?: string; body?: unknown }

/**
 * Fire a server-side PURCHASE to Snapchat's Conversions API. Never throws —
 * returns a result so callers can log without ever failing the order.
 */
export async function sendSnapPurchase(input: SnapPurchaseInput): Promise<SnapPurchaseResult> {
  try {
    const phone = normalizePhone(input.customerPhone, input.country)
    const { first, last } = splitName(input.customerName)

    const user_data: Record<string, unknown> = {}
    const em = hash(input.customerEmail)
    if (em) user_data.em = [em]
    const ph = hash(phone)
    if (ph) user_data.ph = [ph]
    const fn = hash(first)
    if (fn) user_data.fn = [fn]
    const ln = hash(last)
    if (ln) user_data.ln = [ln]
    if (input.clientIp) user_data.client_ip_address = input.clientIp
    if (input.userAgent) user_data.client_user_agent = input.userAgent
    if (input.sccid) user_data.sc_click_id = input.sccid
    if (input.scCookie) user_data.sc_cookie1 = input.scCookie

    const custom_data: Record<string, unknown> = {
      currency: input.currency,
      value: Number(input.value).toFixed(2),
      order_id: input.orderId,
    }
    if (input.numItems != null) custom_data.num_items = input.numItems

    const event: Record<string, unknown> = {
      event_name: 'PURCHASE',
      event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
      action_source: 'web',
      event_id: input.eventId,
      user_data,
      custom_data,
    }
    if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl

    const payload: Record<string, unknown> = { data: [event] }
    if (input.testEventCode) payload.test_event_code = input.testEventCode

    // Host is hardcoded (no SSRF); pixelId/token are encoded into the URL.
    const url = `${SNAP_CAPI_ENDPOINT}/v3/${encodeURIComponent(input.pixelId)}/events?access_token=${encodeURIComponent(input.token)}`
    // Bound the request so a slow/hung Snap endpoint can never hold up the
    // (public) order-create response that awaits this call.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    let body: unknown = null
    try { body = await res.json() } catch { /* non-JSON response */ }

    if (!res.ok) return { ok: false, status: res.status, error: `Snap CAPI ${res.status}`, body }
    return { ok: true, status: res.status, body }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Snap CAPI request failed' }
  }
}
