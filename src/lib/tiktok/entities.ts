import {
  TIKTOK, campaignPageSize, fetchIntegratedReport, num, resolveAdvertiserCurrency, tiktokApiFailure,
} from '@/lib/tiktok/server'
import {
  detectSmartPlus,
  type BidField,
  type BudgetLabel,
  type EntityDaily,
  type EntityLevel,
  type EntityRow,
} from '@/lib/tiktok/types'

export type { CampaignData, EntityDaily, EntityLevel, EntityRow } from '@/lib/tiktok/types'
export { tiktokAdsManagerUrl } from '@/lib/tiktok/types'

const VIDEO_METRICS = [
  'spend', 'impressions', 'clicks', 'ctr', 'conversion', 'cost_per_conversion',
  'conversion_rate', 'cpc', 'cpm',
  'video_play_actions', 'video_watched_2s', 'average_video_play',
]

type BudgetMeta = {
  budget: number | null
  budget_mode: string | null
  budget_label: 'cbo' | 'abo' | null
  budget_editable: boolean
}

type BidMeta = {
  bid_price: number | null
  bid_type: string | null
  bid_field: BidField | null
  bid_editable: boolean
  schedule_start_time: string | null
  schedule_end_time: string | null
}

type Meta = {
  name: string
  objective: string | null
  operation_status: string | null
  is_smart_plus: boolean
} & BudgetMeta & BidMeta

/** Core fields — must always be requested (invalid names in `fields` break the whole /campaign/get/ call). */
const CAMPAIGN_CORE_FIELDS = [
  'campaign_id', 'campaign_name', 'budget', 'budget_mode', 'budget_optimize_on',
  'operation_status', 'objective_type', 'is_smart_performance_campaign',
  'campaign_automation_type', 'campaign_type',
]

/** Documented campaign-level bid fields (bid_price / conversion_bid_price are ad-group fields). */
const CAMPAIGN_BID_FIELDS = ['bid_type', 'roas_bid', 'deep_bid_type']

const CAMPAIGN_META_FIELDS = [...CAMPAIGN_CORE_FIELDS, ...CAMPAIGN_BID_FIELDS]

let campaignGetSampleLogged = false

async function fetchCampaignGet(
  connection: { advertiser_id: string; access_token: string },
  extra: Record<string, string> = {},
  fields: string[] = CAMPAIGN_META_FIELDS
) {
  let json = await tiktokGet(connection, '/campaign/get/', extra, fields)
  if (json.code !== 0 && fields.length > CAMPAIGN_CORE_FIELDS.length) {
    console.warn('[tiktok/campaign/get] extended fields failed, retrying core only:', json.code, json.message)
    json = await tiktokGet(connection, '/campaign/get/', extra, CAMPAIGN_CORE_FIELDS)
  }
  if (json.code !== 0) {
    console.warn('[tiktok/campaign/get] error:', json.code, json.message)
  } else if (!campaignGetSampleLogged) {
    const sample = json.data?.list?.[0]
    if (sample) {
      campaignGetSampleLogged = true
      console.log('[tiktok/campaign/get] sample campaign keys:', Object.keys(sample).join(', '))
      console.log('[tiktok/campaign/get] sample campaign:', JSON.stringify(sample))
    }
  }
  return json
}

const BID_EDITABLE_TYPES = new Set(['BID_TYPE_CUSTOM', 'BID_TYPE_MAX_CONVERSION'])
const MAX_DELIVERY_BID_TYPES = new Set(['BID_TYPE_NO_BID', ''])

const ADGROUP_CORE_FIELDS = [
  'adgroup_id', 'adgroup_name', 'campaign_id', 'budget', 'budget_mode', 'scheduled_budget',
  'operation_status', 'optimization_goal', 'promotion_type',
  'schedule_start_time', 'schedule_end_time',
]

const ADGROUP_OWN_BUDGET_MODES = new Set([
  'BUDGET_MODE_DAY',
  'BUDGET_MODE_TOTAL',
  'BUDGET_MODE_DYNAMIC_DAILY_BUDGET',
])

const ADGROUP_BID_FIELDS = [
  'bid_type', 'bid_price', 'conversion_bid_price', 'deep_bid_type', 'deep_cpa_bid',
]

const ADGROUP_META_FIELDS = [...ADGROUP_CORE_FIELDS, ...ADGROUP_BID_FIELDS]

let adgroupGetSampleLogged = false

async function fetchAdgroupGet(
  connection: { advertiser_id: string; access_token: string },
  extra: Record<string, string> = {},
  fields: string[] = ADGROUP_META_FIELDS
) {
  let json = await tiktokGet(connection, '/adgroup/get/', extra, fields)
  if (json.code !== 0 && fields.length > ADGROUP_CORE_FIELDS.length) {
    console.warn('[tiktok/adgroup/get] extended fields failed, retrying core only:', json.code, json.message)
    json = await tiktokGet(connection, '/adgroup/get/', extra, ADGROUP_CORE_FIELDS)
  }
  if (json.code !== 0) {
    console.warn('[tiktok/adgroup/get] error:', json.code, json.message)
  } else if (!adgroupGetSampleLogged) {
    const sample = json.data?.list?.[0]
    if (sample) {
      adgroupGetSampleLogged = true
      console.log('[tiktok/adgroup/get] sample adgroup keys:', Object.keys(sample).join(', '))
      console.log('[tiktok/adgroup/get] sample adgroup:', JSON.stringify(sample))
    }
  }
  return json
}

