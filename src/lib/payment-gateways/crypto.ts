import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/** Envelope encryption for gateway secrets: `v1:<iv>:<authTag>:<ciphertext>`,
 *  each part base64, AES-256-GCM. The `v1` prefix is the key version, so
 *  PAYMENTS_ENC_KEY can be rotated later.
 *
 *  This protects DB dumps, backups and support access — not an attacker who
 *  already has the server env.
 */

const VERSION = 'v1'
const ALGO = 'aes-256-gcm'
const IV_BYTES = 12

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env.PAYMENTS_ENC_KEY
  if (!raw) {
    throw new Error(
      'PAYMENTS_ENC_KEY is not set. Generate one with: ' +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    )
  }

  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`PAYMENTS_ENC_KEY must decode to 32 bytes, got ${key.length}`)
  }

  cachedKey = key
  return key
}

/** Encrypt one secret value into a self-describing envelope string. */
export function encryptValue(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

/** Decrypt an envelope produced by `encryptValue`. Throws if tampered with. */
export function decryptValue(envelope: string): string {
  const parts = envelope.split(':')
  if (parts.length !== 4) throw new Error('Malformed secret envelope')

  const [version, iv, tag, ciphertext] = parts
  if (version !== VERSION) throw new Error(`Unsupported secret version: ${version}`)

  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(`${VERSION}:`)
}

/** Last 4 chars of a stored secret, for the masked "✓ ••••1234" display.
 *  Null when it can't be decrypted (e.g. key rotated), so the settings page
 *  degrades instead of failing. */
export function tailOf(envelope: unknown): string | null {
  if (!isEncrypted(envelope)) return null
  try {
    return decryptValue(envelope).slice(-4) || null
  } catch {
    return null
  }
}
