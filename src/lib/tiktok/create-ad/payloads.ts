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
  const isSmartPlus = adv.campaignType === 'smart_plus'
  const isCbo = adv.budgetLevel === 'cbo'
  const budgetMode = adv.budgetMode === 'lifetime' ? 'BUDGET_MODE_TOTAL' : 'BUDGET_MODE_DAY'

  const body: Record<string, unknown> = {
    campaign_name: buildCampaignName(
      payload.product.title,
      payload.targeting.goal
    ),
    objective_type: objective,
    operation_status: 'ENABLE',
  }

  if (isSmartPlus) {
    body.campaign_type = 'SMART_PERFORMANCE_CAMPAIGN'
  } else {
    body.campaign_type = 'REGULAR_CAMPAIGN'
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
  payload: CreateAdWizardPayload
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
      : ['AGE_18_24', 'AGE_25_34', 'AGE_35_44'],
    languages: adv.languages.length ? adv.languages : ['ar'],
    operation_status: 'ENABLE',
  }

  if (obj.promotion_target_type) {
    body.promotion_target_type = obj.promotion_target_type
  }
  if (obj.placements?.length) {
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

  if (goal === 'orders' && payload.store.tiktok_pixel_id) {
    body.pixel_id = payload.store.tiktok_pixel_id
    body.optimization_event = 'COMPLETE_PAYMENT'
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
    languages: ['ar'],
    touched: false,
  }
  return adv
}
