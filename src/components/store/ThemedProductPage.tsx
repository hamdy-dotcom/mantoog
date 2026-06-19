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

type Cust = {
  whatsapp?: string
  announcement?: { text: string; bg?: string; textColor?: string }
  guarantees?: string[]
  faq?: Array<{ q: string; a: string }>
  video?: string
  ctaLabel?: string
}

function parseCust(store: any): Cust {
  return store?.customizations || {}
}

function Img({ src, alt, style }: { src?: string; alt: string; style?: React.CSSProperties }) {
  if (src) return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
  return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, background: 'inherit' }}>📦</div>
}

/* ── WHATSAPP BUTTON ───────────────────────────────────────────── */
function WhatsAppButton({ phone }: { phone: string }) {
  const clean = phone.replace(/[^0-9+]/g, '')
  return (
    <a href={`https://wa.me/${clean}`} target="_blank" rel="noopener noreferrer" title="تواصل عبر واتساب"
       style={{ position: 'fixed', bottom: 20, left: 20, width: 52, height: 52, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.45)', zIndex: 900, textDecoration: 'none', flexShrink: 0 }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  )
}

/* ── GUARANTEE BADGES ──────────────────────────────────────────── */
const BADGE_LABELS: Record<string, string> = {
  shipping: '🚚 شحن مجاني',
  return: '↩️ إرجاع مجاني',
  original: '✅ منتج أصلي',
  cod: '💵 الدفع عند الاستلام',
  warranty: '🛡️ ضمان سنة',
}

function GuaranteeBadges({ badges, k }: { badges: string[]; k: StoreTheme }) {
  if (!badges.length) return null
  return (
    <div style={{ background: k.sectionBg, borderTop: `1px solid ${k.border}`, padding: '14px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      {badges.map(b => BADGE_LABELS[b] && (
        <span key={b} style={{ fontSize: 12, color: k.subtext, fontWeight: 600 }}>{BADGE_LABELS[b]}</span>
      ))}
    </div>
  )
}

/* ── FAQ SECTION ───────────────────────────────────────────────── */
function FAQSection({ items, k }: { items: Array<{ q: string; a: string }>; k: StoreTheme }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!items.length) return null
  return (
    <div style={{ padding: '24px 18px', borderTop: `1px solid ${k.border}` }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: k.text, margin: '0 0 14px', fontFamily: k.headingFont }}>الأسئلة الشائعة</p>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${k.border}`, marginBottom: 4 }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', textAlign: 'right', background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: k.text, textAlign: 'right' }}>{item.q}</span>
            <span style={{ fontSize: 16, color: k.muted, flexShrink: 0, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
          </button>
          {open === i && (
            <p style={{ fontSize: 13, color: k.subtext, lineHeight: 1.7, margin: '0 0 12px', paddingRight: 4 }}>{item.a}</p>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── VIDEO SECTION ─────────────────────────────────────────────── */
function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    // TikTok
    if (u.hostname.includes('tiktok.com')) {
      const parts = u.pathname.split('/')
      const vid = parts[parts.indexOf('video') + 1]
      return vid ? `https://www.tiktok.com/embed/v2/${vid}` : null
    }
    return null
  } catch {
    return null
  }
}

function VideoSection({ url, k }: { url: string; k: StoreTheme }) {
  const embed = getEmbedUrl(url)
  if (!embed) return null
  return (
    <div style={{ padding: '24px 18px', borderTop: `1px solid ${k.border}` }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: k.text, margin: '0 0 14px', fontFamily: k.headingFont }}>شاهد المنتج</p>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: k.radius, border: `1px solid ${k.border}` }}>
        <iframe
          src={embed}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Product video"
        />
      </div>
    </div>
  )
}

