import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GATEWAY_DEFINITIONS, isGatewayId } from '@/lib/payment-gateways/registry'
import { loadRows, saveGateway, toState } from '@/lib/payment-gateways/store'

export const runtime = 'nodejs'

// Gateway API keys are secrets, so they are read/written ONLY here (server-side,
// service role) — never through the client-side settings save path, and never
// returned to the browser. GET reports presence + last 4 chars; it never echoes
// a secret. Mirrors the Snapchat CAPI route, which solves the same problem.

async function getStore() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 }

  const { data: store } = await supabase
    .from('stores')
    .select('id, currency')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return { error: 'no_store' as const, status: 404 }
  return { userId: user.id, storeId: store.id as string, currency: (store.currency as string) ?? '' }
}

export async function GET() {
  const s = await getStore()
  if ('error' in s) return NextResponse.json({ error: s.error }, { status: s.status })

  const rows = await loadRows(s.storeId)

  return NextResponse.json({
    currency: s.currency,
    gateways: GATEWAY_DEFINITIONS.map(def =>
      toState(def, rows.find(r => r.gateway === def.id)),
    ),
  })
}

export async function POST(req: NextRequest) {
  const s = await getStore()
  if ('error' in s) return NextResponse.json({ error: s.error }, { status: s.status })

  const body = await req.json().catch(() => ({}))
  const gateway = typeof body.gateway === 'string' ? body.gateway : ''

  if (!isGatewayId(gateway)) {
    return NextResponse.json({ error: 'Unknown gateway' }, { status: 400 })
  }

  const result = await saveGateway({
    storeId: s.storeId,
    merchantId: s.userId,
    gateway,
    currency: s.currency,
    enabled: !!body.enabled,
    values: body.values && typeof body.values === 'object' ? body.values : {},
    clear: Array.isArray(body.clear) ? body.clear.filter((k: unknown) => typeof k === 'string') : [],
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  // Report final state without echoing any secret.
  return NextResponse.json({ ok: true, gateway: result.state })
}
