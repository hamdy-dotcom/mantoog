import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RouteCtx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const upsell_item = typeof body.upsell_item === 'string' && body.upsell_item.trim()
      ? body.upsell_item.trim().slice(0, 500)
      : null
    const additional_price = Number(body.additional_price)
    if (!upsell_item || !Number.isFinite(additional_price) || additional_price <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid upsell data' }, { status: 400 })
    }

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('total_price')
      .eq('id', id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const newTotal = Number(order.total_price) + Number(additional_price)

    const { error } = await supabase
      .from('orders')
      .update({ upsell_item, total_price: newTotal })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
