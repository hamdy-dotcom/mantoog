import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 30

// Veo3.1 Lite text-to-video: $0.05/sec WITH audio, 9:16, generates person + product scenes
const FAL_VEO3_LITE = 'https://queue.fal.run/fal-ai/veo3.1/lite'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, prompt: userPrompt } = await req.json().catch(() => ({}))
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, title, description, images, store_id, merchant_id')
    .eq('id', productId)
    .eq('merchant_id', user.id)
    .single()
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  const basePrompt = userPrompt?.trim()
    || `A young Saudi woman in casual hijab holds up "${product.title}" and speaks directly to camera in Arabic: "صدقوني هذا المنتج غيّر حياتي! لازم تجربونه!" She demonstrates the product enthusiastically. Phone-camera quality, natural daylight, authentic home setting. Vertical 9:16 TikTok UGC style.`

  try {
    const res = await fetch(FAL_VEO3_LITE, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: basePrompt,
        aspect_ratio: '9:16',
        resolution: '720p',
        generate_audio: true,
        duration: '8s',
      }),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await res.text()
    if (!res.ok) throw new Error(`fal.ai ${res.status}: ${txt.slice(0, 200)}`)
    const b = JSON.parse(txt)
    if (!b.request_id) throw new Error(`no request_id: ${txt.slice(0, 200)}`)
    const clip = {
      requestId: b.request_id as string,
      responseUrl: b.response_url ?? null,
      statusUrl: b.status_url ?? null,
    }
    return NextResponse.json({ clip, productId, storeId: product.store_id ?? null, status: 'pending' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
