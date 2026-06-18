import { tiktokPost } from '@/lib/tiktok/mutations'
import { buildAdgroupPayload, buildCampaignPayload } from '@/lib/tiktok/create-ad/payloads'
import {
  buildCreateFlowError,
  logTikTokCreateCall,
  type CreateFlowError,
  type TikTokRawResponse,
} from '@/lib/tiktok/create-ad/errors'
import { validateCreatePayload } from '@/lib/tiktok/create-ad/validate'
import type { CreateAdWizardPayload } from '@/lib/tiktok/create-ad/types'
import {
  finalizeMutationResult,
  resolveAdvertiserTimezone,
  supabaseAdmin,
} from '@/lib/tiktok/server'
import {
  createTikTokAd,
  MAX_VIDEO_ADS_PER_GROUP,
  resolveTikTokIdentity,
  uploadCreativeToTikTok,
  uploadSingleVideoCreative,
} from '@/lib/tiktok/create-ad/publish'
import { cacheTikTokCreativeIds, resolveCreativeSelection } from '@/lib/product-creatives/server'
import { resolveConversionPixel } from '@/lib/tiktok/pixels'
import {
  isOptimizationEventApiError,
  orderOptimizationRetryEvents,
} from '@/lib/tiktok/create-ad/optimization-events'
import { withPublicProductLandingUrl } from '@/lib/tiktok/create-ad/landing-url'
import type { LaunchAdResult, LaunchSuccess } from '@/lib/tiktok/create-ad/launch-types'

type Connection = { advertiser_id: string; access_token: string }

function isVideoCreativeSource(source: CreateAdWizardPayload['creative']['source']) {
  return source === 'product_video' || source === 'upload'
}

async function cacheUploadedCreative(
  uploadRes: { creative: import('@/lib/tiktok/create-ad/publish').UploadedCreative },
  payload: CreateAdWizardPayload,
  storeId: string
) {
  try {
    await cacheTikTokCreativeIds({
      creativeIds: uploadRes.creative.creative_ids || [],
      video_id: uploadRes.creative.video_id,
      image_ids: uploadRes.creative.image_ids,
      cover_image_id: uploadRes.creative.cover_image_id,
      video_url: uploadRes.creative.video_url,
      image_urls: uploadRes.creative.image_urls,
      productId: payload.product.id,
      storeId,
    })
  } catch (cacheErr) {
    console.error('[tiktok/create/launch] creative cache write failed:', cacheErr)
  }
}

function buildMultiAdMessage(
  adResults: LaunchAdResult[],
  isLeads: boolean
): { message: string; partial: boolean } {
  const succeeded = adResults.filter(r => r.ok)
  const failed = adResults.filter(r => !r.ok)
  const noun = isLeads ? 'lead-gen ad' : 'ad'
  const plural = succeeded.length === 1 ? noun : `${noun}s`

  if (!failed.length) {
    return {
      message: isLeads
        ? `Campaign, ad group, and ${succeeded.length} ${plural} created successfully.`
        : `Campaign, ad group, and ${succeeded.length} ${plural} created successfully.`,
      partial: false,
    }
  }

  const failReasons = failed
    .map(f => f.error)
    .filter((msg): msg is string => Boolean(msg))
  const reasonText = failReasons.length ? `: ${failReasons.join('; ')}` : ''
  return {
    message: `${succeeded.length} of ${adResults.length} ${plural} created, ${failed.length} failed${reasonText}`,
    partial: true,
  }
}

