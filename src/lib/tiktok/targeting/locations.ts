import { getTikTokDataRecord, tiktokGet, tiktokPost } from '@/lib/tiktok/mutations'
import type { AdGoal } from '@/lib/tiktok/create-ad/types'
import {
  defaultLocationId,
  regionCodeFromStoreCurrency,
  type TargetLocation,
} from '@/lib/tiktok/targeting/location-defaults'

export type { TargetLocation }
export { defaultLocationId, regionCodeFromStoreCurrency }

type Connection = { advertiser_id: string; access_token: string }

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const cache = new Map<string, { at: number; items: TargetLocation[] }>()

/** ISO country code → Arabic display name for MENA + common targets. */
const COUNTRY_AR: Record<string, string> = {
  EG: 'مصر',
  SA: 'السعودية',
  AE: 'الإمارات',
  KW: 'الكويت',
  QA: 'قطر',
  BH: 'البحرين',
  OM: 'عُمان',
  JO: 'الأردن',
  LB: 'لبنان',
  IQ: 'العراق',
  MA: 'المغرب',
  DZ: 'الجزائر',
  TN: 'تونس',
  LY: 'ليبيا',
  YE: 'اليمن',
  PS: 'فلسطين',
  SD: 'السودان',
  IL: 'إسرائيل',
  TR: 'تركيا',
  US: 'الولايات المتحدة',
  GB: 'المملكة المتحدة',
  DE: 'ألمانيا',
  FR: 'فرنسا',
}

const PRIORITY_CODES = ['EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'IQ', 'MA', 'DZ', 'TN']

function goalRegionParams(goal: AdGoal) {
  if (goal === 'leads') {
    return {
      objective_type: 'LEAD_GENERATION',
      promotion_target_type: 'INSTANT_PAGE',
    }
  }
  if (goal === 'orders') {
    return { objective_type: 'WEB_CONVERSIONS' }
  }
  return { objective_type: 'TRAFFIC' }
}

function cacheKey(advertiserId: string, goal: AdGoal) {
  return `${advertiserId}:${goal}`
}

function mapRegionRow(row: Record<string, unknown>): TargetLocation | null {
  const locationId = row.location_id ?? row.region_id
  const name = row.name ?? row.region_name
  const code = String(row.region_code || '').toUpperCase()
  if (locationId == null || !name) return null
  return {
    location_id: String(locationId),
    name: String(name),
    label_ar: COUNTRY_AR[code] || String(name),
    region_code: code,
    level: String(row.level || row.region_level || 'COUNTRY'),
  }
}

function sortLocations(items: TargetLocation[]) {
  return [...items].sort((a, b) => {
    const ai = PRIORITY_CODES.indexOf(a.region_code)
    const bi = PRIORITY_CODES.indexOf(b.region_code)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return a.name.localeCompare(b.name)
  })
}

export async function fetchCountryLocations(
  connection: Connection,
  goal: AdGoal
): Promise<{ items: TargetLocation[]; cached: boolean; error?: string }> {
  const key = cacheKey(connection.advertiser_id, goal)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { items: hit.items, cached: true }
  }

  const params = goalRegionParams(goal)
  const extra: Record<string, string> = {
    placements: JSON.stringify(['PLACEMENT_TIKTOK']),
    objective_type: params.objective_type,
    level_range: 'TO_COUNTRY',
  }
  if ('promotion_target_type' in params && params.promotion_target_type) {
    extra.promotion_target_type = params.promotion_target_type
  }

  const json = await tiktokGet(connection, '/tool/region/', extra)
  if (json.code !== 0) {
    return { items: [], cached: false, error: json.message }
  }

  const data = getTikTokDataRecord(json.data)
  const list = (data.region_info || data.list || []) as Record<string, unknown>[]
  const items = sortLocations(
    list
      .map(mapRegionRow)
      .filter((x): x is TargetLocation => x != null)
      .filter(l => l.level === 'COUNTRY' || !l.level)
  )

  cache.set(key, { at: Date.now(), items })
  return { items, cached: false }
}

export async function searchTargetLocations(
  connection: Connection,
  goal: AdGoal,
  query: string
): Promise<{ items: TargetLocation[]; error?: string }> {
  const q = query.trim()
  if (!q) return { items: [] }

  const params = goalRegionParams(goal)
  const body: Record<string, unknown> = {
    advertiser_id: connection.advertiser_id,
    search_type: 'FUZZY_SEARCH',
    keywords: [q],
    geo_types: ['COUNTRY', 'PROVINCE', 'CITY'],
    placements: ['PLACEMENT_TIKTOK'],
    objective_type: params.objective_type,
  }
  if (goal === 'leads') {
    body.promotion_type = 'LEAD_GENERATION'
  }

  const json = await tiktokPost(connection, '/tool/targeting/search/', body)
  if (json.code !== 0) {
    return { items: [], error: json.message }
  }

  const data = getTikTokDataRecord(json.data)
  const tags = (data.targeting_tag_list || []) as Record<string, unknown>[]
  const items = tags
    .map(tag => {
      const geo = tag.geo as Record<string, unknown> | undefined
      if (!geo?.geo_id) return null
      const code = String(geo.region_code || '').toUpperCase()
      const name = String(tag.name || geo.description || code)
      return {
        location_id: String(geo.geo_id),
        name,
        label_ar: COUNTRY_AR[code] || name,
        region_code: code,
        level: String(geo.geo_type || 'GEO'),
      } satisfies TargetLocation
    })
    .filter((x): x is TargetLocation => x != null)

  return { items }
}

/** Clear cache (e.g. after account switch). */
export function clearLocationCache(advertiserId?: string) {
  if (!advertiserId) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${advertiserId}:`)) cache.delete(key)
  }
}
