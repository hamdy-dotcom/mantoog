import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

// Kling v2.5 Turbo Standard — image-to-video, $0.042/s
// Takes the actual product image as start frame → exact product appearance
const FAL_KLING = 'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/standard/image-to-video'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director for the Saudi Arabian market.
The product image is already provided as the video start frame — you do NOT need to describe the product's appearance.
Your job is to write a motion/scene prompt that tells the AI how to animate and extend that image into an 8-second UGC video.

Write a prompt that describes MOTION and SCENE only:

1. SCENE SETUP:
The product sits in a Saudi home (living room or kitchen). A Saudi woman in casual hijab and abaya, or a Saudi man in white thobe and shemagh, reaches into frame from the side and picks up the product naturally.

2. SHOT SEQUENCE (describe motion and camera):
  • 0–2s: Hands reach in and pick up the product confidently. Camera handheld, slightly shaky. Product remains clearly visible.
  • 2–5s: Person holds the product up toward camera, rotates it to show different angles. Their face enters frame — natural, relaxed expression, eyes open. Person speaks in Saudi Arabic dialect (write their EXACT words in Arabic script).
  • 5–7s: Person demonstrates using the product — shows it working, reacts positively. Speaks Arabic about one key benefit (write exact Arabic words).
  • 7–8s: Person looks directly at camera: "اطلبه الحين!" or "جربه الحين!"

3. TECHNICAL:
iPhone handheld footage, slightly shaky. Soft warm natural daylight. Person's eyes ALWAYS OPEN — natural, relaxed gaze, zero wide-eyed or staring expressions. Authentic Saudi home background, unstaged. Ambient sounds.

ABSOLUTE RULES:
- Output only the prompt text. No labels, no markdown, no explanation.
- ALL spoken dialogue MUST be in Saudi Arabic script only. Zero English spoken words.
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

  // Step 1: Claude writes the motion/scene prompt (product appearance comes from the image)
  const client = new Anthropic({ apiKey: anthropicKey })

  const imageBlocks = (imageUrls as string[]).slice(0, 4).map((url: string) => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const textBlock = {
    type: 'text' as const,
    text: `Product: ${title}
${description ? `Description: ${description.slice(0, 300)}` : ''}

The images above show the exact product. Write a Kling image-to-video motion prompt — the product appearance is already in the start frame, so focus on motion, person, Arabic dialogue, and scene.`,
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

  // Step 2: Submit to Kling image-to-video (product image as start frame)
  try {
    const res = await fetch(FAL_KLING, {
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
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/standard/image-to-video/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, veoPrompt }, { status: 502 })
  }
}
