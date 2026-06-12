import { NextRequest, NextResponse } from 'next/server'
import { duplicateEntity, resolveOrThrow } from '@/lib/tiktok/mutations'
import type { EntityLevel } from '@/lib/tiktok/types'

export async function POST(req: NextRequest) {
  try {
    const { connection } = await resolveOrThrow()
    const { level, entity_id, is_smart_plus } = await req.json()
    if (!entity_id) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const result = await duplicateEntity(
      connection,
      level as EntityLevel,
      String(entity_id),
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
