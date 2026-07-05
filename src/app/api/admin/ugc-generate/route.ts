import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 90

// Composite-first pipeline:
// 1) nano-banana (Gemini 2.5 Flash Image) composites a Saudi person holding the REAL product
//    (product preserved from the reference image) → photorealistic first frame
// 2) Gemini Omni Flash image-to-video animates that frame (10s + native audio + Arabic voiceover)
const FAL_NANO = 'https://queue.fal.run/fal-ai/nano-banana/edit'
const FAL_VIDEO_I2V = 'https://queue.fal.run/fal-ai/gemini-omni-flash/image-to-video'
const VIDEO_DURATION = 10 // seconds (Omni Flash supports 3–10)

// Turns the scraped product photos into one clean multi-angle (360°) reference.
const THREE60_PROMPT = `Create ONE clean studio product image on a plain pure-white background showing THIS exact product from several angles in a single frame — a 360-degree multi-view reference: front, three-quarter, side, and back views arranged neatly in a row or grid. Keep the product's exact shape, colour, proportions, materials, and every detail identical across all views — it is ONE product shown from different angles, do not invent variations. Photorealistic e-commerce product photography, soft even studio lighting, sharp focus. No people, no text, no extra props.`

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

videoPrompt (animates that first frame — a 10-second TikTok UGC ad). Follow this EXACT structure every time:
- Length: 10 seconds. Format: 9:16 vertical. Style: authentic UGC, handheld phone footage. NO text overlays anywhere. Music: soft trendy beat, low under the voiceover.
- MUST start with a strong creative hook in the first 2 seconds — a scroll-stopping pattern interrupt (a surprising line, a "stop!" moment, a bold question, or an unexpected visual). This hook is the most important part — never skip it. Deliver it with a calm, natural, relaxed face (never wide-eyed or shocked).
- Give a second-by-second visual breakdown as 5 short shots: (1) the hook, (2) product reveal, (3) key benefit/feature in action, (4) lifestyle use, (5) final product shot.
- Everything the video needs is ALREADY in the opening frame — animate only natural motion of what is present. Do NOT introduce new large objects; nothing pops in from off-screen. New elements may only enter by the person moving or a hand reaching in.
- Voiceover script in Saudi dialect Arabic, punchy and natural, where the FIRST line is the hook. Write the exact Arabic words in Arabic script; under each Arabic line add its English translation in parentheses labelled "(EN: ...)" for the editor's reference ONLY — the English is never spoken and never shown on screen. The voiceover MUST end with a strong call to action (order-now style, e.g. "اطلبه الحين").
- Any spray, mist, water, or air comes ONLY from the product, aimed where it naturally goes — NEVER from the person's mouth or nose. Mouth closed except when speaking; eyes relaxed and natural throughout.

OUTPUT — return ONLY valid JSON, nothing else:
{"imageIndex": <number>, "imagePrompt": "<composite first-frame prompt>", "videoPrompt": "<10s UGC ad prompt: 5-shot breakdown + Saudi Arabic voiceover with (EN: ...) translations + CTA>"}`

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

  // Step 2: Proxy several product images through Supabase (fal.ai can't fetch Amazon CDN directly).
  const proxied = (await Promise.all(
    urls.slice(0, 5).map((u, i) => proxyImageToSupabase(u, i))
  )).filter(Boolean) as string[]
  if (!proxied.length) {
    return NextResponse.json({ error: 'Failed to proxy product images — cannot pass images to fal.ai', videoPrompt }, { status: 502 })
  }

  // Step 3: Build a 360° multi-angle product reference from all the images (nano-banana).
  // Falls back to the first image if the 360 render fails.
  let referenceUrl = proxied[0]
  try {
    const ref = await runFalJob(FAL_NANO, {
      prompt: THREE60_PROMPT,
      image_urls: proxied,
      num_images: 1,
    }, falKey, 55000)
    if (ref?.images?.[0]?.url) referenceUrl = ref.images[0].url
  } catch { /* keep the first proxied image as reference */ }

  // Step 4: Composite the person + real product into a photorealistic first frame,
  // using the 360° reference plus the originals so nano-banana has full product info.
  let compositeUrl: string
  try {
    const result = await runFalJob(FAL_NANO, {
      prompt: imagePrompt,
      image_urls: [referenceUrl, ...proxied].slice(0, 5),
      num_images: 1,
    }, falKey, 55000)
    compositeUrl = result?.images?.[0]?.url ?? ''
    if (!compositeUrl) throw new Error('no composite image returned')
  } catch (e: any) {
    return NextResponse.json({ error: `composite step: ${e.message}`, imagePrompt, videoPrompt }, { status: 502 })
  }

  // Step 4: Submit the composite to VEO3.1 image-to-video; client polls for the result.
  try {
    const res = await fetch(FAL_VIDEO_I2V, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: videoPrompt,
        image_url: compositeUrl,
        aspect_ratio: '9:16',
        duration: VIDEO_DURATION,
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
      statusUrl: b.status_url ?? `https://queue.fal.run/fal-ai/gemini-omni-flash/image-to-video/requests/${b.request_id}/status`,
      responseUrl: b.response_url ?? null,
      veoPrompt: videoPrompt,
      compositeUrl,
      referenceUrl,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, videoPrompt }, { status: 502 })
  }
}
