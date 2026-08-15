import type { GatewayDefinition } from '../../types'

/** Tamara — BNPL (pay later / instalments).
 *
 *  Tamara issues exactly three credentials: API Token, Notification Token and
 *  Public Key. There is no region field because Tamara has one production host.
 *
 *  Sandbox is on a separate host, and nothing stores which one to use — see the
 *  note on `GatewayField.key` in ../../types.ts. Tamara's adapter is the one
 *  case that will need that decision made; the other two gateways don't.
 */
export const definition: GatewayDefinition = {
  id: 'tamara',
  label: 'Tamara',
  emoji: '🌙',
  docsUrl: 'https://docs.tamara.co',
  supportedCurrencies: ['SAR', 'AED', 'KWD', 'BHD'],
  // Merchant pastes our URL into Partner Portal → Settings → Webhooks.
  webhookSetup: 'manual',

  fields: [
    {
      key: 'api_token',
      labelEn: 'API Token',
      labelAr: 'رمز الـ API',
      secret: true,
      required: true,
      type: 'text',
      helpEn: 'Merchant Portal → Settings → API. Sent as the Bearer token on every request.',
      helpAr: 'بوابة التاجر ← الإعدادات ← API. يُرسل كرمز Bearer مع كل طلب.',
    },
    {
      key: 'notification_token',
      labelEn: 'Notification Token',
      labelAr: 'رمز الإشعارات',
      secret: true,
      required: true,
      type: 'text',
      helpEn: 'Used to verify that incoming webhooks really came from Tamara.',
      helpAr: 'يُستخدم للتحقق من أن الإشعارات الواردة صادرة فعلاً من Tamara.',
    },
    {
      // Widget-only key, rendered in the customer's browser — kept in the clear.
      key: 'public_key',
      labelEn: 'Public Key',
      labelAr: 'المفتاح العام',
      secret: false,
      required: true,
      type: 'text',
      helpEn: 'Required to render the Tamara product and checkout widgets.',
      helpAr: 'مطلوب لعرض ودجت Tamara في صفحة المنتج والدفع.',
    },
  ],
}
