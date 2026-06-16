import { getTikTokDataRecord, tiktokPost } from '@/lib/tiktok/mutations'
import { TIKTOK } from '@/lib/tiktok/server'
import type { AdGoal } from '@/lib/tiktok/create-ad/types'
import { AGE_OPTIONS } from '@/lib/tiktok/create-ad/types'
import type { TargetLocation } from '@/lib/tiktok/targeting/locations'
import { fetchCountryLocations } from '@/lib/tiktok/targeting/locations'
import { detectSmartPlus } from '@/lib/tiktok/types'

type Connection = { advertiser_id: string; access_token: string }

export type DuplicateScaleMode = 'clone_boost' | 'clone_expand'

export type DuplicateScaleContext = {
  source_name: string
  objective_type: string
  goal: AdGoal
  is_cbo: boolean
  location_ids: string[]
  age_groups: string[]
  gender: string
  locations: TargetLocation[]
  suggested_location_id: string | null
  suggested_age_groups: string[]
  default_budget: number | null
}

export type DuplicateScaleOptions = {
  mode: DuplicateScaleMode
  budget: number
  location_ids?: string[]
  age_groups?: string[]
}

const CREATE_STRIP = new Set([
  'campaign_id', 'adgroup_id', 'ad_id', 'create_time', 'modify_time',
  'status', 'secondary_status', 'is_new_structure', 'opt_status',
  'campaign_name', 'adgroup_name',
])

const CAMPAIGN_FIELDS = [
  'campaign_id', 'campaign_name', 'objective_type', 'budget', 'budget_mode',
  'budget_optimize_on', 'operation_status', 'is_smart_performance_campaign',
  'campaign_automation_type', 'campaign_type',
]

const ADGROUP_FIELDS = [
  'adgroup_id', 'adgroup_name', 'campaign_id', 'budget', 'budget_mode',
  'operation_status', 'placement_type', 'placements', 'promotion_type',
  'promotion_target_type', 'optimization_goal', 'billing_event', 'bid_type',
  'bid_price', 'conversion_bid_price', 'deep_bid_type', 'deep_cpa_bid',
  'pacing', 'schedule_type', 'schedule_start_time', 'schedule_end_time',
  'location_ids', 'age_groups', 'gender', 'languages', 'pixel_id',
  'external_action', 'page_id', 'landing_page_url',
]

async function tiktokGetWithFields(
  connection: Connection,
  path: string,
  extra: Record<string, string> = {},
  fields?: string[]
) {
  const params = new URLSearchParams({
    advertiser_id: connection.advertiser_id,
    page_size: '50',
    ...extra,
  })
  if (fields?.length) params.set('fields', JSON.stringify(fields))
  const res = await fetch(`${TIKTOK}${path}?${params}`, {
    headers: { 'Access-Token': connection.access_token },
  })
  return res.json()
}

function stripForCreate(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (CREATE_STRIP.has(k) || v === null || v === undefined) continue
    out[k] = v
  }
  return out
}

function objectiveToGoal(objective: string): AdGoal {
  const o = objective.toUpperCase()
  if (o.includes('LEAD')) return 'leads'
  if (o.includes('CONVERSION') || o.includes('SALES') || o.includes('WEB')) return 'orders'
  return 'visits'
}

function scaledCloneName(originalName: string): string {
  const date = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const base = originalName.replace(/\s*-\s*Scaled\s*-.*$/i, '').trim()
  return `${base} - Scaled - ${date}`
}

function suggestBroaderAges(current: string[]): string[] {
  const order = AGE_OPTIONS.map(a => a.id)
  if (current.length >= 4) return [...current]
  const indices = current.map(a => order.indexOf(a)).filter(i => i >= 0)
  if (!indices.length) return ['AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54']
  const min = Math.min(...indices)
  const max = Math.max(...indices)
  const lo = Math.max(0, min - 1)
  const hi = Math.min(order.length - 1, max + 1)
  return order.slice(lo, hi + 1)
}

function suggestBroaderLocation(
  currentIds: string[],
  allLocations: TargetLocation[]
): string | null {
  if (currentIds.length >= 3) return null
  const current = allLocations.filter(l => currentIds.includes(l.location_id))
  const neighbors: Record<string, string> = {
    EG: 'SA', SA: 'AE', AE: 'SA', KW: 'SA', QA: 'SA', BH: 'SA', OM: 'SA',
  }
  const code = current[0]?.region_code
  const nextCode = code ? neighbors[code] || 'SA' : 'SA'
  const alt = allLocations.find(
    l => l.region_code === nextCode && !currentIds.includes(l.location_id)
  )
  return (
    alt?.location_id
    || allLocations.find(l => !currentIds.includes(l.location_id))?.location_id
    || null
  )
}