async function launchVideoAdsInGroup(opts: {
  connection: Connection
  store: { id: string }
  payload: CreateAdWizardPayload
  campaign: { campaign_id: string; campaign_name: string }
  adgroup: { adgroup_id: string; adgroup_name: string }
  identity: import('@/lib/tiktok/create-ad/publish').IdentityChoice
  videoFile?: File | null
  maxVideoAds?: number
}): Promise<LaunchSuccess | CreateFlowError> {
  const { connection, store, payload, campaign, adgroup, identity, videoFile, maxVideoAds } = opts
  const maxAds = maxVideoAds ?? MAX_VIDEO_ADS_PER_GROUP
  const resolved = await resolveCreativeSelection({
    productId: payload.product.id,
    productImages: payload.product.images || [],
    creativeIds: payload.creative.creative_ids,
    videoUrl: payload.creative.media?.video_url,
    imageUrls: payload.creative.media?.image_urls || undefined,
  })
  const videoItems = resolved.items
    .filter(i => i.type === 'video')
    .slice(0, maxAds)

  if (!videoItems.length) {
    return {
      error: 'validation_error',
      step: 'validation',
      message: 'Select at least one video creative.',
      category: 'missing_required_field',
      explanation: 'Pick 1–5 videos from the product library or upload footage.',
    }
  }

  const adResults: LaunchAdResult[] = []

  type PendingVideoAd = {
    item: (typeof videoItems)[number]
    uploadRes: { ok: true; creative: import('@/lib/tiktok/create-ad/publish').UploadedCreative }
    videoIndex: number
  }
  const pending: PendingVideoAd[] = []

  for (let i = 0; i < videoItems.length; i++) {
    const item = videoItems[i]
    const uploadRes = await uploadSingleVideoCreative({
      connection,
      payload,
      videoItem: item,
      videoFile: i === 0 ? (videoFile ?? null) : null,
      videoIndex: i,
    })

    if (!('ok' in uploadRes) || !uploadRes.ok) {
      const uploadErr = uploadRes as CreateFlowError
      adResults.push({
        ok: false,
        creative_id: item.id,
        error: uploadErr.message || 'Video upload failed',
      })
      continue
    }

    const sourceUrl = item.url || uploadRes.creative.video_url || ''
    console.error('[tiktok/create/launch] multi-video creative resolved', {
      ad_index: i,
      creative_id: item.id,
      source_url: sourceUrl,
      video_id: uploadRes.creative.video_id,
    })

    pending.push({ item, uploadRes, videoIndex: i })
  }

  if (pending.length > 1) {
    const sourceUrls = pending
      .map(p => p.item.url || p.uploadRes.creative.video_url || '')
      .filter(Boolean)
    const distinctUrls = new Set(sourceUrls)
    const distinctVideoIds = new Set(pending.map(p => p.uploadRes.creative.video_id))

    if (distinctUrls.size > 1 && distinctVideoIds.size === 1) {
      const dupId = [...distinctVideoIds][0]
      const rollback = await rollbackCreated(connection, {
        campaignId: campaign.campaign_id,
        adgroupId: adgroup.adgroup_id,
      })
      return {
        error: 'validation_error',
        step: 'creative_upload',
        message: `All ${pending.length} selected videos resolved to the same TikTok video (${dupId}). Each video must be a distinct creative.`,
        category: 'duplicate_material_name',
        explanation:
          'The selected videos share one TikTok video ID — usually a cache lookup matched the wrong file. Try again or re-upload the videos.',
        rolled_back: rollback.rolled_back,
        rollback_error: rollback.rollback_error,
      }
    }

    const videoIdToUrl = new Map<string, string>()
    for (const p of pending) {
      const url = p.item.url || p.uploadRes.creative.video_url || ''
      const videoId = p.uploadRes.creative.video_id
      if (!videoId) continue
      const priorUrl = videoIdToUrl.get(videoId)
      if (priorUrl && priorUrl !== url) {
        const rollback = await rollbackCreated(connection, {
          campaignId: campaign.campaign_id,
          adgroupId: adgroup.adgroup_id,
        })
        return {
          error: 'validation_error',
          step: 'creative_upload',
          message: `Two different videos resolved to the same TikTok video (${videoId}).`,
          category: 'duplicate_material_name',
          explanation:
            'Each selected video must map to its own TikTok video ID. Re-select creatives or re-upload the conflicting video.',
          rolled_back: rollback.rolled_back,
          rollback_error: rollback.rollback_error,
        }
      }
      if (!priorUrl) videoIdToUrl.set(videoId, url)
    }
  }

  for (const { item, uploadRes, videoIndex } of pending) {
    await cacheUploadedCreative(uploadRes, payload, store.id)

    const adRes = await createTikTokAd({
      connection,
      payload,
      adgroup_id: adgroup.adgroup_id,
      identity,
      creative: uploadRes.creative,
      adIndex: videoIndex,
    })

    if (!('ok' in adRes) || !adRes.ok) {
      const adErr = adRes as CreateFlowError
      adResults.push({
        ok: false,
        creative_id: item.id,
        video_id: uploadRes.creative.video_id,
        error: adErr.message || 'Ad create failed',
      })
      continue
    }

    adResults.push({
      ok: true,
      ad_id: adRes.ad_id,
      ad_name: adRes.ad_name,
      creative_id: item.id,
      video_id: uploadRes.creative.video_id,
    })
  }

  const succeeded = adResults.filter(r => r.ok)
  if (!succeeded.length) {
    const rollback = await rollbackCreated(connection, {
      campaignId: campaign.campaign_id,
      adgroupId: adgroup.adgroup_id,
    })
    const firstError = adResults.find(r => r.error)?.error || 'All ads failed to create.'
    return {
      error: 'tiktok_error',
      step: 'ad',
      message: `All ${adResults.length} ads failed: ${firstError}`,
      category: 'unknown',
      explanation: 'No ads were created — the campaign and ad group were rolled back.',
      rolled_back: rollback.rolled_back,
      rollback_error: rollback.rollback_error,
    }
  }

  const isLeads = payload.targeting.goal === 'leads'
  const { message, partial } = buildMultiAdMessage(adResults, isLeads)

  return {
    ok: true,
    campaign_id: campaign.campaign_id,
    campaign_name: campaign.campaign_name,
    adgroup_id: adgroup.adgroup_id,
    adgroup_name: adgroup.adgroup_name,
    ad_id: succeeded[0].ad_id,
    ad_name: succeeded[0].ad_name,
    ads: adResults,
    message,
    partial,
  }
}

