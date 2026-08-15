/** Payment gateway contracts.
 *
 *  A gateway is described by two halves:
 *    - `definition` — pure DATA (field metadata). Safe to import into client
 *      components; it never holds a secret VALUE, only the names of secrets.
 *    - `adapter`    — BEHAVIOUR (endpoints, session creation, webhook checks).
 *      Server-only, and added in Phase 2 — hence optional on the module.
 */

export type GatewayId = 'paytabs' | 'tabby' | 'tamara'

export type GatewayStatus = 'unverified' | 'verified' | 'invalid'

export type FieldType = 'text' | 'select' | 'multiselect' | 'number' | 'toggle'

/** One input on the settings form, plus where its value is stored. */
export type GatewayField = {
  /** Storage key inside `public_config` or `credentials`. Values are stored
   *  flat — there is no sandbox/production nesting, and none is planned:
   *  Tabby separates test from live by key prefix, and PayTabs by `region`. */
  key: string
  labelEn: string
  labelAr: string
  /** true → AES-encrypted into `credentials`; false → plaintext `public_config`.
   *  Decided by "must the browser ever see it", NOT by whether it looks like a
   *  key: widget public keys are credentials by name but belong in the clear. */
  secret: boolean
  /** Must be present (stored or submitted) before `enabled` can be turned on. */
  required: boolean
  type: FieldType
  options?: { value: string; label: string }[]
  placeholder?: string
  helpEn?: string
  helpAr?: string
}

export type GatewayDefinition = {
  id: GatewayId
  label: string
  emoji: string
  /** Gates the gateway against stores.currency — a store on an unsupported
   *  currency sees it greyed out rather than entering unusable credentials. */
  supportedCurrencies: string[]
  /** 'manual' → the merchant pastes our webhook URL into the provider's
   *  dashboard, so the tab must show it. 'api' → we register the endpoint
   *  ourselves (Phase 2), so showing a URL would only confuse. */
  webhookSetup: 'manual' | 'api'
  docsUrl?: string
  fields: GatewayField[]
}

/** public_config merged with the DECRYPTED credentials.
 *  Only ever assembled server-side, at charge/webhook time. */
export type ResolvedConfig = {
  values: Record<string, unknown>
}

export type CreateSessionInput = {
  /** Our `orders.id`.
   *
   *  Every adapter MUST send this as the provider's merchant-reference field
   *  (PayTabs `cart_id`, Tabby `order.reference_id`, Tamara `order_reference_id`)
   *  so it comes back on the webhook. That is what makes webhooks
   *  self-identifying — one platform-wide endpoint per gateway, no store id in
   *  the URL. An adapter that drops it produces webhooks nobody can attribute. */
  orderId: string
  amount: number
  currency: string
  description: string
  customer: { name: string; phone: string; email?: string }
  /** Base URL the customer returns to. Providers wanting distinct
   *  success/cancel/failure URLs append `?o=success|cancel|failure` — a display
   *  hint only, since the customer can edit it. The real status comes from
   *  `verifyStatus`. */
  returnUrl: string
  /** Our webhook endpoint. Merchants also register this in the provider
   *  dashboard, but sending it per transaction means one who skipped that step
   *  still settles. Adapters whose provider has no per-request callback field
   *  simply ignore it. */
  callbackUrl: string
}

/** Normalised across every provider, so nothing outside an adapter has to know
 *  that PayTabs says 'A' and Tamara says 'approved'. */
export type PaymentOutcome = 'paid' | 'failed' | 'cancelled' | 'pending'

export type WebhookResult = {
  /** Our `orders.id`, echoed back by the provider — see CreateSessionInput. */
  reference: string
  status: PaymentOutcome
  /** The provider's own transaction id, stored on the order for support and
   *  refunds. Absent on payloads that don't carry one. */
  txnId?: string
}

/** Behaviour half of a gateway. Server-only: it handles decrypted secrets. */
export type GatewayAdapter = {
  baseUrl(cfg: ResolvedConfig): string
  createSession(
    cfg: ResolvedConfig,
    input: CreateSessionInput,
  ): Promise<{ redirectUrl: string; reference: string }>
  /** Read-only status query for the return route. The return redirect is
   *  customer-controlled and proves nothing, so we ask the provider directly
   *  rather than believing the URL. Never writes — the webhook owns state.
   *
   *  Keyed by the provider's own reference (what `createSession` returned and
   *  we stored as `orders.payment_checkout_id`), since that is what their query
   *  APIs take. */
  verifyStatus(cfg: ResolvedConfig, checkoutId: string): Promise<PaymentOutcome>
  verifyWebhook(cfg: ResolvedConfig, rawBody: string, headers: Headers): boolean
  parseWebhook(rawBody: string): WebhookResult
}

export type GatewayModule = {
  definition: GatewayDefinition
  /** Absent until a gateway is actually implemented — callers guard with
   *  `if (!mod.adapter)`. A gateway without one is never offered at checkout
   *  and cannot be enabled in settings, so a merchant can't surface a payment
   *  option with no behaviour behind it. */
  adapter?: GatewayAdapter
}

/* ─── wire shapes shared by the API route and the settings tab ───────────── */

/** What GET returns for one secret field: never the value itself. */
export type SecretState = { set: boolean; tail: string | null }

export type GatewayState = {
  gateway: GatewayId
  enabled: boolean
  status: GatewayStatus
  /** Non-secret values, safe to render straight into inputs. */
  publicConfig: Record<string, unknown>
  /** Presence + last-4 per secret field — never the value itself. */
  secrets: Record<string, SecretState>
  /** URL the merchant registers with the provider. One per gateway,
   *  platform-wide — not per store. */
  webhookUrl: string
  /** False when the gateway has no adapter yet: the tab shows it as "coming
   *  soon" and refuses to enable it, rather than letting a merchant configure
   *  something customers could pick but not pay with. */
  available: boolean
}
