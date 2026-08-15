import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { getEnabledGateways } from '@/lib/payment-gateways/store'

export const runtime = 'nodejs'

// Public: called by the storefront checkout form to render the payment picker.
//
// Everything it returns is safe for a browser. Credentials never come near it —
// `getEnabledGateways` whitelists non-secret fields by definition rather than
// spreading the stored config.

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id, currency')
    .eq('id', storeId)
    .maybeSingle<{ id: string; currency: string | null }>()

  if (!store) return NextResponse.json({ error: 'Unknown store' }, { status: 404 })

  // COD is offered on every store, always — a storefront must never end up with
  // no way to check out because a gateway was misconfigured.
  const gateways = await getEnabledGateways(store.id, store.currency ?? '')

  return NextResponse.json({ cod: true, gateways })
}
