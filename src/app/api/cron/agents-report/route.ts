import { NextRequest, NextResponse } from 'next/server'
import { runReporter } from '@/lib/agents/reporter'

export const runtime = 'nodejs'
export const maxDuration = 120

// Daily digest — محلل الأداء (Performance Reporter), one email per store.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const reporter = await runReporter()
  return NextResponse.json({ ok: true, reporter })
}
