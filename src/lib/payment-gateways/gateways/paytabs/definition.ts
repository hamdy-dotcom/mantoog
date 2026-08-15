import type { GatewayDefinition } from '../../types'

/** PayTabs — hosted payment page / PT2 server-to-server APIs. Profile ID +
 *  Server Key is all a web integration needs; the Client Key is omitted because
 *  PayTabs documents it as mobile-SDK-only. */
export const definition: GatewayDefinition = {
  id: 'paytabs',
  label: 'PayTabs',
  emoji: '💳',
  docsUrl: 'https://docs.paytabs.com',
  supportedCurrencies: ['EGP', 'SAR', 'AED', 'USD'],
  webhookSetup: 'manual',

  fields: [
    {
      key: 'profile_id',
      labelEn: 'Profile ID',
      labelAr: 'معرّف الملف الشخصي',
      secret: false,
      required: true,
      type: 'text',
      placeholder: '123456',
      helpEn: 'Merchant Dashboard → Profile',
      helpAr: 'لوحة التاجر ← الملف الشخصي',
    },
    {
      key: 'region',
      labelEn: 'Region',
      labelAr: 'المنطقة',
      secret: false,
      required: true,
      type: 'select',
      // Values map to regional base URLs inside adapter.ts.
      options: [
        { value: 'ARE', label: 'United Arab Emirates' },
        { value: 'SAU', label: 'Saudi Arabia' },
        { value: 'EGY', label: 'Egypt' },
        { value: 'OMN', label: 'Oman' },
        { value: 'JOR', label: 'Jordan' },
        { value: 'KWT', label: 'Kuwait' },
        { value: 'IRQ', label: 'Iraq' },
        { value: 'GLOBAL', label: 'Global' },
      ],
      helpEn: 'Must match your PayTabs account region — a wrong region fails as an authentication error, not a routing one.',
      helpAr: 'يجب أن تطابق منطقة حسابك في PayTabs — المنطقة الخاطئة تظهر كخطأ مصادقة وليس كخطأ في التوجيه.',
    },
    {
      key: 'server_key',
      labelEn: 'Server Key',
      labelAr: 'مفتاح الخادم',
      secret: true,
      required: true,
      type: 'text',
      placeholder: 'SXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX',
      helpEn: 'Dashboard → Developers → API Keys → Key Management',
      helpAr: 'لوحة التحكم ← المطوّرون ← مفاتيح API ← إدارة المفاتيح',
    },
  ],
}
