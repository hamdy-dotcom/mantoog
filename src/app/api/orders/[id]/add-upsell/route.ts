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
    // Storefront sends upsell_item as an object (same shape order-create stores); also tolerate a string.
    let upsell_item: unknown = null
    if (body.upsell_item && typeof body.upsell_item === 'object') {
      upsell_item = body.upsell_item
    } else if (typeof body.upsell_item === 'string' && body.upsell_item.trim()) {
      upsell_item = body.upsell_item.trim().slice(0, 500)
    }
    const additional_price = Number(body.additional_price)
    if (!upsell_item || !Number.isFinite(additional_price) || additional_price <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid upsell data' }, { status: 400 })
    }

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('total_price, payment_status, cod_balance_due')
      .eq('id', id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // On a COD order the upsell simply raises the amount collected on delivery.
    // On one already paid online the captured amount is fixed, so raising
    // `total_price` would claim money we never took — the extra becomes a cash
    // balance for the courier instead.
    const alreadyPaid = order.payment_status === 'paid'

    const patch: Record<string, unknown> = alreadyPaid
      ? {
          upsell_item,
          cod_balance_due: Number(order.cod_balance_due ?? 0) + Number(additional_price),
        }
      : {
          upsell_item,
          total_price: Number(order.total_price) + Number(additional_price),
        }

    const { error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
