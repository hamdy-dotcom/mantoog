import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

// VEO3 full image-to-video — product image is the literal start frame
// generate_audio: true → Arabic speech + ambient sounds
// Much higher quality than VEO3 lite and Kling
const FAL_VEO3_I2V = 'https://queue.fal.run/fal-ai/veo3/image-to-video'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director for the Saudi Arabian market.
The video will START with the exact product image as its first frame. Your prompt must describe how the scene EVOLVES from that starting point — hands reaching in, camera pulling back to reveal a home setting, person appearing.

Write a prompt that flows naturally from "product sitting in frame" → "UGC ad scene":

STRUCTURE TO FOLLOW:
1. Camera starts tight on the product (this is the start frame — white bg fades/transitions)
2. A Saudi woman's hands enter from below, picking up the product with both hands
3. Camera pulls back to reveal a warm Saudi living room, soft natural daylight
4. Woman reacts with excitement — looks at product, then to camera. Says Arabic line.
5. She holds the product up, rotates it, demonstrates it — speaks Arabic about key benefit
6. She demonstrates using the product actively
7. Looks directly at camera: "اطلبه الحين!" or "جربه الحين!"

WRITE IT AS ONE FLOWING DESCRIPTIVE PROMPT (not a list). Example style:
"The video opens on the [product description] sitting still. Two hands in a beige abaya sleeve reach in from the bottom of frame and gently pick it up. The camera smoothly pulls back to reveal a warm Saudi home living room — cream walls, soft morning light through curtains. A Saudi woman in a soft beige hijab and abaya looks at the product in her hands with delight and says بالعامية السعودية: "[exact Arabic words]". She lifts it toward the camera..."

RULES:
- Write ONLY the prompt text. No labels, no headers, no markdown.
- Include the exact Arabic dialogue the woman speaks (Saudi dialect, Arabic script).
- Eyes ALWAYS open — relaxed natural gaze. No wide eyes, no staring, no closed eyes.
- Handheld iPhone footage feel, slightly shaky.
- Warm authentic home setting, not studio.
- Never name any brand or retailer.
- Keep under 400 words.`

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

  // Step 1: Claude writes the scene evolution prompt
  const client = new Anthropic({ apiKey: anthropicKey })

  const imageBlocks = urls.slice(0, 4).map(url => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const textBlock = {
    type: 'text' as const,
    text: `Product: ${title}
${description ? `Description: ${description.slice(0, 300)}` : ''}

The video start frame IS the product image above. Write the VEO3 image-to-video prompt describing how a Saudi UGC ad scene evolves from that starting frame.`,
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

  // Step 2: Submit to VEO3 image-to-video
  try {
    const res = await fetch(FAL_VEO3_I2V, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: urls[0],
        prompt: veoPrompt,
        aspect_ratio: '9:16',
        duration: '8s',
        resolution: '720p',
        generate_audio: true,
        negative_prompt: 'white background, studio lighting, closed eyes, wide eyes, bulging eyes, fake smile, artificial, staged',
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
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/veo3/image-to-video/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, veoPrompt }, { status: 502 })
  }
}
