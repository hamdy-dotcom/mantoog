import type { GatewayDefinition, GatewayField, GatewayModule } from './types'

/** The name a customer sees for a gateway at checkout.
 *
 *  Merchants often want their own wording — "تقسيط" rather than "Tamara", or a
 *  plain "Credit card" instead of a processor nobody recognises. Both are
 *  optional; a blank one falls back to the provider's own brand label. */

const TITLE_EN = 'title_en'
const TITLE_AR = 'title_ar'

function titleFields(defaultLabel: string): GatewayField[] {
  return [
    {
      key: TITLE_EN,
      labelEn: 'Checkout Title (English)',
      labelAr: 'اسم الخيار (إنجليزي)',
      secret: false,
      required: false,
      type: 'text',
      // Shows the merchant exactly what a blank field will produce.
      placeholder: defaultLabel,
      helpEn: 'Shown to customers on the product page. Leave blank to use the provider name.',
      helpAr: 'يظهر للعملاء في صفحة المنتج. اتركه فارغاً لاستخدام اسم المزوّد.',
    },
    {
      key: TITLE_AR,
      labelEn: 'Checkout Title (Arabic)',
      labelAr: 'اسم الخيار (عربي)',
      secret: false,
      required: false,
      type: 'text',
      placeholder: defaultLabel,
      helpEn: 'Shown on Arabic storefronts. Leave blank to use the provider name.',
      helpAr: 'يظهر في المتاجر العربية. اتركه فارغاً لاستخدام اسم المزوّد.',
    },
  ]
}

/** Prepends the title fields to a gateway's own. Applied centrally in the
 *  registry so a new gateway cannot forget them — everything downstream reads
 *  `def.fields`, so the settings form, save and masking all follow for free. */
export function withTitleFields(mod: GatewayModule): GatewayModule {
  const def: GatewayDefinition = {
    ...mod.definition,
    fields: [...titleFields(mod.definition.label), ...mod.definition.fields],
  }
  return { ...mod, definition: def }
}

/** The merchant's title for one language, or the provider's label when unset. */
export function resolveTitle(
  def: GatewayDefinition,
  publicConfig: Record<string, unknown>,
  lang: 'en' | 'ar',
): string {
  const key = lang === 'ar' ? TITLE_AR : TITLE_EN
  return String(publicConfig?.[key] ?? '').trim() || def.label
}
