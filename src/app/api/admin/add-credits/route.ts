import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdmin } from '@/lib/admin/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  try {
    const { merchant_id, amount } = await request.json()
    if (
      !merchant_id ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 100_000
    ) {
      return NextResponse.json({ success: false, error: 'Invalid params' })
    }

    const { data: credits } = await supabase
      .from('order_credits')
      .select('id, credits_total')
      .eq('merchant_id', merchant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (credits) {
      const { error } = await supabase.from('order_credits')
        .update({ credits_total: credits.credits_total + amount })
        .eq('id', credits.id)
      if (error) return NextResponse.json({ success: false, error: error.message })
    } else {
      const { error } = await supabase.from('order_credits').insert({
        merchant_id,
        credits_total: amount,
        credits_used: 0,
        bundle_type: 'manual',
        price_paid: 0,
      })
      if (error) return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
