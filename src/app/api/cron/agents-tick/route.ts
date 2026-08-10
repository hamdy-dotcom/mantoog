import { NextRequest, NextResponse } from 'next/server'
import { runGuardian } from '@/lib/agents/guardian'

export const runtime = 'nodejs'
export const maxDuration = 120

// Hourly agents tick — runs مراقب الإنفاق (Budget Guardian) over all active deployments.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const guardian = await runGuardian()
  return NextResponse.json({ ok: true, guardian })
}
