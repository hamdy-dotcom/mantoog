/** Customer details BNPL providers require but our checkout does not collect. */

/** Deliberately not `getSiteOrigin()`, which falls back to
 *  `window.location.origin` and would mint addresses at `localhost`. */
const PLACEHOLDER_DOMAIN = 'mantoog.com'

/** Stopgap for a missing checkout field. Providers match identity on email, so
 *  a synthesised one costs approval rate and their mail bounces. Deterministic,
 *  so a retried order keeps the same identity. */
export function placeholderEmail(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  return `${digits || 'customer'}@${PLACEHOLDER_DOMAIN}`
}

/** Gulf currencies are 1:1 with their issuing country, which makes this a
 *  fallback rather than a guess. */
const CURRENCY_COUNTRY: Record<string, string> = {
  SAR: 'SA',
  AED: 'AE',
  KWD: 'KW',
  BHD: 'BH',
  QAR: 'QA',
  OMR: 'OM',
  EGP: 'EG',
}

/** ISO-3166 alpha-2. `address_country` is nullable free text, so it is trusted
 *  only when it already looks like a code. Null means the caller must fail
 *  before calling the provider. */
export function resolveCountry(
  addressCountry: string | null | undefined,
  currency: string,
): string | null {
  const given = String(addressCountry ?? '').trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(given)) return given

  return CURRENCY_COUNTRY[String(currency ?? '').trim().toUpperCase()] ?? null
}
