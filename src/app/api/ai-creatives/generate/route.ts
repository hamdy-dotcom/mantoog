import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 30

// Veo3.1 Lite: $0.05/sec WITH audio, 9:16 support, product image as start/end frame
const FAL_VEO3_LITE = 'https://queue.fal.run/fal-ai/veo3.1/lite/first-last-frame-to-video'

function buildPrompt(title: string, description: string | null, part: 1 | 2): string {
  const desc = description?.trim() ? description.slice(0, 100) : ''
  if (part === 1) {
    return `Vertical 9:16 TikTok UGC video. A young Saudi woman in casual hijab sits in her home. She holds up "${title}" to the camera and speaks in Arabic with excitement: "صدقوني هذا المنتج غيّر حياتي! لازم تجربونه!" She rotates the product slowly to show every side.${desc ? ` ${desc}` : ''} Natural daylight, real Saudi home, phone camera quality. No studio, no logos.`
  }
  return `Vertical 9:16 TikTok UGC video continuation. The same Saudi woman continues reviewing "${title}". She demonstrates how the product works, points out key features with genuine enthusiasm, says in Arabic: "الجودة عالية جداً والسعر مناسب جداً — اطلبوه الحين!" Ends with a big smile and thumbs up to camera. Authentic real home setting.`
}

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

  const images: string[] = Array.isArray(product.images) ? product.images : []
  if (images.length === 0) {
    return NextResponse.json({ error: 'Product has no images — add product images first.' }, { status: 400 })
  }

  const img0 = images[0]
  const img1 = images[1] ?? images[0]
  const img2 = images[2] ?? images[0]

  const submit = async (prompt: string, first: string, last: string) => {
    const res = await fetch(FAL_VEO3_LITE, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, first_frame_url: first, last_frame_url: last, aspect_ratio: '9:16', resolution: '720p', generate_audio: true }),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await res.text()
    if (!res.ok) throw new Error(`fal.ai ${res.status}: ${txt.slice(0, 200)}`)
    const b = JSON.parse(txt)
    if (!b.request_id) throw new Error(`no request_id: ${txt.slice(0, 200)}`)
    return { requestId: b.request_id as string, responseUrl: b.response_url ?? null, statusUrl: b.status_url ?? null }
  }

  try {
    // 2 clips in parallel: 8s each = 16s total at $0.05/s = ~$0.80
    const [clip1, clip2] = await Promise.all([
      submit(userPrompt?.trim() || buildPrompt(product.title, product.description, 1), img0, img1),
      submit(buildPrompt(product.title, product.description, 2), img1, img2),
    ])
    return NextResponse.json({
      clips: [clip1, clip2],
      productId,
      storeId: product.store_id ?? null,
      status: 'pending',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
