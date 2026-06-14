import type { WinnerLevel } from '@/lib/tiktok/entities'
import {
  fetchAdvertiserInfo,
  fetchIntegratedReport,
  formatDate,
  num,
  resolveAdvertiserCurrency,
} from '@/lib/tiktok/server'
import { currencyDefaultTimezone, todayInTimezone } from '@/lib/tiktok/timezone'

export type ScaleRecommendation = 'boost_today' | 'duplicate' | 'proven_winner' | 'early' | 'declining'
export type ScaleStrategy = 'boost_today' | 'duplicate' | 'step_up' | 'custom'

export type ScaleSignal = {
  currency: string
  timezone: string
  today: {
    date: string
    spend: number
    conversions: number
    cpa: number | null
    daily_budget: number | null
    pacing_pct: number | null
  }
  average: {
    cpa: number | null
    total_conversions: number
    days: number
  }
  cpa_indicator: 'better' | 'worse' | 'neutral'
  trend: 'rising' | 'steady' | 'declining'
  recommendation: ScaleRecommendation
  recommended_strategy: ScaleStrategy
  warnings: Array<'learning' | 'declining'>
  period_conversions: number
  duplicate_available: boolean
}

function reportConfig(level: WinnerLevel) {
  if (level === 'campaigns') return { data_level: 'AUCTION_CAMPAIGN', idKey: 'campaign_id' }
  if (level === 'adgroups') return { data_level: 'AUCTION_ADGROUP', idKey: 'adgroup_id' }
  return { data_level: 'AUCTION_AD', idKey: 'ad_id' }
}

function cpaFrom(spend: number, conversions: number): number | null {
  if (conversions <= 0) return null
  return spend / conversions
}

function parseEntityDayRow(
  row: { dimensions?: Record<string, unknown>; metrics?: Record<string, unknown> },
  idKey: string,
  entityId: string
) {
  if (String(row.dimensions?.[idKey] || '') !== entityId) return null
  const m = row.metrics || {}
  const spend = num(m.spend)
  const conversions = num(m.conversion)
  return {
    date: String(row.dimensions?.stat_time_day || '').slice(0, 10),
    spend,
    conversions,
    cpa: num(m.cost_per_conversion) > 0 ? num(m.cost_per_conversion) : cpaFrom(spend, conversions),
  }
}

async function resolveTimezone(
  connection: { advertiser_id: string; access_token: string },
  currency: string
): Promise<string> {
  const json = await fetchAdvertiserInfo(connection)
  const tz = json.code === 0 ? json.data?.list?.[0]?.timezone : null
  if (typeof tz === 'string' && tz.length > 0) return tz
  return currencyDefaultTimezone(currency)
}

function pickRecommendation(
  signal: Omit<ScaleSignal, 'recommendation' | 'recommended_strategy' | 'warnings' | 'duplicate_available'> & {
    period_conversions: number
    duplicate_available: boolean
  }
): Pick<ScaleSignal, 'recommendation' | 'recommended_strategy' | 'warnings'> {
  const warnings: ScaleSignal['warnings'] = []
  if (signal.period_conversions < 50) warnings.push('learning')
  if (signal.trend === 'declining') warnings.push('declining')

  if (signal.trend === 'declining') {
    return { recommendation: 'declining', recommended_strategy: 'custom', warnings }
  }

  const pacingHigh = (signal.today.pacing_pct ?? 0) >= 65
  if (signal.cpa_indicator === 'better' && pacingHigh) {
    return { recommendation: 'boost_today', recommended_strategy: 'boost_today', warnings }
  }

  if (signal.period_conversions >= 50 && (signal.trend === 'steady' || signal.trend === 'rising')) {
    if (!signal.duplicate_available) {
      return { recommendation: 'proven_winner', recommended_strategy: 'step_up', warnings }
    }
    return { recommendation: 'duplicate', recommended_strategy: 'duplicate', warnings }
  }

  if (signal.period_conversions < 50) {
    return { recommendation: 'early', recommended_strategy: 'boost_today', warnings }
  }

  return { recommendation: 'early', recommended_strategy: 'step_up', warnings }
}