/** Pick the first populated bid value (TikTok uses different fields per bid strategy). */
function pickBidValue(g: Record<string, unknown>): { price: number; field: BidField } | null {
  const candidates: { field: BidField; value: unknown }[] = [
    { field: 'bid_price', value: g.bid_price },
    { field: 'conversion_bid_price', value: g.conversion_bid_price },
    { field: 'deep_cpa_bid', value: g.deep_cpa_bid },
    { field: 'roas_bid', value: g.roas_bid },
  ]
  for (const { field, value } of candidates) {
    const n = value != null ? num(value) : null
    if (n != null && n > 0) return { price: n, field }
  }
  return null
}

function parseAdgroupBid(g: Record<string, unknown>): BidMeta {
  const bidType = String(g.bid_type || '')
  const picked = pickBidValue(g)
  const schedule = {
    schedule_start_time: g.schedule_start_time ? String(g.schedule_start_time) : null,
    schedule_end_time: g.schedule_end_time ? String(g.schedule_end_time) : null,
  }

  if (!picked) {
    return { ...noBidMeta, ...schedule }
  }

  return {
    bid_price: picked.price,
    bid_type: bidType || null,
    bid_field: picked.field,
    bid_editable: true,
    ...schedule,
  }
}

/** Campaign-level bid applies only under CBO with a cost-cap / ROAS target set on the campaign. */
function parseCampaignBid(c: Record<string, unknown>): BidMeta {
  const empty: BidMeta = {
    bid_price: null,
    bid_type: null,
    bid_field: null,
    bid_editable: false,
    schedule_start_time: null,
    schedule_end_time: null,
  }

  const cbo = c.budget_optimize_on === true || c.budget_optimize_on === 'true' || c.budget_optimize_on === 1
  if (!cbo) return empty

  const bidType = String(c.bid_type || '')
  if (MAX_DELIVERY_BID_TYPES.has(bidType)) return empty

  const picked = pickBidValue(c)
  if (!picked) return empty
  const { price, field: bidField } = picked

  const editable = bidField === 'roas_bid' || BID_EDITABLE_TYPES.has(bidType)

  return {
    bid_price: price,
    bid_type: bidType || null,
    bid_field: bidField,
    bid_editable: editable,
    schedule_start_time: null,
    schedule_end_time: null,
  }
}

function parseCampaignBudget(c: Record<string, unknown>): BudgetMeta {
  const budgetMode = String(c.budget_mode || '')
  const budget = c.budget != null ? num(c.budget) : null
  const cbo = c.budget_optimize_on === true || c.budget_optimize_on === 'true' || c.budget_optimize_on === 1

  if (cbo) {
    const hasBudget = budgetMode !== 'BUDGET_MODE_INFINITE' && budget != null && budget > 0
    return {
      budget: hasBudget ? budget : null,
      budget_mode: budgetMode || null,
      budget_label: hasBudget ? null : 'cbo',
      budget_editable: hasBudget,
    }
  }
  return {
    budget: null,
    budget_mode: budgetMode || null,
    budget_label: 'abo',
    budget_editable: false,
  }
}

function isCampaignCbo(c: Record<string, unknown> | undefined): boolean {
  if (!c) return false
  return c.budget_optimize_on === true || c.budget_optimize_on === 'true' || c.budget_optimize_on === 1
}

function parseAdgroupBudget(
  g: Record<string, unknown>,
  parentCampaign?: Record<string, unknown>
): BudgetMeta {
  const budgetMode = String(g.budget_mode || '')
  const budget = g.budget != null ? num(g.budget) : null
  const scheduled = g.scheduled_budget != null ? num(g.scheduled_budget) : null
  const amount = budget != null && budget > 0
    ? budget
    : scheduled != null && scheduled > 0
      ? scheduled
      : null

  if (budgetMode === 'BUDGET_MODE_INFINITE') {
    return {
      budget: null,
      budget_mode: budgetMode,
      budget_label: null,
      budget_editable: false,
    }
  }

  if (amount != null && ADGROUP_OWN_BUDGET_MODES.has(budgetMode)) {
    return {
      budget: amount,
      budget_mode: budgetMode,
      budget_label: null,
      budget_editable: true,
    }
  }

  if (amount != null && amount > 0) {
    return {
      budget: amount,
      budget_mode: budgetMode || null,
      budget_label: null,
      budget_editable: false,
    }
  }

  if (isCampaignCbo(parentCampaign)) {
    return {
      budget: null,
      budget_mode: budgetMode || null,
      budget_label: 'cbo',
      budget_editable: false,
    }
  }

  return {
    budget: null,
    budget_mode: budgetMode || null,
    budget_label: null,
    budget_editable: false,
  }
}

