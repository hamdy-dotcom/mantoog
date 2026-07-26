import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getImageTaskResult } from '@/lib/landing-genius/generate'

export const runtime = 'nodejs'
export const maxDuration = 30

// Staged pipeline step 2: one status probe for a batch of image tasks. The client
// calls this every ~12s (6 probes/call ≈ well under Seedance's per-minute limit).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tasks } = await req.json().catch(() => ({}))
  const list: { key: string; taskId: string }[] = Array.isArray(tasks)
    ? tasks.filter((t: any) => t?.key && t?.taskId).slice(0, 8)
    : []
  if (!list.length) return NextResponse.json({ error: 'tasks[] required' }, { status: 400 })

  const seedance = process.env.SEEDANCE_API_KEY
  if (!seedance) return NextResponse.json({ error: 'AI keys not configured' }, { status: 500 })

  const results: Record<string, { status: string; url: string | null }> = {}
  for (const t of list) {
    results[t.key] = await getImageTaskResult(seedance, t.taskId)
  }
  return NextResponse.json({ ok: true, results })
}
