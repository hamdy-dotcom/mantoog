import type {
  CreateSessionInput,
  FinalizeInput,
  GatewayAdapter,
  PaymentOutcome,
  RemoteOutcome,
  ResolvedConfig,
  WebhookResult,
} from '../../types'
import { bearerToken, verifyHs256 } from '../../jwt'

/** Tamara — BNPL (pay later / instalments).
 *
 *  Docs: https://docs.tamara.co
 *
 *  Two differences from a card gateway drive this file:
 *
 *  1. Money arrives in three steps — checkout, authorise, capture. We do the
 *     first two; CAPTURE IS LEFT TO THE MERCHANT, in Tamara's own portal. So
 *     `paid` here means authorised and committed, not money received: an order
 *     nobody captures expires and the merchant is never paid.
 *  2. It posts to two endpoints. The success path is the authorise
 *     notification; a separate webhook carries only expiry and decline. Both
 *     land on our single route, told apart by shape.
 */

/** Live only — the sandbox host is deliberately unreachable. */
const API = 'https://api.tamara.co'

/** Unrecognised statuses stay `pending`, never `paid`. `authorised` counts as
 *  paid because capture is the merchant's to make — see the header. */
const STATUS: Record<string, PaymentOutcome> = {
  new: 'pending',
  approved: 'pending',  // Customer approved, we have not authorised yet.
  authorised: 'paid',
  authorized: 'paid',
  captured: 'paid',
  fully_captured: 'paid',
  declined: 'failed',
  expired: 'failed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
}

function toOutcome(status: unknown): PaymentOutcome {
  return STATUS[String(status ?? '').toLowerCase()] ?? 'pending'
}

function apiToken(cfg: ResolvedConfig): string {
  // Stored as `api_token`; shown to merchants as "Merchant Key".
  const token = cfg.values.api_token
  if (typeof token !== 'string' || !token) throw new Error('Tamara merchant key missing')
  return token
}

