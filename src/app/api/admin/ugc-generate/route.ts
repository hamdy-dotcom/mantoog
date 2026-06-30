import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

// Kling O1 reference-to-video: uses product image as visual reference (not start frame)
// Generates a fresh UGC scene while maintaining the product's exact appearance
const FAL_KLING_REF = 'https://queue.fal.run/fal-ai/kling-video/o1/reference-to-video'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director for the Saudi Arabian market.
You will be shown the product images. The AI video model will use these images as a visual reference to keep the product looking exactly right in the generated video.
Your job: write a scene + motion prompt describing the UGC ad. You do NOT need to describe the product appearance — the model already has the reference images.

Write a prompt covering:

1. PERSON & SCENE:
Saudi woman in casual hijab and abaya, OR Saudi man in white thobe and shemagh. Saudi home interior — warm living room or kitchen. Soft natural daylight. Authentic, unstaged look.

2. SHOT SEQUENCE (10 seconds):
  • 0–2s: Person reacts naturally to the product with excitement. Says one punchy line in Saudi Arabic dialect (write EXACT words in Arabic script).
  • 2–6s: Person holds the product clearly toward camera with both hands. Rotates it to show key features. Speaks Arabic about the main benefit (write EXACT words in Arabic script). Product and face both clearly visible.
  • 6–9s: Person actively demonstrates using the product. Shows it working. Natural reaction.
  • 9–10s: Person looks directly at camera: "اطلبه الحين!" or "جربه الحين!"

3. TECHNICAL:
Handheld iPhone footage, slightly shaky. Person's eyes ALWAYS OPEN — relaxed, natural gaze, zero wide-eyed or staring. Calm authentic expressions. Warm ambient home sounds + natural Arabic voiceover.

ABSOLUTE RULES:
- Output only the prompt text. No labels, no headers, no explanation.
- ALL spoken dialogue in Saudi Arabic script only. Zero English spoken words.
- NEVER name any brand, retailer, or platform.
- Keep under 350 words.`

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { title, description, imageUrls = [] } = await req.json().catch(() => ({}))
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const imageUrl: string | null = (imageUrls as string[])[0] ?? null
  if (!imageUrl) return NextResponse.json({ error: 'at least one product image required' }, { status: 400 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  // Step 1: Claude writes the UGC scene + motion prompt
  const client = new Anthropic({ apiKey: anthropicKey })

  const imageBlocks = (imageUrls as string[]).slice(0, 4).map((url: string) => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const textBlock = {
    type: 'text' as const,
    text: `Product: ${title}
${description ? `Description: ${description.slice(0, 300)}` : ''}

Write a Kling reference-to-video motion prompt. The model already has the product images for visual reference — focus on the UGC scene, person, motion, and Arabic dialogue.`,
  }

  let veoPrompt: string
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })
    veoPrompt = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!veoPrompt) throw new Error('Empty prompt from Claude')
  } catch (e: any) {
    return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 })
  }

  // Step 2: Submit to Kling reference-to-video
  try {
    const res = await fetch(FAL_KLING_REF, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: veoPrompt,
        duration: '10',
        aspect_ratio: '9:16',
      }),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await res.text()
    if (!res.ok) {
      return NextResponse.json(
        { error: `fal.ai ${res.status}: ${txt.slice(0, 200)}`, veoPrompt },
        { status: 502 }
      )
    }
    const b = JSON.parse(txt)
    if (!b.request_id) {
      return NextResponse.json(
        { error: `no request_id: ${txt.slice(0, 200)}`, veoPrompt },
        { status: 502 }
      )
    }

    return NextResponse.json({
      requestId: b.request_id as string,
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/kling-video/o1/reference-to-video/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, veoPrompt }, { status: 502 })
  }
}
