// AI Genius premium landing page generator (ported from the standalone demo).
// Pipeline: Claude art-direction → Seedance Nano Banana Pro image-to-image (real
// product composed into scenes + feature shots) → ffmpeg chroma-key cutout →
// re-skin the canonical template. Produces a self-contained HTML string.
import Anthropic from '@anthropic-ai/sdk'
import { spawn } from 'child_process'
import { readFile, writeFile, rm, mkdtemp } from 'fs/promises'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import ffmpegPath from 'ffmpeg-static'

const MODEL = 'claude-sonnet-4-6'
const SEED_IMG = 'https://www.seedance2ai.io/api/v1/image/nano-banana-pro'
const SEED_TASK = 'https://www.seedance2ai.io/api/v1/tasks/'

const TEMPLATE = readFileSync(join(process.cwd(), 'src/lib/landing-genius/template.html'), 'utf8')

export type GeniusProduct = {
  title: string
  price: number | null
  compareAtPrice?: number | null
  currency?: string
  description?: string
  features?: string[]
  images: string[]
}

const jsonFrom = (raw: string) => JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))

// ── PHASE 1: art direction ────────────────────────────────────────────────────
const ART_SYS = `You are a world-class creative director + conversion copywriter + brand strategist for premium Saudi e-commerce.
Given a product (with its REAL product photos), invent a bespoke brand world + a high-converting Arabic (Saudi) landing page, PLUS image briefs.
IMPORTANT: images are made with an IMAGE-TO-IMAGE editor that takes the REAL product photo and re-composes it. Every "editPrompt" MUST keep the product 100% identical to the reference (same color, shape, materials, branding/logo) while changing the SCENE, ANGLE, CROP, or CONTEXT. Never describe a different product.
Return ONLY JSON:
{
  "brand":"<short catchy brand/product name>",
  "tagline":"<one punchy Arabic tagline>",
  "palette":{"bg":"#hex","surface":"#hex","primary":"#hex","accent":"#hex","text":"#hex","muted":"#hex"},
  "mood":"<3-5 word visual mood>",
  "imageBriefs":[
    {"slot":"hero","use":"hero","caption":"","editPrompt":"Place THIS EXACT product (identical color/shape/branding) as the hero on a premium fitting setting, cinematic soft lighting, negative space, photorealistic lifestyle product photography, no text/watermark"},
    {"slot":"lifestyle","use":"lifestyle","caption":"<short Arabic>","editPrompt":"Show THIS EXACT product used naturally in a beautiful modern Saudi room, aspirational warm scene, product identical, photorealistic, no text"},
    {"slot":"f1","use":"showcase","caption":"<Arabic caption naming the shown part/feature>","editPrompt":"A clean studio close-up highlighting ONE specific REAL part/feature of this product, product identical, premium macro photography, no text"},
    {"slot":"f2","use":"showcase","caption":"<Arabic>","editPrompt":"<a DIFFERENT real part/feature close-up, product identical, no text>"},
    {"slot":"f3","use":"showcase","caption":"<Arabic>","editPrompt":"<another DIFFERENT angle/context showing the product in action with relevant items, identical product, no text>"},
    {"slot":"f4","use":"showcase","caption":"<Arabic>","editPrompt":"<another DIFFERENT tasteful styled shot, identical product, no text>"}
  ],
  "copy":{
    "hook":"<scroll-stopping Arabic hero headline>","sub":"<Arabic sub-headline>","problem":"<Arabic pain-point paragraph>",
    "benefits":[{"title":"<Arabic>","desc":"<Arabic>"}],"features":[{"title":"<Arabic>","desc":"<Arabic>"}],
    "socialProof":[{"name":"<Arabic name>","city":"<Saudi city>","quote":"<Arabic review>","stars":5}],
    "guarantee":"<Arabic>","urgency":"<Arabic>","faq":[{"q":"<Arabic>","a":"<Arabic>"}],"cta":"<Arabic CTA>"
  }
}
RULES: imageBriefs exactly 6 (hero, lifestyle, f1-f4); each f1-f4 a DIFFERENT real part/feature with a caption that matches what the image shows. benefits 4-6, features 3-6, socialProof 3, faq 3-4. Real persuasive Arabic, no lorem. Palette suits the product.`

