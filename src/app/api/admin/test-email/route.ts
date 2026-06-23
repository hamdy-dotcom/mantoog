import { NextRequest, NextResponse } from 'next/server'
import { sendCreditsWarningEmail } from '@/lib/email/credits-warning'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { to, remaining = 10 } = await req.json()
  if (!to) return NextResponse.json({ error: 'Missing "to"' }, { status: 400 })

  const ok = await sendCreditsWarningEmail(to, remaining)
  return NextResponse.json({ success: ok })
}
