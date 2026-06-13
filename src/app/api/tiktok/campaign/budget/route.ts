import { NextRequest, NextResponse } from 'next/server'
import { resolveOrThrow, updateBudget } from '@/lib/tiktok/mutations'
import type { EntityLevel } from '@/lib/tiktok/types'
import { respondMutationResult } from '@/lib/tiktok/api-errors'

export async function POST(req: NextRequest) {
  try {
    const { connection, store } = await resolveOrThrow()
    const body = await req.json()
    const level = (body.level || 'campaigns') as EntityLevel
    const entity_id = String(body.entity_id || body.campaign_id || '')
    const budgetNum = parseFloat(String(body.budget ?? ''))
    const is_smart_plus = Boolean(body.is_smart_plus)

    if (!entity_id || !Number.isFinite(budgetNum) || budgetNum <= 0) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const result = await updateBudget(connection, level, entity_id, budgetNum, is_smart_plus)
    return respondMutationResult(result, { storeId: store.id, advertiserId: connection.advertiser_id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
