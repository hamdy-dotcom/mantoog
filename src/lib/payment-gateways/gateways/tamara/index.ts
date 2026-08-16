import type { GatewayModule } from '../../types'
import { definition } from './definition'
import { adapter } from './adapter'

export const tamara: GatewayModule = { definition, adapter }
