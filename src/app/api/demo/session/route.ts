import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

const DEMO_EMAIL = 'demo@mantoog.com'

export async function POST() {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: DEMO_EMAIL,
  })

  if (error || !data.properties?.hashed_token) {
    return NextResponse.json({ error: error?.message || 'Failed to generate link' }, { status: 500 })
  }

  return NextResponse.json({ token_hash: data.properties.hashed_token })
}
