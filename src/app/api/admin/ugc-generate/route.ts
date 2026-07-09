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

// Turns the scraped product photos into ONE clean 360° product reference sheet:
// the product from every angle + accessories, with real dimension callouts.
function three60Prompt(dimensions: string): string {
  const dimLine = dimensions
    ? ` In the lower-right area, add a small clean TECHNICAL DIMENSION DIAGRAM in the style of an e-commerce sizing graphic: thin grey measurement lines with arrow endpoints pointing across the product, each with a short label showing the real measurement in BOTH centimetres and inches (from: ${dimensions}) — e.g. height, width, thickness, and any length/circumference. Keep it minimal and precise, like a spec sheet.`
    : ''
  return `Create ONE clean e-commerce product reference image on a pure-white seamless background, laid out as a neat evenly-spaced GRID. The TOP section shows the main unit as a TRUE 360° turntable — 6 views, each a GENUINELY DIFFERENT rotation: (1) front, (2) left side profile, (3) right side profile, (4) back, (5) top-down, (6) a 45° three-quarter angle. CRITICAL: every view must be a clearly DIFFERENT angle — the spout/nozzle, handle and cord must point in different directions from view to view to prove the product is actually rotating. Do NOT repeat, mirror or duplicate the same angle; no two cells may look the same. Below the unit views, show EVERY included accessory, attachment, nozzle, brush, hose, pad, funnel, cup, adapter and tool bundled with the product, each laid out separately — include ALL parts visible anywhere across the reference photos, do NOT omit any; the bundle must look complete. Every item is the SAME one real product set; keep each item's exact shape, colour, proportions, materials, buttons and details identical to the reference photos, evenly lit with soft studio lighting, crisp focus, subtle soft shadows.${dimLine} No people, no text other than the dimension labels, no background props or clutter — only the rotated product views, its accessories, and the dimension callouts.`
}

const SYSTEM_PROMPT = `You are a UGC ad creative director for the Saudi Arabian market. You receive a product's title, description, and product images. Based on them, write a SINGLE 10-second UGC ad video prompt with these exact specs every time:

- Length: 10 seconds only.
- Format: 9:16 vertical, 1080×1920.
- Style: authentic UGC, handheld.
- NO text overlays anywhere on the video (and no logos, watermarks, usernames or app UI — a clean filmed frame).
- Music: soft trendy beat, low under the voiceover.
- MUST start with a strong creative hook in the first 2 seconds — a scroll-stopping pattern interrupt (a surprising line, a "stop!" moment, a bold question, or an unexpected visual). This hook is the most important part — never skip it.
- A second-by-second visual breakdown (5 short shots: 1) the hook, 2) product reveal, 3) key benefit/feature, 4) lifestyle use, 5) final product shot).
- A voiceover script in Saudi dialect (Arabic), punchy and natural, where the FIRST line is the hook. Keep it short enough to be spoken calmly and completely within 10 seconds. Add an English translation underneath each line (label it "EN:" — for the editor only, never spoken and never shown on screen).
- Voiceover must end with a strong call to action ("order now" style).

Tailor the hook, visuals, and voiceover to whatever product is sent. Keep it concise and ready to hand to a video editor. Don't add anything to the video prompt beyond the prompt itself.

Separately, from the title/description, extract the product's REAL physical dimensions (the "dimensions" field) in BOTH metric and imperial where stated — e.g. "height 4.3 cm / 1.69 in, width 2.6 cm / 1.02 in, tank 1.6 L / 54 oz". If none are stated, return "".

OUTPUT — return ONLY valid JSON, nothing else:
{"dimensions": "<real dimensions or empty string>", "videoPrompt": "<the single 10-second UGC ad video prompt>"}`

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

  const textBlock = {
    type: 'text' as const,
    text: `Product: ${title}
${description ? `Description: ${description.slice(0, 600)}` : ''}

Write the 10-second UGC ad video prompt and extract the dimensions. Return only the JSON.`,
  }

  let videoPrompt: string
  let dimensions = ''
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
    videoPrompt = String(parsed.videoPrompt || '').trim()
    dimensions = String(parsed.dimensions || '').trim()
    if (!videoPrompt) throw new Error('Missing videoPrompt in Claude JSON')
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

  // Step 3: Generate the ONE 360° product reference sheet from the scraped images (nano-banana).
  // This single image is what we send to the video model — the video prompt builds the scene.
  let compositeUrl: string
  try {
    const result = await runFalJob(FAL_NANO, {
      prompt: three60Prompt(dimensions),
      image_urls: proxied,
      num_images: 1,
    }, falKey, 55000)
    compositeUrl = result?.images?.[0]?.url ?? ''
    if (!compositeUrl) throw new Error('no 360 image returned')
  } catch (e: any) {
    return NextResponse.json({ error: `360 step: ${e.message}`, videoPrompt }, { status: 502 })
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
      dimensions,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, videoPrompt }, { status: 502 })
  }
}
