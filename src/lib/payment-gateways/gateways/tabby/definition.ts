import type { GatewayDefinition } from '../../types'

/** Tabby — BNPL (pay in 4).
 *
 *  `merchant_code` is required: it is sent as the X-Merchant-Code header, and
 *  webhooks are registered per merchant_code + secret key pair.
 *
 *  No webhook field on purpose — Tabby issues no webhook secret. It is an auth
 *  header value we choose when registering the webhook through their API.
 */
export const definition: GatewayDefinition = {
  id: 'tabby',
  label: 'Tabby',
  emoji: '🐱',
  docsUrl: 'https://docs.tabby.ai',
  supportedCurrencies: ['SAR', 'AED', 'KWD', 'BHD', 'QAR'],
  // We register the endpoint through Tabby's API — no URL to copy.
  webhookSetup: 'api',

  fields: [
    {
      key: 'merchant_code',
      labelEn: 'Merchant Code',
      labelAr: 'كود التاجر',
      secret: false,
      required: true,
      type: 'text',
      helpEn: 'Sent as the X-Merchant-Code header on every request.',
      helpAr: 'يُرسل كترويسة X-Merchant-Code مع كل طلب.',
    },
    {
      key: 'region',
      labelEn: 'Region',
      labelAr: 'المنطقة',
      secret: false,
      required: true,
      type: 'select',
      options: [
        { value: 'SA', label: 'Saudi Arabia' },
        { value: 'AE', label: 'UAE / Kuwait / other' },
      ],
      helpEn: 'Selects the API host: api.tabby.sa for KSA, api.tabby.ai elsewhere.',
      helpAr: 'يحدد عنوان الـ API: api.tabby.sa للسعودية، و api.tabby.ai لغيرها.',
    },
    {
      // Publishable: it renders the Tabby promo snippet in the browser.
      key: 'public_key',
      labelEn: 'Merchant Public Key',
      labelAr: 'المفتاح العام للتاجر',
      secret: false,
      required: true,
      type: 'text',
      placeholder: 'pk_test_… / pk_…',
      helpEn: 'Merchant dashboard → API keys. Used by the storefront widget.',
      helpAr: 'لوحة التاجر ← مفاتيح API. يستخدمه المتجر لعرض الودجت.',
    },
    {
      key: 'secret_key',
      labelEn: 'Merchant Secret Key',
      labelAr: 'المفتاح السري للتاجر',
      secret: true,
      required: true,
      type: 'text',
      placeholder: 'sk_test_… / sk_…',
      helpEn: 'Merchant dashboard → API keys. Server-side only — never exposed to the browser.',
      helpAr: 'لوحة التاجر ← مفاتيح API. يُستخدم على الخادم فقط ولا يظهر في المتصفح.',
    },
  ],
}
