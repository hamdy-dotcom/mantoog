import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const runtime = 'nodejs'

// Read back the minimum needed to render the post-payment screen.
//
// Coming back from a gateway is a fresh page load: the React state that held the
// customer's name and order total is gone, so the page has to ask for it. The id
// is an unguessable uuid, but this still returns the narrowest useful slice —
// no address, no phone, no attribution.

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, total_price, currency, quantity, payment_status, payment_method, cod_balance_due')
    .eq('id', id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ order })
}
