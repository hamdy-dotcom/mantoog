import { NextRequest, NextResponse } from 'next/server'
import { fetchDuplicateScaleContext } from '@/lib/tiktok/scale-duplicate'
import { resolveActiveConnection } from '@/lib/tiktok/server'
import { jsonForTikTokFailure } from '@/lib/tiktok/api-errors'

export async function GET(req: NextRequest) {
  const level = req.nextUrl.searchParams.get('level') || ''
  const entityId = req.nextUrl.searchParams.get('entity_id') || ''
  const budgetParam = req.nextUrl.searchParams.get('daily_budget')
  const dailyBudget = budgetParam != null ? parseFloat(budgetParam) : null

  if (!['campaigns', 'adgroups'].includes(level) || !entityId) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const resolved = await resolveActiveConnection()
  if ('error' in resolved) {
    if (resolved.error === 'no_active_account') {
      return NextResponse.json({ error: 'no_active_account' })
    }
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const result = await fetchDuplicateScaleContext(
    resolved.connection,
    level as 'campaigns' | 'adgroups',
    entityId,
    Number.isFinite(dailyBudget) && dailyBudget! > 0 ? dailyBudget : null
  )

  if ('error' in result) {
    if (result.error === 'tiktok_error') return jsonForTikTokFailure(result)
    return NextResponse.json(result, { status: result.error === 'not_found' ? 404 : 400 })
  }

  return NextResponse.json(result)
}
