import type { GatewayDefinition } from '../../types'

/** Tabby — BNPL (pay in 4).
 *
 *  No webhook secret field, and none is possible: Tabby's webhook is entirely
 *  unauthenticated, so the callback proves nothing about its origin. The
 *  adapter's `finalize` re-reads the payment, and that read settles state.
 *
 *  No region field either — Tabby serves every market from one host.
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
      // Publishable: it renders the Tabby promo snippet in the browser.
      key: 'public_key',
      labelEn: 'Merchant Public Key',
      labelAr: 'المفتاح العام للتاجر',
      secret: false,
      required: true,
      type: 'text',
      placeholder: 'pk_…',
      helpEn: 'Merchant dashboard → API keys. Use the live key — test keys are rejected.',
      helpAr: 'لوحة التاجر ← مفاتيح API. استخدم المفتاح المباشر — مفاتيح الاختبار مرفوضة.',
    },
    {
      key: 'secret_key',
      labelEn: 'Merchant Secret Key',
      labelAr: 'المفتاح السري للتاجر',
      secret: true,
      required: true,
      type: 'text',
      placeholder: 'sk_…',
      helpEn: 'Merchant dashboard → API keys. Live key only, server-side — never exposed to the browser.',
      helpAr: 'لوحة التاجر ← مفاتيح API. المفتاح المباشر فقط، ويُستخدم على الخادم ولا يظهر في المتصفح.',
    },
  ],
}
