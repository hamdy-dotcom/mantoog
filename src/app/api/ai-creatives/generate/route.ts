import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 120

const FAL_SYNC = 'https://fal.run/fal-ai/kling-video/v1.6/standard/text-to-video'

function buildPrompt(title: string, description: string | null): string {
  const desc = description?.trim() ? ` ${description.slice(0, 200)}` : ''
  return `Create a compelling vertical short-form video ad for: ${title}.${desc} Show the product in use, highlight key benefits, dynamic engaging visuals for TikTok. 9:16 format, modern energetic style.`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, prompt: userPrompt } = await req.json().catch(() => ({}))
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, title, description, store_id, merchant_id')
    .eq('id', productId)
    .eq('merchant_id', user.id)
    .single()
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  const prompt = (typeof userPrompt === 'string' && userPrompt.trim()) ? userPrompt.trim() : buildPrompt(product.title, product.description)

  // Synchronous call — blocks until fal.ai finishes (60–120s for Kling)
  let result: any
  try {
    const falRes = await fetch(FAL_SYNC, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, duration: '5', aspect_ratio: '9:16' }),
      signal: AbortSignal.timeout(110_000),
    })
    const txt = await falRes.text()
    if (!falRes.ok) {
      return NextResponse.json({ error: `fal.ai ${falRes.status}: ${txt.slice(0, 300)}` }, { status: 502 })
    }
    result = JSON.parse(txt)
  } catch (e: any) {
    return NextResponse.json({ error: `fal.ai call failed: ${e?.message}` }, { status: 502 })
  }

  const videoUrl: string | null = result?.video?.url ?? result?.videos?.[0]?.url ?? null
  if (!videoUrl) {
    return NextResponse.json({ error: `no video in response: ${JSON.stringify(result).slice(0, 300)}` }, { status: 500 })
  }

  const { data: row, error: insertErr } = await supabaseAdmin
    .from('product_creatives')
    .insert({
      product_id: productId,
      store_id: product.store_id,
      type: 'video',
      url: videoUrl,
      thumbnail_url: null,
      name: 'AI Generated',
      source: 'ai_ugc',
    })
    .select('*')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ item: { ...row, virtual: false } })
}
