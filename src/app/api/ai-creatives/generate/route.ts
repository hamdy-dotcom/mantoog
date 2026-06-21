import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 30

const FAL_TEXT_TO_VIDEO = 'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video'
const FAL_IMAGE_TO_VIDEO = 'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video'

function buildUgcPrompt(title: string, description: string | null, hasImage: boolean): string {
  const features = description?.trim() ? ` Key features: ${description.slice(0, 150)}.` : ''
  if (hasImage) {
    return `UGC TikTok product review. Hands reach in and pick up this product, rotate it to show all sides, place it down and gesture toward it enthusiastically. Close-up shots of the product details. Saudi Arabian home background, warm natural lighting. Raw authentic feel like a real customer filming on their phone.${features}`
  }
  return `UGC TikTok product review video for Saudi Arabian market. A young woman in casual clothes picks up ${title} and holds it close to the camera. She shows it from multiple angles with genuine excitement, points out key features, demonstrates how to use it. Messy authentic home background, natural window light, vertical phone-camera quality. Real customer review vibe — no studio, no logo, no fancy editing.${features}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, prompt: userPrompt } = await req.json().catch(() => ({}))
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, title, description, images, price, store_id, merchant_id')
    .eq('id', productId)
    .eq('merchant_id', user.id)
    .single()
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  // Use the first product image for image-to-video (shows the actual product)
  const images: string[] = Array.isArray(product.images) ? product.images : []
  const imageUrl: string | null = images[0] ?? null

  const useImageToVideo = !!imageUrl
  const endpoint = useImageToVideo ? FAL_IMAGE_TO_VIDEO : FAL_TEXT_TO_VIDEO

  const prompt = (typeof userPrompt === 'string' && userPrompt.trim())
    ? userPrompt.trim()
    : buildUgcPrompt(product.title, product.description, useImageToVideo)

  // Kling 1.6 max is 10 seconds
  const body: Record<string, string> = { prompt, duration: '10', aspect_ratio: '9:16' }
  if (useImageToVideo && imageUrl) body.image_url = imageUrl

  let requestId: string
  try {
    const submitRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await submitRes.text()
    if (!submitRes.ok) {
      return NextResponse.json({ error: `fal.ai ${submitRes.status}: ${txt.slice(0, 300)}` }, { status: 502 })
    }
    const parsed = JSON.parse(txt)
    requestId = parsed.request_id
    if (!requestId) {
      return NextResponse.json({ error: `no request_id. body: ${txt.slice(0, 200)}` }, { status: 502 })
    }
    return NextResponse.json({
      requestId,
      responseUrl: parsed.response_url ?? null,
      statusUrl: parsed.status_url ?? null,
      productId,
      storeId: product.store_id,
      status: 'pending',
      usedImageToVideo: useImageToVideo,
    })
  } catch (e: any) {
    return NextResponse.json({ error: `submit failed: ${e?.message}` }, { status: 502 })
  }
}