const noBudget: BudgetMeta = {
  budget: null,
  budget_mode: null,
  budget_label: null,
  budget_editable: false,
}

const noBidMeta: BidMeta = {
  bid_price: null,
  bid_type: null,
  bid_field: null,
  bid_editable: false,
  schedule_start_time: null,
  schedule_end_time: null,
}

type Agg = {
  spend: number
  conversions: number
  clicks: number
  impressions: number
  ctrSum: number
  cpaSum: number
  cvrSum: number
  cvrDays: number
  cpcSum: number
  cpcDays: number
  cpmSum: number
  cpmDays: number
  days: number
  daily: EntityDaily[]
  video_views: number
  video_2s_views: number
  watchSum: number
  watchDays: number
}

function emptyAgg(): Agg {
  return {
    spend: 0, conversions: 0, clicks: 0, impressions: 0,
    ctrSum: 0, cpaSum: 0, cvrSum: 0, cvrDays: 0, cpcSum: 0, cpcDays: 0, cpmSum: 0, cpmDays: 0,
    days: 0, daily: [],
    video_views: 0, video_2s_views: 0, watchSum: 0, watchDays: 0,
  }
}

function finalizeRateMetrics(agg: Agg) {
  const cvr = agg.cvrDays > 0
    ? agg.cvrSum / agg.cvrDays
    : agg.clicks > 0
      ? (agg.conversions / agg.clicks) * 100
      : null
  const cpc = agg.cpcDays > 0
    ? agg.cpcSum / agg.cpcDays
    : agg.clicks > 0
      ? agg.spend / agg.clicks
      : null
  const cpm = agg.cpmDays > 0
    ? agg.cpmSum / agg.cpmDays
    : agg.impressions > 0
      ? (agg.spend / agg.impressions) * 1000
      : null
  return { cvr, cpc, cpm }
}

async function tiktokGet(
  connection: { advertiser_id: string; access_token: string },
  path: string,
  extra: Record<string, string> = {},
  fields?: string[]
) {
  const params = new URLSearchParams({
    advertiser_id: connection.advertiser_id,
    page_size: '1000',
    ...extra,
  })
  if (fields?.length) params.set('fields', JSON.stringify(fields))
  const res = await fetch(`${TIKTOK}${path}?${params}`, {
    headers: { 'Access-Token': connection.access_token },
  })
  return res.json()
}

async function resolveCampaignMetaById(
  connection: { advertiser_id: string; access_token: string },
  campaignIds: string[]
): Promise<Record<string, Record<string, unknown>>> {
  const map: Record<string, Record<string, unknown>> = {}
  if (!campaignIds.length) return map
  const unique = [...new Set(campaignIds.filter(Boolean))]
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100)
    const json = await fetchCampaignGet(
      connection,
      { filtering: JSON.stringify({ campaign_ids: chunk }) }
    )
    if (json.code !== 0) continue
    for (const c of json.data?.list || []) {
      map[String(c.campaign_id)] = c
    }
  }
  return map
}

async function resolveSmartPlusCampaignIds(
  connection: { advertiser_id: string; access_token: string },
  campaignIds: string[]
): Promise<Set<string>> {
  const smart = new Set<string>()
  const map = await resolveCampaignMetaById(connection, campaignIds)
  for (const [id, c] of Object.entries(map)) {
    if (detectSmartPlus(c)) smart.add(id)
  }
  return smart
}

function applySmartPlusChildLocks(meta: Meta): Meta {
  if (!meta.is_smart_plus) return meta
  return {
    ...meta,
    budget_editable: false,
    bid_editable: false,
    budget_label: meta.budget_label ?? 'cbo',
  }
}

function aggregateRows(
  list: any[],
  idKey: string,
  sparkKey: 'conversion' | 'video_play_actions' = 'conversion',
  entityId?: string | null
) {
  const byId: Record<string, Agg> = {}

  for (const row of list) {
    const id = String(row.dimensions?.[idKey] || '')
    if (!id || (entityId && id !== entityId)) continue
    const date = String(row.dimensions?.stat_time_day || '').slice(0, 10)
    if (!byId[id]) byId[id] = emptyAgg()

    const agg = byId[id]
    const m = row.metrics || {}
    const sparkVal = num(m[sparkKey])
    agg.spend += num(m.spend)
    agg.conversions += num(m.conversion)
    agg.clicks += num(m.clicks)
    agg.impressions += num(m.impressions)
    agg.ctrSum += num(m.ctr)
    agg.cpaSum += num(m.cost_per_conversion)
    if (m.conversion_rate != null && m.conversion_rate !== '') {
      agg.cvrSum += num(m.conversion_rate)
      agg.cvrDays += 1
    }
    if (m.cpc != null && m.cpc !== '') {
      agg.cpcSum += num(m.cpc)
      agg.cpcDays += 1
    }
    if (m.cpm != null && m.cpm !== '') {
      agg.cpmSum += num(m.cpm)
      agg.cpmDays += 1
    }
    agg.video_views += num(m.video_play_actions)
    agg.video_2s_views += num(m.video_watched_2s)
    if (num(m.average_video_play) > 0) {
      agg.watchSum += num(m.average_video_play)
      agg.watchDays += 1
    }
    agg.days += 1
    if (date) agg.daily.push({ date, label: date.slice(5, 10), value: sparkVal })
  }

  return byId
}

