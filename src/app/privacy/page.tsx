'use client'

import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'

const PRIVACY_EMAIL = 'privacy@mantoog.com'
const LAST_UPDATED = 'June 3, 2026'

type Section = { title: string; paragraphs?: string[]; bullets?: string[] }

type PrivacyContent = {
  pageTitle: string
  lastUpdated: string
  backHome: string
  sections: Section[]
}

const content: Record<'en' | 'ar', PrivacyContent> = {
  en: {
    pageTitle: 'Privacy Policy',
    lastUpdated: `Last updated: ${LAST_UPDATED}`,
    backHome: '← Back to Mantoog',
    sections: [
      {
        title: '1. Introduction',
        paragraphs: [
          'Mantoog (“we”, “us”, “our”) provides an e-commerce platform for merchants in MENA and beyond. This Privacy Policy explains what information we collect, how we use it, and your choices — including when you connect a TikTok advertising account.',
          'By using Mantoog, you agree to this policy. If you do not agree, please do not use our services.',
        ],
      },
      {
        title: '2. Information we collect',
        paragraphs: ['We collect the following categories of data:'],
        bullets: [
          'Merchant account information — name, email address, login credentials, and account preferences when you register or sign in.',
          'Store data — store name, branding, product listings, landing pages, orders, and customer order details submitted through your storefront.',
          'Usage information — how you interact with the platform, including pages visited and general analytics needed to operate and improve our services.',
          'TikTok advertising data (when you connect TikTok) — ad performance metrics (spend, impressions, clicks, conversions, video views, etc.), campaign and ad information, pixel and conversion events, ad comments, and lead-form submissions that may contain personal information such as names, phone numbers, and email addresses.',
        ],
      },
      {
        title: '3. TikTok advertising connection',
        paragraphs: [
          'Merchants connect their TikTok ad account through TikTok\'s official authorization channels. You choose which advertiser account to connect and can disconnect at any time.',
          'Mantoog accesses your TikTok data only on your behalf to provide features you use, including: performance reporting, campaign management, pixel and conversion tracking, ad comment management, and lead-form retrieval.',
          'We do not sell your TikTok data. We do not use it to advertise Mantoog to your customers. We only use it to deliver the features you request as a merchant.',
        ],
      },
      {
        title: '4. Lead data and personal information (PII)',
        paragraphs: [
          'When you use TikTok lead-generation features, lead-form submissions may include personal information (for example: full name, phone number, email address, and any custom fields configured in your TikTok form).',
          'Lead records are stored securely on our servers and are kept within your merchant account so you can access them.',
          'Lead data is used only to let you — the merchant — view, manage, and follow up on leads generated from your own TikTok advertising campaigns. Mantoog does not use lead PII for its own marketing or share it with unrelated third parties.',
          'We protect lead data with industry-standard safeguards so that only your authorized account can access your leads.',
        ],
      },
      {
        title: '5. How we use information generally',
        bullets: [
          'Provide, maintain, and improve the Mantoog platform and dashboard.',
          'Process orders and storefront activity for your store.',
          'Display TikTok ads performance and management tools you request.',
          'Send service-related communications (e.g. account or security notices).',
          'Comply with legal obligations and prevent fraud or abuse.',
        ],
      },
      {
        title: '6. Data retention and deletion',
        paragraphs: [
          'We retain data for as long as your account is active and as needed to provide services, comply with law, or resolve disputes.',
          'You can disconnect your TikTok account at any time from the Mantoog dashboard or through TikTok\'s own account settings. Disconnecting stops new TikTok data from being collected.',
          'To request deletion of your merchant account data, TikTok connection data, or stored lead records, contact us at the email below. We will process verified requests within a reasonable timeframe, subject to legal retention requirements.',
        ],
      },
      {
        title: '7. Third-party services',
        paragraphs: [
          'We work with TikTok when you choose to connect your advertising account, so that we can provide the TikTok-related features you request.',
          'We also rely on trusted third-party service providers for hosting and infrastructure. These providers may process limited data on our behalf to help us operate Mantoog.',
          'We share only what is necessary to deliver our services. Third parties are required to protect your information in line with applicable law and our agreements with them.',
        ],
      },
      {
        title: '8. Security',
        paragraphs: [
          'We take reasonable measures designed to protect your information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
        ],
      },
      {
        title: '9. Your rights',
        paragraphs: [
          'Depending on your location, you may have rights to access, correct, delete, or restrict certain processing of your personal data. Merchants can update account details in the dashboard. For other requests, contact us using the details below.',
        ],
      },
      {
        title: '10. Contact us',
        paragraphs: [
          'For privacy questions, data access requests, or deletion requests, contact:',
          `Email: ${PRIVACY_EMAIL}`,
          'We will respond to legitimate privacy requests as soon as practicable.',
        ],
      },
      {
        title: '11. Changes to this policy',
        paragraphs: [
          'We may update this Privacy Policy from time to time. The “Last updated” date at the top will reflect the latest version. Continued use of Mantoog after changes constitutes acceptance of the updated policy.',
        ],
      },
    ],
  },
  ar: {
    pageTitle: 'سياسة الخصوصية',
    lastUpdated: `آخر تحديث: ${LAST_UPDATED}`,
    backHome: '→ العودة إلى Mantoog',
    sections: [
      {
        title: '1. مقدمة',
        paragraphs: [
          'تقدّم Mantoog («نحن») منصة تجارة إلكترونية للتجار في منطقة الشرق الأوسط وشمال أفريقيا وخارجها. توضّح سياسة الخصوصية هذه المعلومات التي نجمعها وكيف نستخدمها وخياراتك — بما في ذلك عند ربط حساب TikTok للإعلانات.',
          'باستخدامك لـ Mantoog، فإنك توافق على هذه السياسة. إذا لم توافق، يرجى عدم استخدام خدماتنا.',
        ],
      },
      {
        title: '2. المعلومات التي نجمعها',
        paragraphs: ['نجمع الفئات التالية من البيانات:'],
        bullets: [
          'معلومات حساب التاجر — الاسم والبريد الإلكتروني وبيانات تسجيل الدخول وتفضيلات الحساب عند التسجيل أو الدخول.',
          'بيانات المتجر — اسم المتجر والعلامة التجارية وقوائم المنتجات وصفحات الهبوط والطلبات وتفاصيل طلبات العملاء المقدّمة عبر متجرك.',
          'معلومات الاستخدام — كيفية تفاعلك مع المنصة، بما في ذلك الصفحات التي تزورها وتحليلات عامة نحتاجها لتشغيل خدماتنا وتحسينها.',
          'بيانات إعلانات TikTok (عند الربط) — مقاييس أداء الإعلانات (الإنفاق، الظهور، النقرات، التحويلات، مشاهدات الفيديو، إلخ)، ومعلومات الحملات والإعلانات، وأحداث البكسل والتحويل، وتعليقات الإعلانات، وطلبات نماذج العملاء المحتملين التي قد تتضمن معلومات شخصية مثل الأسماء وأرقام الهواتف وعناوين البريد الإلكتروني.',
        ],
      },
      {
        title: '3. ربط إعلانات TikTok',
        paragraphs: [
          'يربط التجار حساب TikTok الإعلاني الخاص بهم عبر قنوات التفويض الرسمية من TikTok. أنت تختار حساب المعلن الذي تريد ربطه ويمكنك قطع الاتصال في أي وقت.',
          'تصل Mantoog إلى بيانات TikTok الخاصة بك فقط نيابةً عنك لتقديم الميزات التي تستخدمها، بما في ذلك: تقارير الأداء، وإدارة الحملات، وتتبع البكسل والتحويلات، وإدارة تعليقات الإعلانات، واسترجاع نماذج العملاء المحتملين.',
          'لا نبيع بيانات TikTok الخاصة بك. لا نستخدمها للإعلان عن Mantoog لعملائك. نستخدمها فقط لتقديم الميزات التي تطلبها كتاجر.',
        ],
      },
      {
        title: '4. بيانات العملاء المحتملين والمعلومات الشخصية (PII)',
        paragraphs: [
          'عند استخدام ميزات توليد العملاء المحتملين في TikTok، قد تتضمن طلبات النماذج معلومات شخصية (مثل: الاسم الكامل، رقم الهاتف، البريد الإلكتروني، وأي حقول مخصّصة في نموذج TikTok).',
          'تُخزَّن سجلات العملاء المحتملين بشكل آمن على خوادمنا وتبقى ضمن حساب التاجر الخاص بك لتتمكن من الوصول إليها.',
          'تُستخدم بيانات العملاء المحتملين فقط لتمكينك — كتاجر — من عرض وإدارة ومتابعة العملاء المحتملين الناتجين عن حملاتك الإعلانية على TikTok. لا تستخدم Mantoog بيانات PII لأغراض تسويقية خاصة بها ولا تشاركها مع أطراف ثالثة غير ذات صلة.',
          'نحمي بيانات العملاء المحتملين بضمانات معيارية في المجال بحيث يمكن لحسابك المصرّح به فقط الوصول إلى عملائك المحتملين.',
        ],
      },
      {
        title: '5. كيف نستخدم المعلومات بشكل عام',
        bullets: [
          'تقديم المنصة ولوحة التحكم وصيانتها وتحسينها.',
          'معالجة الطلبات ونشاط المتجر.',
          'عرض أداء إعلانات TikTok وأدوات الإدارة التي تطلبها.',
          'إرسال اتصالات متعلقة بالخدمة (مثل إشعارات الحساب أو الأمان).',
          'الامتثال للالتزامات القانونية ومنع الاحتيال أو إساءة الاستخدام.',
        ],
      },
      {
        title: '6. الاحتفاظ بالبيانات والحذف',
        paragraphs: [
          'نحتفظ بالبيانات طالما حسابك نشط ووفق ما يلزم لتقديم الخدمات أو الامتثال للقانون أو تسوية النزاعات.',
          'يمكنك قطع اتصال حساب TikTok في أي وقت من لوحة تحكم Mantoog أو من إعدادات حسابك في TikTok. يوقف قطع الاتصال جمع بيانات TikTok الجديدة.',
          'لطلب حذف بيانات حساب التاجر أو اتصال TikTok أو سجلات العملاء المحتملين المخزّنة، تواصل معنا عبر البريد أدناه. نعالج الطلبات الموثّقة خلال فترة زمنية معقولة، مع مراعاة متطلبات الاحتفاظ القانونية.',
        ],
      },
      {
        title: '7. خدمات الأطراف الثالثة',
        paragraphs: [
          'نتعاون مع TikTok عندما تختار ربط حسابك الإعلاني، لتقديم ميزات TikTok التي تطلبها.',
          'كما نعتمد على مزوّدي خدمات خارجيين موثوقين للاستضافة والبنية التحتية. قد تعالج هذه الجهات بيانات محدودة نيابةً عنا لمساعدتنا في تشغيل Mantoog.',
          'نشارك فقط ما يلزم لتقديم خدماتنا. يُطلب من الأطراف الثالثة حماية معلوماتك وفق القانون المعمول به واتفاقياتنا معهم.',
        ],
      },
      {
        title: '8. الأمان',
        paragraphs: [
          'نتخذ تدابير معقولة لحماية معلوماتك. لا توجد طريقة نقل أو تخزين آمنة بالكامل، ولا يمكننا ضمان أمان مطلق.',
        ],
      },
      {
        title: '9. حقوقك',
        paragraphs: [
          'بحسب موقعك، قد يكون لك حقوق في الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها أو تقييد معالجتها. يمكن للتجار تحديث بيانات الحساب من لوحة التحكم. لطلبات أخرى، تواصل معنا عبر التفاصيل أدناه.',
        ],
      },
      {
        title: '10. تواصل معنا',
        paragraphs: [
          'لأسئلة الخصوصية أو طلبات الوصول إلى البيانات أو طلبات الحذف:',
          `البريد الإلكتروني: ${PRIVACY_EMAIL}`,
          'سنرد على طلبات الخصوصية المشروعة في أقرب وقت ممكن.',
        ],
      },
      {
        title: '11. تغييرات على هذه السياسة',
        paragraphs: [
          'قد نحدّث سياسة الخصوصية من وقت لآخر. يعكس تاريخ «آخر تحديث» في الأعلى أحدث نسخة. استمرارك في استخدام Mantoog بعد التغييرات يعني قبول السياسة المحدّثة.',
        ],
      },
    ],
  },
}

