import { createHmac, timingSafeEqual } from 'crypto'
import type {
  CreateSessionInput,
  GatewayAdapter,
  PaymentOutcome,
  ResolvedConfig,
  WebhookResult,
} from '../../types'

/** PayTabs PT2 — hosted payment page.
 *
 *  Docs: https://docs.paytabs.com/manuals/PT-API-Endpoints/
 *  Signature spec: PayTabs support article 60000718961.
 */

/** Region → API host, keyed to the `region` options in ./definition.ts. A wrong
 *  region surfaces as an authentication failure, not a routing one. */
const HOSTS: Record<string, string> = {
  ARE: 'https://secure.paytabs.com',
  SAU: 'https://secure.paytabs.sa',
  EGY: 'https://secure-egypt.paytabs.com',
  OMN: 'https://secure-oman.paytabs.com',
  JOR: 'https://secure-jordan.paytabs.com',
  KWT: 'https://secure-kuwait.paytabs.com',
  IRQ: 'https://secure-iraq.paytabs.com',
  GLOBAL: 'https://secure-global.paytabs.com',
}

/** PayTabs `payment_result.response_status` → our vocabulary. H and P are
 *  genuinely undecided, so neither may map to `paid` — no money has moved. */
const STATUS: Record<string, PaymentOutcome> = {
  A: 'paid',        // Authorised
  H: 'pending',     // Hold — authorised, not captured
  P: 'pending',     // Pending
  D: 'failed',      // Declined
  E: 'failed',      // Error
  X: 'failed',      // Expired
  C: 'cancelled',   // Cancelled by the customer
  V: 'cancelled',   // Voided
}

function toOutcome(responseStatus: unknown): PaymentOutcome {
  const key = String(responseStatus ?? '').toUpperCase()
  // Unknown codes are pending, never paid: an unrecognised status must not be
  // able to release goods.
  return STATUS[key] ?? 'pending'
}

function serverKey(cfg: ResolvedConfig): string {
  const key = cfg.values.server_key
  if (typeof key !== 'string' || !key) throw new Error('PayTabs server_key missing')
  return key
}

async function callApi(
  cfg: ResolvedConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${adapter.baseUrl(cfg)}${path}`, {
    method: 'POST',
    headers: {
      // PayTabs takes the raw server key as the header value — no Bearer scheme.
      authorization: serverKey(cfg),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let json: Record<string, unknown>
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`PayTabs returned non-JSON (${res.status})`)
  }

  if (!res.ok) {
    // Never echo the body — it repeats the customer details we just sent.
    const reason = json.message ?? json.result ?? res.status
    throw new Error(`PayTabs ${path} failed: ${String(reason)}`)
  }

  return json
}

export const adapter: GatewayAdapter = {
  baseUrl(cfg) {
    const region = String(cfg.values.region ?? '').toUpperCase()
    return HOSTS[region] ?? HOSTS.GLOBAL
  },

  async createSession(cfg, input: CreateSessionInput) {
    const json = await callApi(cfg, '/payment/request', {
      profile_id: cfg.values.profile_id,
      tran_type: 'sale',
      tran_class: 'ecom',

      // Our order id, so the webhook identifies itself. See CreateSessionInput.
      cart_id: input.orderId,
      cart_description: input.description,
      cart_currency: input.currency.toUpperCase(),
      cart_amount: Number(input.amount.toFixed(2)),

      customer_details: {
        name: input.customer.name,
        phone: input.customer.phone,
        // PayTabs collects an email on its own page when we don't supply one.
        ...(input.customer.email ? { email: input.customer.email } : {}),
      },

      return: input.returnUrl,
      callback: input.callbackUrl,

      // We already collect the address in our own checkout form.
      hide_shipping: true,
    })

    const redirectUrl = json.redirect_url
    const reference = json.tran_ref

    if (typeof redirectUrl !== 'string' || typeof reference !== 'string') {
      throw new Error('PayTabs did not return a redirect_url')
    }

    return { redirectUrl, reference }
  },

  async verifyStatus(cfg, checkoutId) {
    const json = await callApi(cfg, '/payment/query', {
      profile_id: cfg.values.profile_id,
      tran_ref: checkoutId,
    })

    const result = json.payment_result as Record<string, unknown> | undefined
    return toOutcome(result?.response_status)
  },

  verifyWebhook(cfg, rawBody, headers) {
    // HMAC-SHA256 of the ENTIRE raw body, keyed by the server key, hex-encoded.
    // Must be the raw bytes as received — re-serialising parsed JSON reorders
    // keys and the signature stops matching.
    const received = headers.get('signature')
    if (!received) return false

    const expected = createHmac('sha256', serverKey(cfg)).update(rawBody, 'utf8').digest('hex')

    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(received.trim().toLowerCase(), 'utf8')

    // timingSafeEqual throws on a length mismatch.
    return a.length === b.length && timingSafeEqual(a, b)
  },

  parseWebhook(rawBody) {
    const json = JSON.parse(rawBody) as Record<string, unknown>
    const result = json.payment_result as Record<string, unknown> | undefined

    return {
      reference: String(json.cart_id ?? ''),
      status: toOutcome(result?.response_status),
      txnId: typeof json.tran_ref === 'string' ? json.tran_ref : undefined,
    } satisfies WebhookResult
  },
}
