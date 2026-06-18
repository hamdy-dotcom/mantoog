import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/tiktok/server'

const MANTOOG_ICON = '/logo.svg'

export type PublicStore = {
  id: string
  merchant_id: string
  name: string
  slug: string
  logo_url: string | null
  currency: string | null
  language: string | null
  has_paid: boolean
}

export type PublicProduct = {
  id: string
  title: string
  description: string | null
  images: string[] | null
}

function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  const base = (fromEnv || 'https://mantoog.com').trim().replace(/\/$/, '')
  return /^https?:\/\//i.test(base) ? base : `https://${base}`
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function storeIcons(logoUrl: string | null | undefined): Metadata['icons'] {
  if (logoUrl) {
    return {
      icon: [{ url: logoUrl }],
      shortcut: logoUrl,
      apple: logoUrl,
    }
  }
  return {
    icon: [{ url: MANTOOG_ICON, type: 'image/svg+xml', sizes: 'any' }],
    shortcut: MANTOOG_ICON,
    apple: MANTOOG_ICON,
  }
}

function productImages(product: PublicProduct): string[] {
  return Array.isArray(product.images) ? product.images.filter(Boolean) : []
}

export async function fetchStoreBySlug(slug: string): Promise<PublicStore | null> {
  const { data } = await supabaseAdmin
    .from('stores')
    .select('id, merchant_id, name, slug, logo_url, currency, language, has_paid')
    .eq('slug', slug)
    .single()
  if (!data) return null
  return {
    ...(data as Omit<PublicStore, 'has_paid'>),
    has_paid: Boolean((data as { has_paid?: boolean }).has_paid),
  }
}

export async function fetchProductForStore(
  storeId: string,
  productId: string
): Promise<PublicProduct | null> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, title, description, images')
    .eq('id', productId)
    .eq('store_id', storeId)
    .eq('status', 'active')
    .single()
  return data as PublicProduct | null
}

export function buildStoreMetadata(store: PublicStore): Metadata {
  const name = store.name?.trim() || store.slug
  const description = `Shop at ${name}`
  const url = `${siteOrigin()}/${store.slug}`
  const ogImage = store.logo_url || undefined

  return {
    title: name,
    description,
    icons: storeIcons(store.logo_url),
    openGraph: {
      title: name,
      description,
      url,
      siteName: name,
      ...(ogImage ? { images: [{ url: ogImage, alt: name }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: name,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export function buildProductMetadata(
  store: PublicStore,
  product: PublicProduct
): Metadata {
  const storeName = store.name?.trim() || store.slug
  const productTitle = product.title?.trim() || 'Product'
  const title = `${productTitle} — ${storeName}`
  const rawDesc = product.description || productTitle
  const description = stripHtml(String(rawDesc)).slice(0, 300)
  const images = productImages(product)
  const ogImage = images[0] || store.logo_url || undefined
  const url = `${siteOrigin()}/${store.slug}/${product.id}`

  return {
    title,
    description,
    icons: storeIcons(store.logo_url),
    openGraph: {
      title,
      description,
      url,
      siteName: storeName,
      ...(ogImage ? { images: [{ url: ogImage, alt: productTitle }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}
