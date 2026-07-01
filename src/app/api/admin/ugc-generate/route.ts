import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 90

// Composite-first pipeline:
// 1) nano-banana (Gemini 2.5 Flash Image) composites a Saudi person holding the REAL product
//    (product preserved from the reference image) → photorealistic first frame
// 2) VEO3.1 Lite image-to-video animates that frame with Arabic voiceover
const FAL_NANO = 'https://queue.fal.run/fal-ai/nano-banana/edit'
const FAL_VEO_I2V = 'https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video'

const SYSTEM_PROMPT = `You are a TikTok ad creative director for the Saudi Arabian market. You receive a product's title, description, and several images. You produce TWO prompts for a two-step pipeline:
- STEP 1 (compositing): an image model takes ONE product reference image + your imagePrompt and generates a photorealistic first frame of a Saudi person with the product.
- STEP 2 (video): a video model animates that frame using your videoPrompt with Arabic voiceover.

CHOOSE THE REFERENCE IMAGE (imageIndex):
- Pick the image that shows the PRODUCT most clearly and completely (usually a clean, well-lit product shot). The compositing model copies the product from this image, so clarity of the product matters more than scenery. Return its 0-based index.

NEVER DESCRIBE THE PRODUCT'S APPEARANCE (in BOTH prompts):
- The reference image already shows exactly what it looks like. Any words describing its appearance make the models reinvent it. Refer to it ONLY as "the product", "the device", or "it".
- Do NOT write its color, shape, size, material, "handle", "tank", "grille", "blades", "buttons", "tower", "compact", "LED", brand, or any capacity/number. Zero physical adjectives.
- FORBIDDEN phrases: "by its handle", "the 7-color LED", "the transparent water tank", "the fan blades", "the control buttons". Instead: "the product", "holding the product", "presses the product", "a soft glow from the product".

FACIAL REALISM — CRITICAL (applies to BOTH prompts):
- The person's face must ALWAYS look calm, natural, and relaxed. Normal, softly-open eyes with a relaxed gaze.
- ABSOLUTELY NEVER: wide-open eyes, bulging eyes, popping or staring eyes, raised-high eyebrows, an exaggerated shocked/gasping face, or an over-excited cartoonish expression. This looks fake and ruins the ad.
- The energy is confident, warm, and genuine — like a real person casually talking to their phone. A soft natural smile, not a big forced grin. Emotion is conveyed by tone of voice, not by widening the eyes.

imagePrompt (the composite first frame — treat it as a full OPENING SCENE):
- Pick a realistic setting that matches how the product is ACTUALLY USED, and build the whole scene there: a kitchen for a kitchen gadget, a driveway with a car for a car-cleaning tool, a bathroom for a grooming device, a living room for a home cooler, etc. A young Saudi person (woman in casual hijab and abaya, OR man in thobe) is in that setting with the product, with a CALM, RELAXED, natural expression and softly-open eyes (never wide-eyed or surprised).
- Establish the ENVIRONMENT fully in this frame — include whatever context the action will need (e.g. if the product is used on a car, the car is already visible in the shot). This prevents the video from having to invent objects later.
- Compose it as a real opening scene: a slightly wider, natural framing that shows the person, the product, and the setting — not just a tight close-up of the product in hands.
- Keep the product IDENTICAL to the reference image — same shape, proportions, and details; do not alter it or add parts.
- Photorealistic, authentic UGC phone-photo look, soft natural light, vertical 9:16 framing.

videoPrompt (animates that first frame, 8 seconds):
- Everything the video needs is ALREADY in the opening frame. Animate only natural motion of what is present — the person moves, uses the product, reacts, speaks. Do NOT introduce NEW large objects that were not in the opening frame; nothing may pop into existence or slide in from off-screen. New elements may only appear by the person naturally moving or a hand reaching in.
- REAL UGC CAMERA WORK: do not keep one static angle. Use handheld movement and 1-2 natural reframes or cuts to different angles/distances — e.g. open on a medium selfie-style shot, cut to a closer angle of the product in action, then back to the person's reaction. Slightly shaky, authentic phone-held feel.
- Open with a confident, conversational hook in the first 2 seconds — delivered with a natural relaxed face and calm energy, NOT a shocked or wide-eyed expression. Voiceover in natural Saudi dialect Arabic, punchy; the FIRST spoken line is the hook; write the exact spoken words in Arabic script in quotes; end on a strong call to action (e.g. "اطلبه الحين").
- Any spray, mist, water, or air comes ONLY from the product, aimed where it naturally goes (its target) — it NEVER comes from the person's mouth or nose. The person's mouth stays closed except when speaking, eyes relaxed and natural throughout.
- Soft trendy beat low under the voiceover. NO text overlays.

OUTPUT — return ONLY valid JSON, nothing else:
{"imageIndex": <number>, "imagePrompt": "<composite first-frame prompt>", "videoPrompt": "<8s animation + Arabic voiceover prompt>"}`

