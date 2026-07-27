import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 15

const OBSERVE_HOURS = 48

async function storeForUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('id').eq('merchant_id', user.id).single()
  return store ? { storeId: store.id as string, merchantId: user.id } : null
}

export async function GET(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response
  const ctx = await storeForUser()
  if (!ctx) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const campaignId = req.nextUrl.searchParams.get('campaignId')
  let q = supabaseAdmin.from('agent_deployments').select('*').eq('store_id', ctx.storeId).order('created_at', { ascending: false })
  if (campaignId) q = q.eq('campaign_id', campaignId)
  const { data, error } = await q.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 502 })
  return NextResponse.json({ deployments: data || [] })
}

// Deploy agents on a campaign. Guardian starts in 48h observe mode.
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response
  const ctx = await storeForUser()
  if (!ctx) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const {
    campaignId, campaignName, smartPlus, agents, targetCpa, maxSpendNoOrders, alertEmail, currency,
    productId, costPrice, desiredMarginPct, budgetCeiling, currentBudget,
  } = await req.json().catch(() => ({}))
  const KNOWN = ['guardian', 'reporter', 'pnl', 'auditor', 'scaler']
  const list: string[] = Array.isArray(agents) ? agents.filter((a: string) => KNOWN.includes(a)) : []
  if (!campaignId || !list.length) {
    return NextResponse.json({ error: 'campaignId and agents[] required' }, { status: 400 })
  }
  const cpa = Number(targetCpa)
  if (list.includes('guardian') && !(cpa > 0)) {
    return NextResponse.json({ error: 'targetCpa (>0) is required for the guardian agent' }, { status: 400 })
  }
  if (list.includes('pnl') && !(Number(costPrice) > 0)) {
    return NextResponse.json({ error: 'costPrice (>0) is required for the pnl agent' }, { status: 400 })
  }
  if (list.includes('scaler') && !(Number(budgetCeiling) > 0)) {
    return NextResponse.json({ error: 'budgetCeiling (>0) is required for the scaler agent' }, { status: 400 })
  }
  if (!alertEmail || !/.+@.+\..+/.test(String(alertEmail))) {
    return NextResponse.json({ error: 'valid alertEmail required' }, { status: 400 })
  }

  // Persist COGS on the product — مدير الأرباح builds on it.
  if (Number(costPrice) > 0 && productId) {
    await supabaseAdmin.from('products').update({ cost_price: Number(costPrice) }).eq('id', productId)
  }

  const config = {
    targetCpa: cpa > 0 ? cpa : undefined,
    maxSpendNoOrders: Number(maxSpendNoOrders) > 0 ? Number(maxSpendNoOrders) : undefined,
    alertEmail: String(alertEmail),
    currency: currency ? String(currency) : undefined,
    productId: productId ? String(productId) : undefined,
    costPrice: Number(costPrice) > 0 ? Number(costPrice) : undefined,
    desiredMarginPct: Number(desiredMarginPct) > 0 ? Number(desiredMarginPct) : undefined,
    budgetCeiling: Number(budgetCeiling) > 0 ? Number(budgetCeiling) : undefined,
    currentBudget: Number(currentBudget) > 0 ? Number(currentBudget) : undefined,
  }

  const rows = list.map(agent => ({
    store_id: ctx.storeId,
    merchant_id: ctx.merchantId,
    campaign_id: String(campaignId),
    campaign_name: campaignName ? String(campaignName) : null,
    smart_plus: smartPlus !== false,
    agent,
    status: 'active',
    config,
    observe_until: agent === 'guardian'
      ? new Date(Date.now() + OBSERVE_HOURS * 3600 * 1000).toISOString()
      : null,
  }))

  const { data, error } = await supabaseAdmin
    .from('agent_deployments')
    .upsert(rows, { onConflict: 'campaign_id,agent' })
    .select('id, agent')
  if (error) return NextResponse.json({ error: error.message }, { status: 502 })
  return NextResponse.json({ ok: true, deployed: data })
}

export async function PATCH(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response
  const ctx = await storeForUser()
  if (!ctx) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const { id, status } = await req.json().catch(() => ({}))
  if (!id || !['active', 'paused'].includes(status)) {
    return NextResponse.json({ error: 'id and status (active|paused) required' }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from('agent_deployments').update({ status })
    .eq('id', id).eq('store_id', ctx.storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 502 })
  return NextResponse.json({ ok: true })
}
