import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { spawn } from 'child_process'
import { writeFile, readFile, rm, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import ffmpegPath from 'ffmpeg-static'

export const runtime = 'nodejs'
export const maxDuration = 60

// Re-encode any image to a clean, downscaled JPEG so Seedance always gets a
// supported, fast-to-download file (Amazon serves webp for some images, which
// Seedance rejects with "unsupported media file type" and fails the whole request).
async function toJpeg(input: Buffer, dir: string, idx: number): Promise<Buffer | null> {
  if (!ffmpegPath) return null
  const inP = join(dir, `in${idx}`)
  const outP = join(dir, `out${idx}.jpg`)
  try {
    await writeFile(inP, input)
    await new Promise<void>((resolve, reject) => {
      const p = spawn(ffmpegPath as string, ['-y', '-i', inP, '-vf', "scale='min(1024,iw)':-2", '-q:v', '3', outP])
      let err = ''
      p.stderr.on('data', d => { err += d.toString() })
      p.on('error', reject)
      p.on('close', c => c === 0 ? resolve() : reject(new Error(err.slice(-150))))
    })
    return await readFile(outP)
  } catch { return null }
}

async function proxyOne(imageUrl: string, dir: string, idx: number): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const raw = Buffer.from(await res.arrayBuffer())
    // Prefer the JPEG re-encode; fall back to the raw bytes if ffmpeg is unavailable.
    const jpg = await toJpeg(raw, dir, idx)
    const bytes = jpg || raw
    const ext = jpg ? 'jpg' : ((res.headers.get('content-type') || '').includes('png') ? 'png' : 'jpg')
    const contentType = jpg ? 'image/jpeg' : (res.headers.get('content-type') || 'image/jpeg')
    const path = `ugc-temp/seed-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}.${ext}`
    const { error } = await supabaseAdmin.storage.from('store-assets').upload(path, bytes, { contentType, upsert: true })
    if (error) return null
    return supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { imageUrls } = await req.json().catch(() => ({}))
  const imgs = Array.isArray(imageUrls) ? imageUrls.filter(Boolean).slice(0, 9) : []
  if (!imgs.length) return NextResponse.json({ error: 'imageUrls[] required' }, { status: 400 })

  const dir = await mkdtemp(join(tmpdir(), 'px-'))
  try {
    const mediaUrls = (await Promise.all(imgs.map((u, i) => proxyOne(u, dir, i)))).filter(Boolean) as string[]
    if (!mediaUrls.length) return NextResponse.json({ error: 'Failed to proxy any product image' }, { status: 502 })
    return NextResponse.json({ mediaUrls })
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