type SourcePair = {
  campaign: Record<string, unknown>
  adgroup: Record<string, unknown>
  campaignId: string
  adgroupId: string
}

type SourcePairError = {
  error: 'tiktok_error' | 'not_found' | 'smart_plus_not_supported'
  message?: string
  code?: number
}

async function resolveSourcePair(
  connection: Connection,
  scaleLevel: 'campaigns' | 'adgroups',
  entityId: string
): Promise<SourcePair | SourcePairError> {
  if (scaleLevel === 'adgroups') {
    const agJson = await tiktokGetWithFields(
      connection,
      '/adgroup/get/',
      { filtering: JSON.stringify({ adgroup_ids: [entityId] }) },
      ADGROUP_FIELDS
    )
    if (agJson.code !== 0) {
      return { error: 'tiktok_error' as const, message: agJson.message, code: agJson.code }
    }
    const adgroup = agJson.data?.list?.[0] as Record<string, unknown> | undefined
    if (!adgroup) return { error: 'not_found' as const }

    const campaignId = String(adgroup.campaign_id || '')
    const campJson = await tiktokGetWithFields(
      connection,
      '/campaign/get/',
      { filtering: JSON.stringify({ campaign_ids: [campaignId] }) },
      CAMPAIGN_FIELDS
    )
    if (campJson.code !== 0) {
      return { error: 'tiktok_error' as const, message: campJson.message, code: campJson.code }
    }
    const campaign = campJson.data?.list?.[0] as Record<string, unknown> | undefined
    if (!campaign) return { error: 'not_found' as const }
    return { campaign, adgroup, campaignId, adgroupId: entityId }
  }

  const campJson = await tiktokGetWithFields(
    connection,
    '/campaign/get/',
    { filtering: JSON.stringify({ campaign_ids: [entityId] }) },
    CAMPAIGN_FIELDS
  )
  if (campJson.code !== 0) {
    return { error: 'tiktok_error' as const, message: campJson.message, code: campJson.code }
  }
  const campaign = campJson.data?.list?.[0] as Record<string, unknown> | undefined
  if (!campaign) return { error: 'not_found' as const }

  const agJson = await tiktokGetWithFields(
    connection,
    '/adgroup/get/',
    { filtering: JSON.stringify({ campaign_ids: [entityId] }) },
    ADGROUP_FIELDS
  )
  if (agJson.code !== 0) {
    return { error: 'tiktok_error' as const, message: agJson.message, code: agJson.code }
  }
  const adgroups = (agJson.data?.list || []) as Record<string, unknown>[]
  const adgroup = adgroups.find(g => String(g.operation_status || '') !== 'DELETE') || adgroups[0]
  if (!adgroup) return { error: 'not_found' as const, message: 'No ad group on campaign' }

  return {
    campaign,
    adgroup,
    campaignId: entityId,
    adgroupId: String(adgroup.adgroup_id || ''),
  }
}

export async function fetchDuplicateScaleContext(
  connection: Connection,
  scaleLevel: 'campaigns' | 'adgroups',
  entityId: string,
  currentBudget: number | null
): Promise<DuplicateScaleContext | { error: string; message?: string; code?: number }> {
  const pair = await resolveSourcePair(connection, scaleLevel, entityId)
  if ('error' in pair) return pair

  const { campaign, adgroup } = pair
  if (detectSmartPlus(campaign)) {
    return { error: 'smart_plus_not_supported', message: 'Smart+ campaigns cannot be duplicated via API' }
  }

  const objective = String(campaign.objective_type || 'TRAFFIC')
  const goal = objectiveToGoal(objective)
  const locResult = await fetchCountryLocations(connection, goal)
  const locationIds = (adgroup.location_ids as string[] | undefined) || []
  const ageGroups = (adgroup.age_groups as string[] | undefined) || []
  const isCbo = Boolean(campaign.budget_optimize_on)

  const sourceName = scaleLevel === 'campaigns'
    ? String(campaign.campaign_name || 'Campaign')
    : String(adgroup.adgroup_name || 'Ad group')

  const base = currentBudget && currentBudget > 0
    ? currentBudget
    : isCbo
      ? Number(campaign.budget) || null
      : Number(adgroup.budget) || null

  return {
    source_name: sourceName,
    objective_type: objective,
    goal,
    is_cbo: isCbo,
    location_ids: locationIds.map(String),
    age_groups: ageGroups.map(String),
    gender: String(adgroup.gender || 'GENDER_UNLIMITED'),
    locations: locResult.items,
    suggested_location_id: suggestBroaderLocation(locationIds.map(String), locResult.items),
    suggested_age_groups: suggestBroaderAges(ageGroups.map(String)),
    default_budget: base != null && base > 0 ? Math.round(base * 1.5) : null,
  }
}

