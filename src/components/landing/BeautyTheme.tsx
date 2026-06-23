'use client'
import { useRef, useState, useEffect } from 'react'

export default function BeautyTheme({ store, product, landingPage, sections, images, benefits, shippingCost, onSubmit, submitting, formError, activeOffers = [], selectedOffer, setSelectedOffer, upsellProduct, upsellConfig, bumpChecked, setBumpChecked }: any) {
  const formRef = useRef<HTMLDivElement>(null)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const [descOpen, setDescOpen] = useState(true)
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [shipOpen, setShipOpen] = useState(false)
  const [soldCount, setSoldCount] = useState(0)
  const [viewCount, setViewCount] = useState(0)

  const currency = store?.currency || 'EGP'
  const accentColor = '#2d8c7a'
  const buttonColor = '#e8956d'
  const bumpPrice = bumpChecked && upsellConfig?.type === 'bump' ? (upsellConfig.sale_price || 0) : 0
  const basePrice = selectedOffer ? selectedOffer.price : parseFloat(product?.price || 0) * qty
  const total = (basePrice + bumpPrice + parseFloat(shippingCost || 0)).toFixed(0)
  const discount = product?.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : null

  useEffect(() => {
    setSoldCount(Math.floor(Math.random() * 40) + 20)
    setViewCount(Math.floor(Math.random() * 20) + 28)
  }, [])

  const rawVariants = product?.variants
  const variants: string[] = Array.isArray(rawVariants)
    ? rawVariants.map((v: any) => (typeof v === 'string' ? v : v?.name || String(v)))
    : rawVariants && typeof rawVariants === 'string'
    ? (() => { try { const a = JSON.parse(rawVariants); return Array.isArray(a) ? a.map((v: any) => (typeof v === 'string' ? v : v?.name || String(v))) : [] } catch { return [] } })()
    : []

  const seed = product?.id ? product.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) : 42
  const reviewCount = (seed % 150) + 80
  const ratingDist = { 5: 78, 4: 15, 3: 5, 2: 1, 1: 1 }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontSize: 15, background: '#fff', color: '#111',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const Accordion = ({ title, open, onToggle, children }: any) => (
    <div style={{ borderTop: '1px solid #f0e8e8' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#111', fontFamily: 'inherit' }}>
        <span>{title}</span>
        <span style={{ fontSize: 20, color: '#888', transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && <div style={{ paddingBottom: 20 }}>{children}</div>}
    </div>
  )

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: 'system-ui, Arial, sans-serif', overflowX: 'hidden', maxWidth: '100vw' }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        .b-wrap { max-width: 1100px; margin: 0 auto; padding: 40px 24px; width: 100%; }
        .b-cols { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 60px; align-items: flex-start; }
        .b-img-col { width: 100%; }
        .b-mobile-img { display: none; }
        .b-bottom { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: flex-start; padding: 48px 24px; }
        @media (max-width: 768px) {
          .b-cols { grid-template-columns: 1fr; gap: 16px; }
          .b-img-col { display: none; }
          .b-mobile-img { display: block; margin-bottom: 16px; }
          .b-wrap { padding: 16px; }
          .b-bottom { grid-template-columns: 1fr; gap: 24px; padding: 24px 16px; }
        }
      `}</style>

      <div style={{ background: accentColor, color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
        {shippingCost === 0 ? '🚚 شحن مجاني على جميع الطلبات' : '🚚 التوصيل خلال 3-5 أيام عمل'}
      </div>

      <div className="b-wrap">
        <div className="b-cols">

        <div className="b-img-col">
          <div style={{ position: 'relative', marginBottom: 16, borderRadius: 16, overflow: 'hidden', background: '#f9f0f5' }}>
            {images.length > 0 ? (
              <img src={images[activeImg]} alt={product?.title}
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', display: 'block', padding: 24 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>💄</div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setActiveImg(i => Math.max(0, i - 1))}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>‹</button>
                <button onClick={() => setActiveImg(i => Math.min(images.length - 1, i + 1))}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>›</button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {images.slice(0, 5).map((img: string, i: number) => (
                <img key={i} src={img} onClick={() => setActiveImg(i)}
                  style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 10, cursor: 'pointer', border: activeImg === i ? `2px solid ${accentColor}` : '2px solid #e5e7eb', background: '#f9f0f5', padding: 4 }} />
              ))}
            </div>
          )}
        </div>

        <div>
          {images.length > 0 && (
            <div className="b-mobile-img">
              <div style={{ background: '#f9f0f5', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <img src={images[activeImg]} alt={product?.title}
                  style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: 12 }} />
              </div>
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {images.slice(0, 4).map((img: string, i: number) => (
                    <img key={i} src={img} onClick={() => setActiveImg(i)}
                      style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 8, cursor: 'pointer', border: activeImg === i ? `2px solid ${accentColor}` : '2px solid #e5e7eb', background: '#f9f0f5', padding: 4 }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.3, color: accentColor }}>
            {landingPage?.headline || product?.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>{currency} {product?.price}</span>
            {product?.compare_at_price && (
              <span style={{ fontSize: 16, color: '#aaa', textDecoration: 'line-through' }}>{currency} {product.compare_at_price}</span>
            )}
            {discount && (
              <span style={{ background: '#fde68a', color: '#92400e', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 99 }}>وفر {discount}%</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <span style={{ color: '#f59e0b', fontSize: 16 }}>⭐⭐⭐⭐⭐</span>
            <span style={{ fontSize: 14, color: accentColor, fontWeight: 600 }}>{reviewCount} تقييم</span>
          </div>

          {variants.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>الحجم / النوع</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {variants.map((v: any, i: number) => (
                  <button key={i} onClick={() => setSelectedVariant(v.name || v)}
                    style={{ padding: '6px 16px', borderRadius: 99, border: 'none', background: selectedVariant === (v.name || v) ? accentColor : '#f0f0f0', color: selectedVariant === (v.name || v) ? '#fff' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {v.name || v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, fontSize: 13 }}>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ متوفر في المخزن</span>
            {soldCount > 0 && <span style={{ color: '#888' }}>🔥 {soldCount} طلب في آخر 10 ساعات</span>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>الكمية:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid #e5e7eb', borderRadius: 8, width: 'fit-content', overflow: 'hidden' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 40, height: 40, background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: 18, color: '#555', fontFamily: 'inherit' }}>−</button>
              <span style={{ width: 48, textAlign: 'center', fontSize: 15, fontWeight: 700, borderRight: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb' }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                style={{ width: 40, height: 40, background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: 18, color: '#555', fontFamily: 'inherit' }}>+</button>
            </div>
          </div>

          <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{ width: '100%', background: buttonColor, color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 16, fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {shippingCost === 0 ? 'اطلب الآن — شحن مجاني 🌸' : 'اطلب الآن 🌸'}
          </button>

          {viewCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#888', marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
              {viewCount} عميل يشاهد هذا المنتج الآن
            </div>
          )}

          {[
            { icon: '💳', text: 'الدفع عند الاستلام' },
            { icon: '🚚', text: shippingCost === 0 ? 'شحن مجاني لجميع المناطق' : 'توصيل سريع 3-5 أيام' },
            { icon: '🔒', text: 'تسوق آمن ومضمون 100%' },
            { icon: '🧪', text: 'مختبر ومعتمد طبياً' },
            { icon: '🌿', text: 'مكونات طبيعية آمنة' },
            { icon: '↩️', text: 'إرجاع مجاني خلال 14 يوم' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i === 0 ? '1px solid #f0e8e8' : 'none', fontSize: 14, color: '#444' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f0e8e8' }} />

          <Accordion title="الوصف" open={descOpen} onToggle={() => setDescOpen(!descOpen)}>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.8 }}>
              {landingPage?.subheadline && <p style={{ marginBottom: 12 }}>{landingPage.subheadline}</p>}
              {benefits.map((b: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: accentColor }}>✦</span><span>{b}</span>
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion title="المكونات الرئيسية" open={ingredientsOpen} onToggle={() => setIngredientsOpen(!ingredientsOpen)}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['مقشر AHA', 'حمض الساليسيليك BHA', 'نياسيناميد', 'حمض الهيالورونيك', 'فيتامين C', 'ريتينول'].map((ing, i) => (
                <span key={i} style={{ background: '#f9f0f5', color: accentColor, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99, border: '1px solid #f0d8e8' }}>
                  {ing}
                </span>
              ))}
            </div>
          </Accordion>

          <Accordion title="الشحن والإرجاع" open={shipOpen} onToggle={() => setShipOpen(!shipOpen)}>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.8 }}>
              <p>• التوصيل خلال 3-5 أيام عمل</p>
              <p>• {shippingCost === 0 ? 'الشحن مجاني على جميع الطلبات' : `تكلفة الشحن ${shippingCost} ${currency}`}</p>
              <p>• إرجاع مجاني خلال 14 يوم</p>
              <p>• الدفع عند الاستلام</p>
            </div>
          </Accordion>
        </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid #f0e8e8' }}>
        <div className="b-bottom">

          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, color: '#111' }}>آراء العملاء</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: accentColor }}>4.8</div>
                <div style={{ color: '#f59e0b', fontSize: 18, margin: '4px 0' }}>⭐⭐⭐⭐⭐</div>
                <div style={{ fontSize: 13, color: '#888' }}>({reviewCount} تقييم)</div>
              </div>
              <div style={{ flex: 1 }}>
                {Object.entries(ratingDist).reverse().map(([star, pct]) => (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#888', minWidth: 20 }}>{star}★</span>
                    <div style={{ flex: 1, height: 8, background: '#f0e8e8', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: buttonColor, borderRadius: 99, width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#888', minWidth: 32 }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={formRef}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: accentColor, fontWeight: 700, marginBottom: 6 }}>🌸 أكمل طلبك</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>{landingPage?.headline || product?.title}</h3>
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>الدفع عند الاستلام • شحن آمن</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" style={inputStyle} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف" type="tel"
                style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }} />
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="العنوان تفصيلي" style={inputStyle} />

              {store?.show_note && (
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظات (اختياري)" rows={2}
                  style={{ ...inputStyle, resize: 'none' }} />
              )}

              {/* Bundle offers */}
              {activeOffers.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 8 }}>🌸 اختري العرض المناسب</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div onClick={() => setSelectedOffer(null)}
                      style={{ border: `2px solid ${!selectedOffer ? buttonColor : '#f0e8e8'}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: !selectedOffer ? '#fdf8fb' : '#fff' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${!selectedOffer ? buttonColor : '#d1b0a8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {!selectedOffer && <div style={{ width: 8, height: 8, borderRadius: '50%', background: buttonColor }} />}
                      </div>
                      <span style={{ fontSize: 13, flex: 1 }}>قطعة واحدة</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: buttonColor }}>{parseFloat(product?.price || 0)} {currency}</span>
                    </div>
                    {activeOffers.map((offer: any) => {
                      const isSelected = selectedOffer?.id === offer.id
                      const savings = Math.round(parseFloat(product?.price || 0) * offer.quantity - offer.price)
                      return (
                        <div key={offer.id} onClick={() => setSelectedOffer(offer)}
                          style={{ border: `2px solid ${isSelected ? buttonColor : '#f0e8e8'}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: isSelected ? '#fdf8fb' : '#fff' }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isSelected ? buttonColor : '#d1b0a8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: buttonColor }} />}
                          </div>
                          <span style={{ fontSize: 13, flex: 1 }}>{offer.quantity} قطع</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: buttonColor }}>{offer.price} {currency}</span>
                          {savings > 0 && <span style={{ fontSize: 11, background: buttonColor, color: '#fff', borderRadius: 4, padding: '2px 6px' }}>وفري {savings}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Bump upsell */}
              {upsellConfig?.type === 'bump' && upsellProduct && (
                <div onClick={() => setBumpChecked(!bumpChecked)}
                  style={{ border: `2px dashed ${bumpChecked ? accentColor : '#f59e0b'}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ background: bumpChecked ? accentColor : '#f59e0b', padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    🌸 عرض حصري — أضفيه الآن بسعر خاص!
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: bumpChecked ? '#fdf8fb' : '#fff' }}>
                    {upsellProduct.images?.[0] && <img src={upsellProduct.images[0]} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, border: '1px solid #f0e8e8', flexShrink: 0 }} />}
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

              <div style={{ background: '#fdf8fb', border: '1px solid #f0e8e8', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888', marginBottom: 6 }}>
                  <span>الشحن</span>
                  <span style={{ color: shippingCost === 0 ? '#16a34a' : '#111', fontWeight: 600 }}>
                    {shippingCost === 0 ? 'مجاني ✓' : `${shippingCost} ${currency}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800 }}>
                  <span>الإجمالي</span>
                  <span style={{ color: accentColor }}>{total} {currency}</span>
                </div>
              </div>

              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>{formError}</div>
              )}

              <button onClick={() => onSubmit({ name, phone, address, note, qty })} disabled={submitting}
                style={{ background: submitting ? '#d1b0a8' : buttonColor, color: '#fff', border: 'none', borderRadius: 10, padding: '16px', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {submitting ? '...' : (shippingCost === 0 ? 'اطلب الآن — شحن مجاني 🌸' : 'اطلب الآن 🌸')}
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, color: '#aaa', flexWrap: 'wrap' }}>
                <span>🔒 دفع عند الاستلام</span>
                <span>📦 شحن مضمون</span>
                <span>↩️ إرجاع مجاني</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#111', color: '#fff', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>{store?.name}</div>
        <div style={{ fontSize: 12, color: '#555' }}>© 2025 {store?.name}. جميع الحقوق محفوظة.</div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #f0e8e8', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: accentColor }}>{currency} {product?.price}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>الدفع عند الاستلام</div>
        </div>
        <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
          style={{ background: buttonColor, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          اطلب الآن 🌸
        </button>
      </div>

    </div>
  )
}
