import { NextRequest, NextResponse } from 'next/server'
import { runAuditor } from '@/lib/agents/auditor'
import { runPnl } from '@/lib/agents/pnl'
import { runScaler } from '@/lib/agents/scaler'
import { runReporter } from '@/lib/agents/reporter'

export const runtime = 'nodejs'
export const maxDuration = 300

// Daily agents chain, in dependency order:
// مدقق الطلبات (truth) → مدير الأرباح (thresholds) → محرك النمو (scaling) → محلل الأداء (digest).
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const auditor = await runAuditor()
  const pnl = await runPnl()
  const scaler = await runScaler()
  const reporter = await runReporter()
  return NextResponse.json({ ok: true, auditor, pnl, scaler, reporter })
}
