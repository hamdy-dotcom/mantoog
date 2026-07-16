// AI Genius premium landing page generator — CHEAP/FAST pipeline.
// Design is a FIXED shell (template.html). Claude runs ONCE to produce the
// content JSON (no HTML re-skin). We generate exactly 3 images (a transparent
// cutout + 2 multi-angle montages) and the template's hydrate script crops
// different regions of those montages into every tile. Colors are swapped
// programmatically. No per-tile image generation, no 27KB HTML rewrite.
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

// ── PHASE 1: content (ONE Claude call → structured JSON that maps to the shell's slots) ──
const ART_SYS = `You are a world-class creative director + conversion copywriter + brand strategist for premium Saudi/Gulf e-commerce.
Given a product (with its REAL photos + details), invent a bespoke brand world + a high-converting Arabic (Saudi) landing page as STRUCTURED CONTENT that will be poured into a fixed premium template. Do NOT write HTML. Return ONLY JSON in EXACTLY this shape (keep every key; counts are fixed):
{
  "brand":"<short catchy Arabic brand/product name>",
  "tagline":"<one punchy Arabic tagline>",
  "palette":{"bg":"#hex","surface":"#hex","primary":"#hex","accent":"#hex","text":"#hex","muted":"#hex"},
  "hero":{"badge":"<short Arabic badge>","h1":"<scroll-stopping Arabic headline, first line>","h1em":"<emphasised second line>","sub":"<Arabic sub-headline>","priceMain":"<number only, no currency>","priceNote":"<e.g. شامل الضريبة>","ctaPrimary":"<Arabic CTA incl. price>","ctaSecondary":"<Arabic, e.g. اعرف أكثر>","trust":["<3-4 word Arabic>","<...>","<...>"]},
  "problem":{"title":"<Arabic pain-point headline>","para":"<Arabic pain paragraph>","icons":["<2-3 word Arabic pain>","<...>","<...>","<...>"]},
  "benefits":{"title":"<Arabic>","titleAccent":"<Arabic highlighted tail>","desc":"<Arabic>","items":[{"title":"<Arabic>","desc":"<Arabic>"},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}]},
  "showcase":[{"caption":"<Arabic caption naming the shown part/feature>","title":"<Arabic>","desc":"<Arabic>"},{"caption":"","title":"","desc":""},{"caption":"","title":"","desc":""},{"caption":"","title":"","desc":""}],
  "lifestyle":{"title":"<Arabic>","titleAccent":"<Arabic highlighted tail>","para":"<Arabic>","overlay":"<short Arabic caption>","items":["<Arabic point>","<...>","<...>","<...>"]},
  "reviews":[{"quote":"<authentic Saudi Arabic review>","name":"<Saudi name>","city":"<Saudi city>"},{"quote":"","name":"","city":""},{"quote":"","name":"","city":""}],
  "urgency":"<Arabic urgency line incl. price>",
  "price":{"badge":"<Arabic badge>","amount":"<number only>","currency":"<e.g. SAR or ريال>","sub":"<Arabic under-price line>","features":["<Arabic spec/benefit>","<...>","<...>","<...>","<...>","<...>"],"cta":"<Arabic CTA button>"},
  "guarantee":{"title":"<Arabic guarantee headline>","para":"<Arabic>"},
  "faq":[{"q":"<Arabic>","a":"<Arabic>"},{"q":"","a":""},{"q":"","a":""},{"q":"","a":""}]
}
RULES: benefits.items EXACTLY 6, showcase EXACTLY 4 (each a DIFFERENT real part/feature the customer should see), lifestyle.items EXACTLY 4, reviews EXACTLY 3, price.features EXACTLY 6, faq EXACTLY 4. Real persuasive Saudi Arabic, no lorem, no English. priceMain/price.amount are digits only. Palette must suit the product and be tasteful with strong contrast.`

async function artDirect(client: Anthropic, p: GeniusProduct) {
  const r = await client.messages.create({
    model: MODEL, max_tokens: 4000, system: ART_SYS,
    messages: [{ role: 'user', content: `Product: ${p.title}\nPrice: ${p.price} ${p.currency || 'SAR'}\nDescription: ${p.description || ''}\nReal features: ${(p.features || []).join(' | ')}\n\nReturn the JSON.` }],
  })
  const t = r.content[0].type === 'text' ? r.content[0].text : ''
  return jsonFrom(t)
}

// ── PHASE 2: Seedance nano-banana-pro image-to-image ──────────────────────────
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

