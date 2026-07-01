import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 60

// VEO3.1 Lite image-to-video
// image_url = the product photo, used as the video's first frame → strong product fidelity
// generate_audio: true → Arabic speech + ambient sounds
const FAL_VEO3_REF = 'https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video'

const SYSTEM_PROMPT = `You are a TikTok ad creative director for the Saudi Arabian market. You receive a product's title, description, and several images, and write ONE image-to-video generation prompt.

HOW THE MODEL WORKS: The video model uses ONE of the product images as the literal FIRST FRAME and animates forward from it. You must (a) choose which image is the best opening frame, and (b) write the prompt.

CHOOSING THE OPENING FRAME (imageIndex):
- Prefer a LIFESTYLE / in-context image (product sitting in a real room, on a desk, in a home) so the video opens on a natural scene, NOT a plain white studio catalog shot.
- Only fall back to a plain white-background image if there is no lifestyle image.
- Return the 0-based index of your chosen image.

PRODUCT ACCURACY — THE #1 RULE (read carefully):
- The opening frame ALREADY shows exactly what the product looks like. Any words you write describing its appearance FIGHT the image and make the model deform/reinvent the product into something else. So:
- NEVER describe the product's appearance. In the ENGLISH scene directions, refer to it ONLY as "the product", "the device", or "it". Do NOT write ANY of: its color, shape, size, material, "handle", "tank", "grille", "blades", "buttons", "tower", "compact", "LED", brand, or any capacity/number. Zero physical adjectives.
- FORBIDDEN example phrases (never write these): "picks it up by its handle", "the 7-color LED glow", "the transparent water tank", "the fan blades spinning", "the control buttons on top". Instead write: "picks up the product", "a soft glow from the product", "presses the product", "the product hums to life".
- The person interacts with "the product" — picks it up, presses it, tilts it, holds it — without you naming or describing any of its parts.
- Keep the product visually IDENTICAL to the opening frame the whole time. Do NOT add parts or attachments. Do NOT change its shape or proportions.
- The Arabic voiceover MAY mention benefits (cooling, mist, colors) since that is spoken ad copy — but the English visual directions must stay free of any product description.
- Mist/vapor stays LOW and close to the product only. Mist must NEVER rise up to, around, or across the person's face, nose, or mouth — never let it look like the person is breathing out or emitting vapor. The person's face stays clear; they just feel the breeze on their skin and smile with mouth closed.

PROMPT SPECS:
- 8 seconds, 9:16 vertical, authentic UGC, handheld camera, warm Saudi home.
- Do NOT hold on a static product photo — begin with immediate natural motion (a hand reaching in, the camera moving, or a person already interacting) so it never looks like a frozen catalog image.
- Strong hook in the first 2 seconds: a scroll-stopping pattern interrupt (a surprising line, a "stop!" moment, a bold question).
- 5 quick shots: (1) hook, (2) a Saudi person picks up the product — woman in casual hijab and abaya OR man in thobe, (3) she/he presses a button and the product works, (4) lifestyle use, (5) final shot on the product.
- Voiceover in natural Saudi dialect Arabic, punchy. The FIRST spoken line is the hook. Write the exact spoken words in Arabic script, in quotes. End on a strong call to action (e.g. "اطلبه الحين").
- Soft trendy beat low under the voiceover. NO text overlays anywhere. Eyes natural and open.

OUTPUT FORMAT — return ONLY valid JSON, nothing else:
{"imageIndex": <number>, "prompt": "<the full video prompt as one cohesive paragraph weaving the 5 shots with the Arabic voiceover lines inline>"}`

async function proxyImageToSupabase(imageUrl: string, idx: number): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const path = `ugc-temp/${Date.now()}-${idx}.${ext}`
    const { error } = await supabaseAdmin.storage
      .from('store-assets')
      .upload(path, buffer, { contentType, upsert: true })
    if (error) return null
    const { data } = supabaseAdmin.storage.from('store-assets').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

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

  // Step 1: Claude writes the UGC prompt (product images for visual context)
  const client = new Anthropic({ apiKey: anthropicKey })

  const imageBlocks = urls.slice(0, 4).map(url => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const shownImages = urls.slice(0, 4)
  const textBlock = {
    type: 'text' as const,
    text: `Product: ${title}
${description ? `Description: ${description.slice(0, 600)}` : ''}

Images are numbered 0-${shownImages.length - 1} in the order shown. Pick the best opening frame and write the image-to-video prompt. Return only the JSON.`,
  }

  let veoPrompt: string
  let imageIndex = 0
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!raw) throw new Error('Empty response from Claude')
    // Claude returns JSON { imageIndex, prompt } — parse leniently
    const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    const parsed = JSON.parse(json)
    veoPrompt = String(parsed.prompt || '').trim()
    const idx = Number(parsed.imageIndex)
    if (Number.isInteger(idx) && idx >= 0 && idx < shownImages.length) imageIndex = idx
    if (!veoPrompt) throw new Error('No prompt in Claude JSON')
  } catch (e: any) {
    return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 })
  }

  // Step 2: Proxy the chosen opening-frame image through Supabase (fal.ai can't fetch Amazon CDN URLs directly).
  const proxyUrl = await proxyImageToSupabase(urls[imageIndex], imageIndex)
  if (!proxyUrl) {
    return NextResponse.json({ error: 'Failed to proxy product image — cannot pass image to fal.ai', veoPrompt }, { status: 502 })
  }

  // Step 3: Submit to VEO3.1 Lite image-to-video — the product photo is the first frame
  try {
    const res = await fetch(FAL_VEO3_REF, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: veoPrompt,
        image_url: proxyUrl,
        aspect_ratio: '9:16',
        resolution: '720p',
        duration: '8s',
        generate_audio: true,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await res.text()
    if (!res.ok) {
      return NextResponse.json(
        { error: `fal.ai ${res.status}: ${txt.slice(0, 300)}`, veoPrompt },
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
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, veoPrompt }, { status: 502 })
  }
}
