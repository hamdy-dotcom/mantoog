import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 30

// Veo3 generates video WITH audio/speech from a single prompt — unlike Kling which is silent
const FAL_VEO3 = 'https://queue.fal.run/fal-ai/veo3'

function buildUgcPrompt(title: string, description: string | null): string {
  const features = description?.trim() ? description.slice(0, 180) : ''
  const featureText = features
    ? `انظروا هذه الميزات: ${features.slice(0, 100)}`
    : 'ما توقعت أنه يكون بهالجودة'

  return `Vertical 9:16 TikTok UGC ad video. A young Saudi woman in casual everyday clothes and hijab sits in a bright cozy living room. She holds up "${title}" directly to the camera with genuine excitement and speaks in Arabic: "صدقوني هذا المنتج غيّر حياتي! ${featureText}. لازم تجربونه!" She then demonstrates the product naturally — holds it close to the camera lens, rotates it to show all sides, uses it with real enthusiasm. Her energy is authentic like a real customer doing a review. Soft natural daylight from a window, real Saudi home background, filmed on a phone. No studio lights, no brand logos, no text overlays. Raw UGC feel.`
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

  const prompt = (typeof userPrompt === 'string' && userPrompt.trim())
    ? userPrompt.trim()
    : buildUgcPrompt(product.title, product.description)

  const requestBody = {
    prompt,
    aspect_ratio: '9:16',
    duration: '8s',
    resolution: '720p',
    generate_audio: true,
  }

  let requestId: string
  try {
    const submitRes = await fetch(FAL_VEO3, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
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
    })
  } catch (e: any) {
    return NextResponse.json({ error: `submit failed: ${e?.message}` }, { status: 502 })
  }
}