async function deleteCampaign(connection: Connection, campaignId: string) {
  return tiktokPost(connection, '/campaign/status/update/', {
    campaign_ids: [campaignId],
    operation_status: 'DELETE',
  })
}

async function deleteAdgroup(connection: Connection, adgroupId: string) {
  return tiktokPost(connection, '/adgroup/status/update/', {
    adgroup_ids: [adgroupId],
    operation_status: 'DELETE',
  })
}

async function rollbackClone(
  connection: Connection,
  ids: { campaignId?: string; adgroupId?: string }
) {
  if (ids.adgroupId) await deleteAdgroup(connection, ids.adgroupId)
  if (ids.campaignId) await deleteCampaign(connection, ids.campaignId)
}

export type DuplicateScaleSuccess = {
  ok: true
  campaign_id: string
  adgroup_id: string
  campaign_name: string
  adgroup_name: string
  budget: number
  budget_level: 'campaigns' | 'adgroups'
  entity_id: string
  mode: DuplicateScaleMode
}

export type DuplicateScaleFailure = {
  error: 'tiktok_error' | 'not_found' | 'smart_plus_not_supported'
  message?: string
  code?: number
}

export async function duplicateToScale(
  connection: Connection,
  scaleLevel: 'campaigns' | 'adgroups',
  entityId: string,
  opts: DuplicateScaleOptions
): Promise<DuplicateScaleSuccess | DuplicateScaleFailure> {
  const pair = await resolveSourcePair(connection, scaleLevel, entityId)
  if ('error' in pair) return pair

  const { campaign, adgroup } = pair
  if (detectSmartPlus(campaign)) {
    return {
      error: 'smart_plus_not_supported' as const,
      message: 'Smart+ campaigns cannot be duplicated via API',
    }
  }

  const isCbo = Boolean(campaign.budget_optimize_on)
  const sourceName = scaleLevel === 'campaigns'
    ? String(campaign.campaign_name || 'Campaign')
    : String(adgroup.adgroup_name || 'Ad group')
  const cloneCampaignName = scaledCloneName(sourceName)
  const cloneAdgroupName = `${cloneCampaignName} - Ad group`

  const campaignPayload = stripForCreate({
    ...campaign,
    campaign_name: cloneCampaignName,
    operation_status: 'ENABLE',
  })

  if (isCbo) {
    campaignPayload.budget = opts.budget
    campaignPayload.budget_mode = campaign.budget_mode || 'BUDGET_MODE_DAY'
  }

  const campJson = await tiktokPost(connection, '/campaign/create/', campaignPayload)
  if (campJson.code !== 0) {
    return { error: 'tiktok_error' as const, message: campJson.message, code: campJson.code }
  }

  const campData = getTikTokDataRecord(campJson.data)
  const newCampaignId = String(
    campData.campaign_id || (campData.campaign_ids as unknown[] | undefined)?.[0] || ''
  )
  if (!newCampaignId) {
    return { error: 'tiktok_error' as const, message: 'No campaign_id in create response' }
  }

  const adgroupPayload = stripForCreate({
    ...adgroup,
    campaign_id: newCampaignId,
    adgroup_name: cloneAdgroupName,
    operation_status: 'ENABLE',
  })

  if (opts.mode === 'clone_expand') {
    if (opts.location_ids?.length) adgroupPayload.location_ids = opts.location_ids
    if (opts.age_groups?.length) adgroupPayload.age_groups = opts.age_groups
  }

  if (!isCbo) {
    adgroupPayload.budget = opts.budget
    adgroupPayload.budget_mode = adgroup.budget_mode || 'BUDGET_MODE_DAY'
  } else {
    delete adgroupPayload.budget
  }

  const agJson = await tiktokPost(connection, '/adgroup/create/', adgroupPayload)
  if (agJson.code !== 0) {
    await rollbackClone(connection, { campaignId: newCampaignId })
    return { error: 'tiktok_error' as const, message: agJson.message, code: agJson.code }
  }

  const agData = getTikTokDataRecord(agJson.data)
  const newAdgroupId = String(
    agData.adgroup_id || (agData.adgroup_ids as unknown[] | undefined)?.[0] || ''
  )
  if (!newAdgroupId) {
    await rollbackClone(connection, { campaignId: newCampaignId })
    return { error: 'tiktok_error' as const, message: 'No adgroup_id in create response' }
  }

  return {
    ok: true as const,
    campaign_id: newCampaignId,
    adgroup_id: newAdgroupId,
    campaign_name: cloneCampaignName,
    adgroup_name: cloneAdgroupName,
    budget: opts.budget,
    budget_level: isCbo ? ('campaigns' as const) : ('adgroups' as const),
    entity_id: isCbo ? newCampaignId : newAdgroupId,
    mode: opts.mode,
  }
}
