'use client'
import { useState } from 'react'
import { getStoreTheme, StoreTheme } from '@/lib/store-themes/tokens'

type Props = {
  store: any
  product: any
  landingPage: any
  sections: any
  images: string[]
  shippingCost: number
  onSubmit: (overrides?: any) => void
  submitting: boolean
  formError: string
  onBack: () => void
}

function Img({ src, alt, style }: { src?: string; alt: string; style?: React.CSSProperties }) {
  if (src) return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
  return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, background: 'inherit' }}>📦</div>
}

/* ── ORDER FORM (shared) ─────────────────────────────────────────── */
function OrderForm({ k, product, shippingCost, onSubmit, submitting, formError }: Pick<Props, 'product'|'shippingCost'|'onSubmit'|'submitting'|'formError'> & { k: StoreTheme }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const currency = product?.currency || 'SAR'
  const total = (parseFloat(product?.price || 0) + parseFloat(String(shippingCost || 0))).toFixed(0)

  const input: React.CSSProperties = { width: '100%', background: k.inputBg, border: `1px solid ${k.inputBorder}`, padding: '10px 12px', fontSize: 13, color: k.text, outline: 'none', borderRadius: k.radiusSm, fontFamily: k.font, boxSizing: 'border-box' }

  return (
    <div style={{ background: k.formBg, border: `1px solid ${k.border}`, borderRadius: k.radius, padding: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: k.text, margin: '0 0 12px' }}>📋 أدخل بياناتك لإتمام الطلب</p>
      {[
        { label: 'الاسم الكامل', val: name, set: setName, ph: 'اسمك' },
        { label: 'رقم الهاتف',  val: phone, set: setPhone, ph: '05xxxxxxxx' },
        { label: 'العنوان',     val: address, set: setAddress, ph: 'المدينة / الحي' },
      ].map(f => (
        <div key={f.label} style={{ marginBottom: 9 }}>
          <p style={{ fontSize: 10, color: k.muted, margin: '0 0 3px', fontWeight: 600 }}>{f.label}</p>
          <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={input} />
        </div>
      ))}
      {formError && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0' }}>{formError}</p>}
      <button
        onClick={() => onSubmit({ name, phone, address })}
        disabled={submitting}
        style={{ width: '100%', marginTop: 8, padding: '13px', borderRadius: k.radiusBtn, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', border: 'none', background: k.accent, color: k.accentText, opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? '...' : `✅ تأكيد الطلب — ${total} SAR`}
      </button>
    </div>
  )
}

/* ── EDITORIAL layout (luxe) ─────────────────────────────────────── */
function EditorialPage({ k, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme }) {
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const img = images[0]
  const disc = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
  return (
    <div style={{ background: k.pageBg, color: k.text, fontFamily: k.font, minHeight: '100vh' }}>
      <nav style={{ background: k.navBg, borderBottom: `1px solid ${k.border}`, padding: '0 22px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: k.muted, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: k.font }}>← {store.name}</button>
        <span style={{ fontFamily: k.headingFont, fontSize: 16, color: k.accent }}>{k.emoji}</span>
      </nav>
      <div style={{ display: 'flex', minHeight: '80vh', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 45%', minWidth: 260, background: `radial-gradient(ellipse at 40% 40%,${k.accentGlow},${k.sectionBg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360 }}>
          <Img src={img} alt={name} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, padding: '48px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 220 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.25em', color: k.muted, textTransform: 'uppercase', marginBottom: 18 }}>COLLECTION 2025</p>
          <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 36, color: k.text, lineHeight: 1.1, margin: '0 0 12px' }}>{name}</h1>
          <div style={{ width: 40, height: 1, background: k.accent, marginBottom: 16 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 28 }}>
            <span style={{ fontSize: 28, fontWeight: 600, color: k.accent }}>{product?.price} SAR</span>
            {product?.compare_at_price && <span style={{ fontSize: 13, color: k.muted }}>كان {product.compare_at_price}</span>}
            {disc > 0 && <span style={{ fontSize: 10, color: k.discountBg, fontWeight: 700 }}>-{disc}%</span>}
          </div>
          <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} />
        </div>
      </div>
    </div>
  )
}

/* ── BRUTALIST layout ────────────────────────────────────────────── */
function BrutalistPage({ k, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme }) {
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const img = images[0]
  const disc = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
  return (
    <div style={{ background: '#fff', color: '#000', fontFamily: k.font, minHeight: '100vh' }}>
      <nav style={{ background: '#000', padding: '0 18px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>← BACK</button>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, textTransform: 'uppercase' }}>{store.name}</span>
      </nav>
      {disc > 0 && <div style={{ background: k.discountBg, padding: '9px 18px', textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>🔥 LIMITED OFFER — {disc}% OFF TODAY</div>}
      <div style={{ background: '#f3f4f6', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid #000', overflow: 'hidden' }}>
        <Img src={img} alt={name} style={{ maxHeight: 320, objectFit: 'contain' }} />
      </div>
      <div style={{ padding: '22px 18px' }}>
        <h1 style={{ fontFamily: k.headingFont, fontWeight: 900, fontSize: 30, textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1 }}>{name}</h1>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18, borderBottom: '2px solid #000', paddingBottom: 18 }}>
          <span style={{ fontSize: 36, fontWeight: 900 }}>{product?.price}</span>
          <span style={{ fontSize: 14 }}>SAR</span>
          {product?.compare_at_price && <span style={{ fontSize: 13, color: '#6b7280', textDecoration: 'line-through' }}>{product.compare_at_price}</span>}
        </div>
        <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} />
      </div>
    </div>
  )
}

/* ── GALLERY/MINIMAL layout ──────────────────────────────────────── */
function GalleryPage({ k, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme }) {
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const img = images[0]
  return (
    <div style={{ background: k.pageBg, color: k.text, fontFamily: k.font, minHeight: '100vh' }}>
      <nav style={{ background: k.navBg, borderBottom: `1px solid ${k.divider}`, padding: '0 22px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: k.muted, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: k.font }}>← العودة</button>
        <span style={{ fontFamily: k.headingFont, fontSize: 13, color: k.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{store.name}</span>
      </nav>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ background: k.sectionBg, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${k.border}`, marginBottom: 32, overflow: 'hidden' }}>
          <Img src={img} alt={name} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.2em', color: k.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>مجموعة 2025</p>
            <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 24, color: k.text, margin: 0 }}>{name}</h1>
          </div>
          <div style={{ textAlign: 'left', flexShrink: 0 }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: k.accent, margin: 0 }}>{product?.price}</p>
            {product?.compare_at_price && <p style={{ fontSize: 11, color: k.muted, textDecoration: 'line-through', margin: 0 }}>{product.compare_at_price}</p>}
          </div>
        </div>
        <div style={{ height: 1, background: k.divider, marginBottom: 24 }} />
        <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} />
      </div>
    </div>
  )
}

/* ── FASHION layout ──────────────────────────────────────────────── */
function FashionStorePage({ k, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme }) {
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const img = images[0]
  const disc = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
  return (
    <div style={{ background: k.pageBg, color: k.text, fontFamily: k.font, minHeight: '100vh' }}>
      <nav style={{ background: k.navBg, borderBottom: `1px solid ${k.divider}`, padding: '0 18px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: k.muted, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: k.font }}>← {store.name}</button>
        <span style={{ fontFamily: k.headingFont, fontSize: 16, color: k.text, fontWeight: 700 }}>👗</span>
        <span style={{ fontSize: 10, color: k.muted, letterSpacing: '0.08em', cursor: 'pointer' }}>♡ المفضلة</span>
      </nav>
      <div style={{ padding: '9px 18px', borderBottom: `1px solid ${k.divider}`, fontSize: 10, color: k.muted, display: 'flex', gap: 6 }}>
        <span>الرئيسية</span><span>/</span><span>نساء</span><span>/</span><span style={{ color: k.text }}>{name}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 55%', minWidth: 260, minHeight: 380, background: k.sectionBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: `1px solid ${k.divider}` }}>
          <Img src={img} alt={name} style={{ objectFit: 'contain', maxHeight: 420 }} />
        </div>
        <div style={{ flex: 1, minWidth: 220, padding: '24px 18px', borderRight: `1px solid ${k.divider}` }}>
          <p style={{ fontSize: 9, letterSpacing: '0.22em', color: k.muted, textTransform: 'uppercase', margin: '0 0 10px' }}>MANTOOG FASHION</p>
          <h1 style={{ fontFamily: k.headingFont, fontWeight: 700, fontSize: 20, color: k.text, lineHeight: 1.2, margin: '0 0 12px' }}>{name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${k.divider}` }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{product?.price} SAR</span>
            {product?.compare_at_price && <span style={{ fontSize: 12, color: k.muted, textDecoration: 'line-through' }}>{product.compare_at_price}</span>}
            {disc > 0 && <span style={{ fontSize: 9, color: '#8b1a1a', fontWeight: 700, padding: '2px 6px', border: '1px solid #8b1a1a' }}>-{disc}%</span>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.1em', color: k.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>المقاس</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                <div key={s} style={{ width: 38, height: 38, border: `1px solid ${s === 'M' ? k.text : k.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: s === 'M' ? k.text : k.muted, cursor: 'pointer' }}>{s}</div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
            <button style={{ width: '100%', padding: '12px', background: k.text, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>أضف إلى السلة</button>
            <button style={{ width: '100%', padding: '11px', background: 'transparent', color: k.text, border: `1px solid ${k.border}`, fontSize: 11, cursor: 'pointer' }}>♡ أضف للمفضلة</button>
          </div>
          <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} />
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['🚚 توصيل مجاني للطلبات فوق 200 SAR', '↩️ إرجاع مجاني خلال 30 يوم', '✅ منتج أصلي مضمون'].map(info => (
              <p key={info} style={{ fontSize: 11, color: k.subtext, margin: 0 }}>{info}</p>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: '#1a1a1a', padding: '20px', textAlign: 'center' }}>
        <p style={{ fontFamily: k.headingFont, fontSize: 14, fontWeight: 700, color: '#faf8f5', margin: '0 0 4px' }}>{store.name} 👗</p>
        <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>مدعوم بـ منتوج</p>
      </div>
    </div>
  )
}

/* ── STANDARD layout (all other themes) ─────────────────────────── */
function StandardPage({ k, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme }) {
  const [activeImg, setActiveImg] = useState(0)
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const disc = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
  const currency = store?.currency || 'SAR'

  return (
    <div style={{ background: k.pageBg, color: k.text, fontFamily: k.font, minHeight: '100vh' }}>
      {disc > 0 && <div style={{ background: k.urgencyBg, color: '#fff', fontSize: 12, textAlign: 'center', padding: '8px', fontWeight: 700 }}>🔥 عرض محدود — شحن مجاني اليوم فقط!</div>}
      <nav style={{ background: k.navBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${k.divider}`, padding: '0 18px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: k.subtext, fontSize: 12, fontFamily: k.font }}>← {store.name}</button>
        <span style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 16, color: k.accent }}>{k.emoji}</span>
      </nav>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '18px' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
          {/* Images */}
          <div style={{ flex: '0 0 auto', width: 200 }}>
            <div style={{ width: 200, height: 200, borderRadius: k.radius, border: `1px solid ${k.cardBorder}`, background: k.sectionBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: `0 8px 40px ${k.accentGlow}` }}>
              <Img src={images[activeImg]} alt={name} style={{ objectFit: 'contain' }} />
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {images.slice(0, 4).map((img, i) => (
                  <div key={i} onClick={() => setActiveImg(i)} style={{ width: 48, height: 48, borderRadius: k.radiusSm, border: i === activeImg ? `2px solid ${k.accent}` : `1px solid ${k.cardBorder}`, background: k.cardBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'inline-block', background: k.badgeBg, color: k.badgeText, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, marginBottom: 8 }}>⭐ الأكثر مبيعاً</div>
            <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 21, lineHeight: 1.3, margin: '0 0 8px' }}>{name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: k.accent }}>{product?.price}</span>
              <span style={{ fontSize: 12, color: k.accent }}>{currency}</span>
              {product?.compare_at_price && <span style={{ fontSize: 13, color: k.muted, textDecoration: 'line-through' }}>{product.compare_at_price}</span>}
              {disc > 0 && <span style={{ background: k.discountBg, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 50 }}>-{disc}%</span>}
            </div>
            <button style={{ width: '100%', padding: '13px', borderRadius: k.radiusBtn, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: k.accent, color: k.accentText, boxShadow: `0 4px 20px ${k.accentGlow}`, marginBottom: 14 }}>
              🛒 اطلب الآن — {product?.price} {currency}
            </button>
            <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} />
          </div>
        </div>
      </div>
      <footer style={{ background: k.footerBg, padding: '20px', textAlign: 'center' }}>
        <p style={{ fontFamily: k.headingFont, fontSize: 14, fontWeight: k.headingWeight, color: k.accent, margin: '0 0 4px' }}>{store.name} {k.emoji}</p>
        <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>مدعوم بـ منتوج</p>
      </footer>
    </div>
  )
}

/* ── ROUTER ──────────────────────────────────────────────────────── */
export default function ThemedProductPage(props: Props) {
  const k = getStoreTheme(props.store?.store_theme)
  const shared = { ...props, k }

  if (k.layout === 'editorial')  return <EditorialPage {...shared} />
  if (k.layout === 'brutalist')  return <BrutalistPage {...shared} />
  if (k.layout === 'gallery')    return <GalleryPage {...shared} />
  if (k.layout === 'fashion')    return <FashionStorePage {...shared} />
  return <StandardPage {...shared} />
}
