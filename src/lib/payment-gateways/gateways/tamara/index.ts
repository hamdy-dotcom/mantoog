import type { GatewayModule } from '../../types'
import { definition } from './definition'

/** `adapter` lands in Phase 2 (./adapter.ts) — callers guard on its absence. */
export const tamara: GatewayModule = { definition }