async function postLogged(
  connection: Connection,
  step: 'campaign' | 'adgroup' | 'rollback_campaign' | 'rollback_adgroup',
  path: string,
  body: Record<string, unknown>
): Promise<TikTokRawResponse> {
  const json = (await tiktokPost(connection, path, body)) as TikTokRawResponse
  logTikTokCreateCall(step, path, body, json)
  return json
}

async function deleteCampaign(connection: Connection, campaignId: string) {
  return postLogged(connection, 'rollback_campaign', '/campaign/status/update/', {
    campaign_ids: [campaignId],
    operation_status: 'DELETE',
  })
}

async function deleteAdgroup(connection: Connection, adgroupId: string) {
  return postLogged(connection, 'rollback_adgroup', '/adgroup/status/update/', {
    adgroup_ids: [adgroupId],
    operation_status: 'DELETE',
  })
}

export async function createTikTokCampaign(
  connection: Connection,
  payload: CreateAdWizardPayload
) {
  const body = buildCampaignPayload(payload)
  const json = await postLogged(connection, 'campaign', '/campaign/create/', body)
  if (json.code !== 0) {
    return buildCreateFlowError('campaign', json)
  }
  const data = json.data as Record<string, unknown> | undefined
  const campaignId = data?.campaign_id ?? (data?.campaign_ids as string[] | undefined)?.[0]
  if (!campaignId) {
    return buildCreateFlowError('campaign', {
      code: json.code,
      message: 'No campaign_id in TikTok response',
      request_id: json.request_id,
      data: json.data,
    })
  }
  return {
    ok: true as const,
    campaign_id: String(campaignId),
    campaign_name: String(body.campaign_name),
  }
}

