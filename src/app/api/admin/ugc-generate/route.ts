import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

const FAL_VEO3_LITE = 'https://queue.fal.run/fal-ai/veo3.1/lite'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director specializing in the Saudi Arabian market.
Write a detailed, scene-by-scene video generation prompt for Google Veo3 to create a hyper-realistic 8-second UGC TikTok ad.

CRITICAL rules — read carefully:
- Write ONLY the video prompt text. No labels, no explanation, no intro, no markdown headers.
- A REAL PERSON must be visible at all times — a Saudi man or woman physically HOLDING, USING, and PRESENTING the product to camera. This is not a product showcase; this is a human-led UGC review.
- The person must speak in Saudi Arabic dialect (كتابة بالعامية السعودية) — include their exact spoken words.
- Describe the person's appearance: Saudi man in white thobe + shemagh, OR Saudi woman in hijab/abaya, casual and authentic-looking.
- Set the scene: Saudi home living room, kitchen, desert camp, mall, etc. — pick what fits the product.
- Structure the 8 seconds: HOOK (0-2s, person reacts to product dramatically) → DEMO (2-6s, person holds up product, uses it, explains feature) → CTA (6-8s, person looks at camera: "اطلبه الحين!")
- Camera: handheld, slightly shaky, close-ups of the person's face and hands, phone-camera quality
- Sound: ambient home/environment sounds + natural conversational Arabic voiceover
- Style: authentic iPhone footage, real home background, NOT staged, NOT studio, NOT cartoonish
- Keep under 400 words`

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { title, description, imageUrls = [], productUrl } = await req.json().catch(() => ({}))
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  // Step 1: Generate VEO3 prompt via Claude
  const client = new Anthropic({ apiKey: anthropicKey })

  const userMessage = `Product: ${title}
${description ? `Description: ${description.slice(0, 400)}` : ''}
${productUrl ? `URL: ${productUrl}` : ''}

Write the Veo3 video prompt for a Saudi TikTok UGC ad for this product.`

  let veoPrompt: string
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
    veoPrompt = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!veoPrompt) throw new Error('Empty prompt from Claude')
  } catch (e: any) {
    return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 })
  }

  // Step 2: Submit to fal.ai queue (returns immediately with request_id)
  try {
    const res = await fetch(FAL_VEO3_LITE, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: veoPrompt,
        aspect_ratio: '9:16',
        generate_audio: true,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await res.text()
    if (!res.ok) throw new Error(`fal.ai ${res.status}: ${txt.slice(0, 200)}`)
    const b = JSON.parse(txt)
    if (!b.request_id) throw new Error(`no request_id: ${txt.slice(0, 200)}`)

    return NextResponse.json({
      requestId: b.request_id as string,
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/veo3.1/lite/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
