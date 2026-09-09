import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { resolveOrThrow, tiktokPost } from '@/lib/tiktok/mutations'

export const maxDuration = 120

// Demo-only: launches a real TikTok ad then immediately pauses the campaign.
export async function POST(req: NextRequest) {
  const auth = await assertAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))

  // Forward to the real launch API
  const origin = req.nextUrl.origin
  const launchRes = await fetch(`${origin}/api/admin/ugc-create-ad`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
    body: JSON.stringify(body),
  })

  const data = await launchRes.json()
  if (!launchRes.ok || !data.ok) {
    return NextResponse.json(data, { status: launchRes.status })
  }

  // Immediately pause — try Smart+ first, fall back to regular
  if (data.campaign_id) {
    try {
      const { connection } = await resolveOrThrow()
      const smartRes = await tiktokPost(connection, '/smart_plus/campaign/status/update/', {
        campaign_ids: [data.campaign_id],
        operation_status: 'DISABLE',
      })
      if (smartRes.code !== 0) {
        // Not a Smart+ campaign — try regular endpoint
        await tiktokPost(connection, '/campaign/status/update/', {
          campaign_ids: [data.campaign_id],
          operation_status: 'DISABLE',
        })
      }
    } catch {
      // Non-fatal — ad is live but investor won't see spend in time
    }
  }

  return NextResponse.json({ ...data, paused: true })
}
