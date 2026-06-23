'use client'
import { useRef, useState } from 'react'

export default function HomeTheme({ store, product, landingPage, sections, images, benefits, shippingCost, onSubmit, submitting, formError, activeOffers = [], selectedOffer, setSelectedOffer, upsellProduct, upsellConfig, bumpChecked, setBumpChecked }: any) {
  const formRef = useRef<HTMLDivElement>(null)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedColor, setSelectedColor] = useState<any>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const [descOpen, setDescOpen] = useState(true)
  const [specOpen, setSpecOpen] = useState(false)
  const [featureOpen, setFeatureOpen] = useState(false)

  const currency = store?.currency || 'SAR'
  const accentColor = '#2d5a3d'
  const bgColor = '#f5f0e8'
  const discount = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : null
  const bumpPrice = bumpChecked && upsellConfig?.type === 'bump' ? (upsellConfig.sale_price || 0) : 0
  const basePrice = selectedOffer ? selectedOffer.price : parseFloat(product?.price || 0) * qty
  const total = (basePrice + bumpPrice + parseFloat(shippingCost || 0)).toFixed(0)

  const rawColors = product?.colors
  const colors: {name: string, hex: string}[] = Array.isArray(rawColors)
    ? rawColors.map((c: any) => typeof c === 'string' ? JSON.parse(c) : c)
    : rawColors && typeof rawColors === 'string' ? JSON.parse(rawColors) : []

  const seed = product?.id ? product.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) : 42
  const reviewCount = (seed % 100) + 50
  const soldCount = (seed % 500) + 500
  const ratingDist = { 5: 72, 4: 18, 3: 6, 2: 3, 1: 1 }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #d4c9b0',
    borderRadius: 8, fontSize: 15, background: '#fff', color: '#111',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const Accordion = ({ title, open, onToggle, children }: any) => (
    <div style={{ border: '1px solid #d4c9b0', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: open ? '#fff' : bgColor, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#111', fontFamily: 'inherit' }}>
        <span>{title}</span>
        <span style={{ fontSize: 16, color: '#888', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {open && <div style={{ padding: '0 16px 16px', background: '#fff', fontSize: 14, color: '#555', lineHeight: 1.7 }}>{children}</div>}
    </div>
  )

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: bgColor, color: '#111', fontFamily: 'system-ui, Arial, sans-serif', overflowX: 'hidden', maxWidth: '100vw' }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        .h-wrap { max-width: 1000px; margin: 0 auto; padding: 32px 24px; width: 100%; }
        .h-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: flex-start; }
        .h-img-col { width: 100%; }
        .h-mobile-img { display: none; }
        .h-bottom { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: flex-start; padding: 48px 24px; }
        @media (max-width: 768px) {
          .h-cols { grid-template-columns: 1fr; gap: 16px; }
          .h-img-col { display: none; }
          .h-mobile-img { display: block; margin-bottom: 16px; }
          .h-wrap { padding: 16px; }
          .h-bottom { grid-template-columns: 1fr; gap: 24px; padding: 24px 16px; }
        }
      `}</style>

      <div style={{ background: accentColor, color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>
        {shippingCost === 0 ? '🚚 شحن مجاني على جميع الطلبات هذا الأسبوع فقط!' : 'احصل على خصم إضافي عند الطلب اليوم!'}
      </div>

      <div className="h-wrap">
        <div className="h-cols">

        <div className="h-img-col">
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5ddc8', marginBottom: 16 }}>
            {images.length > 0 ? (
              <img src={images[activeImg]} alt={product?.title}
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', display: 'block', padding: 24 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🏠</div>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {images.slice(0, 3).map((img: string, i: number) => (
                <img key={i} src={img} onClick={() => setActiveImg(i)}
                  style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: 10, cursor: 'pointer', border: activeImg === i ? `2px solid ${accentColor}` : '2px solid #e5ddc8', background: '#fff', padding: 8 }} />
              ))}
            </div>
          )}
        </div>

        <div>
          {images.length > 0 && (
            <div className="h-mobile-img">
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5ddc8', padding: 16, marginBottom: 12 }}>
                <img src={images[activeImg]} alt={product?.title}
                  style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: 8 }} />
              </div>
              {images.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                  {images.slice(0, 3).map((img: string, i: number) => (
                    <img key={i} src={img} onClick={() => setActiveImg(i)}
                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: 8, cursor: 'pointer', border: activeImg === i ? `2px solid ${accentColor}` : '1px solid #e5ddc8', background: '#fff', padding: 6 }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, margin: '0 0 6px', lineHeight: 1.1, color: '#111', textTransform: 'uppercase', letterSpacing: -0.5 }}>
            {landingPage?.headline || product?.title}
          </h1>
          {landingPage?.subheadline && (
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 16px' }}>{landingPage.subheadline}</p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            {product?.compare_at_price && (
              <span style={{ fontSize: 18, color: '#aaa', textDecoration: 'line-through' }}>{currency} {product.compare_at_price}</span>
            )}
            <span style={{ fontSize: 28, fontWeight: 800, color: '#111' }}>{currency} {product?.price}</span>
            {discount && (
              <span style={{ background: accentColor, color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>{discount}% خصم</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ color: '#f59e0b', fontSize: 14 }}>⭐⭐⭐⭐⭐</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>(4.8)</span>
            <span style={{ fontSize: 13, color: '#888' }}>{reviewCount.toLocaleString()} تقييم</span>
            <span style={{ fontSize: 13, color: '#888' }}>·</span>
            <span style={{ fontSize: 13, color: '#888' }}>{soldCount.toLocaleString()} تم بيعه</span>
          </div>

          {colors.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                الألوان المتاحة: <span style={{ fontWeight: 400, color: '#888' }}>{selectedColor?.name || ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {colors.map((color, i) => (
                  <button key={i} onClick={() => setSelectedColor(color)} title={color.name}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: color.hex, border: selectedColor?.hex === color.hex ? `3px solid ${accentColor}` : '3px solid #d4c9b0', cursor: 'pointer', outline: selectedColor?.hex === color.hex ? `2px solid ${accentColor}` : 'none', outlineOffset: 2 }} />
                ))}
              </div>
            </div>
          )}

          <Accordion title="الوصف" open={descOpen} onToggle={() => setDescOpen(!descOpen)}>
            <p style={{ marginBottom: 12 }}>{landingPage?.subheadline}</p>
            {benefits.map((b: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ color: accentColor, flexShrink: 0 }}>•</span><span>{b}</span>
              </div>
            ))}
          </Accordion>

          <Accordion title="المواصفات" open={specOpen} onToggle={() => setSpecOpen(!specOpen)}>
            {product?.specs ? (
              Object.entries(product.specs).map(([k, v]: any, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0e8d8' }}>
                  <span style={{ color: '#888' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))
            ) : (
              <p style={{ color: '#888' }}>لا توجد مواصفات إضافية</p>
            )}
          </Accordion>

          <Accordion title="المميزات" open={featureOpen} onToggle={() => setFeatureOpen(!featureOpen)}>
            {benefits.map((b: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ color: accentColor, fontWeight: 700, flexShrink: 0 }}>✓</span><span>{b}</span>
              </div>
            ))}
          </Accordion>

          <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{ width: '100%', background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', marginTop: 8 }}>
            {shippingCost === 0 ? 'اطلب الآن — شحن مجاني 🚚' : 'اطلب الآن'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, fontSize: 12, color: '#888', textAlign: 'center' }}>
            {[
              { icon: '💳', text: 'دفع عند الاستلام' },
              { icon: '🔒', text: 'شراء آمن' },
              { icon: '↩️', text: 'إرجاع مجاني' },
            ].map((b, i) => (
              <div key={i}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{b.icon}</div>
                <div>{b.text}</div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid #e5ddc8' }}>
        <div className="h-bottom">

          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1 }}>التقييمات والآراء</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: '#111' }}>4.5</div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>/ 5</div>
                <div style={{ color: '#f59e0b', fontSize: 16 }}>⭐⭐⭐⭐⭐</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>({reviewCount} تقييم)</div>
              </div>
              <div style={{ flex: 1 }}>
                {Object.entries(ratingDist).reverse().map(([star, pct]) => (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#f59e0b', fontSize: 12 }}>★</span>
                    <span style={{ fontSize: 12, color: '#888', minWidth: 12 }}>{star}</span>
                    <div style={{ flex: 1, height: 6, background: '#f3f0e8', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: accentColor, borderRadius: 99, width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#888', minWidth: 28 }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={formRef}>
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6, textTransform: 'uppercase' }}>أكمل طلبك</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>الدفع عند الاستلام • شحن آمن</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" style={inputStyle} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف" type="tel"
                style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }} />
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="العنوان تفصيلي" style={inputStyle} />

              {store?.show_quantity && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1.5px solid #d4c9b0', borderRadius: 8, padding: '12px 14px' }}>
                  <span style={{ fontSize: 14, color: '#555' }}>الكمية</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #d4c9b0', background: bgColor, cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>−</button>
                    <span style={{ fontWeight: 700 }}>{qty}</span>
                    <button onClick={() => setQty(q => q + 1)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #d4c9b0', background: bgColor, cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>+</button>
                  </div>
                </div>
              )}

              {store?.show_note && (
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظات إضافية (اختياري)" rows={2}
                  style={{ ...inputStyle, resize: 'none' }} />
              )}

              {/* Bundle offers */}
              {activeOffers.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 8 }}>🏡 اختر العرض المناسب</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div onClick={() => setSelectedOffer(null)}
                      style={{ border: `2px solid ${!selectedOffer ? accentColor : '#d4c9b0'}`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: !selectedOffer ? bgColor : '#fff' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${!selectedOffer ? accentColor : '#aaa'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {!selectedOffer && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />}
                      </div>
                      <span style={{ fontSize: 13, flex: 1 }}>قطعة واحدة</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{parseFloat(product?.price || 0)} {currency}</span>
                    </div>
                    {activeOffers.map((offer: any) => {
                      const isSelected = selectedOffer?.id === offer.id
                      const savings = Math.round(parseFloat(product?.price || 0) * offer.quantity - offer.price)
                      return (
                        <div key={offer.id} onClick={() => setSelectedOffer(offer)}
                          style={{ border: `2px solid ${isSelected ? accentColor : '#d4c9b0'}`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: isSelected ? bgColor : '#fff' }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isSelected ? accentColor : '#aaa'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />}
                          </div>
                          <span style={{ fontSize: 13, flex: 1 }}>{offer.quantity} قطع</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{offer.price} {currency}</span>
                          {savings > 0 && <span style={{ fontSize: 11, background: accentColor, color: '#fff', borderRadius: 4, padding: '2px 6px' }}>وفر {savings}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Bump upsell */}
              {upsellConfig?.type === 'bump' && upsellProduct && (
                <div onClick={() => setBumpChecked(!bumpChecked)}
                  style={{ border: `2px dashed ${bumpChecked ? accentColor : '#f59e0b'}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ background: bumpChecked ? accentColor : '#f59e0b', padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    🏡 عرض حصري — أضفه الآن بسعر خاص!
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: bumpChecked ? bgColor : '#fff' }}>
                    {upsellProduct.images?.[0] && <img src={upsellProduct.images[0]} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #d4c9b0', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{upsellProduct.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{upsellConfig.sale_price} {currency}</span>
                        <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>{upsellProduct.price} {currency}</span>
                      </div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${bumpChecked ? '#fff' : accentColor}`, background: bumpChecked ? '#fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {bumpChecked && <span style={{ color: accentColor, fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: bgColor, border: '1.5px solid #d4c9b0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888', marginBottom: 6 }}>
                  <span>الشحن</span>
                  <span style={{ color: shippingCost === 0 ? '#16a34a' : '#111', fontWeight: 600 }}>
                    {shippingCost === 0 ? 'مجاني ✓' : `${shippingCost} ${currency}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800 }}>
                  <span>الإجمالي</span>
                  <span>{total} {currency}</span>
                </div>
              </div>

              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>{formError}</div>
              )}

              <button onClick={() => onSubmit({ name, phone, address, note, qty, selectedColor })} disabled={submitting}
                style={{ background: submitting ? '#888' : accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {submitting ? '...' : (shippingCost === 0 ? 'اطلب الآن — شحن مجاني 🚚' : 'اطلب الآن')}
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 12, color: '#aaa' }}>
                <span>💳 دفع عند الاستلام</span>
                <span>🔒 شراء آمن</span>
                <span>↩️ إرجاع مجاني</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div style={{ background: accentColor, color: '#fff', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, marginBottom: 4 }}>{store?.name?.toUpperCase()}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>© 2025 {store?.name}. جميع الحقوق محفوظة.</div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5ddc8', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{currency} {product?.price}</div>
          {product?.compare_at_price && <div style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>{currency} {product.compare_at_price}</div>}
        </div>
        <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
          style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          اطلب الآن
        </button>
      </div>

    </div>
  )
}
