import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { resolveOrThrow, tiktokGet } from '@/lib/tiktok/mutations'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 15

// Connected TikTok ad account info for the wizard (currency drives the budget field).
// tiktok_connections.currency can be null for older rows — fall back to a live
// /advertiser/info/ lookup and backfill the row so the next call is instant.
export async function GET() {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  let connection: any
  try {
    const resolved = await resolveOrThrow()
    connection = resolved.connection
  } catch {
    return NextResponse.json({ error: 'no_connection' }, { status: 404 })
  }

  let currency: string | null = connection.currency || null
  let name: string | null = null
  if (!currency) {
    try {
      const info = await tiktokGet(connection, '/advertiser/info/', {
        advertiser_ids: JSON.stringify([connection.advertiser_id]),
      })
      const row = (info.data as any)?.list?.[0]
      if (row?.currency) {
        currency = String(row.currency)
        name = row.name ? String(row.name) : null
        await supabaseAdmin
          .from('tiktok_connections')
          .update({ currency })
          .eq('advertiser_id', connection.advertiser_id)
      }
    } catch { /* fall through — client falls back to store currency */ }
  }

  return NextResponse.json({
    advertiser_id: connection.advertiser_id,
    currency,
    name,
  })
}
