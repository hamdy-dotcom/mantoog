import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createImageTask, FALLBACK_LIFESTYLE, FALLBACK_SHOWCASE, MAGENTA_PROMPT } from '@/lib/landing-genius/generate'

export const runtime = 'nodejs'
export const maxDuration = 60

// Staged pipeline step 1: create ALL Seedance image tasks up-front and return their
// ids immediately. Runs in parallel with the content (Claude) call — the client polls
// /image-status. No long-lived server work → a 504 is structurally impossible here.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { images } = await req.json().catch(() => ({}))
  const refs: string[] = Array.isArray(images) ? images.filter(Boolean).slice(0, 6) : []
  if (!refs.length) return NextResponse.json({ error: 'images[] required' }, { status: 400 })

  const seedance = process.env.SEEDANCE_API_KEY
  if (!seedance) return NextResponse.json({ error: 'AI keys not configured' }, { status: 500 })

  const ref = (i: number) => refs[i % refs.length]
  const jobs: { key: string; refUrl: string; prompt: string }[] = [
    { key: 'cutout', refUrl: ref(0), prompt: MAGENTA_PROMPT },
    { key: 'f0', refUrl: ref(0), prompt: FALLBACK_SHOWCASE[0] },
    { key: 'f1', refUrl: ref(1), prompt: FALLBACK_SHOWCASE[1] },
    { key: 'f2', refUrl: ref(2), prompt: FALLBACK_SHOWCASE[2] },
    { key: 'f3', refUrl: ref(3), prompt: FALLBACK_SHOWCASE[3] },
    { key: 'life', refUrl: ref(0), prompt: FALLBACK_LIFESTYLE },
  ]
  // Sequential creates on purpose — Seedance rate-limits per minute; 6 creates take ~6-10s.
  const tasks: { key: string; taskId: string | null }[] = []
  for (const j of jobs) tasks.push({ key: j.key, taskId: await createImageTask(seedance, j.refUrl, j.prompt) })

  return NextResponse.json({ ok: true, tasks })
}
