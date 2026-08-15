import type { GatewayDefinition, GatewayId, GatewayModule } from './types'
import { paytabs } from './gateways/paytabs'
import { tabby } from './gateways/tabby'
import { tamara } from './gateways/tamara'

/** Every supported gateway. Adding a fourth is one entry here plus its folder —
 *  no migration, no new routes, no new form code. */
export const GATEWAYS: Record<GatewayId, GatewayModule> = {
  paytabs,
  tabby,
  tamara,
}

export const GATEWAY_IDS = Object.keys(GATEWAYS) as GatewayId[]

/** Definitions only — this is what the settings tab (a client component) uses,
 *  so nothing server-side or secret is pulled into the browser bundle. */
export const GATEWAY_DEFINITIONS: GatewayDefinition[] = GATEWAY_IDS.map(
  id => GATEWAYS[id].definition,
)

export function isGatewayId(value: string): value is GatewayId {
  return value in GATEWAYS
}

export function getGateway(id: GatewayId): GatewayModule {
  return GATEWAYS[id]
}

export function getDefinition(id: GatewayId): GatewayDefinition {
  return GATEWAYS[id].definition
}

/** A gateway is offerable only if it settles in the store's currency. */
export function supportsCurrency(def: GatewayDefinition, currency: string): boolean {
  return def.supportedCurrencies.includes(currency.toUpperCase())
}
