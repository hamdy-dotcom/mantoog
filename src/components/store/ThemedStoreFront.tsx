'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getStoreTheme, StoreTheme } from '@/lib/store-themes/tokens'

/* ── helpers ──────────────────────────────────────────────────────── */
function disc(price: number, compare: number | null) {
  return compare && compare > price ? Math.round((1 - price / compare) * 100) : 0
}
function seedNum(id: string, min: number, max: number) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return (n % (max - min)) + min
}

function parseCust(store: any) {
  return (store?.customizations || {}) as {
    whatsapp?: string
    announcement?: { text: string; bg?: string; textColor?: string }
    tagline?: string
    social?: { instagram?: string; tiktok?: string; snapchat?: string; twitter?: string }
    guarantees?: string[]
    faq?: Array<{ q: string; a: string }>
    video?: string
    ctaLabel?: string
  }
}

/* ── product image box ──────────────────────────────────────────── */
function Img({ src, alt, style }: { src?: string; alt: string; style: React.CSSProperties }) {
  if (src) return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
  return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📦</div>
}

/* ── ANNOUNCEMENT BAR ──────────────────────────────────────────── */
function AnnouncementBar({ text, bg, textColor }: { text: string; bg?: string; textColor?: string }) {
  return (
    <div style={{ background: bg || '#dc2626', color: textColor || '#fff', textAlign: 'center', padding: '9px 16px', fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>
      {text}
    </div>
  )
}

/* ── WHATSAPP BUTTON ───────────────────────────────────────────── */
function WhatsAppButton({ phone }: { phone: string }) {
  const clean = phone.replace(/[^0-9+]/g, '')
  return (
    <a
      href={`https://wa.me/${clean}`}
      target="_blank"
      rel="noopener noreferrer"
      title="تواصل عبر واتساب"
      style={{ position: 'fixed', bottom: 20, left: 20, width: 52, height: 52, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.45)', zIndex: 900, textDecoration: 'none', flexShrink: 0 }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  )
}

/* ── GUARANTEE BADGES ──────────────────────────────────────────── */
const BADGES: Record<string, string> = {
  shipping: '🚚 شحن مجاني',
  return: '↩️ إرجاع مجاني',
  original: '✅ منتج أصلي',
  cod: '💵 الدفع عند الاستلام',
  warranty: '🛡️ ضمان سنة',
}

function GuaranteeBadges({ badges, k }: { badges: string[]; k: StoreTheme }) {
  if (!badges.length) return null
  return (
    <div style={{ background: k.sectionBg, borderTop: `1px solid ${k.border}`, borderBottom: `1px solid ${k.border}`, padding: '10px 18px', display: 'flex', gap: 14, overflowX: 'auto', justifyContent: 'center', flexWrap: 'wrap' }}>
      {badges.map(b => BADGES[b] && (
        <span key={b} style={{ fontSize: 11, color: k.subtext, fontWeight: 600, whiteSpace: 'nowrap' }}>{BADGES[b]}</span>
      ))}
    </div>
  )
}

/* ── CARD VARIANTS ─────────────────────────────────────────────── */
function ProductCard({ product, k, currency, onClick }: { product: any; k: StoreTheme; currency: string; onClick: () => void }) {
  const d = disc(product.price, product.compare_at_price)
  const name = product.landing_pages?.[0]?.headline || product.title
  const img = product.images?.[0]

  if (k.cardStyle === 'editorial') return (
    <div onClick={onClick} style={{ display: 'flex', gap: 14, borderBottom: `1px solid ${k.border}`, padding: '16px 0', cursor: 'pointer' }}>
      <div style={{ width: 70, height: 70, flexShrink: 0, background: k.sectionBg, overflow: 'hidden' }}>
        <Img src={img} alt={name} style={{ borderRadius: 0 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.2em', color: k.muted, textTransform: 'uppercase', margin: '0 0 4px' }}>COLLECTION</p>
        <p style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 16, color: k.text, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: k.accent }}>{product.price} {currency}</span>
          <span style={{ fontSize: 10, color: k.muted, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${k.accent}`, cursor: 'pointer' }}>ORDER →</span>
        </div>
      </div>
    </div>
  )

  if (k.cardStyle === 'fashion') return (
    <div onClick={onClick} style={{ cursor: 'pointer', position: 'relative' }}>
      <div style={{ aspectRatio: '2/3', background: k.sectionBg, overflow: 'hidden', position: 'relative' }}>
        <Img src={img} alt={name} style={{}} />
        <div style={{ position: 'absolute', top: 10, left: 10, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(250,248,245,0.85)', fontSize: 14, color: '#4a4040', cursor: 'pointer' }}>♡</div>
        {d > 0 && <div style={{ position: 'absolute', top: 10, right: 0, fontSize: 9, fontWeight: 700, color: '#fff', background: '#8b1a1a', padding: '4px 9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SALE</div>}
        <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 4 }}>
          {['#1a1a1a', '#c9993a', '#8b1a1a'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, border: '1.5px solid rgba(255,255,255,0.85)' }} />)}
        </div>
      </div>
      <div style={{ padding: '9px 0 13px' }}>
        <p style={{ fontSize: 12, color: '#1a1a1a', margin: '0 0 3px', fontFamily: k.font, fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 600 }}>{product.price}</span>
            {product.compare_at_price && <span style={{ fontSize: 10, color: '#9a8880', textDecoration: 'line-through' }}>{product.compare_at_price}</span>}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {['S', 'M', 'L'].map(s => <div key={s} style={{ width: 17, height: 17, border: '1px solid #e5ddd6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#9a8880' }}>{s}</div>)}
          </div>
        </div>
      </div>
    </div>
  )

  if (k.cardStyle === 'gallery') return (
    <div onClick={onClick} style={{ cursor: 'pointer', textAlign: 'center' }}>
      <div style={{ background: k.sectionBg, aspectRatio: '1', overflow: 'hidden', border: `1px solid ${k.border}`, marginBottom: 10 }}>
        <Img src={img} alt={name} style={{}} />
      </div>
      <p style={{ fontSize: 12, color: k.text, margin: '0 0 2px', fontFamily: k.headingFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
      <p style={{ fontSize: 12, color: k.muted, margin: 0 }}>{product.price} {currency}</p>
    </div>
  )

  if (k.cardStyle === 'brutalist') return (
    <div onClick={onClick} style={{ background: k.cardBg, border: `2px solid ${k.cardBorder}`, cursor: 'pointer', position: 'relative' }}>
      <div style={{ background: '#f3f4f6', overflow: 'hidden', borderBottom: `2px solid ${k.cardBorder}`, aspectRatio: '1' }}>
        <Img src={img} alt={name} style={{}} />
        {d > 0 && <div style={{ position: 'absolute', top: 0, left: 0, background: k.discountBg, color: '#fff', fontSize: 9, fontWeight: 900, padding: '4px 8px', textTransform: 'uppercase' }}>-{d}%</div>}
      </div>
      <div style={{ padding: '12px' }}>
        <p style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: k.text, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: k.text }}>{product.price}</span>
          {product.compare_at_price && <span style={{ fontSize: 11, color: k.muted, textDecoration: 'line-through' }}>{product.compare_at_price}</span>}
        </div>
        <button style={{ width: '100%', padding: '9px', background: '#000', color: '#fff', border: 'none', fontSize: 11, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ORDER →</button>
      </div>
    </div>
  )

  if (k.cardStyle === 'hype') {
    const orders = seedNum(product.id, 80, 400)
    const pct = seedNum(product.id, 55, 90)
    return (
      <div onClick={onClick} style={{ background: k.cardBg, border: `1px solid ${k.accentGlow}`, borderRadius: k.radius, overflow: 'hidden', cursor: 'pointer', backdropFilter: 'blur(10px)', boxShadow: `0 4px 20px ${k.accentGlow}` }}>
        <div style={{ background: `radial-gradient(ellipse at 50% 30%,${k.accentGlow},transparent)`, padding: '14px', textAlign: 'center', borderBottom: `1px solid ${k.border}`, aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
          <Img src={img} alt={name} style={{ borderRadius: 0 }} />
          <p style={{ position: 'absolute', bottom: 8, left: 0, right: 0, fontSize: 10, color: '#e879f9', fontWeight: 700, margin: 0, background: 'rgba(7,0,26,0.6)', padding: '3px 0' }}>🔥 {orders} طلب اليوم</p>
        </div>
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: k.text, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#a855f7,#be185d)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: k.accent }}>{product.price}</span>
            {d > 0 && <span style={{ background: k.discountBg, color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 50, fontWeight: 700 }}>-{d}%</span>}
          </div>
          <button style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg,#a855f7,#be185d)', color: '#fff', border: 'none', borderRadius: 50, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>✨ اطلب الآن</button>
        </div>
      </div>
    )
  }

  // default card
  return (
    <div onClick={onClick} style={{ background: k.cardBg, border: `1px solid ${k.cardBorder}`, borderRadius: k.radius, overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ aspectRatio: '1', background: k.sectionBg, position: 'relative', overflow: 'hidden' }}>
        <Img src={img} alt={name} style={{}} />
        {d > 0 && <div style={{ position: 'absolute', top: 8, right: 8, background: k.discountBg, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 50 }}>-{d}%</div>}
      </div>
      <div style={{ padding: '12px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: k.text, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: k.accent }}>{product.price}</span>
          <span style={{ fontSize: 11, color: k.muted }}>{currency}</span>
          {product.compare_at_price && <span style={{ fontSize: 11, color: k.muted, textDecoration: 'line-through' }}>{product.compare_at_price}</span>}
        </div>
        <button style={{ width: '100%', padding: '8px', background: k.accent, color: k.accentText, border: 'none', cursor: 'pointer', borderRadius: k.radiusBtn, fontSize: 12, fontWeight: 700 }}>اطلب الآن</button>
      </div>
    </div>
  )
}

/* ── HERO VARIANTS ─────────────────────────────────────────────── */
function StoreHero({ k, store, tagline, onShop }: { k: StoreTheme; store: any; tagline: string; onShop: () => void }) {
  const name = store.name

  if (k.layout === 'editorial') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '56px 28px', borderBottom: `1px solid ${k.border}` }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.25em', color: k.muted, textTransform: 'uppercase', marginBottom: 14 }}>COLLECTION 2025</p>
        <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 46, color: k.accent, lineHeight: 1.05, margin: '0 0 14px' }}>{name}</h1>
        <div style={{ width: 40, height: 1, background: k.accent, marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: k.subtext, lineHeight: 1.9, marginBottom: 28 }}>{tagline}</p>
        <button onClick={onShop} style={{ background: 'transparent', color: k.accent, border: `1px solid ${k.accent}`, padding: '10px 26px', fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: k.font }}>SHOP NOW →</button>
      </div>
      <div style={{ fontSize: 80, opacity: 0.6, flexShrink: 0 }}>{k.emoji}</div>
    </div>
  )

  if (k.layout === 'wellness') return (
    <div style={{ background: k.heroGradient, padding: '40px 22px', textAlign: 'center', borderBottom: `1px solid ${k.border}` }}>
      <div style={{ display: 'inline-block', background: k.accent, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 50, marginBottom: 14 }}>100% طبيعي · خالٍ من المواد الكيميائية</div>
      <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 34, color: k.heroTextColor, margin: '0 0 10px' }}>{name}</h1>
      <p style={{ color: k.subtext, fontSize: 13, marginBottom: 22 }}>{tagline}</p>
      <button onClick={onShop} style={{ background: k.accent, color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🌿 تسوق الآن</button>
    </div>
  )

  if (k.layout === 'dark_tech') return (
    <div style={{ background: k.heroGradient, padding: '52px 22px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle,${k.accentGlow} 1px,transparent 1px)`, backgroundSize: '24px 24px', opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-block', background: k.badgeBg, border: `1px solid ${k.accent}`, color: k.accent, fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 4, marginBottom: 16 }}>⚡ NEW DROP 2025</div>
        <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 40, color: k.accent, margin: '0 0 10px', textShadow: `0 0 30px ${k.accent}` }}>{name}</h1>
        <p style={{ color: k.subtext, fontSize: 13, marginBottom: 24 }}>{tagline}</p>
        <button onClick={onShop} style={{ background: k.accent, color: k.accentText, border: 'none', padding: '11px 24px', borderRadius: k.radiusBtn, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 0 24px ${k.accent}` }}>تسوق الآن</button>
      </div>
    </div>
  )

  if (k.layout === 'playful') return (
    <div style={{ background: k.heroGradient, padding: '40px 22px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(192,38,211,0.1)', top: -30, right: '8%', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🌸💕✨</div>
        <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 32, color: k.heroTextColor, margin: '0 0 8px' }}>{name}</h1>
        <p style={{ color: k.subtext, fontSize: 13, marginBottom: 20 }}>{tagline}</p>
        <button onClick={onShop} style={{ background: `linear-gradient(135deg,${k.accent},${k.accentDark})`, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>💕 تسوقي الآن</button>
      </div>
    </div>
  )

  if (k.layout === 'brutalist') return (
    <div>
      <div style={{ background: '#000', padding: '40px 22px' }}>
        <p style={{ fontSize: 10, color: '#555', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>EST. 2025 — {name}</p>
        <h1 style={{ fontFamily: k.headingFont, fontWeight: 900, fontSize: 'clamp(38px,8vw,68px)', color: '#fff', margin: 0, lineHeight: 0.9, textTransform: 'uppercase' }}>SHOP<br />THE<br />BEST</h1>
      </div>
      <div style={{ background: k.discountBg, padding: '10px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>🔥 عروض محدودة</span>
        <button onClick={onShop} style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 18px', fontSize: 12, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' }}>تسوق الآن →</button>
      </div>
    </div>
  )

  if (k.layout === 'gallery') return (
    <div style={{ padding: '64px 28px', textAlign: 'center', borderBottom: `1px solid ${k.divider}` }}>
      <p style={{ fontSize: 10, letterSpacing: '0.25em', color: k.muted, textTransform: 'uppercase', marginBottom: 18 }}>{name}</p>
      <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 46, color: k.text, margin: '0 0 6px', lineHeight: 1.05 }}>مجموعة ٢٠٢٥</h1>
      <div style={{ width: 28, height: 1, background: k.accent, margin: '18px auto' }} />
      <button onClick={onShop} style={{ background: 'transparent', color: k.text, border: `1px solid ${k.text}`, padding: '10px 28px', fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: k.headingFont }}>اكتشف المجموعة</button>
    </div>
  )

  if (k.layout === 'trust') return (
    <div>
      <div style={{ background: k.accent, padding: '34px 22px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>✅ منتجات موثوقة · ضمان رسمي · شحن آمن</p>
        <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 32, color: '#fff', margin: '0 0 10px' }}>{name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 20 }}>{tagline}</p>
        <button onClick={onShop} style={{ background: '#fff', color: k.accent, border: 'none', padding: '11px 24px', borderRadius: k.radiusBtn, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>تسوق بثقة →</button>
      </div>
      <div style={{ background: k.sectionBg, padding: '10px 22px', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${k.border}` }}>
        {['🏅 ضمان سنة', '🚚 شحن مجاني', '↩️ إرجاع مجاني', '✅ منتجات أصلية'].map(b => (
          <span key={b} style={{ fontSize: 11, color: k.subtext, fontWeight: 600 }}>{b}</span>
        ))}
      </div>
    </div>
  )

  if (k.layout === 'artisan') return (
    <div style={{ background: k.heroGradient, padding: '44px 22px', textAlign: 'center', borderBottom: `2px dashed ${k.border}` }}>
      <div style={{ display: 'inline-block', background: k.badgeBg, color: k.accent, fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 50, marginBottom: 16, border: `1px solid ${k.border}` }}>🤝 صنع بأيدٍ محلية · نكهة أصيلة</div>
      <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 36, color: k.heroTextColor, margin: '0 0 10px' }}>{name}</h1>
      <p style={{ color: k.subtext, fontSize: 14, marginBottom: 24, fontStyle: 'italic' }}>{tagline}</p>
      <button onClick={onShop} style={{ background: k.accent, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>اكتشف المنتجات 🌾</button>
    </div>
  )

  if (k.layout === 'neon') return (
    <div style={{ background: k.heroGradient, padding: '52px 22px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(168,85,247,0.15)', filter: 'blur(80px)', top: -100, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 40, margin: '0 0 10px', background: 'linear-gradient(135deg,#f8f0ff,#e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{name}</h1>
        <p style={{ color: k.subtext, fontSize: 13, marginBottom: 24 }}>{tagline}</p>
        <button onClick={onShop} style={{ background: 'linear-gradient(135deg,#a855f7,#be185d)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 30px rgba(168,85,247,0.5)' }}>✨ تسوقي الآن</button>
      </div>
    </div>
  )

  if (k.layout === 'fashion') return (
    <div>
      <div style={{ background: '#1a1a1a', padding: '48px 26px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 0,transparent 8px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.38em', color: '#9a8880', textTransform: 'uppercase', margin: '0 0 20px' }}>NEW COLLECTION — 2025</p>
          <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: 42, color: '#faf8f5', lineHeight: 1.08, margin: '0 0 20px' }}>{name}</h1>
          <div style={{ width: 30, height: 1, background: 'rgba(250,248,245,0.25)', margin: '0 auto 22px' }} />
          {tagline && <p style={{ fontSize: 12, color: '#9a8880', marginBottom: 22, fontStyle: 'italic' }}>{tagline}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={onShop} style={{ background: 'transparent', color: '#faf8f5', border: '1px solid rgba(250,248,245,0.45)', padding: '11px 24px', fontSize: 10, letterSpacing: '0.16em', cursor: 'pointer', textTransform: 'uppercase' }}>اكتشف المجموعة</button>
            <button style={{ background: '#faf8f5', color: '#1a1a1a', border: 'none', padding: '11px 20px', fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 700 }}>تخفيضات الموسم</button>
          </div>
        </div>
      </div>
      <div style={{ background: '#faf8f5', borderBottom: '1px solid #e5ddd6', padding: '0 18px', display: 'flex', overflowX: 'auto' }}>
        {['الكل', 'نساء', 'رجال', 'أطفال', 'إكسسوارات', 'تخفيضات'].map((cat, i) => (
          <button key={cat} style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#1a1a1a' : '#9a8880', borderBottom: i === 0 ? '2px solid #1a1a1a' : '2px solid transparent', flexShrink: 0, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{cat}</button>
        ))}
      </div>
    </div>
  )

  // default (centered / classic)
  return (
    <div style={{ background: k.heroGradient, padding: '52px 22px', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', background: k.badgeBg, color: k.badgeText, fontSize: 10, fontWeight: 700, padding: '5px 14px', borderRadius: 50, marginBottom: 16 }}>✦ متجر موثوق · توصيل سريع</div>
      <h1 style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 38, color: k.heroTextColor, margin: '0 0 10px' }}>{name}</h1>
      <p style={{ color: k.subtext, fontSize: 14, marginBottom: 24 }}>{tagline}</p>
      <button onClick={onShop} style={{ background: k.accent, color: k.accentText, border: 'none', padding: '12px 24px', borderRadius: k.radiusBtn, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 20px ${k.accentGlow}` }}>تسوق الآن ↓</button>
    </div>
  )
}

/* ── MAIN COMPONENT ─────────────────────────────────────────────── */
export default function ThemedStoreFront({ store, products }: { store: any; products: any[] }) {
  const router = useRouter()
  const params = useParams()
  const k = getStoreTheme(store.store_theme)
  const cust = parseCust(store)
  const currency = store?.currency || 'SAR'
  const isList = k.cardStyle === 'editorial'
  const gridCols = k.cardStyle === 'gallery'
    ? 'repeat(auto-fill,minmax(110px,1fr))'
    : k.cardStyle === 'fashion'
    ? 'repeat(auto-fill,minmax(130px,1fr))'
    : 'repeat(auto-fill,minmax(150px,1fr))'

  const tagline = cust.tagline || store.tagline || (store.language === 'ar' ? 'اكتشف منتجات مميزة بأفضل الأسعار' : 'Discover premium products at the best prices')
  const firstProduct = products[0]
  const handleShop = () => { if (firstProduct) router.push(`/${params.storeSlug}/${firstProduct.id}`) }
  const goToProduct = (id: string) => router.push(`/${params.storeSlug}/${id}`)

  const social = cust.social || {}
  const hasSocial = social.instagram || social.tiktok || social.snapchat || social.twitter

  return (
    <div dir="rtl" style={{ background: k.pageBg, color: k.text, fontFamily: k.font, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@400;600;700&family=Nunito:wght@400;700;800&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;700;900&family=Lora:wght@400;700&family=Outfit:wght@400;700;800&display=swap');
        *{box-sizing:border-box}
      `}</style>

      {/* Announcement bar — in page flow so it doesn't cover sticky nav */}
      {cust.announcement?.text && (
        <AnnouncementBar text={cust.announcement.text} bg={cust.announcement.bg} textColor={cust.announcement.textColor} />
      )}

      {/* Nav */}
      <nav style={{ background: k.navBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${k.divider}`, padding: '0 18px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {store.logo_url
            ? <img src={store.logo_url} alt={store.name} style={{ height: 28, objectFit: 'contain' }} />
            : <span style={{ fontFamily: k.headingFont, fontWeight: k.headingWeight, fontSize: 17, color: k.layout === 'brutalist' ? '#fff' : k.accent }}>{store.name}</span>
          }
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: k.muted }}>{products.length} منتج</span>
          <div style={{ fontSize: 10, background: k.badgeBg, color: k.badgeText, padding: '3px 8px', borderRadius: k.radiusSm }}>🚚 مجاني</div>
        </div>
      </nav>

      {/* Hero */}
      <StoreHero k={k} store={store} tagline={tagline} onShop={handleShop} />

      {/* Guarantee badges below hero */}
      {cust.guarantees && cust.guarantees.length > 0 && (
        <GuaranteeBadges badges={cust.guarantees} k={k} />
      )}

      {/* Section header */}
      {!isList && k.cardStyle !== 'gallery' && k.cardStyle !== 'fashion' && (
        <div style={{ padding: '24px 18px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: k.divider }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: k.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>جميع المنتجات</span>
          <div style={{ flex: 1, height: 1, background: k.divider }} />
        </div>
      )}
      {k.cardStyle === 'fashion' && (
        <div style={{ padding: '18px 18px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>الأكثر مبيعاً</p>
          <p style={{ fontSize: 10, color: '#9a8880', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>عرض الكل →</p>
        </div>
      )}

      {/* Products */}
      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: k.text }}>قريباً...</p>
        </div>
      ) : (
        <div style={{
          padding: isList ? '14px 28px 48px' : '0 18px 48px',
          display: isList ? 'block' : 'grid',
          gridTemplateColumns: gridCols,
          gap: k.cardStyle === 'gallery' ? 16 : k.cardStyle === 'fashion' ? '6px 12px' : 12,
        }}>
          {products.map(p => (
            <ProductCard key={p.id} product={p} k={k} currency={currency} onClick={() => goToProduct(p.id)} />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: k.footerBg, padding: '22px', textAlign: 'center' }}>
        <p style={{ fontFamily: k.headingFont, fontSize: 15, fontWeight: k.headingWeight, color: k.accent, margin: '0 0 4px' }}>{store.name} {k.emoji}</p>
        {hasSocial && (
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '10px 0', flexWrap: 'wrap' }}>
            {social.instagram && <a href={`https://instagram.com/${social.instagram}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'none' }}>📸 @{social.instagram}</a>}
            {social.tiktok && <a href={`https://tiktok.com/@${social.tiktok}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'none' }}>🎵 @{social.tiktok}</a>}
            {social.snapchat && <a href={`https://snapchat.com/add/${social.snapchat}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'none' }}>👻 @{social.snapchat}</a>}
            {social.twitter && <a href={`https://x.com/${social.twitter}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'none' }}>𝕏 @{social.twitter}</a>}
          </div>
        )}
        <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>مدعوم بـ منتوج</p>
      </footer>

      {/* WhatsApp floating button */}
      {cust.whatsapp && <WhatsAppButton phone={cust.whatsapp} />}
    </div>
  )
}
