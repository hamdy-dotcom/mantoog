import { NextRequest, NextResponse } from 'next/server'
import type { CreateFlowError } from '@/lib/tiktok/create-ad/errors'
import { launchCreateAdAtomic } from '@/lib/tiktok/create-ad/service'
import type { CreateAdWizardPayload } from '@/lib/tiktok/create-ad/types'
import { resolveOrThrow } from '@/lib/tiktok/mutations'
import { finalizeMutationResult } from '@/lib/tiktok/server'

import type { BulkLaunchItemResult } from '@/lib/tiktok/create-ad/bulk-types'

export async function POST(req: NextRequest) {
  try {
    const { connection, store } = await resolveOrThrow()
    const body = await req.json()
    const payloads = (body.payloads || []) as CreateAdWizardPayload[]

    if (!Array.isArray(payloads) || payloads.length === 0) {
      return NextResponse.json({ error: 'invalid_body', message: 'No products to launch' }, { status: 400 })
    }
    if (payloads.length > 20) {
      return NextResponse.json({ error: 'invalid_body', message: 'Maximum 20 campaigns per bulk launch' }, { status: 400 })
    }

    const results: BulkLaunchItemResult[] = []
    let reauthHit = false

    for (const payload of payloads) {
      const title = payload.product?.title || payload.product?.id || 'Product'
      const result = await launchCreateAdAtomic(connection, store, payload)

      if ('ok' in result && result.ok) {
        results.push({
          product_id: payload.product.id,
          product_title: title,
          ok: true,
          campaign_id: result.campaign_id,
          adgroup_id: result.adgroup_id,
          campaign_name: result.campaign_name,
          message: result.message,
          ads: result.ads,
          partial: result.partial,
        })
        continue
      }

      const err = result as CreateFlowError
      if (err.step === 'campaign' && err.error === 'tiktok_error') {
        const finalized = await finalizeMutationResult(
          { error: 'tiktok_error', code: err.code, message: err.message },
          { storeId: store.id, advertiserId: connection.advertiser_id }
        )
        if ('error' in finalized && finalized.error === 'reauth_required') {
          reauthHit = true
          break
        }
      }

      results.push({
        product_id: payload.product.id,
        product_title: title,
        ok: false,
        error: err.message || err.error,
        step: err.step,
        code: err.code,
        request_id: err.request_id,
        explanation: err.explanation,
        rolled_back: err.rolled_back,
      })
    }

    if (reauthHit) {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401 })
    }

    const succeeded = results.filter(r => r.ok).length
    const failed = results.filter(r => !r.ok).length

    return NextResponse.json({
      ok: failed === 0,
      results,
      succeeded,
      failed,
      total: results.length,
    })
  } catch (e: unknown) {
    const err = e as Error & { status?: number }
    if (err.message === 'reauth_required') {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
