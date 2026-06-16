const DEFAULT_ORIGIN = 'https://mantoog.com'

function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '')
  if (!trimmed) return DEFAULT_ORIGIN
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** Resolve the app origin (with protocol) from env or the current browser host. */
export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return normalizeOrigin(fromEnv)

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return DEFAULT_ORIGIN
}

/** Display-friendly store URL without protocol, e.g. mantoog.com/my-store */
export function formatStoreUrlDisplay(slug?: string | null): string {
  try {
    const { host } = new URL(getSiteOrigin())
    return slug ? `${host}/${slug}` : host
  } catch {
    const host = getSiteOrigin().replace(/^https?:\/\//i, '')
    return slug ? `${host}/${slug}` : host
  }
}

/** Full shareable store URL with protocol for copying or linking. */
export function getStoreShareUrl(slug?: string | null): string {
  const origin = getSiteOrigin()
  return slug ? `${origin}/${slug}` : origin
}

/** Public product landing page URL for ads and sharing (never localhost). */
export function getProductLandingUrl(storeSlug: string, productId: string): string {
  const slug = storeSlug.replace(/^\/+|\/+$/g, '')
  const id = productId.replace(/^\/+|\/+$/g, '')
  return `${getSiteOrigin()}/${slug}/${id}`
}
