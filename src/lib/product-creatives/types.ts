export type ProductCreativeType = 'video' | 'image'

export type ProductCreativeSource = 'upload' | 'product_media' | 'wizard_upload'

export type ProductCreativeRow = {
  id: string
  product_id: string
  store_id: string
  type: ProductCreativeType
  url: string
  thumbnail_url: string | null
  name: string | null
  source: string | null
  tiktok_video_id: string | null
  tiktok_image_id: string | null
  created_at: string
}

/** Client-facing item — DB row or virtual entry from product.images */
export type ProductCreativeItem = {
  id: string
  product_id: string
  type: ProductCreativeType
  url: string
  thumbnail_url: string | null
  name: string | null
  source: string | null
  tiktok_video_id: string | null
  tiktok_image_id: string | null
  created_at: string | null
  /** True when derived from products.images (not yet in product_creatives) */
  virtual?: boolean
}

export const VIRTUAL_ID_PREFIX = 'virtual:'

export function isVirtualCreativeId(id: string) {
  return id.startsWith(VIRTUAL_ID_PREFIX)
}

export function mediaTypeFromUrl(url: string): ProductCreativeType {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ? 'video' : 'image'
}
