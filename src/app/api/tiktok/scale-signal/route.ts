import { NextRequest, NextResponse } from 'next/server'
import type { WinnerLevel } from '@/lib/tiktok/entities'
import { fetchScaleSignal } from '@/lib/tiktok/scale-signal'
import { parseQueryDates, resolveActiveConnection } from '@/lib/tiktok/server'
import { jsonForTikTokFailure } from '@/lib/tiktok/api-errors'

const LEVELS = new Set<WinnerLevel>(['campaigns', 'adgroups', 'ads'])

export async function GET(req: NextRequest) {
  const dates = parseQueryDates(req.nextUrl.searchParams)
  if ('error' in dates) {
    return NextResponse.json({ error: dates.error }, { status: 400 })
  }

  const level = (req.nextUrl.searchParams.get('level') || 'campaigns') as WinnerLevel
  const entityId = req.nextUrl.searchParams.get('entity_id') || ''
  const budgetParam = req.nextUrl.searchParams.get('daily_budget')
  const dailyBudget = budgetParam != null ? parseFloat(budgetParam) : null
  const smartPlusParam = req.nextUrl.searchParams.get('is_smart_plus')
  const duplicateAvailable = smartPlusParam !== 'true' && smartPlusParam !== '1'

  if (!LEVELS.has(level) || !entityId) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const resolved = await resolveActiveConnection()
  if ('error' in resolved) {
    if (resolved.error === 'no_active_account') {
      return NextResponse.json({ error: 'no_active_account' })
    }
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const result = await fetchScaleSignal(
    resolved.connection,
    resolved.store.id,
    level,
    entityId,
    dates.start_date,
    dates.end_date,
    Number.isFinite(dailyBudget) && dailyBudget! > 0 ? dailyBudget : null,
    { duplicate_available: duplicateAvailable }
  )

  if ('error' in result) {
    if (result.error === 'tiktok_error') {
      return jsonForTikTokFailure(result)
    }
    return NextResponse.json(result)
  }

  return NextResponse.json(result)
}
