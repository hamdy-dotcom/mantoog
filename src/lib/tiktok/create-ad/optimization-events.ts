export type ConversionEventPreference =
  | 'place_an_order'
  | 'purchase'
  | 'initiate_checkout'
  | 'add_to_cart'
  | 'view_content'
  | 'landing_page_view'

/** Default for Get orders — COD-friendly (orders placed, not card captured). */
export const DEFAULT_CONVERSION_EVENT_PREFERENCE: ConversionEventPreference = 'place_an_order'

export const DEFAULT_ORDER_OPTIMIZATION_EVENT = 'ON_WEB_ORDER'

/** If TikTok rejects the primary order event, try these API codes in order. */
export const ORDER_OPTIMIZATION_API_FALLBACKS = [
  'ON_WEB_ORDER',
  'SUCCESSORDER_ACTION',
  'INITIATE_ORDER',
] as const

/**
 * Pixel Events Manager display labels → TikTok optimization_event codes.
 * Covers human-readable names returned by /pixel/list/ alongside API codes.
 */
export const PIXEL_EVENT_ALIASES: Record<string, string> = {
  'PAGE VIEW': 'PAGE_VIEW',
  'VIEW CONTENT': 'ON_WEB_DETAIL',
  'LANDING PAGE VIEW': 'LANDING_PAGE_VIEW',
  'ENGAGED SESSION': 'ENGAGED_SESSION',
  'INITIATE CHECKOUT': 'INITIATE_CHECKOUT',
  'PLACE AN ORDER': 'ON_WEB_ORDER',
  'PURCHASE': 'SHOPPING',
  'ADD TO CART': 'ON_WEB_CART',
  // Common API spellings
  ON_WEB_ORDER: 'ON_WEB_ORDER',
  SHOPPING: 'SHOPPING',
  INITIATE_CHECKOUT: 'INITIATE_CHECKOUT',
  ON_WEB_CART: 'ON_WEB_CART',
  ON_WEB_DETAIL: 'ON_WEB_DETAIL',
  LANDING_PAGE_VIEW: 'LANDING_PAGE_VIEW',
  SUCCESSORDER_ACTION: 'SUCCESSORDER_ACTION',
  INITIATE_ORDER: 'INITIATE_ORDER',
}

/** UI preference → TikTok optimization_event candidates (first pixel match wins). */
export const CONVERSION_EVENT_OPTIONS: {
  id: ConversionEventPreference
  tiktokCandidates: string[]
  labelEn: string
  labelAr: string
  recommended?: boolean
  hintEn?: string
  hintAr?: string
}[] = [
  {
    id: 'place_an_order',
    tiktokCandidates: ['ON_WEB_ORDER'],
    labelEn: 'Place an order',
    labelAr: 'إتمام الطلب',
    recommended: true,
    hintEn: 'Best for COD — optimizes for orders placed, not card payments.',
    hintAr: 'الأفضل للدفع عند الاستلام — يحسّن لطلبات مُسجّلة وليس مدفوعات البطاقة.',
  },
  {
    id: 'purchase',
    tiktokCandidates: ['SHOPPING', 'ON_WEB_ORDER'],
    labelEn: 'Purchase / Complete payment',
    labelAr: 'شراء / إتمام الدفع',
  },
  {
    id: 'initiate_checkout',
    tiktokCandidates: ['INITIATE_CHECKOUT'],
    labelEn: 'Initiate checkout',
    labelAr: 'بدء الدفع',
  },
  {
    id: 'add_to_cart',
    tiktokCandidates: ['ON_WEB_CART'],
    labelEn: 'Add to cart',
    labelAr: 'إضافة للسلة',
  },
  {
    id: 'view_content',
    tiktokCandidates: ['ON_WEB_DETAIL'],
    labelEn: 'View content',
    labelAr: 'عرض المحتوى',
  },
  {
    id: 'landing_page_view',
    tiktokCandidates: ['LANDING_PAGE_VIEW'],
    labelEn: 'Landing page view',
    labelAr: 'عرض صفحة الهبوط',
  },
]

export function normalizePixelEventToken(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const upper = trimmed.toUpperCase()
  return PIXEL_EVENT_ALIASES[upper] ?? upper.replace(/\s+/g, '_')
}

