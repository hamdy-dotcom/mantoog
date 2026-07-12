import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 30

// Use the www host directly — the apex host 307-redirects and drops the auth header.
const SEEDANCE_CREATE = 'https://www.seedance2ai.io/api/v1/video/seedance2'

async function proxyToSupabase(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const path = `ugc-temp/seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabaseAdmin.storage.from('store-assets').upload(path, buffer, { contentType, upsert: true })
    if (error) return null
    return supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl
  } catch { return null }
}

// One creative: proxy the angle image, create a Seedance 2.0 task (seedance2.ai, 15s,
// ambient audio, no voiceover). Client polls via /api/admin/seedance-status.
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { imageUrl, prompt } = await req.json().catch(() => ({}))
  if (!imageUrl || !prompt) return NextResponse.json({ error: 'imageUrl and prompt required' }, { status: 400 })

  const seedKey = process.env.SEEDANCE_API_KEY
  if (!seedKey) return NextResponse.json({ error: 'SEEDANCE_API_KEY not configured' }, { status: 500 })

  const proxied = await proxyToSupabase(imageUrl)
  if (!proxied) return NextResponse.json({ error: 'Failed to proxy angle image' }, { status: 502 })

  try {
    const res = await fetch(SEEDANCE_CREATE, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${seedKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'image-to-video',
        quality_tier: 'standard',
        prompt,
        image_url: proxied,
        duration: '15',
        resolution: '720p',
        aspect_ratio: '9:16',
        generate_audio: true,
      }),
      signal: AbortSignal.timeout(20000),
    })
    const txt = await res.text()
    if (!res.ok) return NextResponse.json({ error: `Seedance ${res.status}: ${txt.slice(0, 300)}` }, { status: 502 })
    const b = JSON.parse(txt)
    const taskId = b.id ?? b.taskId ?? b.task_id
    if (!taskId) return NextResponse.json({ error: `no taskId: ${txt.slice(0, 200)}` }, { status: 502 })
    return NextResponse.json({ taskId, firstFrame: proxied })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
