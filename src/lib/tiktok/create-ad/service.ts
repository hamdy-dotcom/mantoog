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

type Connection = { advertiser_id: string; access_token: string }

type LaunchSuccess = {
  ok: true
  campaign_id: string
  campaign_name: string
  adgroup_id: string
  adgroup_name: string
  creative_pending: boolean
  lead_form_pending: boolean
  message: string
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
  payload: CreateAdWizardPayload
) {
  const body = buildAdgroupPayload(campaignId, payload)
  const json = await postLogged(connection, 'adgroup', '/adgroup/create/', body)
  if (json.code !== 0) {
    return buildCreateFlowError('adgroup', json)
  }
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
  return {
    ok: true as const,
    adgroup_id: String(adgroupId),
    adgroup_name: String(body.adgroup_name),
  }
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
  payload: CreateAdWizardPayload
): Promise<LaunchSuccess | CreateFlowError> {
  const timezone = await resolveAdvertiserTimezone(connection, payload.store.currency)

  const validationError = validateCreatePayload(payload, timezone)
  if (validationError) {
    console.error('[tiktok/create/launch] validation failed:', validationError)
    return validationError
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

  const adgroup = await createTikTokAdgroup(connection, campaign.campaign_id, payload)
  if (!('ok' in adgroup) || !adgroup.ok) {
    const rollback = await rollbackCreated(connection, { campaignId: campaign.campaign_id })
    const flowErr = adgroup as CreateFlowError
    return {
      ...flowErr,
      rolled_back: rollback.rolled_back,
      rollback_error: rollback.rollback_error,
    }
  }

  const { error: insertErr } = await supabaseAdmin.from('tiktok_pending_ads').insert({
    store_id: store.id,
    advertiser_id: connection.advertiser_id,
    campaign_id: campaign.campaign_id,
    adgroup_id: adgroup.adgroup_id,
    product_id: payload.product.id,
    wizard_payload: payload,
    status: 'pending_creative',
  })

  if (insertErr) {
    console.error('[tiktok/create/launch] pending ad insert failed:', insertErr.message)
    const rollback = await rollbackCreated(connection, {
      campaignId: campaign.campaign_id,
      adgroupId: adgroup.adgroup_id,
    })
    return {
      error: 'tiktok_error',
      step: 'pending_ad',
      message: `Failed to save pending ad: ${insertErr.message}`,
      explanation: 'Nothing was left in TikTok — created campaign/ad group were rolled back.',
      rolled_back: rollback.rolled_back,
      rollback_error: rollback.rollback_error,
    }
  }

  const isLeads = payload.targeting.goal === 'leads'
  return {
    ok: true,
    campaign_id: campaign.campaign_id,
    campaign_name: campaign.campaign_name,
    adgroup_id: adgroup.adgroup_id,
    adgroup_name: adgroup.adgroup_name,
    creative_pending: true,
    lead_form_pending: isLeads,
    message: isLeads
      ? 'Campaign & ad group created. Lead form attachment and ad publish will complete once Lead Generation is approved.'
      : 'Campaign & ad group created. Ad creative will publish once Creative Management is approved.',
  }
}
