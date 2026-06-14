import type { AdGoal, AdvancedSettings, BidStrategyOption, PlacementOption } from '@/lib/tiktok/create-ad/types'

export type ObjectiveAdgroupConfig = {
  optimization_goal: string
  billing_event: string
  promotion_type: string
  promotion_target_type?: string
  placement_type: string
  placements?: string[]
  /** Whether cost-cap bidding is valid for this objective/billing combo. */
  supports_cost_cap: boolean
  /** TikTok bid field when cost cap is set; null = lowest-cost only. */
  bid_cap_field: 'bid_price' | 'conversion_bid_price' | null
}

export function goalAdgroupConfig(
  goal: AdGoal,
  placement: PlacementOption = 'automatic'
): ObjectiveAdgroupConfig {
  if (goal === 'visits') {
    return {
      optimization_goal: 'CLICK',
      billing_event: 'CPC',
      promotion_type: 'WEBSITE',
      placement_type:
        placement === 'automatic' ? 'PLACEMENT_TYPE_AUTOMATIC' : 'PLACEMENT_TYPE_NORMAL',
      supports_cost_cap: true,
      bid_cap_field: 'bid_price',
    }
  }

  if (goal === 'leads') {
    return {
      optimization_goal: 'LEAD_GENERATION',
      billing_event: 'OCPM',
      promotion_type: 'LEAD_GENERATION',
      promotion_target_type: 'INSTANT_PAGE',
      placement_type: 'PLACEMENT_TYPE_NORMAL',
      placements: ['PLACEMENT_TIKTOK'],
      supports_cost_cap: true,
      bid_cap_field: 'conversion_bid_price',
    }
  }

  return {
    optimization_goal: 'CONVERT',
    billing_event: 'OCPM',
    promotion_type: 'WEBSITE',
    placement_type:
      placement === 'automatic' ? 'PLACEMENT_TYPE_AUTOMATIC' : 'PLACEMENT_TYPE_NORMAL',
    supports_cost_cap: true,
    bid_cap_field: 'conversion_bid_price',
  }
}

/** Apply bid_type and cap fields only when valid for the objective combo. */
export function applyBidFields(
  body: Record<string, unknown>,
  bidStrategy: BidStrategyOption,
  bidCap: number | null,
  config: ObjectiveAdgroupConfig
) {
  const useCostCap =
    bidStrategy === 'cost_cap' &&
    config.supports_cost_cap &&
    config.bid_cap_field != null &&
    bidCap != null &&
    bidCap > 0

  if (useCostCap && config.bid_cap_field) {
    body.bid_type = 'BID_TYPE_CUSTOM'
    body[config.bid_cap_field] = bidCap
    return
  }

  body.bid_type = 'BID_TYPE_NO_BID'
}

export function resolvedPlacement(advanced: AdvancedSettings): PlacementOption {
  return advanced.touched ? advanced.placement : 'automatic'
}
