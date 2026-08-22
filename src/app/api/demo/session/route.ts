import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

const DEMO_USER_ID = '100fe080-665b-4537-aadc-2740ce7199b6'

export async function POST() {
  const { data, error } = await supabaseAdmin.auth.admin.createSession({ user_id: DEMO_USER_ID })

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message || 'Failed to create session' }, { status: 500 })
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
