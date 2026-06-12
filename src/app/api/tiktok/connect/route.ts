import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function GET(req: NextRequest) {
  console.log('secret length:', process.env.TIKTOK_CLIENT_SECRET?.length)
  console.log('TIKTOK_CLIENT_KEY:', process.env.TIKTOK_CLIENT_KEY)
  console.log('TIKTOK_REDIRECT_URI:', process.env.TIKTOK_REDIRECT_URI)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const { data: store } = await supabase
    .from('stores').select('id').eq('merchant_id', user.id).single()
  if (!store) return NextResponse.redirect(new URL('/dashboard?error=no_store', req.url))

  const nonce = randomBytes(16).toString('hex')
  const state = `${nonce}.${store.id}.${user.id}`

  const authUrl =
    `https://business-api.tiktok.com/portal/auth` +
    `?app_id=${encodeURIComponent(process.env.TIKTOK_CLIENT_KEY!)}` +
    `&state=${encodeURIComponent(state)}` +
    `&redirect_uri=${encodeURIComponent(process.env.TIKTOK_REDIRECT_URI!)}`

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: 600,
  })
  return res
}
