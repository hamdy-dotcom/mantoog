import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import {
  mediaTypeFromUrl,
  VIRTUAL_ID_PREFIX,
  type ProductCreativeItem,
  type ProductCreativeRow,
  type ProductCreativeType,
} from '@/lib/product-creatives/types'

const BUCKET = 'store-assets'

export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx !== -1) return decodeURIComponent(url.slice(idx + marker.length))
  const short = `/public/${BUCKET}/`
  const idx2 = url.indexOf(short)
  if (idx2 !== -1) return decodeURIComponent(url.slice(idx2 + short.length))
  return null
}

export async function assertProductAccess(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 as const }

  const { data: product, error } = await supabase
    .from('products')
    .select('id, store_id, images, title, merchant_id')
    .eq('id', productId)
    .eq('merchant_id', user.id)
    .single()

  if (error || !product) return { error: 'not_found' as const, status: 404 as const }
  return { user, product }
}

function virtualIdForUrl(url: string, index: number) {
  return `${VIRTUAL_ID_PREFIX}${index}:${encodeURIComponent(url)}`
}

function parseVirtualUrl(id: string): string | null {
  if (!id.startsWith(VIRTUAL_ID_PREFIX)) return null
  const rest = id.slice(VIRTUAL_ID_PREFIX.length)
  const colon = rest.indexOf(':')
  if (colon === -1) return null
  try {
    return decodeURIComponent(rest.slice(colon + 1))
  } catch {
    return null
  }
}

export function mergeProductCreatives(
  rows: ProductCreativeRow[],
  productImages: string[],
  productId: string
): ProductCreativeItem[] {
  const byUrl = new Map<string, ProductCreativeItem>()
  for (const row of rows) {
    byUrl.set(row.url, { ...row, virtual: false })
  }

  productImages.forEach((url, index) => {
    if (!url || byUrl.has(url)) return
    byUrl.set(url, {
      id: virtualIdForUrl(url, index),
      product_id: productId,
      type: mediaTypeFromUrl(url),
      url,
      thumbnail_url: mediaTypeFromUrl(url) === 'image' ? url : null,
      name: null,
      source: 'product_media',
      tiktok_video_id: null,
      tiktok_image_id: null,
      created_at: null,
      virtual: true,
    })
  })

  const merged = [...byUrl.values()]
  merged.sort((a, b) => {
    if (a.virtual !== b.virtual) return a.virtual ? 1 : -1
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })
  return merged
}

export async function listProductCreatives(productId: string): Promise<ProductCreativeItem[]> {
  const access = await assertProductAccess(productId)
  if ('error' in access) return []

  const images = Array.isArray(access.product.images) ? access.product.images as string[] : []
  const { data: rows } = await supabaseAdmin
    .from('product_creatives')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  const typed = (rows || []) as ProductCreativeRow[]
  if (typed.length) typed.forEach(r => { r.product_id = productId })
  return mergeProductCreatives(typed, images, productId)
}

export async function getCreativeRowsByIds(ids: string[]): Promise<ProductCreativeRow[]> {
  const realIds = ids.filter(id => !id.startsWith(VIRTUAL_ID_PREFIX))
  if (!realIds.length) return []
  const { data } = await supabaseAdmin
    .from('product_creatives')
    .select('*')
    .in('id', realIds)
  return (data || []) as ProductCreativeRow[]
}

export type ResolvedCreativeMedia = {
  items: ProductCreativeItem[]
  video_url: string | null
  image_urls: string[]
  creative_ids: string[]
}

export async function resolveCreativeSelection(opts: {
  productId: string
  productImages: string[]
  creativeIds?: string[] | null
  videoUrl?: string | null
  imageUrls?: string[] | null
}): Promise<ResolvedCreativeMedia> {
  const all = await listProductCreatives(opts.productId)
  const byId = new Map(all.map(c => [c.id, c]))
  const items: ProductCreativeItem[] = []
  const creative_ids: string[] = []

  const addItem = (item: ProductCreativeItem | undefined) => {
    if (!item) return
    items.push(item)
    if (!item.virtual) creative_ids.push(item.id)
  }

  if (opts.creativeIds?.length) {
    for (const id of opts.creativeIds) {
      let item = byId.get(id)
      if (!item) {
        const url = parseVirtualUrl(id)
        if (url) item = all.find(c => c.url === url)
      }
      addItem(item)
    }
  }

  if (!items.length && opts.videoUrl) {
    addItem(all.find(c => c.url === opts.videoUrl && c.type === 'video'))
  }

  if (!items.length && opts.imageUrls?.length) {
    for (const url of opts.imageUrls) {
      addItem(all.find(c => c.url === url && c.type === 'image'))
    }
  }

  const video = items.find(i => i.type === 'video')
  const images = items.filter(i => i.type === 'image').map(i => i.url)

  return {
    items,
    video_url: video?.url || opts.videoUrl || null,
    image_urls: images.length ? images : (opts.imageUrls || []),
    creative_ids,
  }
}

