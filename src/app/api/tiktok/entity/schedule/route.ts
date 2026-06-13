import { NextRequest, NextResponse } from 'next/server'
import { resolveOrThrow, updateSchedule } from '@/lib/tiktok/mutations'
import { respondMutationResult } from '@/lib/tiktok/api-errors'

function toTikTokDatetime(v: string) {
  if (!v) return v
  if (v.includes(' ')) return v
  return v.replace('T', ' ') + (v.length === 16 ? ':00' : '')
}

export async function POST(req: NextRequest) {
  try {
    const { connection, store } = await resolveOrThrow()
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
    return respondMutationResult(result, { storeId: store.id, advertiserId: connection.advertiser_id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
