'use client'
import { useParams } from 'next/navigation'
import FashionTheme from '@/components/landing/FashionTheme'
import BeautyTheme from '@/components/landing/BeautyTheme'
import HomeTheme from '@/components/landing/HomeTheme'

const dummyStore = {
  name: 'متجر تجريبي',
  currency: 'SAR',
  primary_color: '#3b82f6',
  language: 'ar',
  theme: 'classic',
  show_quantity: false,
  show_note: false,
  address_mode: 'text',
  location_required: false,
  static_shipping_cost: 0,
  shipping_type: 'static',
}

const dummyProduct = {
  id: 'preview-123',
  title: 'منتج تجريبي رائع',
  price: 199,
  compare_at_price: 299,
  images: [],
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  colors: [
    { name: 'أسود', hex: '#000000' },
    { name: 'أبيض', hex: '#ffffff' },
    { name: 'رمادي', hex: '#9ca3af' },
  ],
  specs: null,
  variants: ['30ml', '50ml'],
}

const dummyLandingPage = {
  headline: 'جودة استثنائية بسعر لا يُصدق',
  subheadline: 'منتج مصنوع من أجود المواد لضمان تجربة لا مثيل لها',
  cta_text: 'اطلب الآن',
  trust_text: 'ضمان استرداد 14 يوم',
  urgency_text: 'الكمية محدودة — اطلب الآن!',
}

const dummyBenefits = [
  'جودة عالية ومتانة استثنائية',
  'تصميم أنيق يناسب جميع الأذواق',
  'سهل الاستخدام ومريح جداً',
  'ضمان سنة كاملة على المنتج',
]

const dummyM = {
  dir: 'rtl',
  cta: 'اطلب الآن 🚀',
  ctaFree: 'اطلب الآن والتوصيل مجاني 🚀',
  namePlaceholder: 'الاسم',
  phonePlaceholder: '05xxxxxxxx',
  qtyLabel: 'الكمية',
}

export default function ThemePreviewPage() {
  const params = useParams()
  const theme = (params.theme as string) || 'classic'

  const props = {
    store: { ...dummyStore, theme },
    product: dummyProduct,
    landingPage: dummyLandingPage,
    sections: {},
    images: [] as string[],
    benefits: dummyBenefits,
    shippingCost: 0,
    submitting: false,
    formError: '',
    m: dummyM,
    onSubmit: () => {},
  }

  if (theme === 'fashion') return <FashionTheme {...props} />
  if (theme === 'beauty') return <BeautyTheme {...props} />
  if (theme === 'home') return <HomeTheme {...props} />
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, Arial, sans-serif', color: '#111' }}>
      <div style={{ background: '#ef4444', color: '#fff', padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
        🔥 الكمية محدودة — اطلب الآن!
      </div>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>
        <div style={{ background: '#f3f4f6', borderRadius: 12, aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, marginBottom: 16 }}>📦</div>
        <span style={{ background: '#f3f4f6', fontSize: 11, padding: '2px 8px', borderRadius: 99, color: '#555' }}>الأكثر مبيعاً</span>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0', lineHeight: 1.3 }}>جودة استثنائية بسعر لا يُصدق</h1>
        <p style={{ fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 1.5 }}>منتج مصنوع من أجود المواد لضمان تجربة لا مثيل لها</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 26, fontWeight: 800 }}>199 SAR</span>
          <span style={{ fontSize: 15, color: '#aaa', textDecoration: 'line-through' }}>299 SAR</span>
          <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>33% خصم</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[{ v: '00', l: 'أيام' }, { v: '12', l: 'ساعات' }, { v: '47', l: 'دقائق' }, { v: '33', l: 'ثواني' }].map((t, i) => (
            <div key={i} style={{ flex: 1, background: '#1f2937', color: '#fff', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{t.v}</div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>{t.l}</div>
            </div>
          ))}
        </div>
        {['جودة عالية ومتانة استثنائية', 'تصميم أنيق يناسب جميع الأذواق', 'سهل الاستخدام ومريح جداً'].map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 14 }}>
            <span>✅</span><span>{b}</span>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 16, marginBottom: 16 }}>
          {[{ i: '💵', t: 'دفع عند الاستلام' }, { i: '🚚', t: 'شحن مجاني' }, { i: '↩️', t: 'إرجاع مجاني' }, { i: '✅', t: 'منتج أصلي' }].map((b, i) => (
            <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 16 }}>{b.i}</div>
              <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{b.t}</div>
            </div>
          ))}
        </div>
        <button style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 800, marginBottom: 20 }}>اطلب الآن 🚀</button>
        <div style={{ background: '#f0f0f0', borderRadius: 12, padding: '20px 16px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>يرجى ادخال معلوماتك لإكمال الطلب</h3>
          {['الاسم', 'رقم الهاتف', 'العنوان تفصيلي'].map((p, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', color: '#9ca3af', fontSize: 14, marginBottom: 10 }}>{p}</div>
          ))}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
            <span>الإجمالي</span><span>199 SAR</span>
          </div>
          <button style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 800 }}>اطلب الآن 🚀</button>
        </div>
      </div>
    </div>
  )
}
