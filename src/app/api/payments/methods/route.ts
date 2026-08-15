import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { getEnabledGateways } from '@/lib/payment-gateways/store'

export const runtime = 'nodejs'

// Public: called by the storefront checkout form to render the payment picker.
// Safe for a browser — `getEnabledGateways` whitelists non-secret fields.

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id, currency')
    .eq('id', storeId)
    .maybeSingle<{ id: string; currency: string | null }>()

  if (!store) return NextResponse.json({ error: 'Unknown store' }, { status: 404 })

  // COD is always offered, so a misconfigured gateway can never leave a
  // storefront with no way to check out.
  const gateways = await getEnabledGateways(store.id, store.currency ?? '')

  return NextResponse.json({ cod: true, gateways })
}
