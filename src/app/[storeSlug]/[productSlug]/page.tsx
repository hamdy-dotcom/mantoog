'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

const MARKET: Record<string, any> = {
  EGP: {
    dir: 'rtl',
    cta: 'اضغط هنا للشراء',
    ctaShort: 'اطلب الآن',
    freeShipping: 'شحن مجاني لجميع محافظات مصر',
    stockText: (n: number) => `فقط متبقي ${n} قطعة`,
    codText: 'الدفع عند الاستلام',
    returnText: 'إرجاع مجاني',
    originalText: 'منتج أصلي',
    regionLabel: 'المحافظة',
    submitLabel: 'اضغط هنا للشراء',
    namePlaceholder: 'الاسم',
    phonePlaceholder: '01xxxxxxxxx',
    urgencyLabel: 'ينتهي العرض في',
    days: 'أيام', hours: 'ساعات', mins: 'دقائق', secs: 'ثواني',
    addToCart: 'أضف للسلة',
    shippingLabel: 'تكلفة الشحن',
    shippingFree: 'شحن مجاني',
    totalLabel: 'الإجمالي',
    qtyLabel: 'عدد القطع',
    orderFormTitle: 'يرجى ادخال معلوماتك لإكمال الطلب',
    socialNames: ['أحمد','محمد','علي','عمر','يوسف','سارة','مريم','نور','ليلى','هنا'],
    regions: ['القاهرة','الجيزة','الإسكندرية','الدقهلية','البحيرة','الفيوم','الغربية','الإسماعيلية','المنوفية','المنيا','القليوبية','السويس','أسوان','أسيوط','بني سويف','بورسعيد','دمياط','الشرقية','سوهاج','قنا','كفر الشيخ','مطروح','الأقصر','البحر الأحمر','جنوب سيناء','شمال سيناء','الوادي الجديد'],
  },
  SAR: {
    dir: 'rtl',
    cta: 'اطلب الآن 🚀',
    ctaFree: 'اطلب الآن والتوصيل مجاني 🚀',
    ctaShort: 'اطلب الآن',
    freeShipping: 'توصيل مجاني لجميع مناطق المملكة',
    stockText: (n: number) => `تبقى ${n} قطعة فقط`,
    codText: 'الدفع عند الاستلام',
    returnText: 'إرجاع مجاني',
    originalText: 'منتج أصلي',
    regionLabel: 'المنطقة',
    submitLabel: 'اطلب الآن والتوصيل مجاني 🚀',
    namePlaceholder: 'الاسم',
    phonePlaceholder: '05xxxxxxxx',
    urgencyLabel: 'ينتهي العرض في',
    days: 'أيام', hours: 'ساعات', mins: 'دقائق', secs: 'ثواني',
    addToCart: 'أضف للسلة',
    shippingLabel: 'تكلفة الشحن',
    shippingFree: 'شحن مجاني',
    totalLabel: 'الإجمالي',
    qtyLabel: 'عدد القطع',
    orderFormTitle: 'يرجى ادخال معلوماتك لإكمال الطلب',
    socialNames: ['محمد','عبدالله','سلطان','فيصل','خالد','نورة','ريم','لينا','سارة','هيا'],
    regions: ['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الطائف','تبوك','أبها','القصيم','حائل','جازان','نجران','الباحة','الجوف','عسير','المنطقة الشرقية'],
  },
  AED: {
    dir: 'rtl',
    cta: 'اطلب الآن 🚀',
    ctaFree: 'اطلب الآن والتوصيل مجاني 🚀',
    ctaShort: 'اطلب الآن',
    freeShipping: 'توصيل مجاني لجميع الإمارات',
    stockText: (n: number) => `تبقى ${n} قطعة فقط`,
    codText: 'الدفع عند الاستلام',
    returnText: 'إرجاع مجاني',
    originalText: 'منتج أصلي',
    regionLabel: 'الإمارة',
    submitLabel: 'اطلب الآن والتوصيل مجاني 🚀',
    namePlaceholder: 'الاسم',
    phonePlaceholder: '05xxxxxxxx',
    urgencyLabel: 'ينتهي العرض في',
    days: 'أيام', hours: 'ساعات', mins: 'دقائق', secs: 'ثواني',
    addToCart: 'أضف للسلة',
    shippingLabel: 'تكلفة الشحن',
    shippingFree: 'شحن مجاني',
    totalLabel: 'الإجمالي',
    qtyLabel: 'عدد القطع',
    orderFormTitle: 'يرجى ادخال معلوماتك لإكمال الطلب',
    socialNames: ['محمد','أحمد','علي','خالد','سارة','فاطمة','مريم','نور'],
    regions: ['أبوظبي','دبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين'],
  },
  MAD: {
    dir: 'rtl',
    cta: 'اطلب دابا 🚀',
    ctaFree: 'اطلب دابا والتوصيل مجاني 🚀',
    ctaShort: 'اطلب دابا',
    freeShipping: 'التوصيل مجاني لجميع مناطق المغرب',
    stockText: (n: number) => `غير بقا ${n} قطعة`,
    codText: 'الأداء عند الاستلام',
    returnText: 'الإرجاع مجاني',
    originalText: 'منتج أصلي',
    regionLabel: 'المدينة',
    submitLabel: 'اطلب دابا والتوصيل مجاني 🚀',
    namePlaceholder: 'الاسم',
    phonePlaceholder: '06xxxxxxxx',
    urgencyLabel: 'العرض كيتما خلال',
    days: 'أيام', hours: 'ساعات', mins: 'دقائق', secs: 'ثواني',
    addToCart: 'أضف للسلة',
    shippingLabel: 'تكلفة التوصيل',
    shippingFree: 'مجاني',
    totalLabel: 'المجموع',
    qtyLabel: 'الكمية',
    orderFormTitle: 'أدخل معلوماتك لإتمام الطلب',
    socialNames: ['محمد','يوسف','أمين','إيمان','سلمى','ريم','خديجة','عمر'],
    regions: ['الدار البيضاء','الرباط','فاس','مراكش','طنجة','أكادير','مكناس','وجدة','القنيطرة','تطوان'],
  },
  DZD: {
    dir: 'rtl',
    cta: 'اطلب درك 🚀',
    ctaFree: 'اطلب درك والتوصيل مجاني 🚀',
    ctaShort: 'اطلب درك',
    freeShipping: 'التوصيل مجاني لجميع ولايات الجزائر',
    stockText: (n: number) => `بقا ${n} قطعة فقط`,
    codText: 'الدفع عند الاستلام',
    returnText: 'الإرجاع مجاني',
    originalText: 'منتج أصلي',
    regionLabel: 'الولاية',
    submitLabel: 'اطلب درك والتوصيل مجاني 🚀',
    namePlaceholder: 'الاسم',
    phonePlaceholder: '05xxxxxxxx',
    urgencyLabel: 'العرض ينتهي خلال',
    days: 'أيام', hours: 'ساعات', mins: 'دقائق', secs: 'ثواني',
    addToCart: 'أضف للسلة',
    shippingLabel: 'تكلفة التوصيل',
    shippingFree: 'مجاني',
    totalLabel: 'المجموع',
    qtyLabel: 'الكمية',
    orderFormTitle: 'أدخل معلوماتك لإتمام الطلب',
    socialNames: ['محمد','يوسف','أمين','إسلام','أيوب','سارة','إيمان','خديجة'],
    regions: ['الجزائر العاصمة','وهران','قسنطينة','عنابة','بلعباس','باتنة','الشلف','سطيف','بسكرة','تلمسان','تيزي وزو','البليدة','بجاية','ورقلة'],
  },
  USD: {
    dir: 'ltr',
    cta: 'Order Now 🚀',
    ctaFree: 'Order Now — Free Shipping 🚀',
    ctaShort: 'Order Now',
    freeShipping: 'Free shipping worldwide',
    stockText: (n: number) => `Only ${n} left in stock`,
    codText: 'Cash on Delivery',
    returnText: 'Free Returns',
    originalText: 'Original Product',
    regionLabel: 'City',
    submitLabel: 'Order Now — Free Shipping 🚀',
    namePlaceholder: 'Full Name',
    phonePlaceholder: '+1 xxx xxx xxxx',
    urgencyLabel: 'Offer ends in',
    days: 'Days', hours: 'Hours', mins: 'Mins', secs: 'Secs',
    addToCart: 'Add to Cart',
    shippingLabel: 'Shipping',
    shippingFree: 'Free',
    totalLabel: 'Total',
    qtyLabel: 'Quantity',
    orderFormTitle: 'Enter your details to complete order',
    socialNames: ['James','Emma','Liam','Olivia','Noah','Ava','William','Sophia'],
    regions: [],
  },
}