/* ── ORDER FORM (shared) ─────────────────────────────────────────── */
function OrderForm({ k, product, shippingCost, onSubmit, submitting, formError, ctaLabel }: Pick<Props, 'product'|'shippingCost'|'onSubmit'|'submitting'|'formError'> & { k: StoreTheme; ctaLabel?: string }) {
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
        {submitting ? '...' : (ctaLabel || `✅ تأكيد الطلب — ${total} ${currency}`)}
      </button>
    </div>
  )
}

/* ── EDITORIAL layout (luxe) ─────────────────────────────────────── */
function EditorialPage({ k, cust, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme; cust: Cust }) {
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const img = images[0]
  const d = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
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
            {d > 0 && <span style={{ fontSize: 10, color: k.discountBg, fontWeight: 700 }}>-{d}%</span>}
          </div>
          <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} ctaLabel={cust.ctaLabel} />
        </div>
      </div>
      {cust.guarantees && cust.guarantees.length > 0 && <GuaranteeBadges badges={cust.guarantees} k={k} />}
      {cust.video && <VideoSection url={cust.video} k={k} />}
      {cust.faq && cust.faq.length > 0 && <FAQSection items={cust.faq} k={k} />}
    </div>
  )
}

/* ── BRUTALIST layout ────────────────────────────────────────────── */
function BrutalistPage({ k, cust, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme; cust: Cust }) {
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const img = images[0]
  const d = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
  return (
    <div style={{ background: '#fff', color: '#000', fontFamily: k.font, minHeight: '100vh' }}>
      <nav style={{ background: '#000', padding: '0 18px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>← BACK</button>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, textTransform: 'uppercase' }}>{store.name}</span>
      </nav>
      {d > 0 && <div style={{ background: k.discountBg, padding: '9px 18px', textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>🔥 LIMITED OFFER — {d}% OFF TODAY</div>}
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
        <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} ctaLabel={cust.ctaLabel} />
      </div>
      {cust.guarantees && cust.guarantees.length > 0 && <GuaranteeBadges badges={cust.guarantees} k={k} />}
      {cust.video && <VideoSection url={cust.video} k={k} />}
      {cust.faq && cust.faq.length > 0 && <FAQSection items={cust.faq} k={k} />}
    </div>
  )
}

/* ── GALLERY/MINIMAL layout ──────────────────────────────────────── */
function GalleryPage({ k, cust, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme; cust: Cust }) {
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
        <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} ctaLabel={cust.ctaLabel} />
      </div>
      {cust.guarantees && cust.guarantees.length > 0 && <GuaranteeBadges badges={cust.guarantees} k={k} />}
      {cust.video && <VideoSection url={cust.video} k={k} />}
      {cust.faq && cust.faq.length > 0 && <FAQSection items={cust.faq} k={k} />}
    </div>
  )
}

/* ── FASHION layout ──────────────────────────────────────────────── */
function FashionStorePage({ k, cust, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme; cust: Cust }) {
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const img = images[0]
  const d = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
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
            {d > 0 && <span style={{ fontSize: 9, color: '#8b1a1a', fontWeight: 700, padding: '2px 6px', border: '1px solid #8b1a1a' }}>-{d}%</span>}
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
            <button style={{ width: '100%', padding: '12px', background: k.text, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cust.ctaLabel || 'أضف إلى السلة'}</button>
            <button style={{ width: '100%', padding: '11px', background: 'transparent', color: k.text, border: `1px solid ${k.border}`, fontSize: 11, cursor: 'pointer' }}>♡ أضف للمفضلة</button>
          </div>
          <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} ctaLabel={cust.ctaLabel} />
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['🚚 توصيل مجاني للطلبات فوق 200 SAR', '↩️ إرجاع مجاني خلال 30 يوم', '✅ منتج أصلي مضمون'].map(info => (
              <p key={info} style={{ fontSize: 11, color: k.subtext, margin: 0 }}>{info}</p>
            ))}
          </div>
        </div>
      </div>
      {cust.guarantees && cust.guarantees.length > 0 && <GuaranteeBadges badges={cust.guarantees} k={k} />}
      {cust.video && <VideoSection url={cust.video} k={k} />}
      {cust.faq && cust.faq.length > 0 && <FAQSection items={cust.faq} k={k} />}
      <div style={{ background: '#1a1a1a', padding: '20px', textAlign: 'center' }}>
        <p style={{ fontFamily: k.headingFont, fontSize: 14, fontWeight: 700, color: '#faf8f5', margin: '0 0 4px' }}>{store.name} 👗</p>
        <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>مدعوم بـ منتوج</p>
      </div>
    </div>
  )
}

