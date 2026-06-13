import { NextRequest, NextResponse } from 'next/server'
import { duplicateEntity, resolveOrThrow } from '@/lib/tiktok/mutations'
import type { EntityLevel } from '@/lib/tiktok/types'
import { respondMutationResult } from '@/lib/tiktok/api-errors'

export async function POST(req: NextRequest) {
  try {
    const { connection, store } = await resolveOrThrow()
    const { level, entity_id, is_smart_plus } = await req.json()
    if (!entity_id) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const result = await duplicateEntity(
      connection,
      level as EntityLevel,
      String(entity_id),
      Boolean(is_smart_plus)
    )
    return respondMutationResult(result, { storeId: store.id, advertiserId: connection.advertiser_id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
