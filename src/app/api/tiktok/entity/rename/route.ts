import { NextRequest, NextResponse } from 'next/server'
import { renameEntity, resolveOrThrow } from '@/lib/tiktok/mutations'
import type { EntityLevel } from '@/lib/tiktok/types'

export async function POST(req: NextRequest) {
  try {
    const { connection } = await resolveOrThrow()
    const { level, entity_id, name, is_smart_plus } = await req.json()
    if (!entity_id || !name?.trim()) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
    const result = await renameEntity(
      connection,
      level as EntityLevel,
      String(entity_id),
      String(name),
      Boolean(is_smart_plus)
    )
    if ('error' in result) {
      return NextResponse.json(result, { status: result.error === 'tiktok_error' ? 502 : 400 })
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
