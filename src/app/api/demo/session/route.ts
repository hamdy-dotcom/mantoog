import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const DEMO_EMAIL = 'demo@mantoog.com'

export async function POST() {
  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!'

  // Find demo user
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find((u: { email?: string }) => u.email === DEMO_EMAIL)

  if (existing) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: tempPassword })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: tempPassword,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sign in via GoTrue REST to get session tokens
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

  // Write the session into SSR cookies so server-side getUser() works
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })

  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  return NextResponse.json({ ok: true })
}
