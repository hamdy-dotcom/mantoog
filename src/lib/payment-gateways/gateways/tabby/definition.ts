import type { GatewayDefinition } from '../../types'

/** Tabby — BNPL (pay in 4).
 *
 *  `merchant_code` is required, not optional: it is sent as the X-Merchant-Code
 *  header and webhooks are registered per merchant_code + secret key pair.
 *
 *  There is no webhook field here on purpose. Tabby does not issue a webhook
 *  secret — it is an auth header value the merchant chooses when registering
 *  the webhook through Tabby's API, so Phase 2 generates one and writes it into
 *  `credentials` itself.
 */
export const definition: GatewayDefinition = {
  id: 'tabby',
  label: 'Tabby',
  emoji: '🐱',
  docsUrl: 'https://docs.tabby.ai',
  supportedCurrencies: ['SAR', 'AED', 'KWD', 'BHD', 'QAR'],
  // We register the endpoint through Tabby's API in Phase 2, so there is no
  // URL for the merchant to copy anywhere.
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
      // Publishable by design — it renders the Tabby promo snippet in the
      // customer's browser, so it stays in public_config rather than encrypted.
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
