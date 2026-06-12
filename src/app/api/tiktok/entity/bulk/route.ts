import { NextRequest, NextResponse } from 'next/server'
import { resolveOrThrow, toggleEntities, updateBudget } from '@/lib/tiktok/mutations'
import type { EntityLevel } from '@/lib/tiktok/types'

export async function POST(req: NextRequest) {
  try {
    const { connection } = await resolveOrThrow()
    const { level, action, entity_ids, budget, smart_plus_ids } = await req.json()
    const ids = Array.isArray(entity_ids) ? entity_ids.map(String).filter(Boolean) : []
    const smartPlusSet = new Set(
      Array.isArray(smart_plus_ids) ? smart_plus_ids.map(String).filter(Boolean) : []
    )
    if (!ids.length || !action) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    if (action === 'pause') {
      const result = await toggleEntities(connection, level as EntityLevel, ids, 'DISABLE', smartPlusSet)
      if ('error' in result) return NextResponse.json(result, { status: 502 })
      return NextResponse.json(result)
    }

    if (action === 'resume') {
      const result = await toggleEntities(connection, level as EntityLevel, ids, 'ENABLE', smartPlusSet)
      if ('error' in result) return NextResponse.json(result, { status: 502 })
      return NextResponse.json(result)
    }

    if (action === 'set_budget') {
      const budgetNum = parseFloat(String(budget ?? ''))
      if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
        return NextResponse.json({ error: 'invalid_budget' }, { status: 400 })
      }
      const errors: string[] = []
      for (const id of ids) {
        const isSmartPlus = smartPlusSet.has(id)
        const r = await updateBudget(connection, level as EntityLevel, id, budgetNum, isSmartPlus)
        if ('error' in r) errors.push(`${id}: ${r.message || r.error}`)
      }
      if (errors.length) return NextResponse.json({ error: 'partial_failure', messages: errors }, { status: 502 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
