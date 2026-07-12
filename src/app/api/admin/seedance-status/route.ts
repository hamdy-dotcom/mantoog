import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'

// Polls a seedance2ai.io task and returns { status, videoUrl }.
export async function GET(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const taskId = new URL(req.url).searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const seedKey = process.env.SEEDANCE_API_KEY
  if (!seedKey) return NextResponse.json({ status: 'failed', error: 'SEEDANCE_API_KEY not configured' })

  try {
    const res = await fetch(`https://www.seedance2ai.io/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${seedKey}` },
      signal: AbortSignal.timeout(10000),
    })
    const txt = await res.text()
    if (!res.ok) return NextResponse.json({ status: 'pending', debug: `${res.status}: ${txt.slice(0, 150)}` })
    const b = JSON.parse(txt)
    const status: string = b.status ?? 'processing'

    if (status === 'completed' || status === 'succeeded') {
      const videoUrl = b?.output?.video_url ?? b?.video_url ?? b?.output?.url ?? null
      if (!videoUrl) return NextResponse.json({ status: 'failed', error: `no video url. keys: ${Object.keys(b?.output || b || {}).join(',')}` })
      return NextResponse.json({ status: 'completed', videoUrl })
    }
    if (status === 'failed' || status === 'error') return NextResponse.json({ status: 'failed', error: b?.error?.message || b?.error || b?.message || 'seedance failed' })
    return NextResponse.json({ status: 'pending', seedanceStatus: status })
  } catch (e: any) {
    return NextResponse.json({ status: 'pending', debug: e?.message })
  }
}
