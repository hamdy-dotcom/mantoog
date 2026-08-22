import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEMO_EMAIL = 'demo@mantoog.com'
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD!

export async function POST() {
  if (!DEMO_PASSWORD) {
    return NextResponse.json({ error: 'Demo not configured' }, { status: 503 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message || 'Auth failed' }, { status: 401 })
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
