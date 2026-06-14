import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { currencyDefaultTimezone } from '@/lib/tiktok/timezone'

export const TIKTOK = 'https://business-api.tiktok.com/open_api/v1.3'

export const REPORT_METRICS = [
  'spend', 'impressions', 'clicks', 'ctr', 'conversion', 'cost_per_conversion',
  'conversion_rate', 'cpc', 'cpm',
  'video_play_actions', 'video_watched_2s', 'complete_payment_roas',
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)
  return { start_date: formatDate(start), end_date: formatDate(end) }
}

export function parseQueryDates(searchParams: { get: (key: string) => string | null }) {
  const start = searchParams.get('start_date')
  const end = searchParams.get('end_date')
  if (start && end && DATE_RE.test(start) && DATE_RE.test(end)) {
    if (end < start) return { error: 'invalid_date_range' as const }
    return { start_date: start, end_date: end }
  }
  return defaultDateRange()
}

export function daysBetween(start: string, end: string) {
  const s = new Date(`${start}T00:00:00Z`)
  const e = new Date(`${end}T00:00:00Z`)
  return Math.max(1, Math.floor((e.getTime() - s.getTime()) / 86400000) + 1)
}

export function reportPageSize(start: string, end: string) {
  return Math.min(1000, Math.max(1, daysBetween(start, end) + 5))
}

export function campaignPageSize(start: string, end: string) {
  return Math.min(1000, Math.max(50, daysBetween(start, end) * 50))
}

export async function resolveActiveConnection() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return { error: 'No store found' as const, status: 404 }

  const { data: activeRows, error } = await supabaseAdmin
    .from('tiktok_connections')
    .select('advertiser_id, access_token, currency')
    .eq('store_id', store.id)
    .eq('is_active', true)

  const activeCount = activeRows?.length ?? 0
  console.log('[tiktok] resolveActiveConnection store_id:', store.id, 'active_rows:', activeCount)

  if (error) {
    console.error('[tiktok] resolveActiveConnection query error:', error.message)
    return { error: 'db_error' as const, status: 500 }
  }

  if (activeCount === 0) {
    return { error: 'no_active_account' as const, status: 200, store, activeCount: 0 }
  }

  const connection = activeRows![0]
  if (activeCount > 1) {
    console.warn(
      '[tiktok] multiple is_active connections for store',
      store.id,
      '— using',
      connection.advertiser_id
    )
  }

  return { connection, store, activeCount }
}

export async function fetchAdvertiserInfo(
  connection: { advertiser_id: string; access_token: string }
) {
  const params = new URLSearchParams({
    advertiser_ids: JSON.stringify([connection.advertiser_id]),
    fields: JSON.stringify(['currency', 'name', 'advertiser_id', 'timezone']),
  })
  const res = await fetch(`${TIKTOK}/advertiser/info/?${params}`, {
    headers: { 'Access-Token': connection.access_token },
  })
  return res.json()
}

export async function resolveAdvertiserTimezone(
  connection: { advertiser_id: string; access_token: string },
  currency: string
): Promise<string> {
  const json = await fetchAdvertiserInfo(connection)
  const tz = json.code === 0 ? json.data?.list?.[0]?.timezone : null
  if (typeof tz === 'string' && tz.length > 0) return tz
  return currencyDefaultTimezone(currency)
}

export async function resolveAdvertiserCurrency(
  connection: { advertiser_id: string; access_token: string; currency?: string | null },
  storeId: string
): Promise<string> {
  if (connection.currency) return connection.currency

  const json = await fetchAdvertiserInfo(connection)
  const currency = json.code === 0 ? json.data?.list?.[0]?.currency : null
  const resolved = currency || 'USD'

  await supabaseAdmin
    .from('tiktok_connections')
    .update({ currency: resolved, updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('advertiser_id', connection.advertiser_id)

  return resolved
}

export async function fetchIntegratedReport(
  connection: { advertiser_id: string; access_token: string },
  opts: {
    start_date: string
    end_date: string
    data_level: string
    dimensions: string[]
    page_size?: number
    metrics?: string[]
  }
) {
  const params = new URLSearchParams({
    advertiser_id: connection.advertiser_id,
    report_type: 'BASIC',
    data_level: opts.data_level,
    dimensions: JSON.stringify(opts.dimensions),
    metrics: JSON.stringify(opts.metrics ?? REPORT_METRICS),
    start_date: opts.start_date,
    end_date: opts.end_date,
    page: '1',
    page_size: String(opts.page_size ?? 30),
  })

  const res = await fetch(`${TIKTOK}/report/integrated/get/?${params}`, {
    headers: { 'Access-Token': connection.access_token },
  })
  return res.json()
}

export const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

/** TikTok auth/token failure codes (40001, 401xx, revoked-token messages). */
export function isTikTokAuthError(code: unknown, message?: string): boolean {
  const c = Number(code)
  if (Number.isFinite(c)) {
    if (c === 40001) return true
    if (c >= 40100 && c < 40200) return true
  }
  const msg = String(message || '').toLowerCase()
  if (msg.includes('access token') && (msg.includes('invalid') || msg.includes('expired') || msg.includes('revoked'))) {
    return true
  }
  if (msg.includes('token') && msg.includes('revok')) return true
  return false
}

export async function markConnectionExpired(storeId: string, advertiserId: string) {
  const { error } = await supabaseAdmin
    .from('tiktok_connections')
    .update({
      status: 'expired',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', storeId)
    .eq('advertiser_id', advertiserId)

  if (error) console.error('[tiktok] markConnectionExpired failed:', error.message)
}

export type TikTokApiFailure =
  | { error: 'reauth_required' }
  | { error: 'tiktok_error'; code?: number; message?: string }

export async function tiktokApiFailure(
  code: number | undefined,
  message: string | undefined,
  ctx?: { storeId: string; advertiserId: string }
): Promise<TikTokApiFailure> {
  if (isTikTokAuthError(code, message) && ctx) {
    await markConnectionExpired(ctx.storeId, ctx.advertiserId)
    return { error: 'reauth_required' }
  }
  return { error: 'tiktok_error', code, message }
}

export async function finalizeMutationResult<T extends Record<string, unknown>>(
  result: T | { error: string; code?: number; message?: string },
  ctx: { storeId: string; advertiserId: string }
): Promise<T | TikTokApiFailure | { error: string; code?: number; message?: string }> {
  if (!result || typeof result !== 'object' || !('error' in result)) return result
  const err = result as { error: string; code?: number; message?: string }
  if (err.error === 'reauth_required') return { error: 'reauth_required' }
  if (err.error === 'tiktok_error') {
    return tiktokApiFailure(err.code, err.message, ctx)
  }
  return err
}
