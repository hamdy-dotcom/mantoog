import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { recordCreditPurchase, recordSubscription, type SubscriptionPlan } from '@/lib/store/payments'

const ADMIN_EMAILS = ['admin@mantoog.com']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { request_id, action, admin_notes } = await req.json()
  if (!request_id || !action) {
    return NextResponse.json({ error: 'Missing request_id or action' }, { status: 400 })
  }

  const { data: pr, error: fetchErr } = await supabaseAdmin
    .from('payment_requests').select('*').eq('id', request_id).single()
  if (fetchErr || !pr) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (pr.status !== 'pending') {
    return NextResponse.json({ error: 'Request already processed' }, { status: 409 })
  }

  if (action === 'approve') {
    let fulfillErr: string | undefined

    if (pr.item_type === 'credits') {
      const result = await recordCreditPurchase({
        merchantId: pr.merchant_id,
        creditsTotal: pr.credits_amount,
        bundleType: pr.bundle_id ?? 'manual',
        pricePaid: pr.amount_egp,
      })
      fulfillErr = result.error
    } else if (pr.item_type === 'subscription') {
      const result = await recordSubscription({
        merchantId: pr.merchant_id,
        plan: pr.sub_plan as SubscriptionPlan,
        priceEgp: pr.amount_egp,
        paymentMethod: pr.payment_method,
      })
      fulfillErr = result.error
    }

    if (fulfillErr) return NextResponse.json({ error: fulfillErr }, { status: 500 })
  }

  await supabaseAdmin.from('payment_requests').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    admin_notes: admin_notes ?? null,
    processed_by: user.email,
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', request_id)

  return NextResponse.json({ ok: true })
}
