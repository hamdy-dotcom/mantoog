import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 90

// Use the www host directly — the apex host 307-redirects and drops the auth header.
const SEEDANCE_CREATE = 'https://www.seedance2ai.io/api/v1/video/seedance2'

async function proxyToSupabase(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const path = `ugc-temp/seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabaseAdmin.storage.from('store-assets').upload(path, buffer, { contentType, upsert: true })
    if (error) return null
    return supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl
  } catch { return null }
}

// One creative: proxy the angle image, create a Seedance 2.0 task (seedance2.ai, 15s,
// ambient audio, no voiceover). Client polls via /api/admin/seedance-status.
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { imageUrls, mediaUrls, prompt, productId } = await req.json().catch(() => ({}))
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const seedKey = process.env.SEEDANCE_API_KEY
  if (!seedKey) return NextResponse.json({ error: 'SEEDANCE_API_KEY not configured' }, { status: 500 })

  // Prefer already-proxied public URLs (fast path — no re-download). Seedance
  // media-to-video accepts up to 9 images.
  let proxied: string[]
  if (Array.isArray(mediaUrls) && mediaUrls.filter(Boolean).length) {
    proxied = (mediaUrls as string[]).filter(Boolean).slice(0, 9)
  } else {
    const imgs = Array.isArray(imageUrls) ? imageUrls.filter(Boolean).slice(0, 9) : []
    if (!imgs.length) return NextResponse.json({ error: 'mediaUrls[] or imageUrls[] required' }, { status: 400 })
    proxied = (await Promise.all(imgs.map(u => proxyToSupabase(u)))).filter(Boolean) as string[]
  }
  if (!proxied.length) return NextResponse.json({ error: 'No usable product images' }, { status: 502 })

  // Clean fallback sets: the AI-redesigned product images already generated for this
  // product's premium landing. Ordered from richest to safest — older landings' "in-use"
  // and lifestyle shots can THEMSELVES contain an AI person (verified visually on a
  // face-care product), so each person-rejection narrows the set. Rejected creates are
  // free, so walking the ladder costs nothing.
  async function landingCleanSets(): Promise<string[][]> {
    if (!productId) return []
    try {
      const { data } = await supabaseAdmin
        .from('landing_pages').select('custom_html')
        .eq('product_id', productId).maybeSingle()
      const html = String(data?.custom_html || '')
      const m = html.match(/window\.GENIUS = (\{[\s\S]*?\});<\/script>/)
      if (!m) return []
      const g = JSON.parse(m[1])
      const ok = (u: unknown): u is string => typeof u === 'string' && /^https:\/\//.test(u)
      const showcase: string[] = (Array.isArray(g?.images?.showcase) ? g.images.showcase : []).filter(ok)
      const lifestyle = ok(g?.images?.lifestyle) ? [g.images.lifestyle] : []
      const cutout = ok(g?.images?.cutout) ? [g.images.cutout] : []
      const uniq = (a: string[]) => [...new Set(a)].slice(0, 9)
      const sets = [
        uniq([...showcase, ...lifestyle, ...cutout]),                 // everything
        uniq([...showcase.slice(0, 3), ...cutout]),                   // studio-only (no in-use/lifestyle)
        uniq(cutout.length ? cutout : showcase.slice(0, 1)),          // safest single
      ].filter(s => s.length)
      // drop consecutive duplicates
      return sets.filter((s, i) => i === 0 || JSON.stringify(s) !== JSON.stringify(sets[i - 1]))
    } catch { return [] }
  }
  let cleanSets: string[][] | null = null
  let cleanSetIdx = 0

  const buildBody = (urls: string[]) => JSON.stringify({
    mode: 'media-to-video',   // multiple input images
    quality_tier: 'mini',     // Seedance 2 Mini
    channel: 'standard',      // Standard rendering mode (vs real/wild)
    prompt: String(prompt).slice(0, 9500), // API max is 10k chars
    media_urls: urls,
    duration: '15',
    resolution: '1080p',
    aspect_ratio: '9:16',
    generate_audio: true,
  })

  // Seedance allows 30 req/60s per account; heavy status polling can trip a 429 on
  // create. A 429 means NO task was created, so it's safe to wait and retry without
  // double-charging. (Timeouts are ambiguous → we do NOT retry those.)
  // If a specific product image is rejected (unsupported/unfetchable), we fall back
  // to just the main image — which is a clean JPEG and works for any product.
  let urls = proxied
  let reducedToMain = false
  let lastErr = 'Seedance request failed'
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(SEEDANCE_CREATE, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${seedKey}`, 'Content-Type': 'application/json' },
        body: buildBody(urls),
        signal: AbortSignal.timeout(50000),
      })
      const txt = await res.text()
      if (res.ok) {
        const b = JSON.parse(txt)
        const taskId = b.id ?? b.taskId ?? b.task_id
        if (taskId) return NextResponse.json({ taskId, firstFrame: urls[0] })
        return NextResponse.json({ error: `no taskId: ${txt.slice(0, 200)}` }, { status: 502 })
      }
      lastErr = `Seedance ${res.status}: ${txt.slice(0, 200)}`
      // Seedance content policy: images containing a real person are rejected outright.
      // Automatic ladder: retry ONCE with the AI-redesigned landing images (product-only
      // renders we already generated). Manual upload is only surfaced if that also fails.
      if (/real person/i.test(txt)) {
        if (cleanSets === null) cleanSets = await landingCleanSets()
        if (cleanSetIdx < cleanSets.length) {
          urls = cleanSets[cleanSetIdx]
          console.error('[seedance-generate] person_in_image — retrying with AI landing set', { productId, set: cleanSetIdx, count: urls.length })
          cleanSetIdx++
          continue
        }
        return NextResponse.json({
          error: 'صور هذا المنتج تحتوي على شخص حقيقي (موديل) — خدمة الفيديو ترفض الصور التي فيها أشخاص. استخدم صور المنتج فقط (بدون موديل) ثم أعد المحاولة.',
          code: 'person_in_image',
        }, { status: 422 })
      }
      if (res.status === 429 && attempt < 4) {
        // Honour the account's Retry-After (observed ~36s) so the retry actually clears the window.
        const ra = parseInt(res.headers.get('retry-after') || '', 10)
        const waitMs = Math.min((Number.isFinite(ra) && ra > 0 ? ra + 1 : attempt * 6) * 1000, 38000)
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }
      // A rejected image (unsupported type / download failed) fails the whole request —
      // retry once with only the main product image, which is reliable for any product.
      if (res.status === 400 && !reducedToMain && urls.length > 1 && /media|image|download|url|unsupported|resource/i.test(txt)) {
        urls = urls.slice(0, 1)
        reducedToMain = true
        continue
      }
      return NextResponse.json({ error: lastErr }, { status: 502 })
    } catch (e: any) {
      // timeout/network: the task may have been created — don't retry (avoid a double charge)
      return NextResponse.json({ error: e.message }, { status: 502 })
    }
  }
  return NextResponse.json({ error: lastErr }, { status: 502 })
}
