import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 30

// Veo3.1 Lite: $0.05/sec WITH audio, 9:16 support, product image as start/end frame
const FAL_VEO3_LITE = 'https://queue.fal.run/fal-ai/veo3.1/lite/first-last-frame-to-video'

function buildClip2Prompt(clip1Prompt: string): string {
  return `${clip1Prompt} CONTINUATION: The presenter now demonstrates the product in use, highlighting 2-3 key benefits with genuine enthusiasm. Ends by holding the product up to camera and saying in Saudi Arabic: "اطلبه الحين — التوصيل سريع لكل السعودية! الرابط في البايو!" with a big smile.`
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

  const basePrompt = userPrompt?.trim() || `Vertical 9:16 TikTok UGC video. A young Saudi woman in casual hijab sits in her home holding "${product.title}" close to camera and speaking in Arabic: "صدقوني هذا المنتج غيّر حياتي! لازم تجربونه!" Phone-camera quality, natural daylight, authentic home setting.`

  try {
    // 2 clips in parallel: 8s each = 16s total at $0.05/s = ~$0.80
    const [clip1, clip2] = await Promise.all([
      submit(basePrompt, img0, img1),
      submit(buildClip2Prompt(basePrompt), img1, img2),
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