function toEntityRow(id: string, meta: Meta | undefined, agg: Agg, opts?: { readOnly?: boolean }): EntityRow {
  const a = agg || emptyAgg()
  const rates = finalizeRateMetrics(a)
  return {
    id,
    name: meta?.name || id,
    objective: meta?.objective ?? null,
    operation_status: meta?.operation_status ?? (opts?.readOnly ? null : 'ENABLE'),
    budget: meta?.budget ?? null,
    budget_mode: meta?.budget_mode ?? null,
    budget_label: meta?.budget_label ?? null,
    budget_editable: meta?.budget_editable ?? false,
    bid_price: meta?.bid_price ?? null,
    bid_type: meta?.bid_type ?? null,
    bid_field: meta?.bid_field ?? null,
    bid_editable: meta?.bid_editable ?? false,
    schedule_start_time: meta?.schedule_start_time ?? null,
    schedule_end_time: meta?.schedule_end_time ?? null,
    is_smart_plus: meta?.is_smart_plus ?? false,
    spend: a.spend,
    conversions: a.conversions,
    ctr: a.days ? a.ctrSum / a.days : 0,
    cpa: a.days ? a.cpaSum / a.days : 0,
    cvr: rates.cvr,
    cpc: rates.cpc,
    cpm: rates.cpm,
    daily: a.daily.sort((x, y) => x.date.localeCompare(y.date)),
    video_views: a.video_views,
    video_2s_views: a.video_2s_views,
    avg_watch_time: a.watchDays ? a.watchSum / a.watchDays : 0,
    readOnly: opts?.readOnly,
  }
}

function buildCampaignMeta(c: Record<string, unknown>, id: string): Meta {
  return {
    name: String(c.campaign_name || id),
    objective: c.objective_type ? String(c.objective_type) : c.objective ? String(c.objective) : null,
    operation_status: String(c.operation_status || 'ENABLE'),
    is_smart_plus: detectSmartPlus(c),
    ...parseCampaignBudget(c),
    ...parseCampaignBid(c),
  }
}

function buildEntityList(
  metaMap: Record<string, Meta>,
  byId: Record<string, Agg>,
  entityId?: string | null,
  opts?: { readOnly?: boolean }
): EntityRow[] {
  const allIds = new Set([...Object.keys(metaMap), ...Object.keys(byId)])
  if (entityId) allIds.add(entityId)

  return Array.from(allIds)
    .map(id => toEntityRow(id, metaMap[id], byId[id] || emptyAgg(), opts))
    .sort((a, b) => b.spend - a.spend)
}

