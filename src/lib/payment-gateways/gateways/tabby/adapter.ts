import type {
  CreateSessionInput,
  FinalizeInput,
  GatewayAdapter,
  PaymentOutcome,
  RemoteOutcome,
  ResolvedConfig,
  WebhookResult,
} from '../../types'

/** Tabby — BNPL (pay in 4).
 *
 *  Docs: https://docs.tabby.ai
 *
 *  Two things drive this file:
 *
 *  1. The webhook is UNAUTHENTICATED — no signature, no shared secret to
 *     register. Everything rests on `finalize` re-reading the payment.
 *  2. CAPTURE IS LEFT TO THE MERCHANT. `CLOSED` means the account already
 *     auto-captured; `AUTHORIZED` means it did not and someone must. Both
 *     count as `paid` here, so `paid` means committed, not money received.
 */

/** One host for every market. There is no test host — live vs test is the key
 *  prefix alone, which `saveGateway` rejects. */
const API = 'https://api.tabby.ai/api/v2'

/** Unrecognised statuses stay `pending`, never `paid`. `AUTHORIZED` counts as
 *  paid because capture is the merchant's to make — see the header. */
const STATUS: Record<string, PaymentOutcome> = {
  CREATED: 'pending',
  AUTHORIZED: 'paid',
  CLOSED: 'paid', // Captured.
  REJECTED: 'failed',
  EXPIRED: 'failed',
}

function toOutcome(status: unknown): PaymentOutcome {
  return STATUS[String(status ?? '').toUpperCase()] ?? 'pending'
}

function secretKey(cfg: ResolvedConfig): string {
  const key = cfg.values.secret_key
  if (typeof key !== 'string' || !key) throw new Error('Tabby secret_key missing')
  return key
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
      authorization: `Bearer ${secretKey(cfg)}`,
      'content-type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const text = await res.text();
  let json: Record<string, unknown>
  try {
    json = (text ? JSON.parse(text) : {}) as Record<string, unknown>
  } catch {
    throw new Error(`Tabby returned non-JSON (${res.status})`)
  }

  if (!res.ok) {
    // Never echo the body — it repeats the customer details we just sent.
    const reason = json.error ?? json.errorType ?? res.status
    throw new Error(`Tabby ${path} failed: ${String(reason)}`)
  }

  return json
}

export const adapter: GatewayAdapter = {
  baseUrl() {
    return API
  },

  async createSession(cfg, input: CreateSessionInput) {
    const currency = input.currency.toUpperCase()

    const json = await callApi(cfg, '/checkout', 'POST', {
      payment: {
        amount: input.amount.toFixed(2),
        currency,
        description: input.description,

        buyer: {
          name: input.customer.name,
          phone: input.customer.phone,
          email: input.customer.email,
        },

        shipping_address: {
          city: input.shipping.city || '-',
          address: input.shipping.line1 || '-',
        },

        // No `buyer_history` and no `order_history`: we deliberately send no
        // customer order history, at the cost of approval rate.
        order: {
          // Our order id, so the callback identifies itself.
          reference_id: input.orderId,
          shipping_amount: input.shippingAmount.toFixed(2),
          items: input.items.map(item => ({
            title: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice.toFixed(2),
            reference_id: item.sku ?? item.name,
          })),
        },
      },

      lang: 'ar',
      merchant_code: String(cfg.values.merchant_code ?? ''),
      merchant_urls: {
        success: `${input.returnUrl}?o=success`,
        cancel: `${input.returnUrl}?o=cancel`,
        failure: `${input.returnUrl}?o=failure`,
      },
    })
    console.log('Tabby createSession response', json);

    // A rejected buyer comes back 200 with no web_url — Tabby declined to lend,
    // which is a normal outcome, not a transport error.
    const status = String(json.status ?? '').toUpperCase()
    if (status === 'REJECTED') {
      const reason = (json.configuration as Record<string, unknown> | undefined)?.['rejection_reason']
      throw new Error(`Tabby rejected the buyer${reason ? `: ${String(reason)}` : ''}`)
    }

    const configuration = json.configuration as Record<string, unknown> | undefined
    const products = configuration?.available_products as Record<string, unknown> | undefined
    const installments = Array.isArray(products?.installments) ? products.installments : []
    const first = installments[0] as Record<string, unknown> | undefined

    const redirectUrl = first?.web_url
    const reference = json.payment && typeof json.payment === 'object'
      ? (json.payment as Record<string, unknown>).id
      : json.id

    if (typeof redirectUrl !== 'string' || typeof reference !== 'string') {
      throw new Error('Tabby did not return a web_url')
    }

    return { redirectUrl, reference }
  },

  async verifyStatus(cfg, checkoutId) {
    const json = await callApi(cfg, `/payments/${encodeURIComponent(checkoutId)}`, 'GET')
    return toOutcome(json.status)
  },

  verifyWebhook() {
    // Nothing to verify. Tabby registers a URL and nothing else, so a POST here
    // proves nothing about its origin. The real gate is `finalize`.
    return true
  },

  parseWebhook(rawBody) {
    const json = JSON.parse(rawBody) as Record<string, unknown>
    const order = json.order as Record<string, unknown> | undefined

    return {
      reference: String(order?.reference_id ?? ''),
      status: toOutcome(json.status),
      txnId: typeof json.id === 'string' ? json.id : undefined,
    } satisfies WebhookResult
  },

  async finalize(cfg, input: FinalizeInput): Promise<RemoteOutcome> {
    // Keyed by the id stored at session creation, not anything the callback
    // supplied — that field is exactly what an attacker would forge.
    if (!input.checkoutId) {
      throw new Error('Tabby finalize called without a stored checkout id')
    }

    const payment = await callApi(
      cfg,
      `/payments/${encodeURIComponent(input.checkoutId)}`,
      'GET',
    )

    const amount = Number(payment.amount)
    const captures = Array.isArray(payment.captures) ? payment.captures : []
    const capture = captures[0] as Record<string, unknown> | undefined

    // Nothing to drive: capture is the merchant's step, whether the account
    // already did it automatically (CLOSED) or is waiting (AUTHORIZED).
    return {
      status: toOutcome(payment.status),
      amount: Number.isFinite(amount) ? amount : null,
      txnId: typeof capture?.id === 'string' ? capture.id : input.checkoutId,
    }
  },
}