// Two multi-angle montage prompts. Each frame packs several angles/details of the
// SAME product so the template can crop distinct-looking tiles out of one image.
const MONTAGE_A = 'Editorial product composition: place THIS EXACT product (identical color, shape, materials, and branding to the reference) shown from 2-3 complementary views within a SINGLE cohesive frame — a clear front hero view, a three-quarter angle, and one closer detail — arranged with generous spacing on a premium softly-lit lifestyle background that suits the product category. Photorealistic commercial photography, cinematic soft lighting, shallow depth of field, no text, no watermark. The product must stay 100% identical to the reference.'
const MONTAGE_B = 'Studio detail composition: show THIS EXACT product (identical to the reference) with 2-3 different close-up crops of its key real parts and features arranged within ONE clean frame, highlighting distinct components/details. Premium macro product photography on a clean neutral studio background, crisp even lighting, no text, no watermark. The product must stay 100% identical to the reference.'

// ── palette helpers ───────────────────────────────────────────────────────────
const hexRgb = (h: string) => { const x = h.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map(c => c + c).join('') : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const darken = (h: string, f = 0.72) => { const [r, g, b] = hexRgb(h); return toHex(r * f, g * f, b * f) }
const lighten = (h: string, f = 0.9) => { const [r, g, b] = hexRgb(h); return toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) }

// Apply the art-directed palette to the fixed shell's CSS (var values + the
// blue-tinted rgba literals baked into the stylesheet). Deterministic, instant.
function applyPalette(html: string, pal: any): string {
  let h = html
  const set = (name: string, val?: string) => { if (val) h = h.replace(new RegExp(`(--${name}:)\\s*[^;]+;`), `$1 ${val};`) }
  set('bg', pal.bg); set('surface', pal.surface); set('primary', pal.primary); set('accent', pal.accent); set('text', pal.text); set('muted', pal.muted)
  if (pal.primary) {
    set('primary-dark', darken(pal.primary)); set('primary-light', lighten(pal.primary))
    const [r, g, b] = hexRgb(pal.primary)
    h = h.replace(/rgba\(26,\s*95,\s*168,/g, `rgba(${r},${g},${b},`)
  }
  return h
}

const GENIUS_MARKER = '<!--GENIUS_DATA-->'

// ── STAGE 1 (prepare): content + 3 images (cutout + 2 montages). ~40-70s. ─
export async function prepareAssets(
  p: GeniusProduct,
  keys: { anthropic: string; seedance: string },
  uploadCutout: (png: Buffer) => Promise<string>,
): Promise<{ art: any; generated: any[]; cutoutUrl: string }> {
  const client = new Anthropic({ apiKey: keys.anthropic })
  const art = await artDirect(client, p)
  const ref = p.images[0]
  const ref2 = p.images[1] || ref
  // cutout + 2 montages CONCURRENTLY = exactly 3 generations (24 credits).
  const [cutPng, montA, montB] = await Promise.all([
    makeCutout(keys.seedance, ref),
    editImage(keys.seedance, ref, MONTAGE_A),
    editImage(keys.seedance, ref2, MONTAGE_B),
  ])
  const cutoutUrl = cutPng ? await uploadCutout(cutPng) : ref
  // Fall back to the real product photos if a montage fails, so tiles never break.
  const generated = [
    { key: 'a', url: montA || ref },
    { key: 'b', url: montB || ref2 },
  ]
  return { art, generated, cutoutUrl }
}

// ── STAGE 2 (finish): deterministic assembly — NO Claude, NO timeout. ─
export async function assembleHtml(
  p: GeniusProduct, art: any, generated: any[], cutoutUrl: string,
  _keys?: { anthropic?: string },
): Promise<string> {
  const imgOf = (k: string) => (generated.find((g: any) => g?.key === k)?.url) || cutoutUrl
  const currency = art?.price?.currency || p.currency || 'ريال'

  const GENIUS = {
    brand: art.brand || p.title,
    tagline: art.tagline || '',
    currency,
    hero: art.hero || {},
    problem: art.problem || {},
    benefits: art.benefits || {},
    showcase: Array.isArray(art.showcase) ? art.showcase : [],
    lifestyle: art.lifestyle || {},
    reviews: Array.isArray(art.reviews) ? art.reviews : [],
    urgency: art.urgency || '',
    price: art.price || {},
    guarantee: art.guarantee || {},
    faq: Array.isArray(art.faq) ? art.faq : [],
    gallery: (p.images || []).filter(Boolean).slice(0, 4),
    images: { a: imgOf('a'), b: imgOf('b'), cutout: cutoutUrl },
  }

  let html = applyPalette(TEMPLATE, art.palette || {})
  // Point every cutout ref (hero + checkout drawer + baked LANDING_CONFIG) at the upload.
  if (cutoutUrl) html = html.split('hero-cutout.png').join(cutoutUrl)
  // Inject the content the hydrate script reads. </script> is escaped so a stray
  // sequence in the copy can't break out of the tag.
  const payload = JSON.stringify(GENIUS).replace(/<\/script/gi, '<\\/script')
  html = html.replace(GENIUS_MARKER, `<script>window.GENIUS = ${payload};</script>`)
  return html
}
