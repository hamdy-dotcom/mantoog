import { NextRequest, NextResponse } from 'next/server'
import {
  assertProductAccess,
  BUCKET,
  listProductCreatives,
} from '@/lib/product-creatives/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { mediaTypeFromUrl } from '@/lib/product-creatives/types'

type RouteCtx = { params: Promise<{ productId: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { productId } = await ctx.params
  const access = await assertProductAccess(productId)
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const items = await listProductCreatives(productId)
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { productId } = await ctx.params
  const access = await assertProductAccess(productId)
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const thumb = form.get('thumbnail') as File | null
    const name = String(form.get('name') || file?.name || '').trim() || null

    if (!file || typeof (file as File).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'file_required' }, { status: 400 })
    }

    const type = file.type.startsWith('video/') ? 'video' : 'image'
    const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg')
    const path = `creatives/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buf = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    let thumbnail_url: string | null = type === 'image' ? pub.publicUrl : null

    if (thumb && typeof (thumb as File).arrayBuffer === 'function') {
      const thumbPath = `creatives/${productId}/${Date.now()}-thumb.jpg`
      const thumbBuf = Buffer.from(await thumb.arrayBuffer())
      const { error: thumbErr } = await supabaseAdmin.storage.from(BUCKET).upload(thumbPath, thumbBuf, {
        contentType: 'image/jpeg',
      })
      if (!thumbErr) {
        thumbnail_url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl
      }
    }

    const { data: row, error: insertErr } = await supabaseAdmin
      .from('product_creatives')
      .insert({
        product_id: productId,
        store_id: access.product.store_id,
        type,
        url: pub.publicUrl,
        thumbnail_url,
        name,
        source: 'upload',
      })
      .select('*')
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ item: { ...row, virtual: false } })
  }

  const body = await req.json().catch(() => ({}))
  if (body.action === 'register_product_media' && body.url) {
    const url = String(body.url)
    const type = mediaTypeFromUrl(url)
    const { data: existing } = await supabaseAdmin
      .from('product_creatives')
      .select('*')
      .eq('product_id', productId)
      .eq('url', url)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ item: { ...existing, virtual: false } })
    }

    const { data: row, error } = await supabaseAdmin
      .from('product_creatives')
      .insert({
        product_id: productId,
        store_id: access.product.store_id,
        type,
        url,
        thumbnail_url: type === 'image' ? url : null,
        name: body.name || null,
        source: 'product_media',
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: { ...row, virtual: false } })
  }

  return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
}