export function extractPixelEventCodes(row: Record<string, unknown>): string[] {
  const codes = new Set<string>()

  const add = (value: unknown) => {
    if (value == null) return
    const normalized = normalizePixelEventToken(String(value))
    if (normalized) codes.add(normalized)
  }

  const lists = [
    row.events,
    row.event_codes,
    row.pixel_events,
    row.optimization_events,
  ]

  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (typeof item === 'string') {
        add(item)
        continue
      }
      if (!item || typeof item !== 'object') continue
      const event = item as Record<string, unknown>
      add(
        event.event_type
        ?? event.event_code
        ?? event.optimization_event
        ?? event.code
        ?? event.name
        ?? event.event
        ?? event.event_name
      )
    }
  }

  return [...codes]
}

function pickFirstAvailable(
  candidates: string[],
  available: string[]
): string | undefined {
  if (!available.length) return candidates[0]
  const set = new Set(available.map(normalizePixelEventToken))
  return candidates.find(candidate => set.has(normalizePixelEventToken(candidate)))
}

export function pickOptimizationEvent(
  available: string[],
  preference: ConversionEventPreference = DEFAULT_CONVERSION_EVENT_PREFERENCE
): string {
  const option = CONVERSION_EVENT_OPTIONS.find(o => o.id === preference)
    ?? CONVERSION_EVENT_OPTIONS[0]

  const normalizedAvailable = available.map(normalizePixelEventToken)

  const matched = pickFirstAvailable(option.tiktokCandidates, normalizedAvailable)
  if (matched) return matched

  if (normalizedAvailable.length) {
    for (const fallbackOption of CONVERSION_EVENT_OPTIONS) {
      const fallback = pickFirstAvailable(
        fallbackOption.tiktokCandidates,
        normalizedAvailable
      )
      if (fallback) return fallback
    }
    return normalizedAvailable[0]
  }

  return option.tiktokCandidates[0] ?? DEFAULT_ORDER_OPTIMIZATION_EVENT
}

export function orderOptimizationRetryEvents(
  primary: string,
  available: string[] = []
): string[] {
  const normalizedAvailable = available.map(normalizePixelEventToken)
  const chain = ORDER_OPTIMIZATION_API_FALLBACKS.filter(
    (event, index, all) => all.indexOf(event) === index
  )

  const ordered: string[] = []
  const add = (event: string) => {
    const normalized = normalizePixelEventToken(event)
    if (!normalized || ordered.includes(normalized)) return
    if (normalizedAvailable.length && !normalizedAvailable.includes(normalized)) return
    ordered.push(normalized)
  }

  add(primary)
  for (const event of chain) add(event)

  if (!ordered.length) {
    return [...ORDER_OPTIMIZATION_API_FALLBACKS]
  }
  return ordered
}

export function isOptimizationEventApiError(message?: string, code?: number): boolean {
  const text = `${message ?? ''} ${code ?? ''}`.toLowerCase()
  return (
    text.includes('optimization_event')
    || text.includes('optimization event')
    || (text.includes('event') && text.includes('valid'))
  )
}

export type ConversionEventUiOption = {
  id: ConversionEventPreference
  labelEn: string
  labelAr: string
  event: string
  recommended?: boolean
  hintEn?: string
  hintAr?: string
}

/** Build merchant-facing options from pixel events returned by /pixel/list/. */
export function buildConversionUiOptions(available: string[]): ConversionEventUiOption[] {
  const normalizedAvailable = available.map(normalizePixelEventToken)
  const options: ConversionEventUiOption[] = []

  for (const option of CONVERSION_EVENT_OPTIONS) {
    const event = pickFirstAvailable(option.tiktokCandidates, normalizedAvailable)

    if (normalizedAvailable.length && !event) continue

    options.push({
      id: option.id,
      labelEn: option.labelEn,
      labelAr: option.labelAr,
      event: event ?? option.tiktokCandidates[0],
      recommended: option.recommended,
      hintEn: option.hintEn,
      hintAr: option.hintAr,
    })
  }

  if (options.length) return options

  return [{
    id: DEFAULT_CONVERSION_EVENT_PREFERENCE,
    labelEn: CONVERSION_EVENT_OPTIONS[0].labelEn,
    labelAr: CONVERSION_EVENT_OPTIONS[0].labelAr,
    event: DEFAULT_ORDER_OPTIMIZATION_EVENT,
    recommended: true,
    hintEn: CONVERSION_EVENT_OPTIONS[0].hintEn,
    hintAr: CONVERSION_EVENT_OPTIONS[0].hintAr,
  }]
}

export function defaultConversionPreference(
  available: string[]
): ConversionEventPreference {
  const options = buildConversionUiOptions(available)
  const preferred = options.find(o => o.id === DEFAULT_CONVERSION_EVENT_PREFERENCE)
  return preferred?.id ?? options[0]?.id ?? DEFAULT_CONVERSION_EVENT_PREFERENCE
}
