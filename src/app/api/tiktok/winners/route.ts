import { NextRequest, NextResponse } from 'next/server'
import { fetchWinners, type WinnerLevel } from '@/lib/tiktok/entities'
import { parseQueryDates, resolveActiveConnection } from '@/lib/tiktok/server'
import { jsonForTikTokFailure } from '@/lib/tiktok/api-errors'

const WINNER_LEVELS = new Set<WinnerLevel>(['campaigns', 'adgroups', 'ads'])

export async function GET(req: NextRequest) {
  const dates = parseQueryDates(req.nextUrl.searchParams)
  if ('error' in dates) {
    return NextResponse.json({ error: dates.error }, { status: 400 })
  }

  const levelParam = req.nextUrl.searchParams.get('level') || 'campaigns'
  if (!WINNER_LEVELS.has(levelParam as WinnerLevel)) {
    return NextResponse.json({ error: 'invalid_level' }, { status: 400 })
  }
  const level = levelParam as WinnerLevel

  const resolved = await resolveActiveConnection()
  if ('error' in resolved) {
    if (resolved.error === 'no_active_account') {
      return NextResponse.json({
        error: 'no_active_account',
        active_count: 'activeCount' in resolved ? resolved.activeCount ?? 0 : 0,
      })
    }
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const result = await fetchWinners(
    resolved.connection,
    resolved.store.id,
    dates.start_date,
    dates.end_date,
    level
  )

  if ('error' in result) {
    if (result.error === 'reauth_required' || result.error === 'tiktok_error') {
      return jsonForTikTokFailure(result)
    }
    return NextResponse.json(result)
  }

  return NextResponse.json(result)
}
