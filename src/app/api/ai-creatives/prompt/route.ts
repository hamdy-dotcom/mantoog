import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const productId = new URL(req.url).searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('title, description, images, price')
    .eq('id', productId)
    .eq('merchant_id', user.id)
    .single()
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const systemPrompt = `You are an expert TikTok UGC ad creative director specializing in the Saudi Arabian market.
Your job is to write a detailed, scene-by-scene video generation prompt for Google Veo3 to create a hyper-realistic 8-second UGC TikTok ad.

CRITICAL rules — read carefully:
- Write ONLY the video prompt text. No labels, no explanation, no intro, no markdown headers.
- A REAL PERSON must be visible in the video at all times — a Saudi man or woman physically HOLDING, USING, and PRESENTING the product to camera. This is not a product showcase; this is a human-led UGC review.
- The person must speak in Saudi Arabic dialect (كتابة بالعامية السعودية) — include their exact spoken words.
- Describe the person's appearance: Saudi man in white thobe + shemagh, OR Saudi woman in hijab/abaya, casual and authentic-looking.
- Set the scene: Saudi home living room, kitchen, desert camp, mall, etc. — pick what fits the product.
- Structure the 8 seconds: HOOK (0-2s, person reacts to product dramatically) → DEMO (2-6s, person holds up product, uses it, explains feature) → CTA (6-8s, person looks at camera: "اطلبه الحين!")
- Camera: handheld, slightly shaky, close-ups of the person's face and hands, phone-camera quality
- Sound: ambient home/environment sounds + natural conversational Arabic voiceover
- Style: authentic iPhone footage, real home background, NOT staged, NOT studio, NOT cartoonish
- Keep under 400 words`

  const userMessage = `Product: ${product.title}
${product.description ? `Description: ${product.description.slice(0, 400)}` : ''}
${product.price ? `Price: ${product.price} SAR` : ''}

Write the Veo3 video prompt for a Saudi TikTok UGC ad for this product.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    const prompt = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return NextResponse.json({ prompt })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