export async function fetchEntitiesForStore(
  connection: { advertiser_id: string; access_token: string; currency?: string | null },
  storeId: string,
  start_date: string,
  end_date: string,
  level: EntityLevel = 'campaigns',
  entityId?: string | null
) {
  const page_size = campaignPageSize(start_date, end_date)
  const currency = await resolveAdvertiserCurrency(connection, storeId)

  if (level === 'campaigns') {
    const [reportJson, metaJson] = await Promise.all([
      fetchIntegratedReport(connection, {
        start_date, end_date,
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: ['campaign_id', 'stat_time_day'],
        page_size,
      }),
      fetchCampaignGet(
        connection,
        entityId ? { filtering: JSON.stringify({ campaign_ids: [entityId] }) } : {}
      ),
    ])
    if (reportJson.code !== 0) {
      return tiktokApiFailure(reportJson.code, reportJson.message, {
        storeId, advertiserId: connection.advertiser_id,
      })
    }
    const metaMap: Record<string, Meta> = {}
    if (metaJson.code === 0) {
      for (const c of metaJson.data?.list || []) {
        const id = String(c.campaign_id)
        metaMap[id] = buildCampaignMeta(c, id)
      }
    }
    const byId = aggregateRows(reportJson.data?.list || [], 'campaign_id', 'conversion', entityId)
    const items = buildEntityList(metaMap, byId, entityId)
    return { items, currency, level, start_date, end_date }
  }

  if (level === 'adgroups') {
    const [reportJson, metaJson] = await Promise.all([
      fetchIntegratedReport(connection, {
        start_date, end_date,
        data_level: 'AUCTION_ADGROUP',
        dimensions: ['adgroup_id', 'stat_time_day'],
        page_size,
      }),
      fetchAdgroupGet(
        connection,
        entityId ? { filtering: JSON.stringify({ adgroup_ids: [entityId] }) } : {}
      ),
    ])
    if (reportJson.code !== 0) {
      return tiktokApiFailure(reportJson.code, reportJson.message, {
        storeId, advertiserId: connection.advertiser_id,
      })
    }
    const adgroupList = metaJson.code === 0 ? metaJson.data?.list || [] : []
    const campaignIds = adgroupList.map((g: Record<string, unknown>) => String(g.campaign_id || ''))
    const campaignMetaById = await resolveCampaignMetaById(connection, campaignIds)
    const smartPlusCampaignIds = new Set(
      Object.entries(campaignMetaById).filter(([, c]) => detectSmartPlus(c)).map(([id]) => id)
    )
    const metaMap: Record<string, Meta> = {}
    for (const g of adgroupList) {
      const id = String(g.adgroup_id)
      const campaignId = String(g.campaign_id || '')
      const parentCampaign = campaignMetaById[campaignId]
      const parentSmart = smartPlusCampaignIds.has(campaignId)
      metaMap[id] = applySmartPlusChildLocks({
        name: g.adgroup_name || id,
        objective: g.optimization_goal || g.promotion_type || null,
        operation_status: g.operation_status || 'ENABLE',
        is_smart_plus: parentSmart,
        ...parseAdgroupBudget(g, parentCampaign),
        ...parseAdgroupBid(g),
      })
    }
    const byId = aggregateRows(reportJson.data?.list || [], 'adgroup_id', 'conversion', entityId)
    const items = buildEntityList(metaMap, byId, entityId)
    return { items, currency, level, start_date, end_date }
  }

  if (level === 'ads') {
    const [reportJson, metaJson] = await Promise.all([
      fetchIntegratedReport(connection, {
        start_date, end_date,
        data_level: 'AUCTION_AD',
        dimensions: ['ad_id', 'stat_time_day'],
        page_size,
      }),
      tiktokGet(
        connection,
        '/ad/get/',
        entityId ? { filtering: JSON.stringify({ ad_ids: [entityId] }) } : {},
        ['ad_id', 'ad_name', 'campaign_id', 'operation_status', 'optimization_goal']
      ),
    ])
    if (reportJson.code !== 0) {
      return tiktokApiFailure(reportJson.code, reportJson.message, {
        storeId, advertiserId: connection.advertiser_id,
      })
    }
    const adList = metaJson.code === 0 ? metaJson.data?.list || [] : []
    const smartPlusCampaignIds = await resolveSmartPlusCampaignIds(
      connection,
      adList.map((a: Record<string, unknown>) => String(a.campaign_id || ''))
    )
    const metaMap: Record<string, Meta> = {}
    for (const a of adList) {
      const id = String(a.ad_id)
      const parentSmart = smartPlusCampaignIds.has(String(a.campaign_id || ''))
      metaMap[id] = {
        name: a.ad_name || id,
        objective: a.optimization_goal || null,
        operation_status: a.operation_status || 'ENABLE',
        is_smart_plus: parentSmart,
        ...noBudget,
        ...noBidMeta,
      }
    }
    const byId = aggregateRows(reportJson.data?.list || [], 'ad_id', 'conversion', entityId)
    const items = buildEntityList(metaMap, byId, entityId)
    return { items, currency, level, start_date, end_date }
  }

  // videos — try material_id, fallback to ad-level video metrics
  let reportJson = await fetchIntegratedReport(connection, {
    start_date, end_date,
    data_level: 'AUCTION_AD',
    dimensions: ['material_id', 'stat_time_day'],
    page_size,
    metrics: VIDEO_METRICS,
  })

  let idKey = 'material_id'
  if (reportJson.code !== 0 || !reportJson.data?.list?.length) {
    reportJson = await fetchIntegratedReport(connection, {
      start_date, end_date,
      data_level: 'AUCTION_AD',
      dimensions: ['ad_id', 'stat_time_day'],
      page_size,
      metrics: VIDEO_METRICS,
    })
    idKey = 'ad_id'
  }

  if (reportJson.code !== 0) {
    return tiktokApiFailure(reportJson.code, reportJson.message, {
      storeId, advertiserId: connection.advertiser_id,
    })
  }

  const metaMap: Record<string, Meta> = {}
  const byId = aggregateRows(reportJson.data?.list || [], idKey, 'video_play_actions', entityId)

  for (const id of Object.keys(byId)) {
    metaMap[id] = {
      name: idKey === 'material_id'
        ? `Video …${id.slice(-6)}`
        : `Ad …${id.slice(-6)}`,
      objective: 'Video',
      operation_status: null,
      is_smart_plus: false,
      ...noBudget,
      ...noBidMeta,
    }
  }

  const items = buildEntityList(metaMap, byId, entityId, { readOnly: true })
  return { items, currency, level, start_date, end_date }
}

export type WinnerLevel = 'campaigns' | 'adgroups' | 'ads'