function getInitialStock() { return Math.floor(Math.random() * 9) + 7 }
function getInitialTimer() {
  const h = Math.floor(Math.random() * 6) + 18
  return h * 3600 + Math.floor(Math.random() * 3600)
}
function getRandomOrder(m: any) {
  const name = m.socialNames[Math.floor(Math.random() * m.socialNames.length)]
  const region = m.regions.length > 0 ? m.regions[Math.floor(Math.random() * m.regions.length)] : 'your area'
  const mins = Math.floor(Math.random() * 8) + 1
  return { name, region, mins }
}

export default function LandingPage() {
  const params = useParams()
  const supabase = createClient()
  const [store, setStore] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [landingPage, setLandingPage] = useState<any>(null)
  const [sections, setSections] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [m, setM] = useState<any>(MARKET.EGP)
  const [activeImg, setActiveImg] = useState(0)
  const [stock, setStock] = useState(getInitialStock())
  const [timer, setTimer] = useState(getInitialTimer())
  const [socialProof, setSocialProof] = useState<any>(null)
  const [showSocial, setShowSocial] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [address, setAddress] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [showSticky, setShowSticky] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const storeSlug = params.storeSlug as string
      const productSlug = params.productSlug as string
      const { data: storeData } = await supabase.from('stores').select('*').eq('slug', storeSlug).single()
      if (!storeData) { setNotFound(true); setLoading(false); return }
      setStore(storeData)
      const market = MARKET[storeData.currency] || MARKET.EGP
      setM(market)
      const { data: productData } = await supabase.from('products').select('*').eq('id', productSlug).eq('store_id', storeData.id).single()
      if (!productData) { setNotFound(true); setLoading(false); return }
      setProduct(productData)
      const { data: lpData } = await supabase.from('landing_pages').select('*').eq('product_id', productData.id).single()
      if (lpData) {
        setLandingPage(lpData)
        try { setSections(typeof lpData.sections === 'string' ? JSON.parse(lpData.sections) : lpData.sections) } catch {}
      }

      // Increment visit count
      if (lpData) {
        await supabase
          .from('landing_pages')
          .update({ visits: (lpData.visits || 0) + 1 })
          .eq('id', lpData.id)
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const i = setInterval(() => setTimer(t => t > 0 ? t - 1 : 0), 1000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    const i = setInterval(() => setStock(s => s > 3 ? s - 1 : s), Math.random() * 300000 + 180000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    if (!store) return
    const show = () => { setSocialProof(getRandomOrder(m)); setShowSocial(true); setTimeout(() => setShowSocial(false), 5000) }
    const t = setTimeout(() => { show(); setInterval(() => show(), Math.random() * 45000 + 45000) }, Math.random() * 15000 + 10000)
    return () => clearTimeout(t)
  }, [store])

  useEffect(() => {
    const handleScroll = () => {
      if (formRef.current) {
        const rect = formRef.current.getBoundingClientRect()
        setShowSticky(rect.top > window.innerHeight)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatTimer = (s: number) => {
    const days = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600).toString().padStart(2, '0')
    const min = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return { days, h, min, sec }
  }

  const shippingCost = store && product
    ? (store.shipping_type === 'static'
      ? (store.static_shipping_cost || 0)
      : (product.shipping_cost || 0))
    : 0
  const total = product ? ((product.price * qty) + shippingCost).toFixed(2) : '0'
  const t = formatTimer(timer)
  const primaryColor = store?.primary_color || '#2563eb'
  const benefits: string[] = sections?.benefits || []

  const handleSubmit = async () => {
    if (!name.trim()) { setFormError(m.dir === 'rtl' ? 'من فضلك اكتب اسمك' : 'Please enter your name'); return }
    if (!phone.trim()) { setFormError(m.dir === 'rtl' ? 'من فضلك اكتب رقم هاتفك' : 'Please enter your phone'); return }
    if (m.regions.length > 0 && !region) { setFormError(m.dir === 'rtl' ? 'من فضلك اختار المنطقة' : 'Please select region'); return }
    if (!address.trim()) { setFormError(m.dir === 'rtl' ? 'من فضلك اكتب عنوانك بالتفصيل' : 'Please enter your full address'); return }
    setFormError('')
    setSubmitting(true)
    const { error } = await supabase.from('orders').insert({
      store_id: store.id,
      merchant_id: store.merchant_id,
      product_id: product.id,
      customer_name: name,
      customer_phone: phone,
      address_governorate: region,
      address_line1: address,
      address_country: store.currency === 'EGP' ? 'EG' : store.currency === 'SAR' ? 'SA' : 'AE',
      quantity: qty,
      unit_price: product.price,
      total_price: parseFloat(total),
      currency: store.currency,
      shipping_price: shippingCost,
      payment_method: 'cod',
      status: 'pending',
    })
    setSubmitting(false)
    if (!error) {
      const totalPrice = parseFloat(total)
      if (typeof window !== 'undefined') {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            currency: store.currency,
            value: totalPrice,
            content_name: product.title,
          })
        }
        if ((window as any).ttq) {
          (window as any).ttq.track('PlaceAnOrder', {
            currency: store.currency,
            value: totalPrice,
            content_name: product.title,
          })
        }
      }
      setSubmitted(true)
    } else {
      setFormError(m.dir === 'rtl' ? 'حصل خطأ، حاول تاني' : 'Something went wrong, please try again')
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}><div style={{ color: '#999' }}>Loading...</div></div>
  if (notFound) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui' }}><div style={{ fontSize: 48 }}>📦</div><div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>Product not found</div></div>
  if (submitted) return (
    <div dir={m.dir} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center', fontFamily: 'system-ui', background: '#f9fafb' }}>
      <div style={{ fontSize: 72 }}>✅</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#111' }}>{m.dir === 'rtl' ? 'تم استلام طلبك!' : 'Order Received!'}</div>
      <div style={{ fontSize: 16, color: '#555', maxWidth: 360, lineHeight: 1.7 }}>{m.dir === 'rtl' ? `شكراً ${name}! هيتواصل معاك فريقنا خلال 24 ساعة لتأكيد الطلب.` : `Thank you ${name}! Our team will contact you within 24 hours.`}</div>
    </div>
  )

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, boxSizing: 'border-box', direction: m.dir as any, fontFamily: 'system-ui', outline: 'none', background: '#fff' }
  const images = product?.images || []

  return (
    <>
      {store.meta_pixel_id && (
        <>
          <script dangerouslySetInnerHTML={{ __html: [
            "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');",
            "fbq('init', '" + store.meta_pixel_id + "');",
            "fbq('track', 'PageView');",
            "fbq('track', 'ViewContent', {content_name: '" + (product.title || '').replace(/'/g, "\\'") + "', currency: '" + store.currency + "', value: " + product.price + "});",
          ].join('\n') }} />
          <noscript><img height="1" width="1" style={{display:'none'}} src={"https://www.facebook.com/tr?id=" + store.meta_pixel_id + "&ev=PageView&noscript=1"} alt="" /></noscript>
        </>
      )}

      {store.tiktok_pixel_id && (
        <script dangerouslySetInnerHTML={{ __html: [
          "!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement('script');o.type='text/javascript';o.async=!0;o.src=i+'?sdkid='+e+'&lib='+t;var a=document.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)};",
          "ttq.load('" + store.tiktok_pixel_id + "');",
          "ttq.page();",
          "ttq.track('ViewContent', {content_name: '" + (product.title || '').replace(/'/g, "\\'") + "', currency: '" + store.currency + "', value: " + product.price + "});",
          "}(window,document,'ttq');",
        ].join('\n') }} />
      )}

    <div dir={m.dir} style={{ fontFamily: 'system-ui, -apple-system, Arial, sans-serif', background: '#fff', minHeight: '100vh', color: '#111' }}>
      <style>{`
        * { box-sizing: border-box; }
        .lp-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
        .lp-cols { display: flex; gap: 48px; align-items: flex-start; }
        .lp-img-col { width: 48%; flex-shrink: 0; }
        .lp-info-col { flex: 1; }
        .thumb-strip { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .thumb { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; cursor: pointer; flex-shrink: 0; }
        .lp-checkout { max-width: 1100px; margin: 0 auto; padding: 0 24px 60px; }
        @media (max-width: 768px) {
          .lp-cols { flex-direction: column; gap: 0; }
          .lp-img-col { width: 100%; }
          .lp-wrap { padding: 0; }
          .lp-checkout { padding: 0 16px 80px; }
        }
        @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .timer-block { display: flex; flex-direction: column; align-items: center; background: #1f2937; color: #fff; border-radius: 8px; padding: 8px 14px; min-width: 56px; }
        .timer-num { font-size: 26px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
        .timer-label { font-size: 11px; margin-top: 4px; color: #9ca3af; }
        .timer-sep { font-size: 24px; font-weight: 800; color: #1f2937; align-self: flex-start; padding-top: 8px; }
      `}</style>

      {/* Urgency top bar */}
      <div style={{ background: '#ef4444', color: '#fff', padding: '10px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span>⏱️ {m.urgencyLabel}:</span>
        <span style={{ background: '#c00', borderRadius: 6, padding: '2px 10px', fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>{`${t.days}d ${t.h}:${t.min}:${t.sec}`}</span>
        <span>·</span>
        <span>🚚 {m.freeShipping}</span>
      </div>

      <div className="lp-wrap">
        <div className="lp-cols">

          {/* IMAGE COLUMN — always rendered first for LTR, second for RTL via flex-direction */}
          <div className="lp-img-col" style={{ order: m.dir === 'rtl' ? 2 : 1 }}>
            {images.length > 0 ? (
              <div>
                <img
                  src={images[activeImg]}
                  alt={product?.title}
                  style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: 12, display: 'block', background: '#f8f9fa' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {images.length > 1 && (
                  <div className="thumb-strip">
                    {images.map((img: string, i: number) => (
                      <img
                        key={i}
                        src={img}
                        className="thumb"
                        onClick={() => setActiveImg(i)}
                        style={{ border: activeImg === i ? `2px solid ${primaryColor}` : '2px solid #e5e7eb' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>📦</div>
            )}
          </div>

          {/* INFO COLUMN */}
          <div className="lp-info-col" style={{ order: m.dir === 'rtl' ? 1 : 2 }}>

            <div style={{ marginBottom: 8 }}>
              <span style={{ background: '#f3f4f6', color: '#555', fontSize: 13, padding: '4px 12px', borderRadius: 99, fontWeight: 500 }}>
                {m.dir === 'rtl' ? 'الأكثر مبيعاً' : 'Best Seller'}
              </span>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.3, color: '#111' }}>
              {landingPage?.headline || product?.title}
            </h1>

            {landingPage?.subheadline && (
              <p style={{ fontSize: 15, color: '#555', margin: '0 0 16px', lineHeight: 1.5 }}>{landingPage.subheadline}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: '#111' }}>{product?.price} {store?.currency}</span>
              {product?.compare_at_price && (
                <>
                  <span style={{ fontSize: 18, color: '#999', textDecoration: 'line-through' }}>{product.compare_at_price} {store?.currency}</span>
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                    {Math.round((1 - product.price / product.compare_at_price) * 100)}% {m.dir === 'rtl' ? 'خصم' : 'OFF'}
                  </span>
                </>
              )}
            </div>

            {/* Countdown */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 15, fontWeight: 600, color: '#111' }}>
                🔥 <span>{m.urgencyLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div className="timer-block"><span className="timer-num">{t.days.toString().padStart(2,'0')}</span><span className="timer-label">{m.days}</span></div>
                <span className="timer-sep">:</span>
                <div className="timer-block"><span className="timer-num">{t.h}</span><span className="timer-label">{m.hours}</span></div>
                <span className="timer-sep">:</span>
                <div className="timer-block"><span className="timer-num">{t.min}</span><span className="timer-label">{m.mins}</span></div>
                <span className="timer-sep">:</span>
                <div className="timer-block"><span className="timer-num">{t.sec}</span><span className="timer-label">{m.secs}</span></div>
              </div>
            </div>

            {/* Stock bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>🔥 {m.stockText(stock)}</span>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{m.dir === 'rtl' ? 'اطلب قبل نفاذ الكمية' : 'Order before it runs out'}</span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(to left, #ef4444, #f97316, #22c55e)', width: `${Math.min((stock / 15) * 100, 100)}%`, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Benefits */}
            {benefits.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {benefits.map((b: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 14, color: '#222', alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0 }}>✅</span><span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20, textAlign: 'center' }}>
              {[
                { icon: '💵', text: m.codText },
                { icon: '🚚', text: m.freeShipping.split(' ').slice(0, 2).join(' ') },
                { icon: '↩️', text: m.returnText },
                { icon: '✅', text: m.originalText },
              ].map((b, i) => (
                <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{b.icon}</div>
                  <div style={{ fontSize: 10, color: '#555', fontWeight: 500, lineHeight: 1.3 }}>{b.text}</div>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                style={{ flex: 2, background: primaryColor, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
              >
                {shippingCost === 0
                  ? (m.ctaFree || 'اطلب الان والتوصيل مجاني 🚀')
                  : (m.cta || 'اطلب الان 🚀')}
              </button>
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                style={{ flex: 1, background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                {m.addToCart}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* CHECKOUT SECTION */}
      <div className="lp-checkout">
        {sections?.description_long && (
          <div style={{ maxWidth: 800, margin: '0 auto 32px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', direction: m.dir as any }}>
            <div style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 20, background: primaryColor, borderRadius: 99, flexShrink: 0 }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>
                {m.dir === 'rtl' ? 'تفاصيل المنتج' : 'Product Details'}
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              {benefits.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {benefits.map((b: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
                      <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, fontWeight: 500 }}>{b}</span>
                    </div>
                  ))}
                </div>
              )}
              {benefits.length > 0 && <div style={{ height: 1, background: '#e5e7eb', marginBottom: 20 }} />}
              <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.9 }}>
                {sections.description_long.split('\n').filter((p: string) => p.trim()).map((paragraph: string, i: number) => (
                  <p key={i} style={{ margin: '0 0 12px' }}>{paragraph}</p>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
                {sections?.urgency_text && (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⚡</span>
                    <span style={{ fontSize: 13, color: '#c2410c', fontWeight: 600 }}>{sections.urgency_text}</span>
                  </div>
                )}
                {sections?.trust_text && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🛡️</span>
                    <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{sections.trust_text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={formRef} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 28, maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, textAlign: 'center', color: '#111' }}>
            {m.orderFormTitle}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={m.namePlaceholder} style={inputStyle} />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={m.phonePlaceholder} type="tel" style={{ ...inputStyle, direction: 'ltr', textAlign: m.dir === 'rtl' ? 'right' : 'left' }} />
            {m.regions.length > 0 && (
              <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle, color: region ? '#111' : '#9ca3af' }}>
                <option value="">{m.regionLabel}</option>
                {m.regions.map((r: string) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={m.dir === 'rtl' ? 'العنوان بالتفصيل (الشارع، المبنى، الدور)' : 'Full address (street, building, floor)'}
              style={inputStyle}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ fontSize: 14, color: '#555' }}>{m.qtyLabel}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#555' }}>
                <span>{m.shippingLabel}</span>
                <span style={{ color: shippingCost === 0 ? '#16a34a' : '#111', fontWeight: 600 }}>
                  {shippingCost === 0
                    ? (m.freeShipping || 'شحن مجاني ✓')
                    : `${shippingCost} ${store?.currency}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: '#111' }}>
                <span>{m.totalLabel}</span>
                <span>{total} {store?.currency}</span>
              </div>
            </div>
            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>{formError}</div>
            )}
            <button
              onClick={() => {
                const totalPrice = parseFloat(total)
                if (typeof window !== 'undefined') {
                  if ((window as any).fbq) {
                    (window as any).fbq('track', 'InitiateCheckout', {
                      currency: store.currency,
                      value: totalPrice,
                    })
                  }
                  if ((window as any).ttq) {
                    (window as any).ttq.track('InitiateCheckout', {
                      currency: store.currency,
                      value: totalPrice,
                    })
                  }
                }
                handleSubmit()
              }}
              disabled={submitting}
              style={{ background: submitting ? '#9ca3af' : primaryColor, color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: 18, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', width: '100%' }}
            >
              {submitting ? '...' : (shippingCost === 0
                ? (m.ctaFree || 'اطلب الان والتوصيل مجاني 🚀')
                : (m.cta || 'اطلب الان 🚀'))}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      {showSticky && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{product?.price} {store?.currency}</div>
            {product?.compare_at_price && <div style={{ fontSize: 12, color: '#999', textDecoration: 'line-through' }}>{product.compare_at_price} {store?.currency}</div>}
          </div>
          <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ background: primaryColor, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {m.ctaShort} 🚀
          </button>
        </div>
      )}

      {/* Social proof popup */}
      {showSocial && socialProof && (
        <div style={{ position: 'fixed', bottom: 20, left: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 101, maxWidth: 260, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideIn 0.3s ease' }}>
          <div style={{ fontSize: 28 }}>🛍️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', direction: m.dir as any }}>
              {m.dir === 'rtl' ? `${socialProof.name} من ${socialProof.region}` : `${socialProof.name} from ${socialProof.region}`}
            </div>
            <div style={{ fontSize: 12, color: '#16a34a' }}>
              {m.dir === 'rtl' ? `طلب منذ ${socialProof.mins} دقيقة ✓` : `Ordered ${socialProof.mins} min ago ✓`}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
