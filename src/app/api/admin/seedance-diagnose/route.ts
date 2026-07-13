import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { parsePublicProductUrl, fetchProductPageHtml, detectPlatform, extractProductDataFromHtml } from '@/lib/products/fetch-product-url'
import { spawn } from 'child_process'
import { writeFile, readFile, rm, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import ffmpegPath from 'ffmpeg-static'

export const runtime = 'nodejs'
export const maxDuration = 120

const SEEDANCE_CREATE = 'https://www.seedance2ai.io/api/v1/video/seedance2'

async function toJpeg(input: Buffer, dir: string, idx: number): Promise<Buffer | null> {
  if (!ffmpegPath) return null
  const inP = join(dir, `in${idx}`), outP = join(dir, `out${idx}.jpg`)
  try {
    await writeFile(inP, input)
    await new Promise<void>((resolve, reject) => {
      const p = spawn(ffmpegPath as string, ['-y', '-i', inP, '-vf', "scale='min(1024,iw)':-2", '-q:v', '3', outP])
      let e = ''; p.stderr.on('data', d => { e += d.toString() }); p.on('error', reject)
      p.on('close', c => c === 0 ? resolve() : reject(new Error(e.slice(-120))))
    })
    return await readFile(outP)
  } catch { return null }
}

// Diagnose why a product URL's video generation may fail: run the real pipeline
// (extract → convert to JPEG → upload → submit to Seedance) and report each step.
// A rejected Seedance create is FREE; a successful one costs credits (reported).
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { url, submit = true } = await req.json().catch(() => ({}))
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const parsed = parsePublicProductUrl(url)
  if (!parsed) return NextResponse.json({ error: 'invalid url' }, { status: 400 })

  // 1) Extract
  const page = await fetchProductPageHtml(parsed.toString())
  if (!page.ok) return NextResponse.json({ step: 'extract', ok: false, error: `${page.code}: ${page.message}` })
  const data = extractProductDataFromHtml(page.html, detectPlatform(parsed.toString()))
  const sourceImages: string[] = (data.images || []).slice(0, 9)

  const dir = await mkdtemp(join(tmpdir(), 'diag-'))
  const report: any = { title: data.title, sourceImageCount: (data.images || []).length, images: [] as any[] }
  const mediaUrls: string[] = []

  try {
    // 2) Per-image: fetch source → convert → upload → confirm reachable
    for (let i = 0; i < sourceImages.length; i++) {
      const src = sourceImages[i]
      const item: any = { i, src }
      try {
        const res = await fetch(src, { signal: AbortSignal.timeout(12000) })
        item.sourceOk = res.ok
        item.sourceType = res.headers.get('content-type') || ''
        const raw = Buffer.from(await res.arrayBuffer())
        item.sourceKB = Math.round(raw.length / 1024)
        const jpg = await toJpeg(raw, dir, i)
        item.converted = !!jpg
        item.jpgKB = jpg ? Math.round(jpg.length / 1024) : null
        const bytes = jpg || raw
        const path = `ugc-temp/diag-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}.jpg`
        const up = await supabaseAdmin.storage.from('store-assets').upload(path, bytes, { contentType: 'image/jpeg', upsert: true })
        if (up.error) { item.uploadError = up.error.message }
        else {
          const pub = supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl
          item.publicUrl = pub
          // confirm Seedance-style reachability
          const check = await fetch(pub, { signal: AbortSignal.timeout(10000) })
          item.reachable = check.ok
          item.reachableType = check.headers.get('content-type') || ''
          if (check.ok) mediaUrls.push(pub)
        }
      } catch (e: any) { item.error = e.message }
      report.images.push(item)
    }
    report.usableImages = mediaUrls.length

    // 3) Optional: ask Seedance to accept the set (free if it rejects)
    if (submit && mediaUrls.length) {
      const seedKey = process.env.SEEDANCE_API_KEY
      try {
        const res = await fetch(SEEDANCE_CREATE, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${seedKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'media-to-video', quality_tier: 'mini', channel: 'standard', prompt: 'Cinematic realistic UGC product ad, 15 seconds, 9:16 vertical.', media_urls: mediaUrls, duration: '15', resolution: '1080p', aspect_ratio: '9:16', generate_audio: true }),
          signal: AbortSignal.timeout(50000),
        })
        const txt = await res.text()
        let body: any = {}; try { body = JSON.parse(txt) } catch { body = { raw: txt.slice(0, 300) } }
        const taskId = body.id ?? body.taskId ?? body.task_id
        report.seedance = { httpStatus: res.status, accepted: !!taskId, taskId: taskId || null, error: body?.error || null, charged: !!taskId }
      } catch (e: any) {
        report.seedance = { error: e.message, accepted: false }
      }
    }

    return NextResponse.json(report)
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
