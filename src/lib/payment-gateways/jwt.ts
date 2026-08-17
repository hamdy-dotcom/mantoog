import { createHmac, timingSafeEqual } from 'crypto'

/** Minimal HS256 JWT verification, for Tamara's callbacks.
 *
 *  A valid token identifies the sender but signs only itself, NOT the request
 *  body — it cannot tell you the payload is untampered. */

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/** Tolerance on `exp`, for clock drift against the provider. */
const CLOCK_SKEW = 60

export function verifyHs256(token: string, secret: string): boolean {
  if (!token || !secret) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [header, payload, signature] = parts

  // Pin the algorithm before verifying. Trusting the token's own `alg` is the
  // classic forgery: `none` skips the check, and naming an asymmetric algorithm
  // can turn a public key into a signing key.
  let alg: unknown
  try {
    alg = (JSON.parse(base64UrlDecode(header).toString('utf8')) as { alg?: unknown }).alg
  } catch {
    return false
  }
  if (alg !== 'HS256') return false

  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest()
  const received = base64UrlDecode(signature)

  // timingSafeEqual throws on a length mismatch.
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return false
  }

  try {
    const claims = JSON.parse(base64UrlDecode(payload).toString('utf8')) as { exp?: unknown }
    if (typeof claims.exp === 'number' && claims.exp + CLOCK_SKEW < Date.now() / 1000) {
      return false
    }
  } catch {
    return false
  }

  return true
}

export function bearerToken(headers: Headers): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get('authorization') ?? '')
  return match ? match[1] : null
}