export async function createTikTokAdgroup(
  connection: Connection,
  campaignId: string,
  payload: CreateAdWizardPayload,
  opts?: {
    numericPixelId?: string
    optimizationEvent?: string
    availablePixelEvents?: string[]
  }
) {
  let numericPixelId = opts?.numericPixelId
  let optimizationEvent = opts?.optimizationEvent
  let availablePixelEvents = opts?.availablePixelEvents ?? []

  if (
    payload.targeting.goal === 'orders'
    && payload.store.tiktok_pixel_id
    && (!numericPixelId || !optimizationEvent)
  ) {
    const resolved = await resolveConversionPixel(
      connection,
      payload.store.tiktok_pixel_id,
      payload.targeting.conversion_event ?? undefined
    )
    if ('error' in resolved) {
      return resolved
    }
    numericPixelId = resolved.pixel_id
    optimizationEvent = resolved.optimization_event
    availablePixelEvents = resolved.available_events
  }

  const isOrdersConversion = Boolean(
    payload.targeting.goal === 'orders' && numericPixelId && optimizationEvent
  )

  const eventsToTry = isOrdersConversion
    ? orderOptimizationRetryEvents(optimizationEvent!, availablePixelEvents)
    : [optimizationEvent].filter((event): event is string => Boolean(event))

  let lastJson: TikTokRawResponse | null = null
  let lastBody: Record<string, unknown> | null = null
  const primaryEvent = optimizationEvent

  for (const event of eventsToTry.length ? eventsToTry : [undefined]) {
    const body = buildAdgroupPayload(campaignId, payload, {
      numericPixelId,
      optimizationEvent: event,
    })
    const json = await postLogged(connection, 'adgroup', '/adgroup/create/', body)
    lastJson = json
    lastBody = body

    if (json.code === 0) {
      const data = json.data as Record<string, unknown> | undefined
      const adgroupId = data?.adgroup_id ?? (data?.adgroup_ids as string[] | undefined)?.[0]
      if (!adgroupId) {
        return buildCreateFlowError('adgroup', {
          code: json.code,
          message: 'No adgroup_id in TikTok response',
          request_id: json.request_id,
          data: json.data,
        })
      }
      if (primaryEvent && event && event !== primaryEvent) {
        console.error(
          '[tiktok/create/adgroup] optimization_event fallback succeeded:',
          { tried: primaryEvent, accepted: event }
        )
      }
      return {
        ok: true as const,
        adgroup_id: String(adgroupId),
        adgroup_name: String(body.adgroup_name),
      }
    }

    if (!isOrdersConversion || !isOptimizationEventApiError(json.message, json.code)) {
      break
    }
  }

  return buildCreateFlowError('adgroup', lastJson ?? { message: 'TikTok API error' }, {
    explanation: isOrdersConversion && lastBody?.optimization_event
      ? `TikTok rejected optimization_event. Tried: ${eventsToTry.join(', ')}. Check which events your pixel supports in Events Manager.`
      : undefined,
  })
}

async function rollbackCreated(
  connection: Connection,
  ids: { campaignId?: string; adgroupId?: string }
): Promise<{ rolled_back: boolean; rollback_error?: string }> {
  const errors: string[] = []
  if (ids.adgroupId) {
    const delAg = await deleteAdgroup(connection, ids.adgroupId)
    if (delAg.code !== 0) {
      errors.push(`adgroup delete: ${delAg.message || delAg.code}`)
    }
  }
  if (ids.campaignId) {
    const delCamp = await deleteCampaign(connection, ids.campaignId)
    if (delCamp.code !== 0) {
      errors.push(`campaign delete: ${delCamp.message || delCamp.code}`)
    }
  }
  if (errors.length) {
    return { rolled_back: false, rollback_error: errors.join('; ') }
  }
  return { rolled_back: true }
}

