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

/**
 * Store-scoped origin using the slug as a subdomain, e.g.
 * https://my-store.mantoog.com (falls back to the plain origin if no slug).
 */
export function getStoreOrigin(slug?: string | null): string {
  const origin = getSiteOrigin()
  const clean = slug?.replace(/^\/+|\/+$/g, '')
  if (!clean) return origin
  try {
    const url = new URL(origin)
    url.hostname = `${clean}.${url.hostname.replace(/^www\./i, '')}`
    return url.origin
  } catch {
    return origin
  }
}

/** Display-friendly store URL without protocol, e.g. my-store.mantoog.com */
export function formatStoreUrlDisplay(slug?: string | null): string {
  try {
    return new URL(getStoreOrigin(slug)).host
  } catch {
    return getStoreOrigin(slug).replace(/^https?:\/\//i, '')
  }
}

/** Full shareable store URL with protocol for copying or linking. */
export function getStoreShareUrl(slug?: string | null): string {
  return getStoreOrigin(slug)
}

/** Public product landing page URL for ads and sharing (never localhost). */
export function getProductLandingUrl(storeSlug: string, productId: string): string {
  const id = productId.replace(/^\/+|\/+$/g, '')
  return `${getStoreOrigin(storeSlug)}/product/${id}`
}

/**
 * Client-only relative href to a product landing page. Returns `/product/:id`
 * when the store is already being served from its subdomain, and the legacy
 * `/:slug/:id` path otherwise — so in-store navigation works under both schemes.
 */
export function storeProductHref(storeSlug: string, productId: string): string {
  const onStoreSubdomain =
    typeof window !== 'undefined' &&
    window.location.hostname.split('.')[0] === storeSlug
  return onStoreSubdomain ? `/product/${productId}` : `/${storeSlug}/${productId}`
}
