import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

const FAL_VEO3_LITE = 'https://queue.fal.run/fal-ai/veo3.1/lite'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director for the Saudi Arabian market.
Write a video generation prompt for Google Veo3 for a hyper-realistic 8-second UGC TikTok ad.

STRUCTURE YOUR PROMPT IN THIS EXACT ORDER:

1. PRODUCT DESCRIPTION (start here — most important):
Describe the product's exact physical appearance from the images with extreme detail: precise color(s) and finish (matte/glossy/metallic), exact shape and form factor, approximate size and dimensions, all visible text/logos/markings on the product, material textures, any distinctive features (buttons, nozzles, handles, packaging colors). Veo3 must generate a product that LOOKS IDENTICAL to the reference images — be as specific as a product designer would be.

2. SCENE & PERSON:
Saudi man in white thobe and shemagh OR Saudi woman in casual hijab/abaya. Saudi home setting (living room, kitchen) — real, unstaged.

3. SHOT SEQUENCE (8 seconds total):
- 0-1s: Quick HOOK — person reacts with surprise/excitement. Speaks Arabic: one punchy line.
- 1-4s: PRODUCT CLOSEUP — camera pushes in tight on the product itself. Show it from multiple angles. Person's hands hold it up, rotate it. The product fills most of the frame. No face needed here — just the product being shown clearly.
- 4-7s: DEMO — person uses the product in action. Show both face and product together. Speaks Arabic explaining one key benefit.
- 7-8s: CTA — person looks directly at camera: "اطلبه الحين!" or "جربه الحين!"

4. TECHNICAL:
Camera: handheld iPhone, slightly shaky. Person has NATURAL relaxed eyes — NOT wide-eyed, NOT staring, NOT bulging. Calm, conversational, realistic facial expressions. Soft natural daylight. Ambient home sounds + Arabic voiceover.

ABSOLUTE RULES:
- Write ONLY the prompt text. No labels, no headers, no explanation — just the prompt.
- ALL spoken words MUST be in Saudi Arabic script. Zero English dialogue.
- NEVER mention any brand, retailer, or platform name (not Amazon, not any other).
- Keep under 450 words.`

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

  const textBlock = {
    type: 'text' as const,
    text: `Product name: ${title}
${description ? `Description: ${description.slice(0, 400)}` : ''}

Study the product images above carefully. Describe the product's exact appearance (color, shape, size, material, packaging) in your prompt so Veo3 can recreate it accurately. Write the Veo3 video prompt for a Saudi TikTok UGC ad.`,
  }

  const imageBlocks = (imageUrls as string[]).slice(0, 4).map(url => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const userContent = imageBlocks.length > 0
    ? [...imageBlocks, textBlock]
    : [textBlock]

  let veoPrompt: string
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
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
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/veo3.1/lite/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, veoPrompt }, { status: 502 })
  }
}
