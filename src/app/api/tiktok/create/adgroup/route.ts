import { NextRequest, NextResponse } from 'next/server'
import { createTikTokAdgroup } from '@/lib/tiktok/create-ad/service'
import type { CreateAdWizardPayload } from '@/lib/tiktok/create-ad/types'
import { resolveOrThrow } from '@/lib/tiktok/mutations'
import { respondMutationResult } from '@/lib/tiktok/api-errors'

export async function POST(req: NextRequest) {
  try {
    const { connection, store } = await resolveOrThrow()
    const body = await req.json()
    const campaignId = String(body.campaign_id || '')
    const payload = body.payload as CreateAdWizardPayload
    if (!campaignId || !payload?.product?.title) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const result = await createTikTokAdgroup(connection, campaignId, payload)
    return respondMutationResult(result, { storeId: store.id, advertiserId: connection.advertiser_id })
  } catch (e: unknown) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
