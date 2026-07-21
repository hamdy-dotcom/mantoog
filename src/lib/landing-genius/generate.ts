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
  "brand":"<the product's REAL manufacturer/brand ONLY — e.g. كولن / Koolen — read it from the product title; do NOT invent a slogan or made-up name; if the title has no brand, use a short clean brand derived from it>",
  "productName":"<concise Arabic product NAME — WHAT the product is, e.g. غسالة سجاد كهربائية / مكنسة رطبة وجافة — different from the brand, and NOT a slogan>",
  "tagline":"<one punchy Arabic tagline>",
  "palette":{"bg":"#hex","surface":"#hex","primary":"#hex","accent":"#hex","text":"#hex","muted":"#hex"},
  "hero":{"badge":"<short Arabic badge>","h1":"<scroll-stopping Arabic headline, first line>","h1em":"<emphasised second line>","sub":"<Arabic sub-headline>","priceMain":"<number only, no currency>","priceNote":"<e.g. شامل الضريبة>","ctaPrimary":"<Arabic CTA incl. price>","ctaSecondary":"<Arabic, e.g. اعرف أكثر>","trust":["<3-4 word Arabic>","<...>","<...>"]},
  "problem":{"title":"<Arabic pain-point headline>","para":"<Arabic pain paragraph>","icons":["<2-3 word Arabic pain>","<...>","<...>","<...>"]},
  "benefits":{"title":"<Arabic>","titleAccent":"<Arabic highlighted tail>","desc":"<Arabic>","items":[{"title":"<Arabic>","desc":"<Arabic>"},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}]},
  "showcaseHead":{"title":"<Arabic features headline>","titleAccent":"<Arabic highlighted tail>","desc":"<Arabic one-line about the product's strengths — NAME THIS product, never another>"},
  "showcase":[{"caption":"<short Arabic feature/benefit label>","title":"<Arabic headline>","desc":"<Arabic supporting line>","img":"<ENGLISH image-to-image prompt that shows EXACTLY what this tile's caption/title/desc describes — the specific part, angle, or in-use moment. Product 100% identical to the reference photo. Premium commercial product photography, clean composition, soft light, no text, no watermark.>"},{"caption":"","title":"","desc":"","img":""},{"caption":"","title":"","desc":"","img":""},{"caption":"","title":"","desc":"","img":""}],
  "lifestyle":{"title":"<Arabic>","titleAccent":"<Arabic highlighted tail>","para":"<Arabic>","overlay":"<short Arabic caption>","items":["<Arabic point>","<...>","<...>","<...>"],"img":"<ENGLISH image-to-image prompt: THIS EXACT product used naturally in a beautiful, aspirational room that suits it, warm cinematic light, product identical to the reference, photorealistic, no text, no watermark>"},
  "reviewsDesc":"<Arabic one-liner intro to the reviews — about THIS product>",
  "reviews":[{"quote":"<authentic Saudi Arabic review>","name":"<Saudi name>","city":"<Saudi city>"},{"quote":"","name":"","city":""},{"quote":"","name":"","city":""}],
  "urgency":"<Arabic urgency line incl. price>",
  "priceHead":{"title":"<Arabic price-section headline>","titleAccent":"<Arabic highlighted tail>"},
  "price":{"badge":"<Arabic badge>","amount":"<number only>","currency":"<e.g. SAR or ريال>","sub":"<Arabic under-price line>","features":["<Arabic spec/benefit>","<...>","<...>","<...>","<...>","<...>"],"cta":"<Arabic CTA button>"},
  "guarantee":{"title":"<Arabic guarantee headline>","para":"<Arabic>"},
  "faqDesc":"<Arabic one-liner intro to the FAQ — about THIS product>",
  "faq":[{"q":"<Arabic>","a":"<Arabic>"},{"q":"","a":""},{"q":"","a":""},{"q":"","a":""}]
}
RULES: benefits.items EXACTLY 6, showcase EXACTLY 4 (each a DIFFERENT real part/feature the customer should see), lifestyle.items EXACTLY 4, reviews EXACTLY 3, price.features EXACTLY 6, faq EXACTLY 4. Each showcase tile gets ITS OWN image generated from that tile's "img" prompt, so write each "img" prompt to show EXACTLY what its caption/title/desc claims — the image and the text for a tile must match. The 4 showcase "img" prompts must be visibly different from each other (different part / angle / context). "brand" is the manufacturer only (never a slogan); "productName" is the concise name of what the product is — keep them clearly separate and both grounded in the given product title. Every headline/desc must describe THIS product only — never mention a different product category. Real persuasive Saudi Arabic, no lorem, no English. priceMain/price.amount are digits only. Palette must suit the product and be tasteful with strong contrast.`

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

