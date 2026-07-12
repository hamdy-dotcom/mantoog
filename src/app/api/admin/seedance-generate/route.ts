import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 30

const FAL_SEEDANCE = 'https://queue.fal.run/fal-ai/bytedance/seedance-2.0/image-to-video'

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

// One creative: proxy the angle image, submit it to Seedance 2.0 (15s, ambient audio,
// no voiceover). Client polls via /api/admin/ugc-status.
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { imageUrl, prompt } = await req.json().catch(() => ({}))
  if (!imageUrl || !prompt) return NextResponse.json({ error: 'imageUrl and prompt required' }, { status: 400 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  const proxied = await proxyToSupabase(imageUrl)
  if (!proxied) return NextResponse.json({ error: 'Failed to proxy angle image' }, { status: 502 })

  try {
    const res = await fetch(FAL_SEEDANCE, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image_url: proxied,
        aspect_ratio: '9:16',
        resolution: '1080p',
        duration: '15',
        generate_audio: true,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await res.text()
    if (!res.ok) return NextResponse.json({ error: `Seedance ${res.status}: ${txt.slice(0, 300)}` }, { status: 502 })
    const b = JSON.parse(txt)
    if (!b.request_id) return NextResponse.json({ error: `no request_id: ${txt.slice(0, 200)}` }, { status: 502 })
    return NextResponse.json({
      requestId: b.request_id as string,
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/bytedance/seedance-2.0/image-to-video/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      firstFrame: proxied,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
