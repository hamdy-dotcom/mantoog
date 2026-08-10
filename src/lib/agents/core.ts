import { supabaseAdmin } from '@/lib/tiktok/server'
import { tiktokGet, tiktokPost } from '@/lib/tiktok/mutations'

export type AgentConnection = { advertiser_id: string; access_token: string }

export type AgentDeployment = {
  id: string
  store_id: string
  merchant_id: string
  campaign_id: string
  campaign_name: string | null
  smart_plus: boolean
  agent: string
  status: 'active' | 'paused' | 'done'
  config: {
    targetCpa?: number
    maxSpendNoOrders?: number
    alertEmail?: string
    currency?: string
  }
  observe_until: string | null
  last_run_at: string | null
  created_at: string
}

export type CampaignStats = {
  spend: number
  conversions: number
  cpa: number | null
  ctr: number | null
  impressions: number
}

export async function activeDeployments(agent: string): Promise<AgentDeployment[]> {
  const { data, error } = await supabaseAdmin
    .from('agent_deployments')
    .select('*')
    .eq('agent', agent)
    .eq('status', 'active')
  if (error) throw new Error(`agent_deployments query: ${error.message}`)
  return (data || []) as AgentDeployment[]
}

export async function storeConnection(storeId: string): Promise<AgentConnection | null> {
  const { data } = await supabaseAdmin
    .from('tiktok_connections')
    .select('advertiser_id, access_token')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .limit(1)
  return (data && data[0]) || null
}

const num = (v: unknown) => { const n = parseFloat(String(v ?? '')); return Number.isFinite(n) ? n : 0 }

/** Campaign-level stats between two UTC dates (inclusive), keyed by campaign_id. */
export async function campaignStats(
  connection: AgentConnection,
  campaignIds: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, CampaignStats>> {
  if (!campaignIds.length) return {}
  const json = await tiktokGet(connection, '/report/integrated/get/', {
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: JSON.stringify(['campaign_id']),
    metrics: JSON.stringify(['spend', 'conversion', 'cost_per_conversion', 'ctr', 'impressions']),
    start_date: startDate,
    end_date: endDate,
    filtering: JSON.stringify([{ field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify(campaignIds) }]),
    page_size: '50',
  })
  const out: Record<string, CampaignStats> = {}
  if (json.code !== 0) return out
  for (const row of ((json.data as any)?.list || [])) {
    const id = String(row?.dimensions?.campaign_id ?? '')
    const m = row?.metrics || {}
    if (!id) continue
    const conversions = num(m.conversion)
    out[id] = {
      spend: num(m.spend),
      conversions,
      cpa: conversions > 0 ? num(m.cost_per_conversion) : null,
      ctr: m.ctr != null ? num(m.ctr) : null,
      impressions: num(m.impressions),
    }
  }
  return out
}

export async function pauseCampaign(connection: AgentConnection, campaignId: string, smartPlus: boolean) {
  const path = smartPlus ? '/smart_plus/campaign/status/update/' : '/campaign/status/update/'
  return tiktokPost(connection, path, { campaign_ids: [campaignId], operation_status: 'DISABLE' })
}

export async function logAction(input: {
  deployment_id: string
  store_id: string
  campaign_id: string
  agent: string
  action: string
  reason?: string
  data?: Record<string, unknown>
}) {
  await supabaseAdmin.from('agent_actions').insert(input)
}

export async function touchDeployment(id: string, patch: Record<string, unknown> = {}) {
  await supabaseAdmin.from('agent_deployments').update({ last_run_at: new Date().toISOString(), ...patch }).eq('id', id)
}

export const utcDate = (d: Date) => d.toISOString().slice(0, 10)
