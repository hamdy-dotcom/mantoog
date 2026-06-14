import { NextRequest, NextResponse } from 'next/server'
import { revertSurfScalingTasks } from '@/lib/tiktok/cron/revert-surf-scaling'

/** @deprecated Use /api/cron/revert-surf-scaling — kept for existing Vercel cron URLs. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await revertSurfScalingTasks()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
