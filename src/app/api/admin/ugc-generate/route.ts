import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

const FAL_VEO3_LITE = 'https://queue.fal.run/fal-ai/veo3.1/lite'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director for the Saudi Arabian market.
You will be shown product images. Study them extremely carefully — your job is to describe the product so precisely that an AI video generator can recreate its exact look without seeing the photos.

Write a Veo3 video generation prompt structured EXACTLY as follows:

---
PRODUCT: [Write a dense, hyper-specific physical description of the product from the images. Cover every visible attribute:]
  • Exact colors and color placement (e.g. "white matte body with a thin grey stripe along the top edge")
  • Overall shape and silhouette (e.g. "compact rectangular box, roughly the size of a paperback book")
  • Surface finish on each part (matte / glossy / brushed metal / fabric)
  • All visible text, logos, icons, or markings — their position, color, and font style
  • Any buttons, ports, nozzles, handles, hinges, or mechanical parts
  • Materials each section appears to be made from
  • How large it looks relative to a human hand
  • Anything else uniquely distinctive about its visual appearance
[This block must be long and thorough — 80–120 words minimum. Veo3 will recreate the product from your words alone.]

SCENE: Saudi man in white thobe and shemagh OR Saudi woman in casual hijab/abaya. Saudi home interior (living room or kitchen). Soft natural daylight. Unstaged, authentic.

SHOTS (8 seconds):
  • 0–1s: Person reacts to product with surprise. Says one punchy Arabic line in Saudi dialect (write exact words in Arabic script).
  • 1–4s: Extreme close-up on the product — person's hands slowly rotate it toward camera. Product fills the entire frame. No face. Show every angle described above.
  • 4–7s: Person demonstrates using the product. Face and product both visible. Speaks Arabic describing one key benefit (write exact words in Arabic script).
  • 7–8s: Person looks directly at camera: "اطلبه الحين!" or "جربه الحين!"

TECHNICAL: Handheld iPhone footage, slightly shaky. Person's eyes stay OPEN the entire video — natural, relaxed gaze, NOT wide-eyed or staring. No blinking sequences. Calm realistic expressions. Ambient home sounds + natural Arabic voiceover.
---

ABSOLUTE RULES:
- Output only the prompt text itself — no labels, no markdown, no explanation.
- ALL spoken dialogue in Saudi Arabic script only. Zero English spoken words.
- NEVER name any brand, retailer, platform, or company.
- Keep under 500 words.`

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
