import { tiktokGet } from '@/lib/tiktok/mutations'
import {
  buildCreateFlowError,
  type CreateFlowError,
} from '@/lib/tiktok/create-ad/errors'
import {
  type ConversionEventPreference,
  DEFAULT_CONVERSION_EVENT_PREFERENCE,
  extractPixelEventCodes,
  pickOptimizationEvent,
} from '@/lib/tiktok/create-ad/optimization-events'

type Connection = { advertiser_id: string; access_token: string }

/** TikTok /pixel/list/ row: numeric pixel_id + alphanumeric code + configured events. */
export type TikTokPixel = {
  pixel_id: string
  code: string
  pixel_name?: string
  events: string[]
}

type CacheEntry = { pixel_id: string; fetchedAt: number }

const PIXEL_CACHE_TTL_MS = 5 * 60 * 1000
const pixelListCache = new Map<string, { pixels: TikTokPixel[]; fetchedAt: number }>()
const codeToIdCache = new Map<string, CacheEntry>()

function advertiserCacheKey(advertiserId: string, suffix: string) {
  return `${advertiserId}:${suffix}`
}

function isNumericPixelId(value: string): boolean {
  return /^\d+$/.test(value.trim())
}

function normalizePixelRow(raw: Record<string, unknown>): TikTokPixel | null {
  const pixel_id = raw.pixel_id
  const code = raw.code ?? raw.pixel_code
  if (pixel_id == null || code == null) return null
  return {
    pixel_id: String(pixel_id),
    code: String(code),
    pixel_name:
      raw.pixel_name != null
        ? String(raw.pixel_name)
        : raw.name != null
          ? String(raw.name)
          : undefined,
    events: extractPixelEventCodes(raw),
  }
}

function extractPixels(data: unknown): TikTokPixel[] {
  if (!data || typeof data !== 'object') return []
  const container = data as Record<string, unknown>
  const list = container.pixels ?? container.list ?? container.page_list
  if (!Array.isArray(list)) return []
  return list
    .map(row =>
      row && typeof row === 'object'
        ? normalizePixelRow(row as Record<string, unknown>)
        : null
    )
    .filter((p): p is TikTokPixel => p !== null)
}

async function fetchPixelList(
  connection: Connection,
  extra: Record<string, string> = {}
): Promise<TikTokPixel[] | CreateFlowError> {
  const json = await tiktokGet(connection, '/pixel/list/', extra)
  if (json.code !== 0) {
    return buildCreateFlowError('validation', json)
  }
  return extractPixels(json.data)
}

async function getAdvertiserPixels(
  connection: Connection
): Promise<TikTokPixel[] | CreateFlowError> {
  const key = connection.advertiser_id
  const cached = pixelListCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < PIXEL_CACHE_TTL_MS) {
    return cached.pixels
  }

  const pixels = await fetchPixelList(connection)
  if ('error' in pixels) return pixels

  pixelListCache.set(key, { pixels, fetchedAt: Date.now() })
  for (const pixel of pixels) {
    codeToIdCache.set(
      advertiserCacheKey(key, pixel.code.toUpperCase()),
      { pixel_id: pixel.pixel_id, fetchedAt: Date.now() }
    )
  }
  return pixels
}

async function resolvePixelRow(
  connection: Connection,
  storedValue: string
): Promise<{ ok: true; pixel: TikTokPixel } | CreateFlowError> {
  const trimmed = storedValue.trim()
  if (!trimmed) {
    return {
      error: 'validation_error',
      step: 'validation',
      message: 'TikTok Pixel is required for conversion campaigns.',
      category: 'missing_required_field',
      explanation: 'Add your TikTok Pixel code in Store Settings.',
    }
  }

  if (isNumericPixelId(trimmed)) {
    const filtered = await fetchPixelList(connection, { pixel_id: trimmed })
    if ('error' in filtered) return filtered
    const match = filtered.find(pixel => pixel.pixel_id === trimmed)
    if (match) return { ok: true, pixel: match }

    const all = await getAdvertiserPixels(connection)
    if ('error' in all) return all
    const fromAll = all.find(pixel => pixel.pixel_id === trimmed)
    if (fromAll) return { ok: true, pixel: fromAll }

    return {
      ok: true,
      pixel: { pixel_id: trimmed, code: trimmed, events: [] },
    }
  }

  const codeKey = advertiserCacheKey(connection.advertiser_id, trimmed.toUpperCase())
  const codeCached = codeToIdCache.get(codeKey)
  if (codeCached && Date.now() - codeCached.fetchedAt < PIXEL_CACHE_TTL_MS) {
    const cachedPixels = pixelListCache.get(connection.advertiser_id)?.pixels ?? []
    const cached = cachedPixels.find(
      pixel => pixel.code.toUpperCase() === trimmed.toUpperCase()
    )
    if (cached) return { ok: true, pixel: cached }
  }

  const filtered = await fetchPixelList(connection, { code: trimmed })
  if ('error' in filtered) return filtered

  let match = filtered.find(
    pixel => pixel.code.toUpperCase() === trimmed.toUpperCase()
  )

  if (!match) {
    const all = await getAdvertiserPixels(connection)
    if ('error' in all) return all
    match = all.find(pixel => pixel.code.toUpperCase() === trimmed.toUpperCase())
  }

  if (!match) {
    return {
      error: 'validation_error',
      step: 'validation',
      message: `TikTok Pixel code "${trimmed}" was not found on this ad account.`,
      category: 'missing_required_field',
      explanation:
        'The pixel code in Store Settings must match a pixel linked to your connected TikTok ad account. Copy the code from TikTok Events Manager.',
    }
  }

  codeToIdCache.set(codeKey, { pixel_id: match.pixel_id, fetchedAt: Date.now() })
  return { ok: true, pixel: match }
}

export type ConversionPixelResolveSuccess = {
  ok: true
  pixel_id: string
  pixel_code: string
  optimization_event: string
  available_events: string[]
}

export type ConversionPixelResolveResult = ConversionPixelResolveSuccess | CreateFlowError

/**
 * Map stores.tiktok_pixel_id → numeric pixel_id + optimization_event for /adgroup/create/.
 */
export async function resolveConversionPixel(
  connection: Connection,
  storedValue: string,
  preference: ConversionEventPreference = DEFAULT_CONVERSION_EVENT_PREFERENCE
): Promise<ConversionPixelResolveResult> {
  const resolved = await resolvePixelRow(connection, storedValue)
  if ('error' in resolved) return resolved

  const { pixel } = resolved
  const optimization_event = pickOptimizationEvent(pixel.events, preference)

  return {
    ok: true,
    pixel_id: pixel.pixel_id,
    pixel_code: pixel.code,
    optimization_event,
    available_events: pixel.events,
  }
}

/** @deprecated Use resolveConversionPixel */
export async function resolveNumericPixelId(
  connection: Connection,
  storedValue: string
): Promise<ConversionPixelResolveResult> {
  return resolveConversionPixel(connection, storedValue)
}
