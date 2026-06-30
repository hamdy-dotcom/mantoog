import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

// Kling O1 reference-to-video
// Correct API: elements[].frontal_image_url + reference_image_urls
// Product referenced in prompt as @Element1
const FAL_KLING_REF = 'https://queue.fal.run/fal-ai/kling-video/o1/reference-to-video'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director for the Saudi Arabian market.
You will be shown product images. The AI video model will receive the product as "@Element1" — a visual element it will place in the video with exact appearance.
Your job: write a motion/scene prompt. Always refer to the product as "@Element1" — never describe its appearance, just call it @Element1.

Write a prompt like this structure (but as natural flowing text):

A Saudi woman in casual hijab and abaya sits in a warm Saudi living room. She picks up @Element1 and reacts with surprise and excitement. She says [exact Saudi Arabic dialogue]. She holds @Element1 up close to camera with both hands, rotating it to show different angles. She speaks [more Arabic] about its key benefit. She demonstrates using @Element1. She looks directly at camera: "اطلبه الحين!"

SHOT TIMING (10 seconds):
• 0–2s: Person picks up @Element1, surprised reaction, one punchy Arabic line
• 2–6s: Holds @Element1 up to camera, rotates it, speaks Arabic about the benefit
• 6–9s: Demonstrates @Element1 in use, positive reaction
• 9–10s: Direct to camera CTA in Arabic

TECHNICAL: Handheld iPhone, slightly shaky. Eyes always OPEN — natural relaxed gaze, never wide-eyed. Warm home light. Authentic unstaged look. Arabic voiceover.

ABSOLUTE RULES:
- Output only the prompt text. No labels, no markdown, no explanation.
- ALWAYS call the product @Element1 in the prompt.
- ALL spoken dialogue in Saudi Arabic script only. Zero English.
- NEVER name any brand or retailer.
- Keep under 300 words.`

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { title, description, imageUrls = [] } = await req.json().catch(() => ({}))
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const urls = imageUrls as string[]
  if (!urls[0]) return NextResponse.json({ error: 'at least one product image required' }, { status: 400 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  // Step 1: Claude writes the UGC scene prompt (must use @Element1 for product)
  const client = new Anthropic({ apiKey: anthropicKey })

  const imageBlocks = urls.slice(0, 4).map(url => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const textBlock = {
    type: 'text' as const,
    text: `Product: ${title}
${description ? `Description: ${description.slice(0, 300)}` : ''}

Write the UGC scene prompt. Always refer to this product as @Element1.`,
  }

  let veoPrompt: string
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })
    veoPrompt = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!veoPrompt) throw new Error('Empty prompt from Claude')
  } catch (e: any) {
    return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 })
  }

  // Step 2: Submit to Kling O1 reference-to-video with correct elements structure
  // elements[0] = product visual reference → appears as @Element1 in the video
  const element = {
    frontal_image_url: urls[0],
    ...(urls.length > 1 ? { reference_image_urls: urls.slice(1, 4) } : {}),
  }

  try {
    const res = await fetch(FAL_KLING_REF, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: veoPrompt,
        elements: [element],
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
