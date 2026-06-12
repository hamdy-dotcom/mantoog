import { TIKTOK, resolveActiveConnection } from '@/lib/tiktok/server'
import type { BidField, EntityLevel } from '@/lib/tiktok/types'

type Connection = { advertiser_id: string; access_token: string }

export async function resolveOrThrow() {
  const resolved = await resolveActiveConnection()
  if ('error' in resolved) {
    const err = new Error(resolved.error) as Error & { status?: number }
    err.status = resolved.status
    throw err
  }
  return resolved
}

export async function tiktokPost(connection: Connection, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${TIKTOK}${path}`, {
    method: 'POST',
    headers: {
      'Access-Token': connection.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ advertiser_id: connection.advertiser_id, ...body }),
  })
  return res.json()
}

export async function tiktokGet(connection: Connection, path: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    advertiser_id: connection.advertiser_id,
    page_size: '100',
    ...extra,
  })
  const res = await fetch(`${TIKTOK}${path}?${params}`, {
    headers: { 'Access-Token': connection.access_token },
  })
  return res.json()
}

const RENAME_CFG: Partial<Record<EntityLevel, { path: string; idKey: string; nameKey: string }>> = {
  campaigns: { path: '/campaign/update/', idKey: 'campaign_id', nameKey: 'campaign_name' },
  adgroups: { path: '/adgroup/update/', idKey: 'adgroup_id', nameKey: 'adgroup_name' },
  ads: { path: '/ad/update/', idKey: 'ad_id', nameKey: 'ad_name' },
}

const TOGGLE_CFG: Partial<Record<EntityLevel, { path: string; idsKey: string }>> = {
  campaigns: { path: '/campaign/status/update/', idsKey: 'campaign_ids' },
  adgroups: { path: '/adgroup/status/update/', idsKey: 'adgroup_ids' },
  ads: { path: '/ad/status/update/', idsKey: 'ad_ids' },
}

const BUDGET_CFG: Partial<Record<EntityLevel, { path: string; idKey: string }>> = {
  campaigns: { path: '/campaign/update/', idKey: 'campaign_id' },
  adgroups: { path: '/adgroup/update/', idKey: 'adgroup_id' },
}

const CREATE_STRIP = new Set([
  'campaign_id', 'adgroup_id', 'ad_id', 'create_time', 'modify_time',
  'status', 'secondary_status', 'is_new_structure', 'opt_status',
])

export async function renameEntity(
  connection: Connection,
  level: EntityLevel,
  entityId: string,
  name: string,
  isSmartPlus = false
) {
  if (!name.trim()) return { error: 'invalid_level' as const }

  if (level === 'campaigns' && isSmartPlus) {
    const json = await tiktokPost(connection, '/smart_plus/campaign/update/', {
      campaign_id: entityId,
      campaign_name: name.trim(),
    })
    if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
    return { ok: true as const }
  }

  const cfg = RENAME_CFG[level]
  if (!cfg) return { error: 'invalid_level' as const }
  const json = await tiktokPost(connection, cfg.path, {
    [cfg.idKey]: entityId,
    [cfg.nameKey]: name.trim(),
  })
  if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
  return { ok: true as const }
}

export async function updateBid(
  connection: Connection,
  level: EntityLevel,
  entityId: string,
  bidValue: number,
  opts?: {
    isSmartPlus?: boolean
    bidField?: BidField | null
    bidType?: string | null
    deepBidType?: string | null
  }
) {
  const bidField = opts?.bidField || 'bid_price'

  if (level === 'campaigns') {
    const path = opts?.isSmartPlus ? '/smart_plus/campaign/update/' : '/campaign/update/'
    const json = await tiktokPost(connection, path, {
      campaign_id: entityId,
      [bidField]: bidValue,
    })
    if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
    return { ok: true as const }
  }

  if (level === 'adgroups') {
    const body: Record<string, unknown> = {
      adgroup_id: entityId,
      [bidField]: bidValue,
    }
    if (opts?.bidType) body.bid_type = opts.bidType
    if (opts?.deepBidType) body.deep_bid_type = opts.deepBidType
    const json = await tiktokPost(connection, '/adgroup/update/', body)
    if (json.code !== 0) {
      console.warn('[tiktok/adgroup/update] bid rejected:', json.code, json.message, JSON.stringify(body))
      return { error: 'tiktok_error' as const, message: json.message, code: json.code }
    }
    return { ok: true as const }
  }

  return { error: 'invalid_level' as const }
}

export async function updateSchedule(
  connection: Connection,
  adgroupId: string,
  schedule_start_time: string,
  schedule_end_time: string
) {
  const json = await tiktokPost(connection, '/adgroup/update/', {
    adgroup_id: adgroupId,
    schedule_start_time,
    schedule_end_time,
  })
  if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
  return { ok: true as const }
}

export async function updateBudget(
  connection: Connection,
  level: EntityLevel,
  entityId: string,
  budget: number,
  isSmartPlus = false
) {
  if (level === 'campaigns' && isSmartPlus) {
    const json = await tiktokPost(connection, '/smart_plus/campaign/update/', {
      campaign_id: entityId,
      budget,
    })
    if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
    return { ok: true as const }
  }

  const cfg = BUDGET_CFG[level]
  if (!cfg) return { error: 'budget_not_supported' as const }
  const json = await tiktokPost(connection, cfg.path, {
    [cfg.idKey]: entityId,
    budget,
  })
  if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
  return { ok: true as const }
}

export async function toggleEntities(
  connection: Connection,
  level: EntityLevel,
  entityIds: string[],
  status: 'ENABLE' | 'DISABLE',
  smartPlusIds?: Set<string> | string[]
) {
  if (!entityIds.length) return { error: 'invalid_level' as const }

  const smartSet = smartPlusIds instanceof Set
    ? smartPlusIds
    : new Set(smartPlusIds || [])

  if (level === 'campaigns' && smartSet.size) {
    const smartIds = entityIds.filter(id => smartSet.has(id))
    const regularIds = entityIds.filter(id => !smartSet.has(id))

    if (smartIds.length) {
      const json = await tiktokPost(connection, '/smart_plus/campaign/status/update/', {
        campaign_ids: smartIds,
        operation_status: status,
      })
      if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
    }

    if (regularIds.length) {
      const cfg = TOGGLE_CFG.campaigns!
      const json = await tiktokPost(connection, cfg.path, {
        [cfg.idsKey]: regularIds,
        operation_status: status,
      })
      if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
    }

    return { ok: true as const }
  }

  const cfg = TOGGLE_CFG[level]
  if (!cfg) return { error: 'invalid_level' as const }
  const json = await tiktokPost(connection, cfg.path, {
    [cfg.idsKey]: entityIds,
    operation_status: status,
  })
  if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
  return { ok: true as const }
}

function stripForCreate(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (CREATE_STRIP.has(k) || v === null || v === undefined) continue
    out[k] = v
  }
  return out
}

export async function duplicateEntity(
  connection: Connection,
  level: EntityLevel,
  entityId: string,
  isSmartPlus = false
) {
  if (level === 'campaigns') {
    const getJson = await tiktokGet(connection, '/campaign/get/', {
      filtering: JSON.stringify({ campaign_ids: [entityId] }),
    })
    if (getJson.code !== 0) return { error: 'tiktok_error' as const, message: getJson.message }
    const src = getJson.data?.list?.[0]
    if (!src) return { error: 'not_found' as const }

    if (isSmartPlus) {
      return { error: 'smart_plus_not_supported' as const, message: 'Duplicate is not supported for Smart+ campaigns via API' }
    }

    const payload = stripForCreate({
      ...src,
      campaign_name: `Copy of ${src.campaign_name || 'Campaign'}`,
    })
    const json = await tiktokPost(connection, '/campaign/create/', payload)
    if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
    const newId = json.data?.campaign_id || json.data?.campaign_ids?.[0]
    return { ok: true as const, entity_id: String(newId || ''), name: payload.campaign_name as string }
  }

  if (level === 'adgroups') {
    if (isSmartPlus) {
      return { error: 'smart_plus_not_supported' as const, message: 'Duplicate is not supported for Smart+ ad groups via API' }
    }

    const getJson = await tiktokGet(connection, '/adgroup/get/', {
      filtering: JSON.stringify({ adgroup_ids: [entityId] }),
    })
    if (getJson.code !== 0) return { error: 'tiktok_error' as const, message: getJson.message }
    const src = getJson.data?.list?.[0]
    if (!src) return { error: 'not_found' as const }

    const payload = stripForCreate({
      ...src,
      adgroup_name: `Copy of ${src.adgroup_name || 'Ad group'}`,
    })
    const json = await tiktokPost(connection, '/adgroup/create/', payload)
    if (json.code !== 0) return { error: 'tiktok_error' as const, message: json.message, code: json.code }
    const newId = json.data?.adgroup_id || json.data?.adgroup_ids?.[0]
    return { ok: true as const, entity_id: String(newId || ''), name: payload.adgroup_name as string }
  }

  return { error: 'duplicate_not_supported' as const }
}
