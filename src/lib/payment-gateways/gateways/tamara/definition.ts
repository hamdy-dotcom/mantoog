import type { GatewayDefinition } from '../../types'

/** Tamara — BNPL (pay later / instalments).
 *
 *  Three credentials: API Token, Notification Token and Public Key. No region
 *  and no environment field: Tamara has one production host and this platform
 *  runs live only, so the adapter pins `api.tamara.co`. The sandbox host exists
 *  (`api-sandbox.tamara.co`) but is deliberately unreachable from here.
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
    {
      // Sent on every checkout, but the customer picks the real plan on
      // Tamara's own page — so this is a starting point, not a constraint.
      // Optional: defaults to instalments when left blank.
      key: 'payment_type',
      labelEn: 'Default Payment Type',
      labelAr: 'نوع الدفع الافتراضي',
      secret: false,
      required: false,
      type: 'select',
      options: [
        { value: 'PAY_BY_INSTALMENTS', label: 'Pay in instalments' },
        { value: 'PAY_LATER', label: 'Pay later (single payment)' },
        { value: 'PAY_NOW', label: 'Pay now' },
        { value: 'PAY_NEXT_MONTH', label: 'Pay next month' },
      ],
      helpEn: 'Customers choose their own plan on Tamara. Leave blank unless your account needs a specific type — an unsupported one is rejected.',
      helpAr: 'يختار العميل خطته على صفحة Tamara. اتركه فارغاً إلا إذا كان حسابك يتطلب نوعاً محدداً — النوع غير المدعوم يُرفض.',
    },
    {
      key: 'instalments',
      labelEn: 'Number of Instalments',
      labelAr: 'عدد الأقساط',
      secret: false,
      // Only meaningful for PAY_BY_INSTALMENTS, so it cannot be required.
      required: false,
      type: 'number',
      placeholder: '4',
      helpEn: 'Instalment plans only. Tamara supports 2–12; leave blank for other types.',
      helpAr: 'للأقساط فقط. تدعم Tamara من ٢ إلى ١٢؛ اتركه فارغاً للأنواع الأخرى.',
    },
  ],
}