// Fallback image prompts if the model omits a per-tile "img" (kept product-generic).
const FALLBACK_SHOWCASE = [
  'A premium front-facing studio shot of THIS EXACT product on a clean neutral background, soft light, product identical to the reference, no text, no watermark.',
  'A three-quarter angle studio shot of THIS EXACT product highlighting its build quality, clean neutral background, product identical to the reference, no text, no watermark.',
  'A close-up detail shot of a key part of THIS EXACT product, premium macro photography, clean background, product identical to the reference, no text, no watermark.',
  'A tasteful in-use shot of THIS EXACT product in a relevant setting, premium commercial photography, product identical to the reference, no text, no watermark.',
]
const FALLBACK_LIFESTYLE = 'THIS EXACT product used naturally in a beautiful, aspirational room that suits it, warm cinematic light, product identical to the reference, photorealistic, no text, no watermark.'

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

// ── STAGE 1 (prepare): content FIRST, then one image PER showcase tile (built from
// that tile's own prompt) + a lifestyle scene + the cutout. Content leads the image
// so each tile shows exactly what its copy describes. 6 generations (~48 credits). ─
export async function prepareAssets(
  p: GeniusProduct,
  keys: { anthropic: string; seedance: string },
  uploadCutout: (png: Buffer) => Promise<string>,
): Promise<{ art: any; generated: any[]; cutoutUrl: string }> {
  const client = new Anthropic({ apiKey: keys.anthropic })
  const art = await artDirect(client, p)
  const refs = (p.images || []).filter(Boolean)
  const ref = refs[0]

  // The 4 showcase image prompts the model wrote for its own copy (fallbacks if missing).
  const cards: any[] = Array.isArray(art.showcase) ? art.showcase : []
  const showcasePrompts = [0, 1, 2, 3].map(i => (cards[i]?.img && String(cards[i].img).trim()) || FALLBACK_SHOWCASE[i])
  const lifePrompt = (art.lifestyle?.img && String(art.lifestyle.img).trim()) || FALLBACK_LIFESTYLE

  // Everything concurrently. Each image uses a real product photo as reference so the
  // product stays identical; cycle refs so different tiles can start from different shots.
  const [cutPng, s0, s1, s2, s3, life] = await Promise.all([
    makeCutout(keys.seedance, ref),
    editImage(keys.seedance, refs[0] || ref, showcasePrompts[0]),
    editImage(keys.seedance, refs[1 % Math.max(refs.length, 1)] || ref, showcasePrompts[1]),
    editImage(keys.seedance, refs[2 % Math.max(refs.length, 1)] || ref, showcasePrompts[2]),
    editImage(keys.seedance, refs[3 % Math.max(refs.length, 1)] || ref, showcasePrompts[3]),
    editImage(keys.seedance, ref, lifePrompt),
  ])
  const cutoutUrl = cutPng ? await uploadCutout(cutPng) : ref
  // Fall back to a real product photo (then cutout) if any generation fails, so tiles never break.
  const fb = (i: number) => refs[i % Math.max(refs.length, 1)] || cutoutUrl
  const generated = [
    { key: 'f0', url: s0 || fb(0) },
    { key: 'f1', url: s1 || fb(1) },
    { key: 'f2', url: s2 || fb(2) },
    { key: 'f3', url: s3 || fb(3) },
    { key: 'life', url: life || s0 || fb(0) },
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

  const compareAt = p.compareAtPrice != null && Number(p.compareAtPrice) > (Number(art?.price?.amount) || p.price || 0)
    ? Number(p.compareAtPrice) : null

  const showcaseImgs = ['f0', 'f1', 'f2', 'f3'].map(imgOf)
  const lifestyleImg = imgOf('life')

  // Gallery must always show 4: real product photos first, then the AI feature shots
  // (and the cutout as a last resort) so a product with few photos still fills 4.
  const galleryPool = [...(p.images || []).filter(Boolean), ...showcaseImgs, cutoutUrl]
  const gallery = Array.from(new Set(galleryPool)).slice(0, 4)

  const GENIUS = {
    brand: art.brand || p.title,
    productName: art.productName || p.title,
    tagline: art.tagline || '',
    currency,
    compareAt,
    hero: art.hero || {},
    problem: art.problem || {},
    benefits: art.benefits || {},
    showcaseHead: art.showcaseHead || {},
    showcase: Array.isArray(art.showcase) ? art.showcase : [],
    lifestyle: art.lifestyle || {},
    reviewsDesc: art.reviewsDesc || '',
    reviews: Array.isArray(art.reviews) ? art.reviews : [],
    urgency: art.urgency || '',
    priceHead: art.priceHead || {},
    price: art.price || {},
    guarantee: art.guarantee || {},
    faqDesc: art.faqDesc || '',
    faq: Array.isArray(art.faq) ? art.faq : [],
    gallery,
    images: { showcase: showcaseImgs, lifestyle: lifestyleImg, cutout: cutoutUrl },
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