async function artDirect(client: Anthropic, p: GeniusProduct) {
  const r = await client.messages.create({
    model: MODEL, max_tokens: 4000, system: ART_SYS,
    messages: [{ role: 'user', content: `Product: ${p.title}\nPrice: ${p.price} ${p.currency || 'SAR'}\nDescription: ${p.description || ''}\nReal features: ${(p.features || []).join(' | ')}\n\nReturn the JSON.` }],
  })
  const t = r.content[0].type === 'text' ? r.content[0].text : ''
  return jsonFrom(t)
}

// ── PHASE 2: Seedance Nano Banana Pro image-to-image ──────────────────────────
async function editImage(seedKey: string, refUrl: string, prompt: string): Promise<string | null> {
  const H = { Authorization: `Bearer ${seedKey}`, 'Content-Type': 'application/json' }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(SEED_IMG, { method: 'POST', headers: H, body: JSON.stringify({ type: 'image-to-image', prompt, image_urls: [refUrl] }), signal: AbortSignal.timeout(60000) })
      const txt = await res.text()
      if (!res.ok) { if (res.status === 429) { await new Promise(r => setTimeout(r, 4000 * attempt)); continue } return null }
      const id = JSON.parse(txt).id
      if (!id) return null
      const start = Date.now()
      while (Date.now() - start < 150000) {
        await new Promise(r => setTimeout(r, 3000))
        const pr = await fetch(SEED_TASK + id, { headers: H, signal: AbortSignal.timeout(20000) })
        const d = await pr.json().catch(() => ({}))
        if (d.status === 'completed') return d.output?.images?.[0]?.url || null
        if (d.status === 'failed') break
      }
    } catch { await new Promise(r => setTimeout(r, 2000)) }
  }
  return null
}

// ── PHASE 2b: background-free cutout (magenta chroma → ffmpeg colorkey) ────────
async function makeCutout(seedKey: string, refUrl: string): Promise<Buffer | null> {
  const magenta = await editImage(seedKey, refUrl, 'Place THIS EXACT product perfectly centered on a completely flat solid pure magenta background (hex #FF00FF chroma screen), even flat lighting, NO shadow, NO gradient, NO reflection, product 100% identical to the reference, fills ~80% of the frame, no props, no text')
  if (!magenta || !ffmpegPath) return null
  const dir = await mkdtemp(join(tmpdir(), 'cut-'))
  const inP = join(dir, 'c.png'), outP = join(dir, 'o.png')
  try {
    await writeFile(inP, Buffer.from(await (await fetch(magenta)).arrayBuffer()))
    await new Promise<void>((res, rej) => {
      const proc = spawn(ffmpegPath as string, ['-y', '-i', inP, '-vf', 'colorkey=0xFF00FF:0.30:0.10,format=rgba', outP])
      proc.on('error', rej); proc.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c)))
    })
    return await readFile(outP)
  } catch { return null } finally { rm(dir, { recursive: true, force: true }).catch(() => {}) }
}

// ── PHASE 3: re-skin ONLY the body sections (fast, one round ~125s), then swap the
// palette programmatically. The static CSS/scripts/checkout drawer are never sent to
// Claude, so a single request stays well under the function time limit.
const BODY_SYS = `You re-skin the BODY sections of an Arabic RTL landing page for a NEW product. Keep the EXACT structure, ALL class names, and ALL element ids identical.
CHANGE ONLY: the Arabic copy text; the image URLs (the hero <img class="hero-cutout"> src → the provided cutoutUrl; the lifestyle image → the use:"lifestyle" generated image; the showcase grid images → the use:"showcase" generated images, one per tile with a caption that matches the image, never repeating one; the thumbnail gallery → productImages); the price numbers; and the brand text.
Do NOT output <html>, <head>, <style>, or <script> — ONLY the body-section HTML in the same order/structure as given (starting with the nav comment, ending with the sticky-cta section). No markdown fences, no commentary.`

const hexRgb = (h: string) => { const x = h.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map(c => c + c).join('') : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const darken = (h: string, f = 0.72) => { const [r, g, b] = hexRgb(h); return toHex(r * f, g * f, b * f) }
const lighten = (h: string, f = 0.9) => { const [r, g, b] = hexRgb(h); return toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) }

const BODY_START = '<!--GENIUS_BODY_START-->'
const BODY_END = '<!--GENIUS_BODY_END-->'

