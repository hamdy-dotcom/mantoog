import { NextRequest, NextResponse } from 'next/server'
import { resolveOrThrow, updateSchedule } from '@/lib/tiktok/mutations'

function toTikTokDatetime(v: string) {
  if (!v) return v
  if (v.includes(' ')) return v
  return v.replace('T', ' ') + (v.length === 16 ? ':00' : '')
}

export async function POST(req: NextRequest) {
  try {
    const { connection } = await resolveOrThrow()
    const { entity_id, schedule_start_time, schedule_end_time } = await req.json()
    if (!entity_id || !schedule_start_time || !schedule_end_time) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
    const result = await updateSchedule(
      connection,
      String(entity_id),
      toTikTokDatetime(String(schedule_start_time)),
      toTikTokDatetime(String(schedule_end_time))
    )
    if ('error' in result) {
      return NextResponse.json(result, { status: result.error === 'tiktok_error' ? 502 : 400 })
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