export type WinnerRow = {
  id: string
  name: string
  level: WinnerLevel
  scale_level: 'campaigns' | 'adgroups'
  scale_entity_id: string
  is_smart_plus: boolean
  campaign_automation_type?: string | null
  campaign_type?: string | null
  is_smart_performance_campaign?: boolean | null
  entity_budget: number | null
  budget_label: BudgetLabel | null
  budget_editable: boolean
  spend: number
  conversions: number
  cpa: number
  roas: number
  ctr: number
  impressions: number
  clicks: number
  cvr: number | null
  cpc: number | null
  cpm: number | null
}

/** @deprecated use WinnerRow */
export type AdWinnerRow = WinnerRow & {
  ad_id: string
  ad_name: string
  adgroup_id: string
  campaign_id: string
  adgroup_budget: number | null
}

const WINNER_REPORT_METRICS = [
  'spend', 'conversion', 'cost_per_conversion', 'complete_payment_roas',
  'ctr', 'impressions', 'clicks', 'conversion_rate', 'cpc', 'cpm',
]

type WinnerStats = Pick<
  WinnerRow,
  'spend' | 'conversions' | 'cpa' | 'roas' | 'ctr' | 'impressions' | 'clicks' | 'cvr' | 'cpc' | 'cpm'
>

function winnerMetricPresent(m: Record<string, unknown>, key: string) {
  return m[key] != null && m[key] !== ''
}

function resolveWinnerRateMetrics(
  m: Record<string, unknown>,
  spend: number,
  conversions: number,
  clicks: number,
  impressions: number
): Pick<WinnerStats, 'cvr' | 'cpc' | 'cpm'> {
  const cvr = winnerMetricPresent(m, 'conversion_rate')
    ? num(m.conversion_rate)
    : clicks > 0
      ? (conversions / clicks) * 100
      : null
  const cpc = winnerMetricPresent(m, 'cpc')
    ? num(m.cpc)
    : clicks > 0
      ? spend / clicks
      : null
  const cpm = winnerMetricPresent(m, 'cpm')
    ? num(m.cpm)
    : impressions > 0
      ? (spend / impressions) * 1000
      : null
  return { cvr, cpc, cpm }
}

function parseWinnerReportRows(
  list: Array<{ dimensions?: Record<string, unknown>; metrics?: Record<string, unknown> }>,
  idKey: string
): Record<string, WinnerStats> {
  const byId: Record<string, WinnerStats> = {}
  for (const row of list) {
    const id = String(row.dimensions?.[idKey] || '')
    if (!id) continue
    const m = row.metrics || {}
    const spend = num(m.spend)
    const conversions = num(m.conversion)
    const clicks = num(m.clicks)
    const impressions = num(m.impressions)
    byId[id] = {
      spend,
      conversions,
      cpa: num(m.cost_per_conversion),
      roas: num(m.complete_payment_roas),
      ctr: num(m.ctr),
      impressions,
      clicks,
      ...resolveWinnerRateMetrics(m, spend, conversions, clicks, impressions),
    }
  }
  return byId
}

function computeWinnerAverages(items: WinnerRow[]) {
  const withRoas = items.filter(r => r.roas > 0)
  const withCpa = items.filter(r => r.cpa > 0)
  const withCtr = items.filter(r => r.ctr > 0)
  const withConv = items.filter(r => r.conversions > 0)
  const withCvr = items.filter(r => r.cvr != null)
  const withCpc = items.filter(r => r.cpc != null)
  const withCpm = items.filter(r => r.cpm != null)
  return {
    conversions: withConv.length
      ? withConv.reduce((s, r) => s + r.conversions, 0) / withConv.length
      : 0,
    roas: withRoas.length ? withRoas.reduce((s, r) => s + r.roas, 0) / withRoas.length : 0,
    cpa: withCpa.length ? withCpa.reduce((s, r) => s + r.cpa, 0) / withCpa.length : 0,
    ctr: withCtr.length ? withCtr.reduce((s, r) => s + r.ctr, 0) / withCtr.length : 0,
    cvr: withCvr.length ? withCvr.reduce((s, r) => s + (r.cvr as number), 0) / withCvr.length : 0,
    cpc: withCpc.length ? withCpc.reduce((s, r) => s + (r.cpc as number), 0) / withCpc.length : 0,
    cpm: withCpm.length ? withCpm.reduce((s, r) => s + (r.cpm as number), 0) / withCpm.length : 0,
  }
}

function emptyWinnersResult(
  currency: string,
  start_date: string,
  end_date: string,
  level: WinnerLevel
) {
  return {
    items: [] as WinnerRow[],
    currency,
    level,
    start_date,
    end_date,
    averages: { conversions: 0, roas: 0, cpa: 0, ctr: 0, cvr: 0, cpc: 0, cpm: 0 },
  }
}