export default function PrivacyPage() {
  const { lang, dir, setLang } = useLang()
  const c = content[lang]

  return (
    <div dir={dir} className="min-h-screen bg-[#0f1117] text-[#c8cad4]">
      <header className="border-b border-[#2a2d35] bg-[#0f1117]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.svg" alt="Mantoog" className="h-8 w-8 object-contain" />
            <span className="text-white font-semibold text-sm">Mantoog</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang('ar')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                lang === 'ar' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] border border-[#2a2d35] hover:text-white'
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                lang === 'en' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] border border-[#2a2d35] hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{c.pageTitle}</h1>
          <p className="text-sm text-[#4a4e60]">{c.lastUpdated}</p>
        </div>

        <div className="space-y-8">
          {c.sections.map(section => (
            <section
              key={section.title}
              className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl px-5 py-5 md:px-6 md:py-6"
            >
              <h2 className="text-base font-semibold text-white mb-3">{section.title}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-[#8b8fa8] mb-3 last:mb-0">
                  {p.startsWith('Email:') || p.startsWith('البريد الإلكتروني:') ? (
                    <>
                      {p.split(':')[0]}:{' '}
                      <a href={`mailto:${PRIVACY_EMAIL}`} className="text-[#60a5fa] hover:underline">
                        {PRIVACY_EMAIL}
                      </a>
                    </>
                  ) : p.includes(PRIVACY_EMAIL) ? (
                    <>
                      {p.replace(PRIVACY_EMAIL, '')}
                      <a href={`mailto:${PRIVACY_EMAIL}`} className="text-[#60a5fa] hover:underline">
                        {PRIVACY_EMAIL}
                      </a>
                    </>
                  ) : (
                    p
                  )}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-2 space-y-2 list-disc ps-5 text-sm leading-relaxed text-[#8b8fa8]">
                  {section.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-[#2a2d35] flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm text-[#60a5fa] hover:underline">
            {c.backHome}
          </Link>
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-sm text-[#8b8fa8] hover:text-white transition-colors">
            {PRIVACY_EMAIL}
          </a>
        </div>
      </main>

      <footer className="border-t border-[#2a2d35] px-6 py-6 mt-4">
        <div className="max-w-3xl mx-auto text-center text-xs text-[#4a4e60]">
          © 2026 Mantoog. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
        </div>
      </footer>
    </div>
  )
}
