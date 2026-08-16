/** Payment gateway contracts. A gateway has two halves: `definition` is pure
 *  data (field metadata, safe for client components — it holds the names of
 *  secrets, never their values), `adapter` is server-only behaviour. */

export type GatewayId = 'paytabs' | 'tabby' | 'tamara'

export type GatewayStatus = 'unverified' | 'verified' | 'invalid'

export type FieldType = 'text' | 'select' | 'multiselect' | 'number' | 'toggle'

/** One input on the settings form, plus where its value is stored. */
export type GatewayField = {
  /** Storage key inside `public_config` or `credentials`. Stored flat: Tabby
   *  separates test from live by key prefix, PayTabs by `region`. */
  key: string
  labelEn: string
  labelAr: string
  /** true → AES-encrypted into `credentials`; false → plaintext `public_config`.
   *  Decided by "must the browser ever see it", not by whether it looks like a
   *  key — widget public keys belong in the clear. */
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
  /** Gated against stores.currency — an unsupported store sees it greyed out
   *  rather than entering unusable credentials. */
  supportedCurrencies: string[]
  /** 'manual' → the settings tab shows the webhook URL for the merchant to
   *  paste into the provider. 'api' → we register it ourselves. */
  webhookSetup: 'manual' | 'api'
  docsUrl?: string
  fields: GatewayField[]
}

/** public_config merged with the decrypted credentials. Assembled server-side
 *  only, at charge/webhook time. */
export type ResolvedConfig = {
  values: Record<string, unknown>
}

/** One line on the order. BNPL providers underwrite the individual transaction,
 *  so they want to see what is being bought, not just a total. */
export type LineItem = {
  name: string
  quantity: number
  /** Price of ONE unit, in the order's currency. */
  unitPrice: number
  sku?: string
}

export type ShippingAddress = {
  line1: string
  city: string
  /** ISO-3166 alpha-2. Required by both BNPL providers. */
  country: string
}

export type CreateSessionInput = {
  /** Our `orders.id`. Every adapter MUST send this as the provider's
   *  merchant-reference field (PayTabs `cart_id`, Tabby `order.reference_id`,
   *  Tamara `order_reference_id`) so it comes back on the webhook — that is what
   *  lets one platform-wide endpoint per gateway attribute what it receives. */
  orderId: string
  amount: number
  currency: string
  description: string
  customer: { name: string; phone: string; email?: string }
  /** Must reconcile: sum(unitPrice × quantity) + shippingAmount === amount.
   *  Tamara and Tabby both re-add the breakdown and reject on a mismatch, so a
   *  rounding slip here reads as a declined gateway, not a validation error. */
  items: LineItem[]
  shippingAmount: number
  shipping: ShippingAddress
  /** Base URL the customer returns to. Providers wanting distinct
   *  success/cancel/failure URLs append `?o=success|cancel|failure`, a display
   *  hint only — the real status comes from `verifyStatus`. */
  returnUrl: string
  /** Our webhook endpoint, sent per transaction so a merchant who never
   *  registered it in the provider dashboard still settles. Ignored by adapters
   *  whose provider has no per-request callback field. */
  callbackUrl: string
}

/** Normalised across every provider, so nothing outside an adapter has to know
 *  that PayTabs says 'A' and Tamara says 'approved'. */
export type PaymentOutcome = 'paid' | 'failed' | 'cancelled' | 'pending'

export type WebhookResult = {
  /** Our `orders.id`, echoed back by the provider — see CreateSessionInput. */
  reference: string
  status: PaymentOutcome
  /** Provider's transaction id, for support and refunds. */
  txnId?: string
}

export type FinalizeInput = {
  /** Our `orders.id`. */
  orderId: string
  /** Provider reference stored at session creation, when there is one. */
  checkoutId: string | null
}

/** Authoritative state, read back from the provider rather than believed from a
 *  delivered payload. */
export type RemoteOutcome = {
  status: PaymentOutcome
  /** The provider's own figure, cross-checked against the order total: a
   *  payment authorised for less than we charged must never settle as paid.
   *  Null when the provider returns no amount. */
  amount: number | null
  txnId?: string
}

/** Behaviour half of a gateway. Server-only: it handles decrypted secrets. */
export type GatewayAdapter = {
  baseUrl(cfg: ResolvedConfig): string
  createSession(
    cfg: ResolvedConfig,
    input: CreateSessionInput,
  ): Promise<{ redirectUrl: string; reference: string }>
  /** Read-only status query for the return route, which cannot trust its own
   *  customer-controlled URL. Never writes — the webhook owns state. Keyed by
   *  the provider's reference (`orders.payment_checkout_id`), which is what
   *  their query APIs take. */
  verifyStatus(cfg: ResolvedConfig, checkoutId: string): Promise<PaymentOutcome>
  verifyWebhook(cfg: ResolvedConfig, rawBody: string, headers: Headers): boolean
  parseWebhook(rawBody: string): WebhookResult
  /** Drives provider-side settlement and reports what the PROVIDER says, not
   *  what the callback claimed. Present only where the callback cannot be
   *  trusted alone: Tabby's webhook is unauthenticated, and Tamara's JWT signs
   *  only itself so a valid token can be replayed with a substituted body.
   *  PayTabs omits it — its HMAC covers the raw body, which is stronger.
   *
   *  Not read-only: BNPL settlement is multi-step, and authorise happens here.
   *  Capture does not — merchants take that step in the provider's own portal,
   *  so a `paid` outcome from here means committed, not money received. */
  finalize?(cfg: ResolvedConfig, input: FinalizeInput): Promise<RemoteOutcome>
}

export type GatewayModule = {
  definition: GatewayDefinition
  /** Absent until a gateway is implemented. One without it is never offered at
   *  checkout and cannot be enabled in settings. */
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
  /** False when the gateway has no adapter yet: the tab shows "coming soon"
   *  and refuses to enable it. */
  available: boolean
}
