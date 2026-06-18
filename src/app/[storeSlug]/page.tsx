'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useStorePublic } from '@/components/store/StorePublicProvider'

export default function StorePage() {
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { showPoweredBy } = useStorePublic()

  useEffect(() => {
    const load = async () => {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', params.storeSlug)
        .single()
      if (!storeData) { setNotFound(true); setLoading(false); return }
      setStore(storeData)
      const { data: productsData } = await supabase
        .from('products')
        .select('*, landing_pages(headline, published)')
        .eq('store_id', storeData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      setProducts(productsData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#555', fontSize: 14, fontFamily: 'system-ui' }}>Loading...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 48 }}>🏪</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Store not found</div>
    </div>
  )

  const primary = store?.primary_color || '#3b82f6'
  const isRTL = store?.language === 'ar'
  const currency = store?.currency || 'EGP'

  // Create RGB from hex for glow effects
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r}, ${g}, ${b}`
  }
  const primaryRgb = hexToRgb(primary)

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: 'system-ui, -apple-system, Arial, sans-serif', background: '#080808', minHeight: '100vh', color: '#fff', overflowX: 'hidden' }}>

      {store.tiktok_pixel_id && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function(w,d,t){
              w.TiktokAnalyticsObject=t;
              var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
              ttq.load=function(e,n){
                var i="https://analytics.tiktok.com/i18n/pixel/events.js";
                ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;
                ttq._t=ttq._t||{};ttq._t[e]=+new Date;
                ttq._o=ttq._o||{};ttq._o[e]=n||{};
                var o=document.createElement("script");
                o.type="text/javascript";o.async=!0;
                o.src=i+"?sdkid="+e+"&lib="+t;
                var a=document.getElementsByTagName("script")[0];
                a.parentNode.insertBefore(o,a)
              };
              ttq.load("${store.tiktok_pixel_id}");
              ttq.page();
            }(window,document,"ttq");
          `}
        </Script>
      )}

      {store.meta_pixel_id && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){
                if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)
              }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init','${store.meta_pixel_id}');
              fbq('track','PageView');
            `}
          </Script>
          <noscript>
            <img height="1" width="1" style={{display:'none'}}
              src={"https://www.facebook.com/tr?id=" + store.meta_pixel_id + "&ev=PageView&noscript=1"} alt="" />
          </noscript>
        </>
      )}

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .product-card { animation: slide-up 0.5s ease forwards; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .product-card:hover { transform: translateY(-8px) scale(1.02); }
        .order-btn { transition: all 0.2s ease; }
        .order-btn:hover { transform: scale(1.03); filter: brightness(1.1); }
        @media (max-width: 640px) {
          .products-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .hero-title { font-size: 36px !important; }
          .hero-section { padding: 80px 20px 60px !important; }
        }
      `}</style>

      {/* Ambient background blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, rgba(${primaryRgb}, 0.15) 0%, transparent 70%)`, animation: 'pulse-glow 4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, rgba(${primaryRgb}, 0.08) 0%, transparent 70%)`, animation: 'pulse-glow 6s ease-in-out infinite reverse' }} />
      </div>

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(20px)', background: 'rgba(8,8,8,0.8)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {store?.logo_url ? (
            <img src={store.logo_url} alt={store.name} style={{ height: 32, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 800, background: `linear-gradient(135deg, #fff 0%, rgba(${primaryRgb}, 0.8) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{store?.name}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#555', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.08)' }}>
            {products.length} {isRTL ? 'منتج' : 'products'}
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section" style={{ position: 'relative', zIndex: 1, padding: '140px 32px 80px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `rgba(${primaryRgb}, 0.1)`, border: `1px solid rgba(${primaryRgb}, 0.3)`, borderRadius: 99, padding: '6px 16px', marginBottom: 28, fontSize: 13, color: primary }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: primary, display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
          {isRTL ? 'متجر نشط · شحن سريع' : 'Live store · Fast delivery'}
        </div>

        <h1 className="hero-title" style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: -2 }}>
          <span style={{ background: `linear-gradient(135deg, #fff 0%, rgba(${primaryRgb}, 0.7) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {store?.name}
          </span>
        </h1>

        <p style={{ fontSize: 17, color: '#666', lineHeight: 1.7, margin: '0 auto', maxWidth: 500 }}>
          {isRTL ? 'اكتشف أفضل المنتجات بأسعار حصرية مع شحن سريع لباب بيتك' : 'Discover premium products at exclusive prices with fast delivery to your door'}
        </p>

        {/* Scroll indicator */}
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 1, height: 60, background: `linear-gradient(to bottom, rgba(${primaryRgb}, 0.6), transparent)` }} />
        </div>
      </section>

      {/* Products */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 3 }}>{isRTL ? 'جميع المنتجات' : 'ALL PRODUCTS'}</span>
          <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 20, animation: 'float 3s ease-in-out infinite' }}>📦</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{isRTL ? 'قريباً...' : 'Coming soon...'}</div>
            <div style={{ fontSize: 14, color: '#555' }}>{isRTL ? 'يتم إضافة المنتجات قريباً' : 'Products are being added soon'}</div>
          </div>
        ) : (
          <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {products.map((product, idx) => {
              const discountPct = product.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0
              const isHovered = hoveredId === product.id
              return (
                <div
                  key={product.id}
                  className="product-card"
                  style={{ animationDelay: `${idx * 0.08}s`, opacity: 0, animationFillMode: 'forwards' }}
                  onMouseEnter={() => setHoveredId(product.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => router.push(`/${params.storeSlug}/${product.id}`)}
                >
                  <div style={{
                    background: isHovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                    border: isHovered ? `1px solid rgba(${primaryRgb}, 0.4)` : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 20,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: isHovered ? `0 20px 60px rgba(${primaryRgb}, 0.15), 0 0 0 1px rgba(${primaryRgb}, 0.2)` : '0 4px 20px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}>

                    {/* Image */}
                    <div style={{ position: 'relative', aspectRatio: '1/1', background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.4s ease', transform: isHovered ? 'scale(1.06)' : 'scale(1)' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>📦</div>
                      )}

                      {/* Discount badge */}
                      {discountPct > 0 && (
                        <div style={{ position: 'absolute', top: 12, right: isRTL ? 'auto' : 12, left: isRTL ? 12 : 'auto', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 99, letterSpacing: 0.5 }}>
                          -{discountPct}%
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(${primaryRgb}, 0.15) 0%, transparent 60%)`, opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s' }} />
                    </div>

                    {/* Info */}
                    <div style={{ padding: '16px 18px 18px' }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', margin: '0 0 10px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.landing_pages?.[0]?.headline || product.title}
                      </h3>

                      {/* Price row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{product.price}</span>
                        <span style={{ fontSize: 13, color: '#555' }}>{currency}</span>
                        {product.compare_at_price && (
                          <span style={{ fontSize: 12, color: '#444', textDecoration: 'line-through' }}>{product.compare_at_price} {currency}</span>
                        )}
                      </div>

                      {/* CTA */}
                      <button
                        className="order-btn"
                        style={{
                          width: '100%',
                          background: isHovered ? primary : `rgba(${primaryRgb}, 0.15)`,
                          color: isHovered ? '#fff' : primary,
                          border: `1px solid rgba(${primaryRgb}, 0.3)`,
                          borderRadius: 12,
                          padding: '11px',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          letterSpacing: 0.3,
                        }}
                      >
                        {isRTL ? '🛒 اطلب الآن' : '🛒 Order Now'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 32px', display: 'flex', justifyContent: showPoweredBy ? 'space-between' : 'center', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg, #fff, rgba(${primaryRgb}, 0.7))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{store?.name}</span>
        {showPoweredBy && (
          <span style={{ fontSize: 12, color: '#333' }}>{isRTL ? 'مدعوم بواسطة منتوج' : 'Powered by Mantoog'}</span>
        )}
      </footer>
    </div>
  )
}
