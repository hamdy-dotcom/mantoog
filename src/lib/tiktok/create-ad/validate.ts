import { isValidLocalDatetime, localDatetimeToTikTok } from '@/lib/tiktok/create-ad/schedule'
import type { CreateAdWizardPayload } from '@/lib/tiktok/create-ad/types'
import { resolvedAdvancedSummary } from '@/lib/tiktok/create-ad/payloads'
import type { CreateFlowError } from '@/lib/tiktok/create-ad/errors'
import { explainCreateError } from '@/lib/tiktok/create-ad/errors'

const MIN_DAILY_BUDGET: Record<string, number> = {
  EGP: 50,
  SAR: 50,
  AED: 50,
  USD: 20,
  EUR: 20,
}

function minBudget(currency: string) {
  return MIN_DAILY_BUDGET[currency.toUpperCase()] ?? 20
}

export function validateCreatePayload(
  payload: CreateAdWizardPayload,
  timezone: string
): CreateFlowError | null {
  if (!payload?.product?.id || !payload.product.title) {
    return validationFail('Product is required.')
  }
  if (!payload.creative?.source || !payload.creative.caption?.trim()) {
    return validationFail('Creative source and caption are required.')
  }
  if (!payload.targeting?.goal) {
    return validationFail('Campaign goal is required.')
  }

  const budget = payload.targeting.daily_budget
  if (!Number.isFinite(budget) || budget <= 0) {
    return validationFail('Daily budget must be a positive number.', 'budget_minimum')
  }

  const currency = payload.store?.currency || 'USD'
  const min = minBudget(currency)
  const adv = resolvedAdvancedSummary(payload.targeting.advanced)
  const budgetAppliesAtAdgroup = adv.budgetLevel !== 'cbo'

  if (adv.campaignType === 'smart_plus') {
    return validationFail(
      'Smart+ campaigns cannot be created from this wizard yet. Choose Standard campaign type in Advanced settings.',
      'invalid_objective'
    )
  }

  if (budgetAppliesAtAdgroup && budget < min) {
    return validationFail(
      `Daily budget ${budget} ${currency} is below TikTok minimum (~${min} ${currency}).`,
      'budget_minimum'
    )
  }
  if (!budgetAppliesAtAdgroup && budget < min) {
    return validationFail(
      `CBO campaign budget ${budget} ${currency} is below TikTok minimum (~${min} ${currency}).`,
      'budget_minimum'
    )
  }

  if (!payload.targeting.location_id) {
    return validationFail('Location is required.', 'targeting')
  }
  if (!payload.targeting.age_groups?.length) {
    return validationFail('Select at least one age group.', 'targeting')
  }

  const start = payload.targeting.schedule_start
  if (!start || !isValidLocalDatetime(start)) {
    return validationFail(
      'Start date/time is required (YYYY-MM-DDTHH:mm in ad account timezone).',
      'schedule'
    )
  }
  const tiktokStart = localDatetimeToTikTok(start)
  if (!tiktokStart) {
    return validationFail('Invalid start date/time.', 'schedule')
  }

  const end = payload.targeting.schedule_end
  if (end) {
    if (!isValidLocalDatetime(end)) {
      return validationFail('End date/time format is invalid.', 'schedule')
    }
    const tiktokEnd = localDatetimeToTikTok(end)
    if (tiktokEnd && tiktokEnd <= tiktokStart) {
      return validationFail('End time must be after start time.', 'schedule')
    }
  }

  if (payload.targeting.goal === 'leads') {
    const lf = payload.targeting.lead_form
    if (!lf) {
      return validationFail(
        'Lead generation requires a lead form selection.',
        'missing_required_field'
      )
    }
    if (lf.mode === 'existing' && !lf.page_id) {
      return validationFail(
        'Select an existing instant lead form (page_id).',
        'missing_required_field'
      )
    }
  }

  if (payload.targeting.goal === 'orders') {
    if (!payload.store?.tiktok_pixel_id) {
      return validationFail(
        'Order/conversion campaigns require a linked TikTok Pixel.',
        'missing_required_field'
      )
    }
  }

  if (adv.bidStrategy === 'cost_cap' && (adv.bidCap == null || adv.bidCap <= 0)) {
    return validationFail('Cost cap bid requires a positive bid cap value.', 'budget_minimum')
  }

  if (!timezone) {
    return validationFail('Ad account timezone could not be resolved.', 'schedule')
  }

  const src = payload.creative.source
  if (src === 'product_video' || src === 'upload') {
    const count = payload.creative.creative_ids?.length ?? 0
    if (count < 1) {
      return validationFail('Select at least one video creative.', 'missing_required_field')
    }
    if (count > 5) {
      return validationFail('Maximum 5 videos per ad group.', 'missing_required_field')
    }
  }

  return null
}

function validationFail(message: string, category?: CreateFlowError['category']): CreateFlowError {
  return {
    error: 'validation_error',
    step: 'validation',
    message,
    category: category ?? 'unknown',
    explanation: category ? explainCreateError(category) : 'Fix the fields above before launching.',
  }
}
