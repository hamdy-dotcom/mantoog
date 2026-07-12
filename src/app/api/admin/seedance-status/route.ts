import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'

// Polls a seedance2.ai task and returns { status, videoUrl }.
export async function GET(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const taskId = new URL(req.url).searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const seedKey = process.env.SEEDANCE_API_KEY
  if (!seedKey) return NextResponse.json({ status: 'failed', error: 'SEEDANCE_API_KEY not configured' })

  try {
    const res = await fetch(`https://api.seedance2.ai/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${seedKey}` },
      signal: AbortSignal.timeout(10000),
    })
    const txt = await res.text()
    if (!res.ok) return NextResponse.json({ status: 'pending', debug: `${res.status}: ${txt.slice(0, 150)}` })
    const b = JSON.parse(txt)
    const status: string = b.status ?? 'queued'

    if (status === 'completed') {
      // finished URL lives in data.results (array of urls or objects)
      const results = b?.data?.results ?? b?.results ?? []
      const first = Array.isArray(results) ? results[0] : results
      const videoUrl = typeof first === 'string' ? first : (first?.url ?? first?.video_url ?? first?.video?.url ?? null)
      if (!videoUrl) return NextResponse.json({ status: 'failed', error: `no video url. keys: ${Object.keys(b?.data || b || {}).join(',')}` })
      return NextResponse.json({ status: 'completed', videoUrl })
    }
    if (status === 'failed') return NextResponse.json({ status: 'failed', error: b?.error || b?.message || 'seedance failed' })
    return NextResponse.json({ status: 'pending', seedanceStatus: status })
  } catch (e: any) {
    return NextResponse.json({ status: 'pending', debug: e?.message })
  }
}
