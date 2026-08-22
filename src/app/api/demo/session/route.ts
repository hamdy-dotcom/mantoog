import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

const DEMO_USER_ID = '100fe080-665b-4537-aadc-2740ce7199b6'
const DEMO_EMAIL = 'demo@mantoog.com'

export async function POST() {
  // Generate a random one-time password, set it, then sign in via REST
  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(DEMO_USER_ID, {
    password: tempPassword,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Sign in via GoTrue REST (bypasses SDK version limits)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email: DEMO_EMAIL, password: tempPassword }),
  })

  const session = await tokenRes.json()
  if (!tokenRes.ok || !session.access_token) {
    return NextResponse.json({ error: session.error_description || 'Sign-in failed' }, { status: 500 })
  }

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
}
