import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

const DEMO_EMAIL = 'demo@mantoog.com'

export async function POST() {
  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!'

  // Try to find the user first
  const { data: list } = await supabaseAdmin.auth.admin.listUsers()
  const existing = list?.users?.find(u => u.email === DEMO_EMAIL)

  if (existing) {
    // Update password on existing user
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: tempPassword })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Create the user
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: tempPassword,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sign in via GoTrue REST
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