function computeTrend(
  recentDays: Array<{ date: string; conversions: number; cpa: number | null }>
): 'rising' | 'steady' | 'declining' {
  const sorted = [...recentDays].filter(d => d.date).sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return 'steady'

  const convs = sorted.map(d => d.conversions)
  const cpas = sorted.map(d => d.cpa).filter((c): c is number => c != null && c > 0)

  const convDown = convs.length >= 2 && convs[convs.length - 1] < convs[convs.length - 2] * 0.7
  const cpaUp = cpas.length >= 2 && cpas[cpas.length - 1] > cpas[cpas.length - 2] * 1.25
  if (convDown || cpaUp) return 'declining'

  const convUp = convs.length >= 2 && convs[convs.length - 1] > convs[convs.length - 2] * 1.2
  const cpaDown = cpas.length >= 2 && cpas[cpas.length - 1] < cpas[cpas.length - 2] * 0.85
  if (convUp || cpaDown) return 'rising'

  return 'steady'
}

export async function fetchScaleSignal(
  connection: { advertiser_id: string; access_token: string; currency?: string | null },
  storeId: string,
  level: WinnerLevel,
  entityId: string,
  periodStart: string,
  periodEnd: string,
  dailyBudget: number | null,
  opts?: { duplicate_available?: boolean }
): Promise<ScaleSignal | { error: string; message?: string; code?: number }> {
  const duplicate_available = opts?.duplicate_available !== false
  const currency = await resolveAdvertiserCurrency(connection, storeId)
  const timezone = await resolveTimezone(connection, currency)
  const today = todayInTimezone(timezone)
  const { data_level, idKey } = reportConfig(level)

  const metrics = ['spend', 'conversion', 'cost_per_conversion']

  const [todayReport, periodReport, recentReport] = await Promise.all([
    fetchIntegratedReport(connection, {
      start_date: today,
      end_date: today,
      data_level,
      dimensions: [idKey],
      metrics,
      page_size: 10,
    }),
    fetchIntegratedReport(connection, {
      start_date: periodStart,
      end_date: periodEnd,
      data_level,
      dimensions: [idKey],
      metrics,
      page_size: 10,
    }),
    fetchIntegratedReport(connection, {
      start_date: formatDate(new Date(Date.now() - 3 * 86400000)),
      end_date: today,
      data_level,
      dimensions: [idKey, 'stat_time_day'],
      metrics,
      page_size: 50,
    }),
  ])

  if (todayReport.code !== 0) {
    return { error: 'tiktok_error', message: todayReport.message, code: todayReport.code }
  }

  let todaySpend = 0
  let todayConv = 0
  let todayCpa: number | null = null
  for (const row of todayReport.data?.list || []) {
    if (String(row.dimensions?.[idKey] || '') !== entityId) continue
    const m = row.metrics || {}
    todaySpend = num(m.spend)
    todayConv = num(m.conversion)
    todayCpa = num(m.cost_per_conversion) > 0
      ? num(m.cost_per_conversion)
      : cpaFrom(todaySpend, todayConv)
  }

  let periodSpend = 0
  let periodConv = 0
  for (const row of periodReport.data?.list || []) {
    if (String(row.dimensions?.[idKey] || '') !== entityId) continue
    const m = row.metrics || {}
    periodSpend += num(m.spend)
    periodConv += num(m.conversion)
  }

  const periodDays = Math.max(1, Math.ceil(
    (new Date(`${periodEnd}T12:00:00Z`).getTime() - new Date(`${periodStart}T12:00:00Z`).getTime()) / 86400000
  ) + 1)

  const avgCpa = periodConv > 0 ? periodSpend / periodConv : null

  const recentDays: Array<{ date: string; conversions: number; cpa: number | null }> = []
  if (recentReport.code === 0) {
    for (const row of recentReport.data?.list || []) {
      const parsed = parseEntityDayRow(row, idKey, entityId)
      if (parsed?.date) recentDays.push(parsed)
    }
  }

  const trend = computeTrend(recentDays)

  let cpa_indicator: ScaleSignal['cpa_indicator'] = 'neutral'
  if (todayCpa != null && avgCpa != null && avgCpa > 0) {
    if (todayCpa < avgCpa * 0.95) cpa_indicator = 'better'
    else if (todayCpa > avgCpa * 1.1) cpa_indicator = 'worse'
  }

  const pacing_pct = dailyBudget != null && dailyBudget > 0
    ? Math.min(100, Math.round((todaySpend / dailyBudget) * 100))
    : null

  const base = {
    currency,
    timezone,
    today: {
      date: today,
      spend: todaySpend,
      conversions: todayConv,
      cpa: todayCpa,
      daily_budget: dailyBudget,
      pacing_pct,
    },
    average: {
      cpa: avgCpa,
      total_conversions: periodConv,
      days: periodDays,
    },
    cpa_indicator,
    trend,
    period_conversions: periodConv,
    duplicate_available,
  }

  const picked = pickRecommendation(base)
  return { ...base, ...picked }
}
