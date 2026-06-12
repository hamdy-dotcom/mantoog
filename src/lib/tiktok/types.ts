/** Client-safe TikTok dashboard types and constants — no server imports. */

export type EntityLevel = 'campaigns' | 'adgroups' | 'ads' | 'videos'

export const ENTITY_LEVELS: EntityLevel[] = ['campaigns', 'adgroups', 'ads', 'videos']

export type EntityDaily = { date: string; label: string; value: number }

export type BudgetLabel = 'cbo' | 'abo'

export type BidField = 'bid_price' | 'roas_bid' | 'conversion_bid_price' | 'deep_cpa_bid'

/** @deprecated use BidField */
export type CampaignBidField = BidField

/** Which inline controls work via TikTok Smart+ API for a given row. */
export type SmartPlusApiSupport = {
  status: boolean
  budget: boolean
  rename: boolean
  bid: boolean
  schedule: boolean
  duplicate: boolean
}

export const SMART_PLUS_TOOLTIP =
  'Managed by TikTok Smart+ — edit in TikTok Ads Manager'

export type EntityRow = {
  id: string
  name: string
  objective: string | null
  operation_status: string | null
  budget: number | null
  budget_mode: string | null
  budget_label: BudgetLabel | null
  budget_editable: boolean
  bid_price: number | null
  bid_type: string | null
  bid_field: BidField | null
  bid_editable: boolean
  schedule_start_time: string | null
  schedule_end_time: string | null
  is_smart_plus: boolean
  spend: number
  conversions: number
  ctr: number
  cpa: number
  cvr: number | null
  cpc: number | null
  cpm: number | null
  daily: EntityDaily[]
  video_views?: number
  video_2s_views?: number
  avg_watch_time?: number
  readOnly?: boolean
}

const SMART_PLUS_AUTOMATION_TYPES = new Set(['UPGRADED_SMART_PLUS', 'SMART_PLUS'])

/** Detect Smart+ campaigns from /campaign/get/ fields. */
export function detectSmartPlus(c: Record<string, unknown>): boolean {
  const flag = c.is_smart_performance_campaign
  if (flag === true || flag === 'true' || flag === 1 || flag === '1') return true
  const automation = String(c.campaign_automation_type ?? '').toUpperCase()
  if (SMART_PLUS_AUTOMATION_TYPES.has(automation)) return true
  return false
}

/** API support matrix for Smart+ rows (campaign-level vs child entities). */
export function getSmartPlusApiSupport(level: EntityLevel, isSmartPlus: boolean): SmartPlusApiSupport {
  if (!isSmartPlus) {
    return { status: true, budget: true, rename: true, bid: true, schedule: true, duplicate: true }
  }
  if (level === 'campaigns') {
    return { status: true, budget: true, rename: true, bid: true, schedule: false, duplicate: false }
  }
  return { status: false, budget: false, rename: false, bid: false, schedule: false, duplicate: false }
}

export function canEditStatus(row: EntityRow, level: EntityLevel): boolean {
  if (row.readOnly) return false
  return getSmartPlusApiSupport(level, row.is_smart_plus).status
}

export function canEditBudget(row: EntityRow, level: EntityLevel): boolean {
  if (!row.budget_editable) return false
  return getSmartPlusApiSupport(level, row.is_smart_plus).budget
}

export function canEditName(row: EntityRow, level: EntityLevel, nameEditable: boolean): boolean {
  if (!nameEditable) return false
  return getSmartPlusApiSupport(level, row.is_smart_plus).rename
}

export function canEditBid(row: EntityRow, level: EntityLevel): boolean {
  if (row.readOnly || row.bid_price == null || row.bid_price <= 0 || !row.bid_field) return false
  // Ad-group bids are readable under Smart+ parents but /adgroup/update/ rejects them (40002).
  if (level === 'adgroups') return !row.is_smart_plus
  if (!row.bid_editable) return false
  return getSmartPlusApiSupport(level, row.is_smart_plus).bid
}

export function formatBidDisplay(
  row: Pick<EntityRow, 'bid_price' | 'bid_editable' | 'bid_field'>,
  fmtMoney: (n: number, digits?: number) => string,
  fmtNum: (n: number, digits?: number) => string
): { text: string; editable: boolean; hasBid: boolean } {
  if (row.bid_price == null || row.bid_price <= 0 || !row.bid_field) {
    return { text: '—', editable: false, hasBid: false }
  }
  const text = row.bid_field === 'roas_bid'
    ? fmtNum(row.bid_price, 2)
    : fmtMoney(row.bid_price, 2)
  return { text, editable: row.bid_price > 0, hasBid: true }
}

export function canEditSchedule(row: EntityRow, level: EntityLevel): boolean {
  if (level !== 'adgroups') return false
  return getSmartPlusApiSupport(level, row.is_smart_plus).schedule
}

export function canDuplicate(row: EntityRow, level: EntityLevel, canDuplicateLevel: boolean): boolean {
  if (!canDuplicateLevel) return false
  return getSmartPlusApiSupport(level, row.is_smart_plus).duplicate
}

/** @deprecated use EntityRow */
export type CampaignData = EntityRow & { campaign_id: string; campaign_name: string }

export const LEVEL_OPTIONS: { id: EntityLevel; en: string; ar: string }[] = [
  { id: 'campaigns', en: 'Campaigns', ar: 'الحملات' },
  { id: 'adgroups', en: 'Ad Groups', ar: 'مجموعات الإعلانات' },
  { id: 'ads', en: 'Ads', ar: 'الإعلانات' },
  { id: 'videos', en: 'Videos', ar: 'الفيديوهات' },
]

export function toDatetimeLocal(tiktokStr: string | null | undefined) {
  if (!tiktokStr) return ''
  return tiktokStr.replace(' ', 'T').slice(0, 16)
}

export function formatRateMetric(
  value: number | null | undefined,
  format: (n: number) => string
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return format(value)
}

export function formatBudgetDisplay(
  row: Pick<EntityRow, 'budget' | 'budget_label' | 'budget_editable'>,
  fmtMoney: (n: number, digits?: number) => string
): { text: string; editable: boolean } {
  if (row.budget != null && row.budget > 0) {
    return { text: fmtMoney(row.budget, 0), editable: row.budget_editable }
  }
  if (row.budget_label === 'cbo') return { text: 'CBO', editable: false }
  if (row.budget_label === 'abo') return { text: 'ABO', editable: false }
  return { text: '—', editable: false }
}

export function tiktokAdsManagerUrl(level: EntityLevel, advertiserId: string, entityId: string) {
  const base = 'https://ads.tiktok.com/i18n/perf'
  const q = `aadvid=${advertiserId}`
  switch (level) {
    case 'campaigns':
      return `${base}/campaign?${q}&check_one_campaign=${entityId}`
    case 'adgroups':
      return `${base}/adgroup?${q}&check_one_adgroup=${entityId}`
    case 'ads':
      return `${base}/creative?${q}&check_one_ad=${entityId}`
    case 'videos':
      return `${base}/creative?${q}`
    default:
      return `${base}/campaign?${q}`
  }
}
