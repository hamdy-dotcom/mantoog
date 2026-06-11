'use client'
import { useRef, useState } from 'react'

export default function FashionTheme({ store, product, landingPage, sections, images, benefits, shippingCost, onSubmit, submitting, formError }: any) {
  const formRef = useRef<HTMLDivElement>(null)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const [descOpen, setDescOpen] = useState(false)
  const [shipOpen, setShipOpen] = useState(false)

  const parseSizes = (raw: unknown): string[] => {
    if (!raw) return []
    let arr = raw
    if (typeof raw === 'string') {
      try { arr = JSON.parse(raw) } catch { return [] }
    }
    return Array.isArray(arr) && arr.length > 0 ? arr.map(String) : []
  }

  const sizes = product?.sizes?.length ? parseSizes(product.sizes) : []
  const rawColors = product?.colors
  const colors: { name: string; hex: string }[] = Array.isArray(rawColors)
    ? rawColors.map((c: any) => typeof c === 'string' ? JSON.parse(c) : c)
    : rawColors && typeof rawColors === 'string'
    ? JSON.parse(rawColors)
    : []
  const currency = store?.currency || 'SAR'
  const total = (parseFloat(product?.price || 0) * qty + parseFloat(shippingCost || 0)).toFixed(0)
  const discount = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : null

  const seed = product?.id ? product.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) : 42
  const reviewCount = (seed % 200) + 650
  const ratingDist = { 5: 70, 4: 20, 3: 7, 2: 2, 1: 1 }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb',
    borderRadius: 8, fontSize: 15, background: '#fff', color: '#111',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: 'system-ui, Arial, sans-serif', overflowX: 'hidden', maxWidth: '100vw' }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        .f-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px; width: 100%; }
        .f-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: flex-start; }
        .f-img-col { width: 100%; }
        .f-mobile-img { display: none; }
        .f-reviews { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
        .f-thumbnails { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .f-cols { grid-template-columns: 1fr; gap: 16px; }
          .f-img-col { display: none; }
          .f-mobile-img { display: block; margin-bottom: 16px; }
          .f-wrap { padding: 12px; }
          .f-reviews { padding: 24px 16px; }
          .f-thumbnails { gap: 6px; }
        }
      `}</style>

      {/* Top urgency bar */}
      <div style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '8px 16px', textAlign: 'center', fontSize: 13, color: '#555' }}>
        ⏱️ اطلب خلال <strong style={{ color: '#111' }}>02:15:20</strong> للتوصيل في نفس اليوم
        {shippingCost === 0 && <span> · ✈️ <strong>شحن مجاني</strong></span>}
      </div>

      {/* Main layout */}
      <div className="f-wrap">
        <div className="f-cols">

        {/* Image column */}
        <div className="f-img-col">
          {images.length > 0 ? (
            <div>
              <img src={images[activeImg]} alt={product?.title}
                style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 4, display: 'block', background: '#f3f4f6' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              {images.length > 1 && (
                <div className="f-thumbnails">
                  {images.slice(0, 4).map((img: string, i: number) => (
                    <img key={i} src={img} onClick={() => setActiveImg(i)}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: activeImg === i ? '2px solid #111' : '2px solid #e5e7eb' }} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', aspectRatio: '3/4', background: '#f3f4f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>👗</div>
          )}
        </div>

        {/* Info column */}
        <div>
          {images.length > 0 && (
            <div className="f-mobile-img">
              <img src={images[activeImg]} alt={product?.title}
                style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 4, background: '#f3f4f6' }} />
              <div className="f-thumbnails">
                {images.slice(0, 4).map((img: string, i: number) => (
                  <img key={i} src={img} onClick={() => setActiveImg(i)}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: activeImg === i ? '2px solid #111' : '2px solid #e5e7eb' }} />
                ))}
              </div>
            </div>
          )}

          {/* Collection label */}
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
            {store?.name}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3, color: '#111' }}>
            {landingPage?.headline || product?.title}
          </h1>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>{product?.price} {currency}</span>
            {product?.compare_at_price && (
              <span style={{ fontSize: 16, color: '#aaa', textDecoration: 'line-through' }}>{product.compare_at_price} {currency}</span>
            )}
            {discount && (
              <span style={{ background: '#111', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>{discount}% خصم اليوم</span>
            )}
          </div>

          {/* Urgency */}
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
            ⏱️ اطلب خلال <strong style={{ color: '#111' }}>02:15:20</strong> للتوصيل في نفس اليوم
          </div>

          {/* Colors */}
          {colors.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                اللون: <span style={{ fontWeight: 400, color: '#555' }}>{selectedColor?.name || 'اختر اللون'}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {colors.map((color, i) => (
                  <button key={i} onClick={() => setSelectedColor(color)}
                    title={color.name}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: color.hex,
                      border: selectedColor?.hex === color.hex ? '3px solid #111' : '3px solid #e5e7eb',
                      cursor: 'pointer', transition: 'all 0.15s',
                      outline: selectedColor?.hex === color.hex ? '2px solid #111' : 'none',
                      outlineOffset: 2,
                    }} />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>اختر المقاس</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sizes.map((size: string, i: number) => (
                  <button key={i} onClick={() => setSelectedSize(size)}
                    style={{ width: 48, height: 48, borderRadius: '50%', border: selectedSize === size ? 'none' : '1px solid #e5e7eb', background: selectedSize === size ? '#111' : '#fff', color: selectedSize === size ? '#fff' : '#111', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order button */}
          <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{ width: '100%', background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '15px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, transition: 'all 0.2s', fontFamily: 'inherit' }}>
            {shippingCost === 0 ? 'اطلب الآن — شحن مجاني' : 'اطلب الآن'}
          </button>

          {/* Checkout form */}
          <div ref={formRef} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '24px', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>أكمل طلبك</h2>
            <p style={{ fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 }}>الدفع عند الاستلام • شحن آمن ومضمون</p>

            {selectedSize && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#888' }}>المقاس المختار</span>
                <span style={{ fontWeight: 700 }}>{selectedSize}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" style={inputStyle} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف" type="tel"
                style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }} />
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="العنوان تفصيلي (منطقة، مدينة، حي)" style={inputStyle} />

              {store?.show_quantity && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px' }}>
                  <span style={{ fontSize: 14, color: '#555' }}>الكمية</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>−</button>
                    <span style={{ fontWeight: 700 }}>{qty}</span>
                    <button onClick={() => setQty(q => q + 1)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>+</button>
                  </div>
                </div>
              )}

              {store?.show_note && (
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظات إضافية (اختياري)" rows={3}
                  style={{ ...inputStyle, resize: 'none' }} />
              )}

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#888', marginBottom: 8 }}>
                  <span>الشحن</span>
                  <span style={{ color: shippingCost === 0 ? '#16a34a' : '#111', fontWeight: 600 }}>
                    {shippingCost === 0 ? 'مجاني ✓' : `${shippingCost} ${currency}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#111' }}>
                  <span>الإجمالي</span>
                  <span>{total} {currency}</span>
                </div>
              </div>

              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>{formError}</div>
              )}

              <button onClick={() => onSubmit({ name, phone, address, note, qty, selectedSize, selectedColor })} disabled={submitting}
                style={{ background: submitting ? '#9ca3af' : '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '16px', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {submitting ? '...' : (shippingCost === 0 ? 'اطلب الآن — شحن مجاني' : 'اطلب الآن')}
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#aaa', paddingTop: 4 }}>
                <span>🔒 دفع عند الاستلام</span>
                <span>📦 شحن مضمون</span>
                <span>↩️ إرجاع مجاني</span>
              </div>
            </div>
          </div>

          {/* Description accordion */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8 }}>
            <button onClick={() => setDescOpen(!descOpen)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#111', fontFamily: 'inherit' }}>
              <span>الوصف والمقاسات</span>
              <span style={{ fontSize: 18, transition: 'transform 0.2s', transform: descOpen ? 'rotate(180deg)' : 'none' }}>⌄</span>
            </button>
            {descOpen && (
              <div style={{ paddingBottom: 16, fontSize: 14, color: '#555', lineHeight: 1.7 }}>
                {landingPage?.subheadline && <p style={{ marginBottom: 12 }}>{landingPage.subheadline}</p>}
                {benefits.map((b: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#111' }}>•</span><span>{b}</span>
                  </div>
                ))}
                {sections?.description_long && <p style={{ marginTop: 12 }}>{sections.description_long}</p>}
              </div>
            )}
          </div>

          {/* Shipping accordion */}
          <div style={{ borderTop: '1px solid #e5e7eb' }}>
            <button onClick={() => setShipOpen(!shipOpen)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#111', fontFamily: 'inherit' }}>
              <span>معلومات الشحن</span>
              <span style={{ fontSize: 18, transition: 'transform 0.2s', transform: shipOpen ? 'rotate(180deg)' : 'none' }}>⌄</span>
            </button>
            {shipOpen && (
              <div style={{ paddingBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { icon: '🏷️', label: 'الخصم', value: discount ? `${discount}% خصم اليوم` : 'لا يوجد' },
                    { icon: '🚚', label: 'التوصيل', value: shippingCost === 0 ? 'مجاني' : `${shippingCost} ${currency}` },
                    { icon: '📦', label: 'التغليف', value: 'تغليف قياسي' },
                    { icon: '📅', label: 'وقت الوصول', value: '3-5 أيام عمل' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, color: '#888' }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb' }} />
        </div>
        </div>
      </div>

      {/* Reviews — rating summary only */}
      <div className="f-reviews" style={{ borderTop: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#111' }}>آراء العملاء</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          {/* Score */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: '#111' }}>4.8</div>
            <div style={{ color: '#f59e0b', fontSize: 20, margin: '4px 0' }}>⭐⭐⭐⭐⭐</div>
            <div style={{ fontSize: 13, color: '#888' }}>({reviewCount.toLocaleString()} تقييم)</div>
          </div>
          {/* Bars */}
          <div style={{ flex: 1 }}>
            {Object.entries(ratingDist).reverse().map(([star, pct]) => (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#888', minWidth: 24 }}>{star}★</span>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#f59e0b', borderRadius: 99, width: `${pct}%`, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: 13, color: '#888', minWidth: 32 }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', color: '#fff', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>{store?.name?.toUpperCase()}</div>
        <div style={{ fontSize: 12, color: '#555' }}>© 2025 {store?.name}. جميع الحقوق محفوظة.</div>
      </div>

      {/* Sticky bottom bar — mobile */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{product?.price} {currency}</div>
          {product?.compare_at_price && <div style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>{product.compare_at_price} {currency}</div>}
        </div>
        <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
          style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          اطلب الآن
        </button>
      </div>

    </div>
  )
}
