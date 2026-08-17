import { supabaseAdmin } from '@/lib/tiktok/server'
import { getSiteOrigin } from '@/lib/site-url'
import { decryptValue, encryptValue, isEncrypted, tailOf } from './crypto'
import { resolveTitle } from './display-title'
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

/** Webhook URL the merchant registers with the provider — one per gateway,
 *  platform-wide, with no store id in it. It needs none: the payload carries
 *  our `orders.id`, and the order carries `store_id`. Reading that reference is
 *  not trusting it — a forged one still fails the signature check. */
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

  // Checkout still falls back to COD, but log the reason — an empty result and
  // a failed query are otherwise indistinguishable.
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
  /** The store's settlement currency, re-checked here because the settings
   *  tab's greying-out is a client-side courtesy a crafted POST ignores. */
  currency: string
  enabled: boolean
  /** Only the fields the merchant actually submitted. */
  values: Values
  /** Secret keys to explicitly delete — a blank input means "unchanged", so
   *  removing a stored secret needs its own signal. */
  clear?: string[]
}

export type SaveResult = { ok: true; state: GatewayState } | { ok: false; error: string }

/** Tabby has no separate test host — the key prefix is the entire distinction,
 *  so a test key silently points live traffic at an account that never settles. */
const TEST_KEY = /^(sk|pk)_test_/i

export async function saveGateway(input: SaveInput): Promise<SaveResult> {
  const { storeId, merchantId, gateway, currency, enabled, values, clear = [] } = input
  const def = getDefinition(gateway)

  // Unlike the guards below, this applies even when not going live: a test key
  // is never usable here, so accepting it only fails later and further away.
  const testField = def.fields.find(f => {
    const submitted = values[f.key]
    return typeof submitted === 'string' && TEST_KEY.test(submitted.trim())
  })

  if (testField) {
    return {
      ok: false,
      error: `${testField.labelEn} looks like a test key. This platform runs against live APIs only.`,
    }
  }

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
      // An absent or blank secret means "leave what's stored" — the merchant
      // never sees these values, so they cannot retype them on every save.
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

/** What the storefront may know about one payment option. This crosses to the
 *  browser, so it carries no credentials and no row data. */
export type OfferedGateway = {
  id: GatewayId
  /** The provider's own brand name — used for the logo's alt text. */
  label: string
  emoji: string
  /** What the customer actually reads, per language: the merchant's title when
   *  they set one, otherwise `label`. Resolved here so the fallback lives in one
   *  place and the storefront only has to pick a language. */
  titleEn: string
  titleAr: string
  /** Non-secret settings only — widget public keys and the like. */
  publicConfig: Values
}

/** Gateways a customer may actually pay with on this store, in registry order:
 *  enabled, settling in the store's currency, and backed by an adapter. Safe to
 *  expose — never touches `credentials`. */
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
        titleEn: resolveTitle(mod.definition, publicConfig, 'en'),
        titleAr: resolveTitle(mod.definition, publicConfig, 'ar'),
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
