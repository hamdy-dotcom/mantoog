import { NextRequest, NextResponse } from 'next/server'
import { launchCreateAdAtomic } from '@/lib/tiktok/create-ad/service'
import type { CreateFlowError } from '@/lib/tiktok/create-ad/errors'
import type { CreateAdWizardPayload } from '@/lib/tiktok/create-ad/types'
import { resolveOrThrow } from '@/lib/tiktok/mutations'
import { finalizeMutationResult } from '@/lib/tiktok/server'

function errorResponse(result: CreateFlowError, status = 502) {
  return NextResponse.json(result, { status: result.error === 'validation_error' ? 400 : status })
}

export async function POST(req: NextRequest) {
  try {
    const { connection, store } = await resolveOrThrow()
    const body = await req.json()
    const payload = body.payload as CreateAdWizardPayload

    const result = await launchCreateAdAtomic(connection, store, payload)

    if (!('ok' in result) || !result.ok) {
      const err = result as CreateFlowError
      if (err.step === 'campaign' && err.error === 'tiktok_error') {
        const finalized = await finalizeMutationResult(
          { error: 'tiktok_error', code: err.code, message: err.message },
          { storeId: store.id, advertiserId: connection.advertiser_id }
        )
        if ('error' in finalized && finalized.error === 'reauth_required') {
          return NextResponse.json({ error: 'reauth_required' }, { status: 401 })
        }
      }
      return errorResponse(err)
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    const err = e as Error & { status?: number }
    if (err.message === 'reauth_required') {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
