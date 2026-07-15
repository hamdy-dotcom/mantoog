import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const runtime = 'nodejs'

// Snapchat CAPI token settings. The token is a secret, so it is read/written
// ONLY here (server-side, service role) — never through the client-side settings
// save path, and never returned to the browser. GET reports connection status
// (enabled + whether a token is stored); it never echoes the token itself.

async function getStore() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 }
  const { data: store } = await supabase.from('stores').select('id').eq('merchant_id', user.id).single()
  if (!store) return { error: 'no_store' as const, status: 404 }
  return { userId: user.id, storeId: store.id as string }
}

export async function GET() {
  const s = await getStore()
  if ('error' in s) return NextResponse.json({ error: s.error }, { status: s.status })

  const { data } = await supabaseAdmin
    .from('snapchat_capi')
    .select('enabled, capi_token, test_event_code')
    .eq('store_id', s.storeId)
    .maybeSingle()

  return NextResponse.json({
    enabled: !!data?.enabled,
    hasToken: !!data?.capi_token,
    tokenTail: data?.capi_token ? String(data.capi_token).slice(-4) : null,
    testEventCode: data?.test_event_code ?? null,
  })
}

export async function POST(req: NextRequest) {
  const s = await getStore()
  if ('error' in s) return NextResponse.json({ error: s.error }, { status: s.status })

  const body = await req.json().catch(() => ({}))
  const enabled = !!body.enabled
  const testEventCode = typeof body.testEventCode === 'string' && body.testEventCode.trim()
    ? body.testEventCode.trim() : null
  // Only overwrite the token when a non-empty value is supplied, so toggling
  // "enabled" or saving other settings doesn't wipe a previously saved token.
  const rawToken = typeof body.capiToken === 'string' ? body.capiToken.trim() : ''

  const update: Record<string, unknown> = {
    store_id: s.storeId,
    merchant_id: s.userId,
    enabled,
    test_event_code: testEventCode,
    updated_at: new Date().toISOString(),
  }
  if (rawToken) update.capi_token = rawToken

  const { error } = await supabaseAdmin
    .from('snapchat_capi')
    .upsert(update, { onConflict: 'store_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Report final status without echoing the token.
  const { data } = await supabaseAdmin
    .from('snapchat_capi')
    .select('enabled, capi_token, test_event_code')
    .eq('store_id', s.storeId)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    enabled: !!data?.enabled,
    hasToken: !!data?.capi_token,
    tokenTail: data?.capi_token ? String(data.capi_token).slice(-4) : null,
    testEventCode: data?.test_event_code ?? null,
  })
}
