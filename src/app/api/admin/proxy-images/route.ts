import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 60

// Proxy the scraped product images into Supabase ONCE (Seedance can't fetch
// Amazon CDN). The returned public URLs are reused for every creative so
// generation stays fast and doesn't time out.
async function proxyOne(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) })
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

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { imageUrls } = await req.json().catch(() => ({}))
  const imgs = Array.isArray(imageUrls) ? imageUrls.filter(Boolean).slice(0, 9) : []
  if (!imgs.length) return NextResponse.json({ error: 'imageUrls[] required' }, { status: 400 })

  const mediaUrls = (await Promise.all(imgs.map(u => proxyOne(u)))).filter(Boolean) as string[]
  if (!mediaUrls.length) return NextResponse.json({ error: 'Failed to proxy any product image' }, { status: 502 })
  return NextResponse.json({ mediaUrls })
}
