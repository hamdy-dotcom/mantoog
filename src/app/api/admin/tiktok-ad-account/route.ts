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

  // The identity the ad will run under (same priority as the launch: BC_AUTH_TT >
  // TT_USER > CUSTOMIZED_USER) — used by the wizard's TikTok-style ad preview.
  let identity: { display_name: string | null; profile_image: string | null } | null = null
  try {
    const idRes = await tiktokGet(connection, '/identity/get/', {})
    const list: any[] = (idRes.data as any)?.identity_list || []
    const priority: Record<string, number> = { BC_AUTH_TT: 0, TT_USER: 1, CUSTOMIZED_USER: 2 }
    const best = [...list]
      .filter(i => i?.identity_id)
      .sort((a, b) => (priority[a.identity_type] ?? 9) - (priority[b.identity_type] ?? 9))[0]
    if (best) {
      identity = {
        display_name: best.display_name || best.username || null,
        profile_image: best.profile_image || null,
      }
    }
  } catch { /* preview falls back to store name */ }

  return NextResponse.json({
    advertiser_id: connection.advertiser_id,
    currency,
    name,
    identity,
  })
}