export async function upsertTikTokCache(opts: {
  productId: string
  storeId: string
  url: string
  type: ProductCreativeType
  name?: string | null
  source?: string
  tiktok_video_id?: string | null
  tiktok_image_id?: string | null
  thumbnail_url?: string | null
}) {
  const { data: existing } = await supabaseAdmin
    .from('product_creatives')
    .select('id')
    .eq('product_id', opts.productId)
    .eq('url', opts.url)
    .maybeSingle()

  const patch: Record<string, unknown> = {}
  if (opts.tiktok_video_id) patch.tiktok_video_id = opts.tiktok_video_id
  if (opts.tiktok_image_id) patch.tiktok_image_id = opts.tiktok_image_id
  if (opts.thumbnail_url) patch.thumbnail_url = opts.thumbnail_url

  if (existing?.id) {
    if (Object.keys(patch).length) {
      await supabaseAdmin.from('product_creatives').update(patch).eq('id', existing.id)
    }
    return existing.id as string
  }

  const { data: inserted } = await supabaseAdmin
    .from('product_creatives')
    .insert({
      product_id: opts.productId,
      store_id: opts.storeId,
      type: opts.type,
      url: opts.url,
      name: opts.name || null,
      source: opts.source || 'product_media',
      thumbnail_url: opts.thumbnail_url || (opts.type === 'image' ? opts.url : null),
      ...patch,
    })
    .select('id')
    .single()

  return inserted?.id as string | undefined
}

export async function cacheTikTokCreativeIds(opts: {
  creativeIds: string[]
  video_id?: string | null
  image_ids?: string[]
  cover_image_id?: string | null
  video_url?: string | null
  image_urls?: string[]
  productId: string
  storeId: string
}) {
  const rows = await getCreativeRowsByIds(opts.creativeIds)

  if (opts.video_id) {
    const videoRow = rows.find(r => r.type === 'video')
    const url = videoRow?.url || opts.video_url
    if (videoRow) {
      await supabaseAdmin.from('product_creatives').update({
        tiktok_video_id: opts.video_id,
        ...(opts.cover_image_id ? { tiktok_image_id: opts.cover_image_id } : {}),
      }).eq('id', videoRow.id)
    } else if (url) {
      await upsertTikTokCache({
        productId: opts.productId,
        storeId: opts.storeId,
        url,
        type: 'video',
        tiktok_video_id: opts.video_id,
        tiktok_image_id: opts.cover_image_id || null,
      })
    }
  }

  if (opts.image_ids?.length) {
    const imageRows = rows.filter(r => r.type === 'image')
    const urls = opts.image_urls || imageRows.map(r => r.url)
    for (let i = 0; i < opts.image_ids.length; i++) {
      const tiktokId = opts.image_ids[i]
      const row = imageRows[i]
      if (row) {
        await supabaseAdmin.from('product_creatives').update({ tiktok_image_id: tiktokId }).eq('id', row.id)
      } else if (urls[i]) {
        await upsertTikTokCache({
          productId: opts.productId,
          storeId: opts.storeId,
          url: urls[i],
          type: 'image',
          tiktok_image_id: tiktokId,
        })
      }
    }
  }
}

export async function deleteProductCreative(productId: string, creativeId: string) {
  const access = await assertProductAccess(productId)
  if ('error' in access) return access

  const { data: row } = await supabaseAdmin
    .from('product_creatives')
    .select('*')
    .eq('id', creativeId)
    .eq('product_id', productId)
    .single()

  if (!row) return { error: 'not_found' as const, status: 404 as const }

  const path = storagePathFromPublicUrl(row.url as string)
  if (path) {
    await supabaseAdmin.storage.from(BUCKET).remove([path])
  }
  const thumbPath = row.thumbnail_url ? storagePathFromPublicUrl(row.thumbnail_url as string) : null
  if (thumbPath && thumbPath !== path) {
    await supabaseAdmin.storage.from(BUCKET).remove([thumbPath])
  }

  await supabaseAdmin.from('product_creatives').delete().eq('id', creativeId)
  return { ok: true as const }
}

export { BUCKET }
