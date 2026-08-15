import type { GatewayModule } from '../../types'
import { definition } from './definition'
import { adapter } from './adapter'

export const paytabs: GatewayModule = { definition, adapter }
