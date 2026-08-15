import { supabaseAdmin } from '@/lib/tiktok/server'
import { getSiteOrigin } from '@/lib/site-url'
import { decryptValue, encryptValue, isEncrypted, tailOf } from './crypto'
import { getDefinition, getGateway, supportsCurrency } from './registry'
import type {
  GatewayDefinition,
  GatewayId,
  GatewayState,
  ResolvedConfig,
  SecretState,
} from './types'

/** The ONLY module that touches `store_payment_gateways`. Everything else goes
 *  through these helpers so the merge rule and masking can't be bypassed. */

const TABLE = 'store_payment_gateways'

type Values = Record<string, unknown>

export type GatewayRow = {
  store_id: string
  gateway: GatewayId
  merchant_id: string
  enabled: boolean
  public_config: Values
  credentials: Values
  status: string
}

const COLUMNS = 'store_id, gateway, merchant_id, enabled, public_config, credentials, status'

/** Webhook URL the merchant registers with the provider — one per gateway for
 *  the whole platform, with no store id in it.
 *
 *  It doesn't need one: every session is created with our `orders.id` as the
 *  provider's merchant reference, so the payload identifies the order, and the
 *  order carries `store_id`. Parsing the body to find that reference is not the
 *  same as trusting it — it only selects which secret to verify against, and a
 *  forged reference still fails the signature check. */
export function webhookUrlFor(gateway: GatewayId): string {
  return `${getSiteOrigin()}/api/payments/${gateway}/webhook`
}

/** Where the customer's browser lands after the provider is done. Per-order,
 *  because this route has no signed payload — it needs the order to know which
 *  product page to send them back to. */
export function returnUrlFor(gateway: GatewayId, orderId: string): string {
  return `${getSiteOrigin()}/api/payments/${gateway}/return/${orderId}`
}

export async function loadRows(storeId: string): Promise<GatewayRow[]> {
  const { data, error } = await supabaseAdmin.from(TABLE).select(COLUMNS).eq('store_id', storeId)

  // An empty result and a failed query both used to look like "no gateways", so
  // a missing table or a broken key silently degraded every store to COD-only
  // with nothing in the logs. Checkout still falls back to COD — that is the
  // right behaviour — but the reason is now visible.
  if (error) {
    console.error('[payments/store] gateway lookup failed', { storeId, message: error.message })
    return []
  }

  return (data ?? []) as GatewayRow[]
}

/** Row → client-safe state. Secret values become `{ set, tail }` and never
 *  leave the server in readable form. */
export function toState(def: GatewayDefinition, row: GatewayRow | undefined): GatewayState {
  const publicValues = row?.public_config ?? {}
  const secretValues = row?.credentials ?? {}

  const secrets: Record<string, SecretState> = {}
  const publicConfig: Values = {}

  for (const field of def.fields) {
    if (field.secret) {
      const stored = secretValues[field.key]
      secrets[field.key] = { set: isEncrypted(stored), tail: tailOf(stored) }
    } else if (publicValues[field.key] !== undefined) {
      publicConfig[field.key] = publicValues[field.key]
    }
  }

  return {
    gateway: def.id,
    enabled: row?.enabled ?? false,
    status: (row?.status as GatewayState['status']) ?? 'unverified',
    publicConfig,
    secrets,
    webhookUrl: webhookUrlFor(def.id),
    available: !!getGateway(def.id).adapter,
  }
}

export type SaveInput = {
  storeId: string
  merchantId: string
  gateway: GatewayId
  /** The store's settlement currency, checked server-side before a gateway can
   *  go live. The settings tab greys out unsupported gateways, but that is a
   *  client-side courtesy — a crafted POST would otherwise sail past it. */
  currency: string
  enabled: boolean
  /** Only the fields the merchant actually submitted. */
  values: Values
  /** Secret keys to explicitly delete — a blank input means "unchanged", so
   *  removing a stored secret needs its own signal. */
  clear?: string[]
}

export type SaveResult = { ok: true; state: GatewayState } | { ok: false; error: string }

