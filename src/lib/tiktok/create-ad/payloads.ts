import type {
  AdGoal,
  AdvancedSettings,
  CreateAdWizardPayload,
} from '@/lib/tiktok/create-ad/types'
import { localDatetimeToTikTok } from '@/lib/tiktok/create-ad/schedule'
import {
  applyBidFields,
  goalAdgroupConfig,
  resolvedPlacement,
} from '@/lib/tiktok/create-ad/objective-config'
import { DEFAULT_ADVANCED, GOAL_OPTIONS } from '@/lib/tiktok/create-ad/types'

function goalObjective(goal: AdGoal) {
  return GOAL_OPTIONS.find(g => g.id === goal)?.objective || 'TRAFFIC'
}

function goalShortLabel(goal: AdGoal) {
  if (goal === 'leads') return 'Leads'
  if (goal === 'orders') return 'Orders'
  return 'Visits'
}

function uniqueNameSuffix() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** Stable suffix for UI preview; actual launch generates a fresh one in buildCampaignPayload. */
export function previewNameSuffix() {
  return uniqueNameSuffix()
}

export function buildCampaignName(productTitle: string, goal: AdGoal, suffix?: string) {
  const short = productTitle.length > 36 ? `${productTitle.slice(0, 35)}…` : productTitle
  return `${short} - ${goalShortLabel(goal)} - ${suffix ?? uniqueNameSuffix()}`
}

function resolvedAdvanced(advanced: AdvancedSettings) {
  return advanced.touched ? advanced : {
    ...DEFAULT_ADVANCED,
    touched: false,
  }
}

export function buildCampaignPayload(payload: CreateAdWizardPayload) {
  const adv = resolvedAdvanced(payload.targeting.advanced)
  const objective = goalObjective(payload.targeting.goal)
  const isCbo = adv.budgetLevel === 'cbo'
  const budgetMode = adv.budgetMode === 'lifetime' ? 'BUDGET_MODE_TOTAL' : 'BUDGET_MODE_DAY'

  const body: Record<string, unknown> = {
    campaign_name: buildCampaignName(
      payload.product.title,
      payload.targeting.goal
    ),
    objective_type: objective,
    operation_status: 'ENABLE',
    // /campaign/create/ only accepts REGULAR_CAMPAIGN or IOS14_CAMPAIGN — never Smart+.
    campaign_type: 'REGULAR_CAMPAIGN',
  }

  if (isCbo) {
    body.budget_optimize_on = true
    body.budget_mode = budgetMode
    body.budget = payload.targeting.daily_budget
  } else {
    body.budget_optimize_on = false
    body.budget_mode = 'BUDGET_MODE_INFINITE'
  }

  return body
}

export function buildAdgroupPayload(
  campaignId: string,
  payload: CreateAdWizardPayload,
  opts?: { numericPixelId?: string; optimizationEvent?: string }
) {
  const adv = resolvedAdvanced(payload.targeting.advanced)
  const goal = payload.targeting.goal
  const obj = goalAdgroupConfig(goal, resolvedPlacement(adv))
  const isCbo = adv.budgetLevel === 'cbo'
  const budgetMode = adv.budgetMode === 'lifetime' ? 'BUDGET_MODE_TOTAL' : 'BUDGET_MODE_DAY'
  const productShort = payload.product.title.length > 36
    ? `${payload.product.title.slice(0, 35)}…`
    : payload.product.title
  const hasEnd = !!payload.targeting.schedule_end?.trim()

  const body: Record<string, unknown> = {
    campaign_id: campaignId,
    adgroup_name: `${productShort} - Ad group - ${uniqueNameSuffix().slice(-8)}`,
    placement_type: obj.placement_type,
    promotion_type: obj.promotion_type,
    optimization_goal: obj.optimization_goal,
    billing_event: obj.billing_event,
    pacing: 'PACING_MODE_SMOOTH',
    schedule_type: hasEnd ? 'SCHEDULE_START_END' : 'SCHEDULE_FROM_NOW',
    schedule_start_time: localDatetimeToTikTok(payload.targeting.schedule_start),
    location_ids: [payload.targeting.location_id],
    gender: payload.targeting.gender,
    age_groups: payload.targeting.age_groups.length
      ? payload.targeting.age_groups
      : ['AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_100'],
    operation_status: 'ENABLE',
  }

  if (obj.promotion_target_type) {
    body.promotion_target_type = obj.promotion_target_type
  }
  // Placement wiring:
  // - Automatic: PLACEMENT_TYPE_AUTOMATIC (no placements array)
  // - Manual: PLACEMENT_TYPE_NORMAL + placements array (default TikTok if empty)
  if (adv.placement === 'manual') {
    const selected = (adv.placements || []).filter(Boolean)
    body.placements = selected.length ? selected : ['PLACEMENT_TIKTOK']
  } else if (obj.placements?.length) {
    // Objective-enforced placements (ex: leads = TikTok only)
    body.placements = obj.placements
  }

  applyBidFields(body, adv.bidStrategy, adv.bidCap, obj)

  if (goal === 'leads') {
    if (payload.targeting.lead_form?.mode === 'existing' && payload.targeting.lead_form.page_id) {
      body.page_id = payload.targeting.lead_form.page_id
    }
  } else {
    body.landing_page_url = payload.product.landing_url
  }

  if (hasEnd && payload.targeting.schedule_end) {
    body.schedule_end_time = localDatetimeToTikTok(payload.targeting.schedule_end)
  }

  if (!isCbo) {
    body.budget_mode = budgetMode
    body.budget = payload.targeting.daily_budget
  }

  if (goal === 'orders' && opts?.numericPixelId && opts?.optimizationEvent) {
    body.pixel_id = opts.numericPixelId
    body.optimization_event = opts.optimizationEvent
  }

  // Advanced ad controls (ad group-level).
  if (adv.comment_disabled) body.comment_disabled = true
  if (adv.video_download_disabled) body.video_download_disabled = true
  if (adv.share_disabled) body.share_disabled = true

  // Languages: default = All (omit languages field). If merchant selects, include.
  if (adv.languages?.length) {
    body.languages = adv.languages
  }

  // Spending power: default ALL (omit). Only send when HIGH.
  if (adv.spending_power === 'HIGH') {
    body.spending_power = 'HIGH'
  }

  // Dayparting: default all-day (omit). Only send when custom and valid.
  if (adv.dayparting_mode === 'custom_hours' && adv.dayparting && adv.dayparting.length === 168) {
    body.dayparting = adv.dayparting
  }

  return body
}

export function resolvedAdvancedSummary(advanced: AdvancedSettings) {
  const adv = advanced.touched ? advanced : {
    campaignType: 'standard' as const,
    budgetLevel: 'abo' as const,
    budgetMode: 'daily' as const,
    bidStrategy: 'auto' as const,
    bidCap: null,
    placement: 'automatic' as const,
    placements: [],
    languages: [],
    spending_power: 'ALL' as const,
    dayparting_mode: 'all_day' as const,
    dayparting: null,
    comment_disabled: false,
    video_download_disabled: false,
    share_disabled: false,
    touched: false,
  }
  return adv
}