export async function fetchWinners(
  connection: { advertiser_id: string; access_token: string; currency?: string | null },
  storeId: string,
  start_date: string,
  end_date: string,
  level: WinnerLevel = 'campaigns'
) {
  const currency = await resolveAdvertiserCurrency(connection, storeId)

  const reportLevel =
    level === 'campaigns' ? 'AUCTION_CAMPAIGN'
      : level === 'adgroups' ? 'AUCTION_ADGROUP'
        : 'AUCTION_AD'
  const dimensionKey =
    level === 'campaigns' ? 'campaign_id'
      : level === 'adgroups' ? 'adgroup_id'
        : 'ad_id'

  const reportJson = await fetchIntegratedReport(connection, {
    start_date,
    end_date,
    data_level: reportLevel,
    dimensions: [dimensionKey],
    page_size: 1000,
    metrics: WINNER_REPORT_METRICS,
  })

  if (reportJson.code !== 0) {
    return tiktokApiFailure(reportJson.code, reportJson.message, {
      storeId,
      advertiserId: connection.advertiser_id,
    })
  }

  const byId = parseWinnerReportRows(reportJson.data?.list || [], dimensionKey)
  const entityIds = Object.keys(byId)
  if (!entityIds.length) {
    return emptyWinnersResult(currency, start_date, end_date, level)
  }

  if (level === 'campaigns') {
    const metaMap: Record<string, {
      name: string
      is_smart_plus: boolean
      campaign_automation_type: string | null
      campaign_type: string | null
      is_smart_performance_campaign: boolean | null
      entity_budget: number | null
      budget_label: BudgetLabel | null
      budget_editable: boolean
    }> = {}

    for (let i = 0; i < entityIds.length; i += 100) {
      const chunk = entityIds.slice(i, i + 100)
      const json = await fetchCampaignGet(
        connection,
        { filtering: JSON.stringify({ campaign_ids: chunk }) }
      )
      if (json.code !== 0) continue
      for (const c of json.data?.list || []) {
        const id = String(c.campaign_id)
        const budgetMeta = buildCampaignMeta(c, id)
        metaMap[id] = {
          name: String(c.campaign_name || id),
          is_smart_plus: budgetMeta.is_smart_plus,
          campaign_automation_type: c.campaign_automation_type != null
            ? String(c.campaign_automation_type)
            : null,
          campaign_type: c.campaign_type != null ? String(c.campaign_type) : null,
          is_smart_performance_campaign: c.is_smart_performance_campaign === true
            || c.is_smart_performance_campaign === 'true'
            || c.is_smart_performance_campaign === 1,
          entity_budget: budgetMeta.budget,
          budget_label: budgetMeta.budget_label,
          budget_editable: budgetMeta.budget_editable,
        }
      }
    }

    const items: WinnerRow[] = entityIds.map(id => {
      const meta = metaMap[id]
      return {
        id,
        name: meta?.name || id,
        level: 'campaigns' as const,
        scale_level: 'campaigns' as const,
        scale_entity_id: id,
        is_smart_plus: meta?.is_smart_plus ?? false,
        campaign_automation_type: meta?.campaign_automation_type ?? null,
        campaign_type: meta?.campaign_type ?? null,
        is_smart_performance_campaign: meta?.is_smart_performance_campaign ?? null,
        entity_budget: meta?.entity_budget ?? null,
        budget_label: meta?.budget_label ?? null,
        budget_editable: meta?.budget_editable ?? false,
        ...byId[id],
      }
    }).filter(r => r.spend > 0 || r.impressions > 0)

    return {
      items,
      currency,
      level,
      start_date,
      end_date,
      averages: computeWinnerAverages(items),
    }
  }

  if (level === 'adgroups') {
    const adgroupList: Record<string, unknown>[] = []
    for (let i = 0; i < entityIds.length; i += 100) {
      const chunk = entityIds.slice(i, i + 100)
      const json = await fetchAdgroupGet(
        connection,
        { filtering: JSON.stringify({ adgroup_ids: chunk }) }
      )
      if (json.code !== 0) continue
      adgroupList.push(...(json.data?.list || []))
    }

    const campaignIds = adgroupList.map(g => String(g.campaign_id || ''))
    const campaignMetaById = await resolveCampaignMetaById(connection, campaignIds)
    const smartPlusCampaignIds = new Set(
      Object.entries(campaignMetaById).filter(([, c]) => detectSmartPlus(c)).map(([id]) => id)
    )

    const adgroupMeta: Record<string, {
      name: string
      is_smart_plus: boolean
      entity_budget: number | null
      budget_label: BudgetLabel | null
      budget_editable: boolean
    }> = {}

    for (const g of adgroupList) {
      const gid = String(g.adgroup_id)
      const campaignId = String(g.campaign_id || '')
      const parentCampaign = campaignMetaById[campaignId]
      const parentSmart = smartPlusCampaignIds.has(campaignId)
      const budgetMeta = applySmartPlusChildLocks({
        name: String(g.adgroup_name || gid),
        objective: null,
        operation_status: null,
        is_smart_plus: parentSmart,
        ...parseAdgroupBudget(g, parentCampaign),
        ...noBidMeta,
      })
      adgroupMeta[gid] = {
        name: String(g.adgroup_name || gid),
        is_smart_plus: parentSmart,
        entity_budget: budgetMeta.budget,
        budget_label: budgetMeta.budget_label,
        budget_editable: budgetMeta.budget_editable,
      }
    }

    const items: WinnerRow[] = entityIds.map(id => {
      const meta = adgroupMeta[id]
      return {
        id,
        name: meta?.name || id,
        level: 'adgroups' as const,
        scale_level: 'adgroups' as const,
        scale_entity_id: id,
        is_smart_plus: meta?.is_smart_plus ?? false,
        entity_budget: meta?.entity_budget ?? null,
        budget_label: meta?.budget_label ?? null,
        budget_editable: meta?.budget_editable ?? false,
        ...byId[id],
      }
    }).filter(r => r.spend > 0 || r.impressions > 0)

    return {
      items,
      currency,
      level,
      start_date,
      end_date,
      averages: computeWinnerAverages(items),
    }
  }

  // ads
  const adMeta: Record<string, { name: string; adgroup_id: string; campaign_id: string }> = {}
  for (let i = 0; i < entityIds.length; i += 100) {
    const chunk = entityIds.slice(i, i + 100)
    const json = await tiktokGet(
      connection,
      '/ad/get/',
      { filtering: JSON.stringify({ ad_ids: chunk }) },
      ['ad_id', 'ad_name', 'adgroup_id', 'campaign_id']
    )
    if (json.code !== 0) continue
    for (const a of json.data?.list || []) {
      adMeta[String(a.ad_id)] = {
        name: String(a.ad_name || a.ad_id),
        adgroup_id: String(a.adgroup_id || ''),
        campaign_id: String(a.campaign_id || ''),
      }
    }
  }

  const adgroupIds = [...new Set(Object.values(adMeta).map(m => m.adgroup_id).filter(Boolean))]
  const campaignIds = [...new Set(Object.values(adMeta).map(m => m.campaign_id).filter(Boolean))]
  const campaignMetaById = await resolveCampaignMetaById(connection, campaignIds)
  const smartPlusCampaignIds = new Set(
    Object.entries(campaignMetaById).filter(([, c]) => detectSmartPlus(c)).map(([id]) => id)
  )

  const adgroupMeta: Record<string, {
    entity_budget: number | null
    budget_label: BudgetLabel | null
    budget_editable: boolean
  }> = {}
  for (let i = 0; i < adgroupIds.length; i += 100) {
    const chunk = adgroupIds.slice(i, i + 100)
    const json = await fetchAdgroupGet(
      connection,
      { filtering: JSON.stringify({ adgroup_ids: chunk }) }
    )
    if (json.code !== 0) continue
    for (const g of json.data?.list || []) {
      const gid = String(g.adgroup_id)
      const parentCampaign = campaignMetaById[String(g.campaign_id || '')]
      const parentSmart = smartPlusCampaignIds.has(String(g.campaign_id || ''))
      const budgetMeta = applySmartPlusChildLocks({
        name: '',
        objective: null,
        operation_status: null,
        is_smart_plus: parentSmart,
        ...parseAdgroupBudget(g, parentCampaign),
        ...noBidMeta,
      })
      adgroupMeta[gid] = {
        entity_budget: budgetMeta.budget,
        budget_label: budgetMeta.budget_label,
        budget_editable: budgetMeta.budget_editable,
      }
    }
  }

  const items: WinnerRow[] = entityIds.map(adId => {
    const stats = byId[adId]
    const meta = adMeta[adId]
    const ag = meta?.adgroup_id ? adgroupMeta[meta.adgroup_id] : undefined
    const parentSmart = meta?.campaign_id ? smartPlusCampaignIds.has(meta.campaign_id) : false
    return {
      id: adId,
      name: meta?.name || adId,
      level: 'ads' as const,
      scale_level: 'adgroups' as const,
      scale_entity_id: meta?.adgroup_id || '',
      is_smart_plus: parentSmart,
      entity_budget: ag?.entity_budget ?? null,
      budget_label: ag?.budget_label ?? null,
      budget_editable: ag?.budget_editable ?? false,
      ...stats,
    }
  }).filter(r => r.spend > 0 || r.impressions > 0)

  return {
    items,
    currency,
    level,
    start_date,
    end_date,
    averages: computeWinnerAverages(items),
  }
}

/** @deprecated use fetchWinners */
export async function fetchAdWinners(
  connection: { advertiser_id: string; access_token: string; currency?: string | null },
  storeId: string,
  start_date: string,
  end_date: string
) {
  return fetchWinners(connection, storeId, start_date, end_date, 'ads')
}

/** Legacy wrapper */
export async function fetchCampaignsForStore(
  connection: { advertiser_id: string; access_token: string; currency?: string | null },
  storeId: string,
  start_date: string,
  end_date: string,
  campaignId?: string | null
) {
  const result = await fetchEntitiesForStore(connection, storeId, start_date, end_date, 'campaigns', campaignId)
  if ('error' in result) return result
  return {
    campaigns: result.items.map(i => ({
      ...i,
      campaign_id: i.id,
      campaign_name: i.name,
      operation_status: i.operation_status || 'ENABLE',
    })),
    currency: result.currency,
    start_date: result.start_date,
    end_date: result.end_date,
  }
}

