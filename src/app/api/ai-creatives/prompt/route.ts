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
Your job is to write a detailed, scene-by-scene video generation prompt for Google Veo3 to create a hyper-realistic 20-second UGC TikTok ad.

Rules:
- Write ONLY the video prompt. No explanation, no intro, no labels.
- Use Saudi cultural context: desert camp (كشتة), Saudi home, beach, mall, etc.
- The character must wear authentic Saudi clothing (white thobe + shemagh for men, abaya/hijab for women)
- Include SPECIFIC Saudi dialect dialogue (written in Arabic)
- Structure: Hook (first 3s — surprising/punchy) → Product demo → 2-3 key benefits → CTA "اطلبه الحين"
- Describe camera angles, movement (handheld, zoom-in, close-up), and cuts
- Include sound design: ambient sounds (wind, fire crackle, crowd, etc.) + natural voiceover tone
- Style: looks like real iPhone footage, natural lighting, authentic — NOT studio, NOT fake
- Keep under 500 words`

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
