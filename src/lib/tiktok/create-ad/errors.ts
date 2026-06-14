export type CreateErrorCategory =
  | 'duplicate_name'
  | 'invalid_objective'
  | 'budget_minimum'
  | 'missing_required_field'
  | 'targeting'
  | 'schedule'
  | 'auth'
  | 'unknown'

export type TikTokRawResponse = {
  code?: number
  message?: string
  request_id?: string
  data?: unknown
  [key: string]: unknown
}

export type CreateFlowError = {
  error: 'validation_error' | 'tiktok_error' | 'rollback_failed'
  step: 'validation' | 'campaign' | 'adgroup' | 'rollback' | 'pending_ad'
  code?: number
  message: string
  request_id?: string
  category?: CreateErrorCategory
  explanation?: string
  rolled_back?: boolean
  rollback_error?: string
}

const CATEGORY_PATTERNS: { category: CreateErrorCategory; patterns: RegExp[] }[] = [
  {
    category: 'duplicate_name',
    patterns: [/duplicate/i, /already exist/i, /name.*exist/i, /campaign_name/i],
  },
  {
    category: 'invalid_objective',
    patterns: [
      /objective/i,
      /optimization_goal/i,
      /promotion_type/i,
      /promotion_target/i,
      /not compatible/i,
      /invalid combination/i,
      /only cpc/i,
      /billing_event/i,
    ],
  },
  {
    category: 'budget_minimum',
    patterns: [/budget/i, /minimum/i, /less than/i, /too low/i, /bid.*price/i],
  },
  {
    category: 'missing_required_field',
    patterns: [
      /required/i,
      /missing/i,
      /pixel/i,
      /page_id/i,
      /instant.?form/i,
      /lead.?form/i,
      /landing_page/i,
    ],
  },
  {
    category: 'targeting',
    patterns: [/location/i, /geo/i, /audience/i, /age_group/i, /language/i, /placement/i],
  },
  {
    category: 'schedule',
    patterns: [/schedule/i, /start_time/i, /end_time/i, /time zone/i],
  },
  {
    category: 'auth',
    patterns: [/access token/i, /unauthorized/i, /permission/i, /scope/i],
  },
]

const EXPLANATIONS: Record<CreateErrorCategory, string> = {
  duplicate_name:
    'TikTok rejected the name because a campaign or ad group with this name already exists. A new unique suffix is generated on each launch — if you still see this, retry in a minute.',
  invalid_objective:
    'The campaign objective, optimization goal, or promotion type combination is not valid for this ad account (often an allowlist or API field mismatch).',
  budget_minimum:
    'Daily budget or bid is below TikTok’s minimum for this currency/account. Raise the budget and try again.',
  missing_required_field:
    'A required field for this objective is missing — e.g. TikTok Pixel for conversions, or instant lead form / page_id for lead generation.',
  targeting:
    'Targeting failed validation — check location ID, age groups, gender, languages, or placements.',
  schedule:
    'Schedule start/end time is invalid or in the wrong format for the ad account timezone.',
  auth:
    'TikTok rejected the access token or required API scope. Reconnect the ad account or wait for scope approval.',
  unknown:
    'TikTok returned an error that does not match a known category. See the raw message and request_id below.',
}

export function categorizeTikTokMessage(message: string, code?: number): CreateErrorCategory {
  const text = `${message} ${code ?? ''}`
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some(p => p.test(text))) return category
  }
  return 'unknown'
}

export function explainCreateError(category: CreateErrorCategory): string {
  return EXPLANATIONS[category]
}

export function buildCreateFlowError(
  step: CreateFlowError['step'],
  raw: TikTokRawResponse,
  extra?: Partial<CreateFlowError>
): CreateFlowError {
  const message = String(raw.message || 'TikTok API error')
  const code = typeof raw.code === 'number' ? raw.code : undefined
  const request_id = typeof raw.request_id === 'string' ? raw.request_id : undefined
  const category = categorizeTikTokMessage(message, code)

  return {
    error: 'tiktok_error',
    step,
    code,
    message,
    request_id,
    category,
    explanation: explainCreateError(category),
    ...extra,
  }
}

export function logTikTokCreateCall(
  step: string,
  path: string,
  requestBody: Record<string, unknown>,
  response: TikTokRawResponse
) {
  console.error(`[tiktok/create/${step}] POST ${path}`, {
    request: requestBody,
    response,
    code: response.code,
    message: response.message,
    request_id: response.request_id,
  })
}
