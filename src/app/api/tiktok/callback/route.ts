import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAdvertiserInfo } from '@/lib/tiktok/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIKTOK = 'https://business-api.tiktok.com/open_api/v1.3'
const back = (req: NextRequest, s: string) =>
  NextResponse.redirect(new URL(`/dashboard/tiktok?tiktok=${s}`, req.url))

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const authCode = p.get('auth_code') || p.get('code')
  const state = p.get('state')
  const cookieState = req.cookies.get('tiktok_oauth_state')?.value
  if (!authCode || !state || state !== cookieState) return back(req, 'error_state')

  const [, storeId, merchantId] = state.split('.')

  const tokenRes = await fetch(`${TIKTOK}/oauth2/access_token/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.TIKTOK_CLIENT_KEY,
      secret: process.env.TIKTOK_CLIENT_SECRET,
      auth_code: authCode, grant_type: 'authorization_code',
    }),
  })
  const tokenJson = await tokenRes.json()
  console.log('secret length:', process.env.TIKTOK_CLIENT_SECRET?.length)
  console.log('app_id:', process.env.TIKTOK_CLIENT_KEY)
  console.log('TT tokenJson:', JSON.stringify(tokenJson))
  if (tokenJson.code !== 0) { console.error('TT token', tokenJson); return back(req, 'error_token') }

  const { access_token, refresh_token, advertiser_ids = [], scope } = tokenJson.data
  let advertisers = advertiser_ids.map((id: string) => ({ advertiser_id: id, advertiser_name: null as string | null }))
  try {
    const info = await fetch(
      `${TIKTOK}/oauth2/advertiser/get/?app_id=${process.env.TIKTOK_CLIENT_KEY}&secret=${process.env.TIKTOK_CLIENT_SECRET}`,
      { headers: { 'Access-Token': access_token } }
    ).then(r => r.json())
    if (info.code === 0 && info.data?.list) {
      advertisers = info.data.list.map((a: any) => ({ advertiser_id: a.advertiser_id, advertiser_name: a.advertiser_name }))
    }
  } catch (e) { console.warn('advertiser names', e) }

  const rows = await Promise.all(advertisers.map(async (a: any) => {
    let currency: string | null = null
    try {
      const info = await fetchAdvertiserInfo({ advertiser_id: a.advertiser_id, access_token })
      if (info.code === 0) currency = info.data?.list?.[0]?.currency ?? null
    } catch (e) { console.warn('advertiser currency', e) }
    return {
      store_id: storeId, merchant_id: merchantId,
      advertiser_id: a.advertiser_id, advertiser_name: a.advertiser_name,
      access_token, refresh_token: refresh_token ?? null,
      scope: Array.isArray(scope) ? scope.join(',') : scope ?? null,
      currency,
      status: 'active', updated_at: new Date().toISOString(),
    }
  }))

  const { error } = await supabase.from('tiktok_connections')
    .upsert(rows, { onConflict: 'store_id,advertiser_id' })
  if (error) { console.error('upsert', error); return back(req, 'error_db') }

  const { count: activeCount } = await supabase
    .from('tiktok_connections')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('is_active', true)

  if ((activeCount ?? 0) === 0 && advertisers.length > 0) {
    await supabase
      .from('tiktok_connections')
      .update({ is_active: false })
      .eq('store_id', storeId)
    await supabase
      .from('tiktok_connections')
      .update({ is_active: true, status: 'active' })
      .eq('store_id', storeId)
      .eq('advertiser_id', advertisers[0].advertiser_id)
  }

  const res = back(req, 'connected')
  res.cookies.delete('tiktok_oauth_state')
  return res
}
