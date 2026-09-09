import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/tiktok/server'

const MANTOOG_ICON = '/logo.svg'

export type PublicStore = {
  id: string
  merchant_id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
  currency: string | null
  language: string | null
  has_paid: boolean
  google_site_verification: string | null
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

function colorFavicon(color: string, letter: string): string {
  const c = color.startsWith('#') ? color : '#3b82f6'
  const l = (letter || 'M').toUpperCase().charAt(0)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${c}"/><text x="16" y="22" text-anchor="middle" font-size="18" font-family="sans-serif" fill="white" font-weight="bold">${l}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function storeIcons(logoUrl: string | null | undefined, primaryColor?: string | null, storeName?: string | null): Metadata['icons'] {
  if (logoUrl) {
    return {
      icon: [{ url: logoUrl }],
      shortcut: logoUrl,
      apple: logoUrl,
    }
  }
  const favicon = colorFavicon(primaryColor || '#3b82f6', storeName || 'M')
  return {
    icon: [{ url: favicon, type: 'image/svg+xml' }],
    shortcut: favicon,
    apple: favicon,
  }
}

function productImages(product: PublicProduct): string[] {
  return Array.isArray(product.images) ? product.images.filter(Boolean) : []
}

export async function fetchStoreBySlug(slug: string): Promise<PublicStore | null> {
  const { data } = await supabaseAdmin
    .from('stores')
    .select('id, merchant_id, name, slug, logo_url, primary_color, currency, language, has_paid, google_site_verification')
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
    icons: storeIcons(store.logo_url, store.primary_color, store.name),
    ...(store.google_site_verification ? { verification: { google: store.google_site_verification } } : {}),
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
    icons: storeIcons(store.logo_url, store.primary_color, store.name),
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