export async function launchCreateAdAtomic(
  connection: Connection,
  store: { id: string },
  payload: CreateAdWizardPayload,
  opts?: {
    videoFile?: File | null
    imageFiles?: File[]
    /** Bulk launch passes 1 — one video ad per campaign. Single Create defaults to 5. */
    maxVideoAds?: number
  }
): Promise<LaunchSuccess | CreateFlowError> {
  if (!payload.store.name?.trim()) {
    const { data: storeRow } = await supabaseAdmin
      .from('stores')
      .select('name')
      .eq('id', store.id)
      .single()
    if (storeRow?.name) {
      payload = {
        ...payload,
        store: { ...payload.store, name: storeRow.name },
      }
    }
  }

  payload = await withPublicProductLandingUrl(payload, store.id)

  const timezone = await resolveAdvertiserTimezone(connection, payload.store.currency)

  const validationError = validateCreatePayload(payload, timezone)
  if (validationError) {
    console.error('[tiktok/create/launch] validation failed:', validationError)
    return validationError
  }

  let numericPixelId: string | undefined
  let optimizationEvent: string | undefined
  let availablePixelEvents: string[] | undefined
  if (payload.targeting.goal === 'orders' && payload.store.tiktok_pixel_id) {
    const resolved = await resolveConversionPixel(
      connection,
      payload.store.tiktok_pixel_id,
      payload.targeting.conversion_event ?? undefined
    )
    if ('error' in resolved) {
      return resolved
    }
    numericPixelId = resolved.pixel_id
    optimizationEvent = resolved.optimization_event
    availablePixelEvents = resolved.available_events
  }

  const campaign = await createTikTokCampaign(connection, payload)
  if (!('ok' in campaign) || !campaign.ok) {
    const finalized = await finalizeMutationResult(campaign, {
      storeId: store.id,
      advertiserId: connection.advertiser_id,
    })
    if ('error' in finalized && finalized.error === 'reauth_required') {
      return {
        error: 'tiktok_error',
        step: 'campaign',
        message: 'TikTok access token expired. Reconnect your ad account.',
        category: 'auth',
        explanation: 'Reconnect TikTok Ads from the dashboard header.',
      }
    }
    return campaign as CreateFlowError
  }

  const adgroup = await createTikTokAdgroup(
    connection,
    campaign.campaign_id,
    payload,
    { numericPixelId, optimizationEvent, availablePixelEvents }
  )
  if (!('ok' in adgroup) || !adgroup.ok) {
    const rollback = await rollbackCreated(connection, { campaignId: campaign.campaign_id })
    const flowErr = adgroup as CreateFlowError
    return {
      ...flowErr,
      rolled_back: rollback.rolled_back,
      rollback_error: rollback.rollback_error,
    }
  }

  // Publish ads: one carousel ad, or one ad per selected video (max 5).
  const identityRes = await resolveTikTokIdentity(connection, payload.identity?.identity_id ?? null)
  if (!('ok' in identityRes) || !identityRes.ok) {
    const rollback = await rollbackCreated(connection, {
      campaignId: campaign.campaign_id,
      adgroupId: adgroup.adgroup_id,
    })
    const flowErr = identityRes as CreateFlowError
    return { ...flowErr, rolled_back: rollback.rolled_back, rollback_error: rollback.rollback_error }
  }

  if (isVideoCreativeSource(payload.creative.source)) {
    return launchVideoAdsInGroup({
      connection,
      store,
      payload,
      campaign,
      adgroup,
      identity: identityRes.identity,
      videoFile: opts?.videoFile ?? null,
      maxVideoAds: opts?.maxVideoAds,
    })
  }

  const uploadRes = await uploadCreativeToTikTok({
    connection,
    payload,
    videoFile: opts?.videoFile ?? null,
    imageFiles: opts?.imageFiles ?? [],
  })
  if (!('ok' in uploadRes) || !uploadRes.ok) {
    const rollback = await rollbackCreated(connection, {
      campaignId: campaign.campaign_id,
      adgroupId: adgroup.adgroup_id,
    })
    const flowErr = uploadRes as CreateFlowError
    return { ...flowErr, rolled_back: rollback.rolled_back, rollback_error: rollback.rollback_error }
  }

  await cacheUploadedCreative(uploadRes, payload, store.id)

  const adRes = await createTikTokAd({
    connection,
    payload,
    adgroup_id: adgroup.adgroup_id,
    identity: identityRes.identity,
    creative: uploadRes.creative,
  })
  if (!('ok' in adRes) || !adRes.ok) {
    const rollback = await rollbackCreated(connection, {
      campaignId: campaign.campaign_id,
      adgroupId: adgroup.adgroup_id,
    })
    const flowErr = adRes as CreateFlowError
    return { ...flowErr, rolled_back: rollback.rolled_back, rollback_error: rollback.rollback_error }
  }

  const isLeads = payload.targeting.goal === 'leads'
  return {
    ok: true,
    campaign_id: campaign.campaign_id,
    campaign_name: campaign.campaign_name,
    adgroup_id: adgroup.adgroup_id,
    adgroup_name: adgroup.adgroup_name,
    ad_id: adRes.ad_id,
    ad_name: adRes.ad_name,
    ads: [{
      ok: true,
      ad_id: adRes.ad_id,
      ad_name: adRes.ad_name,
      video_id: uploadRes.creative.video_id,
    }],
    message: isLeads
      ? 'Campaign, ad group, and lead-gen ad created successfully.'
      : 'Campaign, ad group, and ad created successfully.',
  }
}
