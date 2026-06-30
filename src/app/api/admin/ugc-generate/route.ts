import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 60

// VEO3.1 Lite reference-to-video
// image_urls = product reference images → consistent subject appearance
// generate_audio: true → Arabic speech + ambient sounds
// Fresh scene generation (NOT start-frame constrained)
const FAL_VEO3_REF = 'https://queue.fal.run/fal-ai/veo3.1/lite/reference-to-video'

const SYSTEM_PROMPT = `You are an expert TikTok UGC ad creative director for the Saudi Arabian market.
You will be shown product images — the AI video model will use these to keep the product looking exactly right.
Write a video generation prompt for a hyper-realistic 8-second Saudi TikTok UGC ad.

CRITICAL: Write the ENTIRE prompt in ENGLISH ONLY. Do NOT include any Arabic script, Arabic letters, or non-Latin characters anywhere in the output. Describe speech in English (e.g. "she exclaims excitedly in Saudi Arabic dialect").

STRUCTURE:

1. PRODUCT (2-3 sentences): Describe the exact physical appearance from the images — color, shape, size, material, markings. Be specific so the model renders the correct object.

2. PERSON & SETTING: A Middle Eastern woman in modest casual clothing and headscarf, OR a Middle Eastern man in traditional white robe. Warm home interior — living room or kitchen. Soft natural daylight. Authentic and unstaged.

3. SHOT SEQUENCE (8 seconds total):
- 0-2s: Person picks up the product and reacts with genuine excitement. They exclaim a short enthusiastic phrase in Gulf Arabic dialect (describe the emotion and tone, do not write Arabic letters).
- 2-6s: Person holds the product clearly toward the camera, rotates it to show key features, demonstrates using it. They speak enthusiastically in Gulf Arabic about the main benefit. Both product and face clearly visible.
- 6-7s: Person actively uses the product with a natural positive reaction.
- 7-8s: Person looks directly at camera and says an enthusiastic call-to-action phrase in Gulf Arabic dialect.

4. TECHNICAL: Handheld iPhone footage, slightly shaky. Eyes always open — natural relaxed gaze, never wide-eyed or staring. Calm authentic expressions. Warm ambient home sounds plus Arabic voiceover audio.

RULES:
- Output only the prompt text. No section headers, no labels, no explanation.
- ENGLISH ONLY — zero Arabic characters, zero Arabic script in the output.
- Never name any brand, retailer, or platform.
- Under 350 words total.`

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

Write the VEO3 UGC video prompt. The model will receive the product images as visual reference to keep the product consistent.`,
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

  // Step 2: Proxy Amazon CDN images through Supabase (fal.ai can't fetch Amazon CDN URLs directly)
  const proxyResults = await Promise.all(urls.slice(0, 4).map((u, i) => proxyImageToSupabase(u, i)))
  const proxyUrls = proxyResults.filter(Boolean) as string[]
  if (proxyUrls.length === 0) {
    return NextResponse.json({ error: 'Failed to proxy product images — cannot pass reference images to fal.ai', veoPrompt }, { status: 502 })
  }

  // Step 3: Submit to VEO3.1 Lite reference-to-video with accessible Supabase URLs
  try {
    const res = await fetch(FAL_VEO3_REF, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: veoPrompt,
        image_urls: proxyUrls,
        aspect_ratio: '9:16',
        resolution: '720p',
        generate_audio: true,
        auto_fix: true,
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
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/veo3.1/lite/reference-to-video/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, veoPrompt }, { status: 502 })
  }
}
