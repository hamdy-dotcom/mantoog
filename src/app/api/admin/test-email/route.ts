import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendCreditsWarningEmail } from '@/lib/email/credits-warning'

const ADMIN_EMAILS = ['admin@mantoog.com']

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  )
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { to, remaining = 10 } = await req.json()
  if (!to) return NextResponse.json({ error: 'Missing "to"' }, { status: 400 })

  const ok = await sendCreditsWarningEmail(to, remaining)
  return NextResponse.json({ success: ok })
}
