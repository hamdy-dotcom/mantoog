import { NextRequest, NextResponse } from 'next/server'
import { resolveOrThrow, toggleEntities } from '@/lib/tiktok/mutations'
import type { EntityLevel } from '@/lib/tiktok/types'
import { respondMutationResult } from '@/lib/tiktok/api-errors'

export async function POST(req: NextRequest) {
  try {
    const { connection, store } = await resolveOrThrow()
    const body = await req.json()
    const level = (body.level || 'campaigns') as EntityLevel
    const entity_id = String(body.entity_id || body.campaign_id || '')
    const status = body.status
    const is_smart_plus = Boolean(body.is_smart_plus)

    if (!entity_id || (status !== 'ENABLE' && status !== 'DISABLE')) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const smartPlusIds = is_smart_plus ? [entity_id] : undefined
    const result = await toggleEntities(connection, level, [entity_id], status, smartPlusIds)
    return respondMutationResult(result, { storeId: store.id, advertiserId: connection.advertiser_id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