async function callApi(
  cfg: ResolvedConfig,
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${apiToken(cfg)}`,
      'content-type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const text = await res.text()
  let json: Record<string, unknown>
  try {
    json = (text ? JSON.parse(text) : {}) as Record<string, unknown>
  } catch {
    throw new Error(`Tamara returned non-JSON (${res.status})`)
  }

  if (!res.ok) {
    // Never echo the body — it repeats the customer details we just sent.
    const reason = json.message ?? res.status
    throw new Error(`Tamara ${path} failed: ${String(reason)}`)
  }

  return json
}

/** Tamara takes every figure as `{ amount, currency }`. */
function money(amount: number, currency: string) {
  return { amount: Number(amount.toFixed(2)), currency: currency.toUpperCase() }
}

/** A single-word name repeats rather than sending an empty last name, which
 *  Tamara rejects. */
function splitName(full: string): { first: string; last: string } {
  const parts = String(full ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: 'Customer', last: 'Customer' }
  if (parts.length === 1) return { first: parts[0], last: parts[0] }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export const adapter: GatewayAdapter = {
  baseUrl() {
    return API
  },

  async createSession(cfg, input: CreateSessionInput) {
    const { first, last } = splitName(input.customer.name)
    const currency = input.currency.toUpperCase()

    const address = {
      first_name: first,
      last_name: last,
      line1: input.shipping.line1 || '-',
      city: input.shipping.city || '-',
      country_code: input.shipping.country,
      phone_number: input.customer.phone,
    }

    // `||` not `??`: clearing a non-secret field stores '', which would be sent
    // verbatim and rejected. The customer picks their real plan on Tamara's
    // page anyway — this is only the type we open with.
    const paymentType = String(cfg.values.payment_type || 'PAY_BY_INSTALMENTS')
    const instalments = Number(cfg.values.instalments)

    const json = await callApi(cfg, '/checkout', 'POST', {
      // Our order id, so the callback identifies itself. See CreateSessionInput.
      order_reference_id: input.orderId,
      total_amount: money(input.amount, currency),
      shipping_amount: money(input.shippingAmount, currency),
      tax_amount: money(0, currency),
      description: input.description,
      country_code: input.shipping.country,
      payment_type: paymentType,
      // Rejected on the other payment types, so sent only when it applies.
      ...(paymentType === 'PAY_BY_INSTALMENTS' && Number.isFinite(instalments) && instalments > 0
        ? { instalments }
        : {}),
      locale: 'ar_SA',

      items: input.items.map(item => ({
        name: item.name,
        type: 'Physical',
        reference_id: item.sku ?? item.name,
        sku: item.sku ?? item.name,
        quantity: item.quantity,
        unit_price: money(item.unitPrice, currency),
        total_amount: money(item.unitPrice * item.quantity, currency),
      })),

      // No `is_first_order` and no `risk_assessment`: we deliberately send no
      // customer order history.
      consumer: {
        first_name: first,
        last_name: last,
        phone_number: input.customer.phone,
        email: input.customer.email,
      },

      shipping_address: address,
      billing_address: address,

      merchant_url: {
        success: `${input.returnUrl}?o=success`,
        failure: `${input.returnUrl}?o=failure`,
        cancel: `${input.returnUrl}?o=cancel`,
        notification: input.callbackUrl,
      },
    })

    const redirectUrl = json.checkout_url
    const reference = json.order_id

    if (typeof redirectUrl !== 'string' || typeof reference !== 'string') {
      throw new Error('Tamara did not return a checkout_url')
    }

    return { redirectUrl, reference }
  },

  async verifyStatus(cfg, checkoutId) {
    // Reads live under /merchants; the authorise verb does not.
    const json = await callApi(cfg, `/merchants/orders/${encodeURIComponent(checkoutId)}`, 'GET')
    return toOutcome(json.status)
  },

  verifyWebhook(cfg, _rawBody, headers) {
    const secret = cfg.values.notification_token

    // Unconfigured — the token is optional, so there is nothing to check. Same
    // posture as Tabby, which offers no webhook auth at all: `finalize` re-reads
    // the order from Tamara, so a callback never settles anything on its own.
    // Failing closed here would instead mean no Tamara order ever settles.
    if (typeof secret !== 'string' || !secret) {
      console.warn('[tamara] no notification_token set — callback sender unverified')
      return true
    }

    const token = bearerToken(headers)
    if (!token) return false

    // Signs the TOKEN, not the body — `_rawBody` is unused on purpose. Proving
    // the sender is not proving the payload, hence `finalize`.
    return verifyHs256(token, secret)
  },

  parseWebhook(rawBody) {
    const json = JSON.parse(rawBody) as Record<string, unknown>

    // `event_type` is present on the cancel-path webhook and absent on the
    // authorise notification. Undocumented as a discriminator, so anything
    // matching neither falls through to `pending`.
    const eventType = String(json.event_type ?? '').toLowerCase()

    let status: PaymentOutcome = 'pending'
    if (eventType === 'order_declined' || eventType === 'order_expired') status = 'failed'

    return {
      reference: String(json.order_reference_id ?? ''),
      status,
      txnId: typeof json.order_id === 'string' ? json.order_id : undefined,
    } satisfies WebhookResult
  },

  async finalize(cfg, input: FinalizeInput): Promise<RemoteOutcome> {
    // Read by OUR reference: the callback's own order_id is exactly the field
    // an attacker would substitute.
    const remote = await callApi(
      cfg,
      `/merchants/orders/reference-id/${encodeURIComponent(input.orderId)}`,
      'GET',
    )

    const tamaraOrderId = String(remote.order_id ?? '')
    const total = remote.total_amount as Record<string, unknown> | undefined
    const amount = Number(total?.amount)
    const reported = String(remote.status ?? '').toLowerCase()

    const settled: RemoteOutcome = {
      status: toOutcome(reported),
      amount: Number.isFinite(amount) ? amount : null,
      txnId: tamaraOrderId || undefined,
    }

    if (settled.status !== 'pending' || !tamaraOrderId) return settled

    // Only `new` and `approved` can be authorised; anything else has moved on.
    // A failure here must NOT report `paid` — it throws, the route 500s, and
    // Tamara retries. We deliberately stop at authorise: capture is the
    // merchant's step.
    if (reported !== 'new' && reported !== 'approved') return settled

    await callApi(cfg, `/orders/${encodeURIComponent(tamaraOrderId)}/authorise`, 'POST')

    return {
      status: 'paid',
      amount: Number.isFinite(amount) ? amount : null,
      txnId: tamaraOrderId,
    }
  },
}