// Submit a fal queue job and poll it to completion; returns the result JSON.
async function runFalJob(endpoint: string, body: object, falKey: string, maxMs: number): Promise<any> {
  const submit = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  const submitTxt = await submit.text()
  if (!submit.ok) throw new Error(`submit ${submit.status}: ${submitTxt.slice(0, 200)}`)
  const s = JSON.parse(submitTxt)
  const statusUrl = s.status_url
  const responseUrl = s.response_url
  if (!statusUrl || !responseUrl) throw new Error(`no status/response url: ${submitTxt.slice(0, 200)}`)

  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 2500))
    const st = await fetch(statusUrl, { headers: { 'Authorization': `Key ${falKey}` }, signal: AbortSignal.timeout(10000) })
    const sb = await st.json().catch(() => ({}))
    const status = sb?.status
    if (status === 'COMPLETED') {
      const r = await fetch(responseUrl, { headers: { 'Authorization': `Key ${falKey}` }, signal: AbortSignal.timeout(10000) })
      const rt = await r.text()
      if (!r.ok) throw new Error(`result ${r.status}: ${rt.slice(0, 200)}`)
      return JSON.parse(rt)
    }
    if (status === 'FAILED' || status === 'ERROR') throw new Error(`job ${status}`)
  }
  throw new Error('job timed out')
}

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

Images are numbered 0-${shownImages.length - 1} in the order shown. Pick the clearest product reference image, then write the imagePrompt and videoPrompt. Return only the JSON.`,
  }

  let imagePrompt: string
  let videoPrompt: string
  let imageIndex = 0
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!raw) throw new Error('Empty response from Claude')
    const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    const parsed = JSON.parse(json)
    imagePrompt = String(parsed.imagePrompt || '').trim()
    videoPrompt = String(parsed.videoPrompt || '').trim()
    const idx = Number(parsed.imageIndex)
    if (Number.isInteger(idx) && idx >= 0 && idx < shownImages.length) imageIndex = idx
    if (!imagePrompt || !videoPrompt) throw new Error('Missing prompt in Claude JSON')
  } catch (e: any) {
    return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 })
  }

  // Step 2: Proxy the chosen product image through Supabase (fal.ai can't fetch Amazon CDN URLs directly).
  const productUrl = await proxyImageToSupabase(urls[imageIndex], imageIndex)
  if (!productUrl) {
    return NextResponse.json({ error: 'Failed to proxy product image — cannot pass image to fal.ai', videoPrompt }, { status: 502 })
  }

  // Step 3: Composite the person + real product into a photorealistic first frame (nano-banana).
  let compositeUrl: string
  try {
    const result = await runFalJob(FAL_NANO, {
      prompt: imagePrompt,
      image_urls: [productUrl],
      num_images: 1,
    }, falKey, 55000)
    compositeUrl = result?.images?.[0]?.url ?? ''
    if (!compositeUrl) throw new Error('no composite image returned')
  } catch (e: any) {
    return NextResponse.json({ error: `composite step: ${e.message}`, imagePrompt, videoPrompt }, { status: 502 })
  }

  // Step 4: Submit the composite to VEO3.1 image-to-video; client polls for the result.
  try {
    const res = await fetch(FAL_VEO_I2V, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: videoPrompt,
        image_url: compositeUrl,
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
        { error: `fal.ai ${res.status}: ${txt.slice(0, 300)}`, videoPrompt },
        { status: 502 }
      )
    }
    const b = JSON.parse(txt)
    if (!b.request_id) {
      return NextResponse.json(
        { error: `no request_id: ${txt.slice(0, 200)}`, videoPrompt },
        { status: 502 }
      )
    }

    return NextResponse.json({
      requestId: b.request_id as string,
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt: videoPrompt,
      compositeUrl,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, videoPrompt }, { status: 502 })
  }
}
