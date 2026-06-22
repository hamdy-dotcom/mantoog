import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    item_type, credits_amount, bundle_id, sub_plan,
    amount_egp, payment_method, sender_phone, proof_url, merchant_notes,
  } = body

  if (!item_type || !amount_egp || !payment_method || !proof_url) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('payment_requests').insert({
    merchant_id: user.id,
    item_type,
    credits_amount: credits_amount ?? null,
    bundle_id: bundle_id ?? null,
    sub_plan: sub_plan ?? null,
    amount_egp,
    payment_method,
    sender_phone: sender_phone ?? null,
    proof_url,
    merchant_notes: merchant_notes ?? null,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}