async function buildLanding(client: Anthropic, p: GeniusProduct, art: any, generated: any[], cutoutUrl: string): Promise<string> {
  const iS = TEMPLATE.indexOf(BODY_START), iE = TEMPLATE.indexOf(BODY_END)
  const head = TEMPLATE.slice(0, iS)
  const bodyRef = TEMPLATE.slice(iS + BODY_START.length, iE)
  const tail = TEMPLATE.slice(iE + BODY_END.length)

  const brief = {
    product: { title: p.title, price: p.price, compareAtPrice: p.compareAtPrice ?? null, currency: p.currency || 'SAR', productImages: p.images || [] },
    brand: art.brand, copy: art.copy, cutoutUrl, generated,
  }
  const messages: any[] = [{ role: 'user', content: `BODY TEMPLATE (re-skin this, keep classes/structure/order):\n${bodyRef}\n\nBRIEF:\n${JSON.stringify(brief)}\n\nReturn ONLY the re-skinned body HTML fragment.` }]
  let body = ''
  for (let round = 0; round < 3; round++) {
    const r = await client.messages.create({ model: MODEL, max_tokens: 16000, system: BODY_SYS, messages })
    const chunk = r.content[0].type === 'text' ? r.content[0].text : ''
    body += chunk
    if (r.stop_reason !== 'max_tokens') break
    messages.push({ role: 'assistant', content: chunk })
    messages.push({ role: 'user', content: 'Continue from EXACTLY where you stopped, no repeats. Finish the fragment.' })
  }
  body = body.replace(/^```html?\s*/i, '').replace(/```\s*$/, '').trim()

  // Programmatic palette swap in the static head CSS (instant).
  const pal = art.palette || {}
  let h = head
  const set = (name: string, val?: string) => { if (val) h = h.replace(new RegExp(`(--${name}:)\\s*[^;]+;`), `$1 ${val};`) }
  set('bg', pal.bg); set('surface', pal.surface); set('primary', pal.primary); set('accent', pal.accent); set('text', pal.text); set('muted', pal.muted)
  if (pal.primary) {
    set('primary-dark', darken(pal.primary)); set('primary-light', lighten(pal.primary))
    const [r, g, b] = hexRgb(pal.primary)
    h = h.replace(/rgba\(26,\s*95,\s*168,/g, `rgba(${r},${g},${b},`)
  }
  const full = h + body + tail
  // Point EVERY cutout reference (hero <img>, checkout-drawer summary <img>, baked
  // LANDING_CONFIG.cutout in the static tail) at the real uploaded cutout URL.
  return cutoutUrl ? full.split('hero-cutout.png').join(cutoutUrl) : full
}

// ── STAGE 1 (prepare): art direction + all images + cutout (~60s). No Claude re-skin. ─
export async function prepareAssets(
  p: GeniusProduct,
  keys: { anthropic: string; seedance: string },
  uploadCutout: (png: Buffer) => Promise<string>,
): Promise<{ art: any; generated: any[]; cutoutUrl: string }> {
  const client = new Anthropic({ apiKey: keys.anthropic })
  const art = await artDirect(client, p)
  const ref = p.images[0]
  const ref2 = p.images[1] || ref
  const briefs: any[] = (art.imageBriefs || [])
  // All scene images + the cutout CONCURRENTLY (nano-banana allows ~30/min).
  const [genResults, cutPng] = await Promise.all([
    Promise.all(briefs.map((b, i) =>
      editImage(keys.seedance, i % 2 === 0 ? ref : ref2, b.editPrompt)
        .then(url => (url ? { slot: b.slot, use: b.use, caption: b.caption || '', url } : null)))),
    makeCutout(keys.seedance, ref),
  ])
  const generated = genResults.filter(Boolean)
  const cutoutUrl = cutPng ? await uploadCutout(cutPng) : ref
  return { art, generated, cutoutUrl }
}

// ── STAGE 2 (finish): body-only re-skin + palette swap → full HTML (~130s, one request). ─
export async function assembleHtml(
  p: GeniusProduct, art: any, generated: any[], cutoutUrl: string,
  keys: { anthropic: string },
): Promise<string> {
  const client = new Anthropic({ apiKey: keys.anthropic })
  return buildLanding(client, p, art, generated, cutoutUrl)
}