/* ── STANDARD layout (all other themes) ─────────────────────────── */
function StandardPage({ k, cust, product, shippingCost, onSubmit, submitting, formError, images, onBack, store }: Props & { k: StoreTheme; cust: Cust }) {
  const [activeImg, setActiveImg] = useState(0)
  const name = product?.landing_pages?.[0]?.headline || product?.title
  const d = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
  const currency = store?.currency || 'SAR'

  return (
    <div style={{ background: k.pageBg, color: k.text, fontFamily: k.font, minHeight: '100vh' }}>
      {d > 0 && <div style={{ background: k.urgencyBg, color: '#fff', fontSize: 12, textAlign: 'center', padding: '8px', fontWeight: 700 }}>🔥 عرض محدود — شحن مجاني اليوم فقط!</div>}
      <nav style={{ background: k.navBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${k.divider}`, padding: '0 18px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: k.subtext, fontSize: 12, fontFamily: k.font }}>← {store.name}</button>
        <span style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 16, color: k.accent }}>{k.emoji}</span>
      </nav>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '18px' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
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
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'inline-block', background: k.badgeBg, color: k.badgeText, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, marginBottom: 8 }}>⭐ الأكثر مبيعاً</div>
            <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 21, lineHeight: 1.3, margin: '0 0 8px' }}>{name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: k.accent }}>{product?.price}</span>
              <span style={{ fontSize: 12, color: k.accent }}>{currency}</span>
              {product?.compare_at_price && <span style={{ fontSize: 13, color: k.muted, textDecoration: 'line-through' }}>{product.compare_at_price}</span>}
              {d > 0 && <span style={{ background: k.discountBg, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 50 }}>-{d}%</span>}
            </div>
            <button style={{ width: '100%', padding: '13px', borderRadius: k.radiusBtn, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: k.accent, color: k.accentText, boxShadow: `0 4px 20px ${k.accentGlow}`, marginBottom: 14 }}>
              {cust.ctaLabel || `🛒 اطلب الآن — ${product?.price} ${currency}`}
            </button>
            <OrderForm k={k} product={product} shippingCost={shippingCost} onSubmit={onSubmit} submitting={submitting} formError={formError} ctaLabel={cust.ctaLabel} />
          </div>
        </div>
      </div>
      {cust.guarantees && cust.guarantees.length > 0 && <GuaranteeBadges badges={cust.guarantees} k={k} />}
      {cust.video && <VideoSection url={cust.video} k={k} />}
      {cust.faq && cust.faq.length > 0 && <FAQSection items={cust.faq} k={k} />}
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
  const cust = parseCust(props.store)
  const shared = { ...props, k, cust }

  return (
    <>
      {cust.announcement?.text && (
        <div style={{ background: cust.announcement.bg || '#dc2626', color: cust.announcement.textColor || '#fff', textAlign: 'center', padding: '9px 16px', fontSize: 12, fontWeight: 600, position: 'sticky', top: 0, zIndex: 100 }}>
          {cust.announcement.text}
        </div>
      )}
      {k.layout === 'editorial' ? <EditorialPage {...shared} /> :
       k.layout === 'brutalist' ? <BrutalistPage {...shared} /> :
       k.layout === 'gallery'   ? <GalleryPage {...shared} /> :
       k.layout === 'fashion'   ? <FashionStorePage {...shared} /> :
       <StandardPage {...shared} />}
      {cust.whatsapp && <WhatsAppButton phone={cust.whatsapp} />}
    </>
  )
}
