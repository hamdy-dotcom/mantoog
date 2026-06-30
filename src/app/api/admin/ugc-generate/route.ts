import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 60

// VEO3.1 Lite image-to-video
// image_url = the product photo, used as the video's first frame → strong product fidelity
// generate_audio: true → Arabic speech + ambient sounds
const FAL_VEO3_REF = 'https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video'

const SYSTEM_PROMPT = `You are a video prompt writer for TikTok UGC ads targeting Saudi Arabia.
Write a single paragraph, plain English only, no Arabic characters, under 120 words.

The paragraph must cover:
1. What the product looks like (describe from the images: color, shape, 2-3 key physical features)
2. A young woman in casual hijab and light abaya, OR a young man in thobe, in a warm home living room
3. She/he holds the product toward the camera, demonstrates it, smiles and speaks in Gulf Arabic
4. Handheld iPhone footage, slightly shaky, warm natural light, eyes always open

Output only the paragraph. No headers, no labels, no Arabic characters.`

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