export async function saveGateway(input: SaveInput): Promise<SaveResult> {
  const { storeId, merchantId, gateway, currency, enabled, values, clear = [] } = input
  const def = getDefinition(gateway)

  // Both guards apply only to going live. Saving credentials for a gateway you
  // can't yet use is harmless, and blocking it would strand anyone mid-setup.
  if (enabled && !getGateway(gateway).adapter) {
    return { ok: false, error: `${def.label} is not available yet` }
  }

  if (enabled && !supportsCurrency(def, currency)) {
    return { ok: false, error: `${def.label} does not settle in ${currency}` }
  }

  const { data: existing } = await supabaseAdmin
    .from(TABLE)
    .select(COLUMNS)
    .eq('store_id', storeId)
    .eq('gateway', gateway)
    .maybeSingle<GatewayRow>()

  const publicConfig: Values = { ...(existing?.public_config ?? {}) }
  const credentials: Values = { ...(existing?.credentials ?? {}) }

  for (const field of def.fields) {
    const submitted = values[field.key]

    if (field.secret) {
      // Merge rule: an absent or blank secret means "leave what's stored".
      // Without this, saving any other setting would wipe every secret the
      // merchant didn't retype — and they never see them to retype.
      if (typeof submitted === 'string' && submitted.trim()) {
        credentials[field.key] = encryptValue(submitted.trim())
      }
      continue
    }

    // Non-secret fields are visible in the form, so a blank submission is a
    // real edit and clears the value.
    if (Object.prototype.hasOwnProperty.call(values, field.key)) {
      publicConfig[field.key] = typeof submitted === 'string' ? submitted.trim() : submitted
    }
  }

  for (const key of clear) {
    if (def.fields.some(f => f.key === key && f.secret)) delete credentials[key]
  }

  // A gateway can only go live once every required field is actually present —
  // stored or just submitted. Otherwise it fails at charge time instead.
  if (enabled) {
    const missing = def.fields
      .filter(f => f.required)
      .filter(f => {
        const value = f.secret ? credentials[f.key] : publicConfig[f.key]
        return value === undefined || value === null || value === ''
      })
      .map(f => f.labelEn)

    if (missing.length) {
      return { ok: false, error: `Missing required field(s): ${missing.join(', ')}` }
    }
  }

  const { error } = await supabaseAdmin.from(TABLE).upsert(
    {
      store_id: storeId,
      gateway,
      merchant_id: merchantId,
      enabled,
      public_config: publicConfig,
      credentials,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'store_id,gateway' },
  )

  if (error) return { ok: false, error: error.message }

  const rows = await loadRows(storeId)
  return { ok: true, state: toState(def, rows.find(r => r.gateway === gateway)) }
}

/** What the storefront may know about one payment option. Deliberately narrow:
 *  this crosses to the browser, so it carries no credentials and no row data. */
export type OfferedGateway = {
  id: GatewayId
  label: string
  emoji: string
  /** Non-secret settings only — widget public keys and the like. */
  publicConfig: Values
}

/** Gateways a customer may actually pay with on this store, in registry order.
 *
 *  Three filters, all of which must pass:
 *    - the merchant enabled it
 *    - it settles in the store's currency (an unsupported one fails at the
 *      provider, after the customer has already committed)
 *    - it has an adapter, so there is behaviour behind the button
 *
 *  Safe to expose: never touches `credentials`. */
export async function getEnabledGateways(
  storeId: string,
  currency: string,
): Promise<OfferedGateway[]> {
  const rows = await loadRows(storeId)

  return rows
    .filter(row => row.enabled)
    .map(row => ({ row, mod: getGateway(row.gateway) }))
    .filter(({ mod }) => !!mod.adapter && supportsCurrency(mod.definition, currency))
    .map(({ row, mod }) => {
      // Whitelist by field definition rather than spreading public_config, so a
      // stray key written by an older shape can't leak into the page.
      const publicConfig: Values = {}
      for (const field of mod.definition.fields) {
        if (!field.secret && row.public_config?.[field.key] !== undefined) {
          publicConfig[field.key] = row.public_config[field.key]
        }
      }

      return {
        id: mod.definition.id,
        label: mod.definition.label,
        emoji: mod.definition.emoji,
        publicConfig,
      }
    })
}

/** Server-only: public settings merged with DECRYPTED secrets, for session
 *  creation and webhook verification. Never return this to a client. */
export async function resolveConfig(
  storeId: string,
  gateway: GatewayId,
): Promise<ResolvedConfig | null> {
  const rows = await loadRows(storeId)
  const row = rows.find(r => r.gateway === gateway)
  if (!row || !row.enabled) return null

  const values: Values = { ...row.public_config }

  for (const [key, value] of Object.entries(row.credentials ?? {})) {
    if (isEncrypted(value)) values[key] = decryptValue(value)
  }

  return { values }
}

/** Store currency changed → the merchant's gateway account may no longer be
 *  provisioned for it, so the connection is no longer known-good. */
export async function markUnverified(storeId: string): Promise<void> {
  await supabaseAdmin
    .from(TABLE)
    .update({ status: 'unverified', updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
}
