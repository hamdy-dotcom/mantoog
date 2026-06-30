import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

const FAL_VEO3_LITE = 'https://queue.fal.run/fal-ai/veo3.1/lite'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director for the Saudi Arabian market.
Write a video generation prompt for Google Veo3 to create a hyper-realistic 8-second UGC TikTok ad.

ABSOLUTE RULES — no exceptions:
- Write ONLY the video prompt text. No labels, no headers, no explanation.
- ALL SPOKEN DIALOGUE IN THE VIDEO MUST BE IN ARABIC (Saudi dialect). Never write any English spoken words.
- The person SPEAKS ARABIC the entire time — write their exact Arabic words in the prompt using Arabic script (e.g. "يقول بالعامية السعودية: صدقوني هذا غيّر حياتي!").
- A real Saudi person is always visible — physically HOLDING and DEMONSTRATING the product to camera.
- Person appearance: Saudi man in white thobe and shemagh, OR Saudi woman in hijab/abaya — casual, authentic home setting.
- Scene: Saudi home (living room, kitchen, bedroom) or outdoor Saudi setting — whatever fits the product.
- 8-second structure: HOOK (0-2s, dramatic reaction in Arabic) → DEMO (2-6s, shows/uses product, explains in Arabic) → CTA (6-8s, looks at camera and says "اطلبه الحين!" or similar Arabic CTA).
- Camera: handheld, slightly shaky, phone-camera quality — NOT studio, NOT staged.
- Sound: ambient home sounds + natural Arabic voiceover.
- Keep under 400 words.`

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
