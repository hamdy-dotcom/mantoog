import { NextRequest, NextResponse } from 'next/server'
import { fetchEntitiesForStore } from '@/lib/tiktok/entities'
import { ENTITY_LEVELS, type EntityLevel } from '@/lib/tiktok/types'
import { parseQueryDates } from '@/lib/tiktok/server'
import { resolveActiveConnection } from '@/lib/tiktok/server-auth'
import { jsonForTikTokFailure } from '@/lib/tiktok/api-errors'

export async function GET(req: NextRequest) {
  const dates = parseQueryDates(req.nextUrl.searchParams)
  if ('error' in dates) {
    return NextResponse.json({ error: dates.error }, { status: 400 })
  }

  const resolved = await resolveActiveConnection()
  if ('error' in resolved) {
    const activeCount = 'activeCount' in resolved ? resolved.activeCount : undefined
    console.log('[tiktok/campaigns] resolve result:', resolved.error, 'active_rows:', activeCount ?? 'n/a')
    if (resolved.error === 'no_active_account') {
      return NextResponse.json({ error: 'no_active_account', active_count: activeCount ?? 0 })
    }
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const levelParam = req.nextUrl.searchParams.get('level') || 'campaigns'
  const level = ENTITY_LEVELS.includes(levelParam as EntityLevel) ? (levelParam as EntityLevel) : 'campaigns'
  const entityId = req.nextUrl.searchParams.get('entity_id')
    || req.nextUrl.searchParams.get('campaign_id')

  const result = await fetchEntitiesForStore(
    resolved.connection,
    resolved.store.id,
    dates.start_date,
    dates.end_date,
    level,
    entityId
  )

  if ('error' in result) {
    if (result.error === 'reauth_required' || result.error === 'tiktok_error') {
      return jsonForTikTokFailure(result)
    }
    return NextResponse.json(result)
  }

  if (entityId) {
    const item = result.items.find(i => i.id === entityId) ?? result.items[0] ?? null
    return NextResponse.json({
      item,
      campaign: level === 'campaigns' && item ? { ...item, campaign_id: item.id, campaign_name: item.name } : undefined,
      currency: result.currency,
      level: result.level,
      start_date: result.start_date,
      end_date: result.end_date,
    })
  }

  return NextResponse.json({
    items: result.items,
    campaigns: level === 'campaigns'
      ? result.items.map(i => ({ ...i, campaign_id: i.id, campaign_name: i.name, operation_status: i.operation_status || 'ENABLE' }))
      : undefined,
    currency: result.currency,
    level: result.level,
    start_date: result.start_date,
    end_date: result.end_date,
  })
}
