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

const MAX_FILES = 9
const MAX_BYTES = 12 * 1024 * 1024 // 12MB per file

// Same clean-JPEG re-encode as proxy-images: Seedance needs supported, fast files.
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

// Direct image upload (multipart "files") → re-encode → store-assets/ugc-temp.
// Used when a merchant supplies product-only photos (e.g. Seedance rejected the
// scraped photos because they contain a real person).
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'multipart form data required' }, { status: 400 })
  const files = form.getAll('files').filter((f): f is File => f instanceof File).slice(0, MAX_FILES)
  if (!files.length) return NextResponse.json({ error: 'files[] required' }, { status: 400 })

  const dir = await mkdtemp(join(tmpdir(), 'up-'))
  try {
    const mediaUrls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.size > MAX_BYTES) continue
      const raw = Buffer.from(await f.arrayBuffer())
      const jpg = await toJpeg(raw, dir, i)
      const bytes = jpg || raw
      const contentType = jpg ? 'image/jpeg' : (f.type || 'image/jpeg')
      const ext = jpg ? 'jpg' : (contentType.includes('png') ? 'png' : 'jpg')
      const path = `ugc-temp/manual-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}.${ext}`
      const { error } = await supabaseAdmin.storage.from('store-assets').upload(path, bytes, { contentType, upsert: true })
      if (!error) mediaUrls.push(supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl)
    }
    if (!mediaUrls.length) return NextResponse.json({ error: 'تعذّر رفع الصور — جرّب صورًا أخرى' }, { status: 502 })
    return NextResponse.json({ mediaUrls })
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
