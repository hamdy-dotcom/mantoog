import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 60

// VEO3.1 Lite image-to-video
// image_url = the product photo, used as the video's first frame → strong product fidelity
// generate_audio: true → Arabic speech + ambient sounds
const FAL_VEO3_REF = 'https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video'

const SYSTEM_PROMPT = `You are a TikTok ad creative director for the Saudi Arabian market. You receive a product's title, description, and images, and write ONE image-to-video generation prompt.

CRITICAL CONTEXT: The video model uses the product image as the literal FIRST FRAME of the video. The real product is already on screen. Therefore:
- Do NOT re-describe the product's appearance — the frame already shows it.
- Instead, instruct the model to keep the product's exact shape, color, buttons, and details IDENTICAL to the opening frame throughout — never morph, restyle, or change it.
- The video opens ON the product, then animates from there.

Specs (every time):
- 8 seconds, 9:16 vertical, authentic UGC, handheld camera, warm Saudi home.
- Strong hook in the first 2 seconds: a scroll-stopping pattern interrupt (a surprising line, a "stop!" moment, a bold question).
- 5 quick shots: (1) hook on the product, (2) a Saudi person picks it up — woman in casual hijab and abaya OR man in thobe, (3) key benefit shown in action, (4) lifestyle use, (5) final product shot.
- Voiceover in natural Saudi dialect Arabic, punchy. The FIRST spoken line is the hook. Write the exact spoken words in Arabic script, in quotes. End on a strong call to action (e.g. "اطلبه الحين").
- Soft trendy beat low under the voiceover. NO text overlays anywhere on the video.
- Eyes natural and open. Authentic, unstaged.

Output ONLY the video prompt as one cohesive paragraph that weaves the 5-shot flow together with the Arabic voiceover lines inline. No section headers, no labels, no preamble, no English translation.`

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

  const textBlock = {
    type: 'text' as const,
    text: `Product: ${title}
${description ? `Description: ${description.slice(0, 300)}` : ''}

Write the image-to-video prompt. The product image is the video's first frame, so keep the product identical to it — do not re-describe its looks.`,
  }

  let veoPrompt: string
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })
    veoPrompt = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!veoPrompt) throw new Error('Empty prompt from Claude')
  } catch (e: any) {
    return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 })
  }

  // Step 2: Proxy the main product image through Supabase (fal.ai can't fetch Amazon CDN URLs directly).
  const proxyUrl = await proxyImageToSupabase(urls[0], 0)
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
