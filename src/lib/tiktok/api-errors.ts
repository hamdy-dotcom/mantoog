import { NextResponse } from 'next/server'
import { finalizeMutationResult, type TikTokApiFailure } from '@/lib/tiktok/server'

type ErrorPayload = TikTokApiFailure | { error: string; code?: number; message?: string; messages?: string[] }

export function jsonForTikTokFailure(result: ErrorPayload, tiktokStatus = 502) {
  if (result.error === 'reauth_required') {
    return NextResponse.json({ error: 'reauth_required' }, { status: 401 })
  }
  if (result.error === 'tiktok_error') {
    return NextResponse.json(result, { status: tiktokStatus })
  }
  return NextResponse.json(result, { status: 400 })
}

export async function respondMutationResult(
  result: { error?: string; code?: number; message?: string } & Record<string, unknown>,
  ctx: { storeId: string; advertiserId: string }
) {
  if (!('error' in result) || !result.error) {
    return NextResponse.json(result)
  }
  const final = await finalizeMutationResult(result, ctx)
  if ('error' in final && final.error) {
    return jsonForTikTokFailure(final as ErrorPayload)
  }
  return NextResponse.json(final)
}
