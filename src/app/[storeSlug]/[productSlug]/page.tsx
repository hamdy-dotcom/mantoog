'use client'

import { useEffect, useState, useRef } from 'react'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import FashionTheme from '@/components/landing/FashionTheme'
import BeautyTheme from '@/components/landing/BeautyTheme'
import HomeTheme from '@/components/landing/HomeTheme'

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
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [showSticky, setShowSticky] = useState(false)
  const [pickedLocation, setPickedLocation] = useState<{lat: number, lng: number, address: string} | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const allReviewsRef = useRef<HTMLDivElement>(null)

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

      // Increment visit count via API
      if (lpData) {
        fetch('/api/track-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landing_page_id: lpData.id }),
        }).catch(() => {})
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

  useEffect(() => {
    (window as any).__setPickedLocation = setPickedLocation
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
  const isMapAddress = store?.address_mode === 'map' || (!store?.address_mode && store?.enable_location)
  const total = store?.show_quantity
    ? (parseFloat(product?.price || 0) * qty + parseFloat(shippingCost || 0)).toFixed(0)
    : (parseFloat(product?.price || 0) + parseFloat(shippingCost || 0)).toFixed(0)
  const t = formatTimer(timer)
  const primaryColor = store?.primary_color || '#2563eb'

  const THEMES: Record<string, any> = {
    classic: {
      bg: '#ffffff',
      pageBg: '#f9fafb',
      text: '#111111',
      subtext: '#555555',
      accent: primaryColor || '#3b82f6',
      timerBg: '#1f2937',
      timerText: '#ffffff',
      urgencyBg: '#ef4444',
      cardBg: '#ffffff',
      cardBorder: '#e5e7eb',
      formBg: '#f0f0f0',
      badgeBg: '#f9fafb',
      font: 'system-ui, Arial, sans-serif',
      heroStyle: 'split',
      ctaSuffix: '🚀',
    },
    fashion: {
      bg: '#0a0a0a',
      pageBg: '#0a0a0a',
      text: '#ffffff',
      subtext: '#a0a0a0',
      accent: '#d4a853',
      timerBg: '#1a1a1a',
      timerText: '#d4a853',
      urgencyBg: '#1a1a1a',
      cardBg: '#111111',
      cardBorder: '#2a2a2a',
      formBg: '#111111',
      badgeBg: '#1a1a1a',
      font: 'system-ui, Arial, sans-serif',
      heroStyle: 'fullwidth',
      ctaSuffix: '✨',
    },
    home: {
      bg: '#fdf6ee',
      pageBg: '#fdf6ee',
      text: '#2d1810',
      subtext: '#7a5c4a',
      accent: '#e07b39',
      timerBg: '#2d1810',
      timerText: '#fdf6ee',
      urgencyBg: '#e07b39',
      cardBg: '#ffffff',
      cardBorder: '#e8d5c0',
      formBg: '#f5ece0',
      badgeBg: '#fff8f0',
      font: 'system-ui, Arial, sans-serif',
      heroStyle: 'split',
      ctaSuffix: '🏠',
    },
    beauty: {
      bg: '#fff5f8',
      pageBg: '#fff5f8',
      text: '#4a1030',
      subtext: '#8b4060',
      accent: '#e91e8c',
      timerBg: '#4a1030',
      timerText: '#ffffff',
      urgencyBg: '#e91e8c',
      cardBg: '#ffffff',
      cardBorder: '#f5c2d8',
      formBg: '#fce8f0',
      badgeBg: '#fff0f5',
      font: 'system-ui, Arial, sans-serif',
      heroStyle: 'split',
      ctaSuffix: '💄',
    },
  }

  const th = THEMES[store?.theme || 'classic'] || THEMES.classic
  const benefits: string[] = sections?.benefits || []

  const handleSubmit = async (overrides?: { name?: string; phone?: string; address?: string; note?: string; qty?: number }) => {
    const submitName = overrides?.name ?? name
    const submitPhone = overrides?.phone ?? phone
    const submitAddress = overrides?.address ?? address
    const submitNote = overrides?.note ?? note
    const submitQty = overrides?.qty ?? qty

    if (!submitName.trim()) { setFormError(m.dir === 'rtl' ? 'من فضلك اكتب اسمك' : 'Please enter your name'); return }
    if (!submitPhone.trim()) { setFormError(m.dir === 'rtl' ? 'من فضلك اكتب رقم هاتفك' : 'Please enter your phone'); return }
    if (isMapAddress && store?.location_required && !pickedLocation) {
      setFormError(m.dir === 'rtl' ? 'يرجى تحديد موقعك على الخريطة' : 'Please pin your location on the map')
      return
    }
    if (!isMapAddress && !submitAddress.trim()) {
      setFormError(m.dir === 'rtl' ? 'يرجى إدخال العنوان' : 'Please enter your address')
      return
    }
    if (store?.show_note && store?.note_required && !submitNote.trim()) {
      setFormError(m.dir === 'rtl' ? 'يرجى إدخال ملاحظاتك' : 'Please enter your note')
      return
    }
    setFormError('')
    setSubmitting(true)
    const orderQty = store?.show_quantity ? submitQty : 1
    const orderTotal = product.price * orderQty + shippingCost
    const { error } = await supabase.from('orders').insert({
      store_id: store.id,
      merchant_id: store.merchant_id,
      product_id: product.id,
      customer_name: submitName,
      customer_phone: submitPhone,
      address_governorate: region,
      address_line1: isMapAddress ? (pickedLocation?.address || '') : submitAddress,
      address_country: store.currency === 'EGP' ? 'EG' : store.currency === 'SAR' ? 'SA' : 'AE',
      quantity: orderQty,
      note: store?.show_note ? submitNote : null,
      unit_price: product.price,
      total_price: orderTotal,
      currency: store.currency,
      shipping_price: shippingCost,
      payment_method: 'cod',
      status: 'pending',
      lat: pickedLocation?.lat || null,
      lng: pickedLocation?.lng || null,
      map_link: pickedLocation ? `https://maps.google.com/?q=${pickedLocation.lat},${pickedLocation.lng}` : null,
      location_address: pickedLocation?.address || null,
    })
    setSubmitting(false)
    if (!error) {
      if (typeof window !== 'undefined') {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            currency: store.currency,
            value: orderTotal,
            content_name: product.title,
          })
        }
        if ((window as any).ttq) {
          (window as any).ttq.track('PlaceAnOrder', {
            content_id: product.id,
            content_name: product.title,
            currency: store.currency,
            value: orderTotal,
            quantity: orderQty,
          })
        }
      }
      setName(submitName)
      setPhone(submitPhone)
      setAddress(submitAddress)
      setNote(submitNote)
      setQty(submitQty)
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

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: `1px solid ${th.cardBorder}`, borderRadius: 8, fontSize: 15, boxSizing: 'border-box', direction: m.dir as any, fontFamily: th.font, outline: 'none', background: th.cardBg, color: th.text }
  const images = product?.images || []

  const REVIEWS_DATA = {
    ar: {
      names: [
        'محمد أحمد', 'خالد محمد', 'فيصل الأحمد', 'عمر حسن', 'سامي العمري',
        'يوسف إبراهيم', 'أحمد علي', 'عبدالله السالم', 'تركي الغامدي', 'ناصر الشمري',
        'وليد الحربي', 'بندر القحطاني', 'سعد المطيري', 'ماجد الزهراني', 'عادل العتيبي',
        'راشد الدوسري', 'هاني الشهري', 'كريم جابر', 'طارق مصطفى', 'حسام الدين',
        'نورة السالم', 'سارة محمد', 'ريم العبدالله', 'هند الفهد', 'لينا العمر'
      ],
      comments: [
        'منتج ممتاز! وصل بسرعة والجودة أحسن من المتوقع 🔥',
        'وصل في 3 أيام وشغال تمام، نصحت فيه كل أصحابي',
        'صراحة مش متوقع الجودة دي بالسعر ده، شكراً جزيلاً',
        'جربت منتجات مشابهة بس ده الأحسن بكتير، راضي جداً',
        'المنتج كويس بس التغليف كان بسيط شوية، غير كده تمام',
        'اشتريته لأهلي وكلهم انبسطوا منه، سأطلب مرة ثانية',
        'يستاهل السعر وزيادة، شكراً على الجودة',
        'جيد بس كنت متوقع يكون أسرع في التوصيل، المنتج نفسه ممتاز',
        'تجربة شراء ممتازة من البداية للنهاية',
        'المنتج طبق الوصف تماماً، سعيد بالشراء',
        'أفضل شراء عملته هذا الشهر بصراحة',
        'الجودة عالية والسعر مناسب، أنصح فيه',
        'وصلني بحالة ممتازة والتغليف محترم',
        'استخدمته أسبوع وما في أي مشكلة، ممتاز',
        'أطلبت كمان واحد لصاحبي بعد ما شافه',
        'ما توقعت يكون بهذا الشكل، جميل جداً',
        'للأمانة المنتج تجاوز توقعاتي بشكل كبير',
        'بسيط وعملي وشغال زين، ما عندي أي شكوى',
        'التوصيل كان سريع والمنتج بحالة ممتازة',
        'اشتريته بناءً على توصية صديق ولم أندم أبداً',
        'جودة ممتازة وسعر معقول، تجربة ناجحة',
        'تاني مرة أشتري من هنا والخدمة دايماً ممتازة',
        'منتج رائع يستحق التجربة بجد',
        'وصل مطابق للصور، راضي عن الشراء',
        'أنصح الجميع بتجربته، لن تندم'
      ],
      ratings: [5,5,5,5,4,5,5,4,5,5,5,5,5,5,5,5,5,4,5,5,5,5,5,5,5],
    },
    en: {
      names: [
        'Mohammed A.', 'Ahmed K.', 'Omar H.', 'Khalid M.', 'Yusuf I.',
        'Sara L.', 'Emma R.', 'James T.', 'David M.', 'Sarah K.',
        'Ali H.', 'Nora S.', 'Lina M.', 'Reem F.', 'Adam B.',
        'Hana R.', 'Tariq M.', 'Layla K.', 'Ziad A.', 'Mona S.'
      ],
      comments: [
        'Excellent product! Fast delivery and quality better than expected 🔥',
        'Arrived in 3 days, works perfectly. Recommended to all my friends!',
        'Amazing quality for the price, highly recommend!',
        'Good product, packaging was simple but the item itself is great',
        'Tried similar products but this is by far the best',
        'Bought it for family, everyone loved it. Will order again!',
        'Delivery took slightly longer than expected, but product is excellent',
        'Very happy with my purchase, exactly as described',
        'Great value for money, will definitely buy again',
        'Simple, practical and works perfectly. No complaints at all',
        'Second time ordering and quality is always consistent',
        'Best purchase I made this month honestly',
        'Received in perfect condition, very well packaged',
        'Used it for a week now with zero issues, excellent',
        'Ordered one for my friend after he saw mine',
        'Didn\'t expect this quality at this price point, impressed',
        'Everything was smooth from ordering to delivery',
        'Exactly what I needed, works like a charm',
        'Solid product, would recommend to anyone',
        'Great experience overall, will shop here again'
      ],
      ratings: [5,5,5,4,5,5,4,5,5,4,5,5,5,5,5,5,5,5,5,5],
    }
  }

  const getReviews = () => {
    const seed = product?.id
      ? product.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
      : 42
    const lang_key = m.dir === 'rtl' ? 'ar' : 'en'
    const data = REVIEWS_DATA[lang_key]
    const reviewCount = (seed % 15) + 11

    const seededRandom = (s: number) => {
      let x = Math.sin(s) * 10000
      return x - Math.floor(x)
    }

    const shuffleWithSeed = (arr: any[], s: number) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(s + i) * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    const shuffledNames = shuffleWithSeed(data.names, seed)
    const shuffledComments = shuffleWithSeed(
      data.comments.map((c, i) => ({ c, r: data.ratings[i] })),
      seed + 99
    )

    const reviews = Array.from({ length: reviewCount }, (_, i) => {
      const daysAgo = i * 2 + 1
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      const dateStr = m.dir === 'rtl'
        ? `${daysAgo} ${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][date.getMonth()]}`
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      const commentObj = shuffledComments[i % shuffledComments.length]
      return {
        name: shuffledNames[i % shuffledNames.length],
        comment: commentObj.c,
        rating: commentObj.r,
        date: dateStr,
      }
    })

    return { reviews, reviewCount }
  }

  // Theme routing
  if (store?.theme === 'fashion') {
    return (
      <FashionTheme
        store={store}
        product={product}
        landingPage={landingPage}
        sections={sections}
        images={images}
        benefits={benefits}
        shippingCost={shippingCost}
        submitting={submitting}
        formError={formError}
        onSubmit={async ({ name, phone, address, note, qty, selectedSize, selectedColor }: any) => {
          setName(name)
          setPhone(phone)
          setAddress(address)
          setNote(note)
          setQty(qty)
          await handleSubmit({ name, phone, address, note, qty })
        }}
      />
    )
  }

  if (store?.theme === 'beauty') {
    return (
      <BeautyTheme
        store={store}
        product={product}
        landingPage={landingPage}
        sections={sections}
        images={images}
        benefits={benefits}
        shippingCost={shippingCost}
        submitting={submitting}
        formError={formError}
        onSubmit={async ({ name, phone, address, note, qty }: any) => {
          setName(name)
          setPhone(phone)
          setAddress(address)
          setNote(note)
          setQty(qty)
          await handleSubmit({ name, phone, address, note, qty })
        }}
      />
    )
  }

  if (store?.theme === 'home') {
    return (
      <HomeTheme
        store={store}
        product={product}
        landingPage={landingPage}
        sections={sections}
        images={images}
        benefits={benefits}
        shippingCost={shippingCost}
        submitting={submitting}
        formError={formError}
        onSubmit={async ({ name, phone, address, note, qty, selectedColor }: any) => {
          setName(name)
          setPhone(phone)
          setAddress(address)
          setNote(note)
          setQty(qty)
          await handleSubmit({ name, phone, address, note, qty })
        }}
      />
    )
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" strategy="lazyOnload" onLoad={() => {
        if (!(window as any).L || !(store?.address_mode === 'map' || (!store?.address_mode && store?.enable_location))) return
        const L = (window as any).L

        const COUNTRY_CENTERS: Record<string, [number, number]> = {
          SAR: [24.7136, 46.6753],
          AED: [25.2048, 55.2708],
          EGP: [30.0444, 31.2357],
          MAD: [33.9716, -6.8498],
          DZD: [36.7372, 3.0865],
          USD: [25.2048, 55.2708],
        }
        const defaultCenter = COUNTRY_CENTERS[store?.currency || 'USD'] || [25.2048, 55.2708]

        const map = L.map('lp-map', {
          zoomControl: true,
          scrollWheelZoom: false,
          tap: true,
          touchZoom: true,
        }).setView(defaultCenter, 13)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
        const marker = L.marker(defaultCenter, { draggable: true }).addTo(map)

        const handlePick = async (lat: number, lng: number) => {
          marker.setLatLng([lat, lng])
          map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.6 })
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar&zoom=18`,
              { headers: { 'Accept': 'application/json' } }
            )
            const data = await res.json()
            ;(window as any).__setPickedLocation({ lat, lng, address: data.display_name || `${lat}, ${lng}` })
          } catch {
            ;(window as any).__setPickedLocation({ lat, lng, address: `${lat}, ${lng}` })
          }
        }

        marker.on('dragend', (e: any) => { const p = e.target.getLatLng(); handlePick(p.lat, p.lng) })
        map.on('click', (e: any) => handlePick(e.latlng.lat, e.latlng.lng))
        setTimeout(() => map.invalidateSize(), 300)
        ;(window as any).__leafletMap = map
        ;(window as any).__leafletMarker = marker
      }} />
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
              ttq.track("ViewContent", {content_id: "${product.id}", content_name: "${product.title?.replace(/"/g, '\\"') || ''}", value: ${product.price || 0}, currency: "${store.currency}"});
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
              fbq('track','ViewContent',{content_name:"${product.title?.replace(/"/g, '\\"') || ''}",value:${product.price || 0},currency:"${store.currency}"});
            `}
          </Script>
          <noscript>
            <img height="1" width="1" style={{display:'none'}}
              src={"https://www.facebook.com/tr?id=" + store.meta_pixel_id + "&ev=PageView&noscript=1"} alt="" />
          </noscript>
        </>
      )}

    <div dir={m.dir} className="min-h-screen" style={{ overflowX: 'hidden', maxWidth: '100vw', fontFamily: th.font, background: th.bg, color: th.text }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        .lp-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px; width: 100%; }
        .lp-cols { display: flex; gap: 48px; align-items: flex-start; width: 100%; }
        .lp-img-col { width: 48%; flex-shrink: 0; }
        .lp-info-col { flex: 1; min-width: 0; }
        .thumb-strip { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .thumb { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; cursor: pointer; flex-shrink: 0; }
        .lp-checkout { max-width: 1100px; margin: 0 auto; padding: 0 16px 100px; width: 100%; }
        .timer-block { display: flex; flex-direction: column; align-items: center; border-radius: 8px; padding: 8px 10px; min-width: 0; flex: 1; }
        .timer-num { font-size: 22px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
        .timer-label { font-size: 10px; margin-top: 4px; color: #9ca3af; }
        .timer-sep { font-size: 20px; font-weight: 800; color: #1f2937; align-self: flex-start; padding-top: 8px; flex-shrink: 0; }
        .timer-row { display: flex; align-items: flex-start; gap: 4px; width: 100%; }
        .lp-mobile-img { display: none; }
        @media (max-width: 768px) {
          .lp-cols { flex-direction: column; gap: 16px; }
          .lp-mobile-img { display: block; }
          .lp-img-col { display: none; }
          .lp-wrap { padding: 12px; }
          .lp-checkout { padding: 0 12px 100px; }
          .timer-num { font-size: 18px; }
          .timer-label { font-size: 9px; }
          .timer-sep { font-size: 16px; }
          .thumb { width: 48px; height: 48px; }
        }
        @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Urgency top bar */}
      <div style={{ background: th.urgencyBg, color: th.text === '#ffffff' ? '#ffffff' : '#ffffff', padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
        <span>⏱️ {m.urgencyLabel}:</span>
        <span style={{ background: '#c00', borderRadius: 6, padding: '2px 10px', fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>
          {`${t.days.toString().padStart(2,'0')} ${m.days} · ${t.h} ${m.hours} · ${t.min} ${m.mins} · ${t.sec} ${m.secs}`}
        </span>
        {shippingCost === 0 && (
          <>
            <span>·</span>
            <span>🚚 {m.freeShipping}</span>
          </>
        )}
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
                        style={{ border: activeImg === i ? `2px solid ${th.accent}` : `2px solid ${th.cardBorder}` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', background: th.badgeBg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>📦</div>
            )}
          </div>

          {/* INFO COLUMN */}
          <div className="lp-info-col" style={{ order: m.dir === 'rtl' ? 1 : 2 }}>

            <div style={{ marginBottom: 8 }}>
              <span style={{ background: th.badgeBg, color: th.subtext, fontSize: 13, padding: '4px 12px', borderRadius: 99, fontWeight: 500 }}>
                {m.dir === 'rtl' ? 'الأكثر مبيعاً' : 'Best Seller'}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 8, color: th.text }}>
              {product?.title}
            </h1>
            {landingPage?.headline && landingPage.headline !== product?.title && (
              <p style={{ fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 600, color: th.accent, marginBottom: 12, lineHeight: 1.4 }}>
                {landingPage.headline}
              </p>
            )}

            {landingPage?.subheadline && (
              <p style={{ fontSize: 15, color: th.subtext, margin: '0 0 16px', lineHeight: 1.5 }}>{landingPage.subheadline}</p>
            )}

            {/* Images — shown here on mobile only, desktop image col handles desktop */}
            {images.length > 0 && (
              <div className="lp-mobile-img" style={{ marginBottom: 16 }}>
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
                        style={{ border: activeImg === i ? `2px solid ${th.accent}` : `2px solid ${th.cardBorder}` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: th.text }}>{product?.price} {store?.currency}</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 15, fontWeight: 600, color: th.text }}>
                🔥 <span>{m.urgencyLabel}</span>
              </div>
              <div className="timer-row">
                <div className="timer-block" style={{ background: th.timerBg, color: th.timerText }}><span className="timer-num">{t.days.toString().padStart(2,'0')}</span><span className="timer-label">{m.days}</span></div>
                <span className="timer-sep">:</span>
                <div className="timer-block" style={{ background: th.timerBg, color: th.timerText }}><span className="timer-num">{t.h}</span><span className="timer-label">{m.hours}</span></div>
                <span className="timer-sep">:</span>
                <div className="timer-block" style={{ background: th.timerBg, color: th.timerText }}><span className="timer-num">{t.min}</span><span className="timer-label">{m.mins}</span></div>
                <span className="timer-sep">:</span>
                <div className="timer-block" style={{ background: th.timerBg, color: th.timerText }}><span className="timer-num">{t.sec}</span><span className="timer-label">{m.secs}</span></div>
              </div>
            </div>

            {/* Stock bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>🔥 {m.stockText(stock)}</span>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{m.dir === 'rtl' ? 'اطلب قبل نفاذ الكمية' : 'Order before it runs out'}</span>
              </div>
              <div style={{ background: th.cardBorder, borderRadius: 99, height: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(to left, #ef4444, #f97316, #22c55e)', width: `${Math.min((stock / 15) * 100, 100)}%`, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Benefits */}
            {benefits.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {benefits.map((b: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 14, color: th.text, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0 }}>✅</span><span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20, textAlign: 'center' }}>
              {[
                { icon: '💵', text: m.codText },
                { icon: '🚚', text: shippingCost === 0 ? m.freeShipping.split(' ').slice(0, 2).join(' ') : (m.dir === 'rtl' ? 'توصيل سريع' : 'Fast Delivery') },
                { icon: '↩️', text: m.returnText },
                { icon: '✅', text: m.originalText },
              ].map((b, i) => (
                <div key={i} style={{ background: th.badgeBg, border: `1px solid ${th.cardBorder}`, borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{b.icon}</div>
                  <div style={{ fontSize: 10, color: th.subtext, fontWeight: 500, lineHeight: 1.3 }}>{b.text}</div>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                style={{ flex: 2, background: th.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
              >
                {shippingCost === 0
                  ? (m.ctaFree || `اطلب الان والتوصيل مجاني ${th.ctaSuffix}`)
                  : (m.cta || `اطلب الان ${th.ctaSuffix}`)}
              </button>
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                style={{ flex: 1, background: th.cardBg, color: th.subtext, border: `1px solid ${th.cardBorder}`, borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
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
          <div style={{ maxWidth: 800, margin: '0 auto 32px', background: th.cardBg, border: `1px solid ${th.cardBorder}`, borderRadius: 16, overflow: 'hidden', direction: m.dir as any }}>
            <div style={{ background: th.badgeBg, borderBottom: `1px solid ${th.cardBorder}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 20, background: th.accent, borderRadius: 99, flexShrink: 0 }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: th.text, margin: 0 }}>
                {m.dir === 'rtl' ? 'تفاصيل المنتج' : 'Product Details'}
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              {benefits.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {benefits.map((b: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: th.badgeBg, border: `1px solid ${th.cardBorder}`, borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
                      <span style={{ fontSize: 13, color: th.subtext, lineHeight: 1.5, fontWeight: 500 }}>{b}</span>
                    </div>
                  ))}
                </div>
              )}
              {benefits.length > 0 && <div style={{ height: 1, background: th.cardBorder, marginBottom: 20 }} />}
              <div style={{ fontSize: 15, color: th.subtext, lineHeight: 1.9 }}>
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

        {/* Customer Reviews */}
        {(() => {
          const { reviews, reviewCount } = getReviews()
          return (
            <div className="lp-checkout" style={{ paddingBottom: 0, marginBottom: 0 }}>
              <div style={{ background: th.pageBg === '#ffffff' || th.pageBg === '#fff5f8' || th.pageBg === '#fdf6ee' ? '#f8f9fa' : th.cardBg, borderRadius: 16, padding: '20px 16px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>⭐⭐⭐⭐⭐</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: th.text }}>4.9/5</span>
                  <span style={{ color: '#888', fontSize: 14 }}>({reviewCount} {m.dir === 'rtl' ? 'تقييم' : 'reviews'})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reviews.slice(0, 3).map((review, i) => (
                    <div key={i} style={{ background: th.cardBg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${th.cardBorder}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                            {review.name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: th.text }}>{review.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#f59e0b', fontSize: 12 }}>{'⭐'.repeat(review.rating)}</span>
                              <span style={{ fontSize: 10, color: '#10b981', fontWeight: 500 }}>✓ {m.dir === 'rtl' ? 'مشتري موثق' : 'Verified buyer'}</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{review.date}</span>
                      </div>
                      <p style={{ fontSize: 14, color: th.subtext, lineHeight: 1.5, margin: 0 }}>{review.comment}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowAllReviews(true)
                    setTimeout(() => allReviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
                  }}
                  style={{ width: '100%', marginTop: 12, padding: '10px', background: 'none', border: `1px solid ${th.cardBorder}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: th.subtext, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {m.dir === 'rtl' ? `عرض جميع التقييمات (${reviewCount})` : `View all reviews (${reviewCount})`}
                </button>
              </div>
            </div>
          )
        })()}

        <div ref={formRef} style={{ background: th.formBg, border: `1px solid ${th.cardBorder}`, borderRadius: 16, padding: 28, maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, textAlign: 'center', color: th.text }}>
            {m.orderFormTitle}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={m.namePlaceholder} style={inputStyle} />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={m.phonePlaceholder} type="tel" style={{ ...inputStyle, direction: 'ltr', textAlign: m.dir === 'rtl' ? 'right' : 'left' }} />

            {!isMapAddress && (
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={m.dir === 'rtl' ? 'العنوان تفصيلي (منطقة، مدينة، حي)' : 'Full address (area, city, district)'}
                style={inputStyle}
              />
            )}

            {isMapAddress && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: th.text }}>
                    📍 {m.dir === 'rtl' ? 'تحديد موقع التوصيل' : 'Delivery Location'}
                    {!store?.location_required && (
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', marginRight: 6, marginLeft: 6 }}>
                        ({m.dir === 'rtl' ? 'اختياري' : 'optional'})
                      </span>
                    )}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationLoading(true)
                    if (!navigator.geolocation) { setLocationLoading(false); return; }
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        const { latitude: lat, longitude: lng } = pos.coords
                        try {
                          const res = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${m.dir === 'rtl' ? 'ar' : 'en'}&zoom=18`,
                            { headers: { 'Accept': 'application/json' } }
                          )
                          const data = await res.json()
                          const loc = { lat, lng, address: data.display_name || `${lat}, ${lng}` }
                          setPickedLocation(loc)
                          if ((window as any).__leafletMap && (window as any).__leafletMarker) {
                            (window as any).__leafletMarker.setLatLng([lat, lng])
                            ;(window as any).__leafletMap.flyTo([lat, lng], 17, { duration: 0.8 })
                          }
                        } catch {
                          setPickedLocation({ lat, lng, address: `${lat}, ${lng}` })
                        }
                        setLocationLoading(false)
                      },
                      () => setLocationLoading(false),
                      { enableHighAccuracy: true, timeout: 10000 }
                    )
                  }}
                  style={{
                    width: '100%', padding: '14px 20px',
                    background: locationLoading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
                    cursor: locationLoading ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginBottom: 10, boxShadow: '0 8px 20px -6px rgba(59,130,246,0.6)',
                    transition: 'all 0.2s', fontFamily: 'inherit',
                  }}>
                  <span style={{ fontSize: 20 }}>📡</span>
                  {locationLoading
                    ? (m.dir === 'rtl' ? 'جاري تحديد موقعك...' : 'Locating...')
                    : (m.dir === 'rtl' ? 'اضغط هنا لتحديد موقعك تلقائياً' : 'Tap to detect my location automatically')}
                </button>
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 10 }}>
                  {m.dir === 'rtl' ? 'أو حرك الدبوس على الخريطة يدوياً' : 'Or drag the pin on the map manually'}
                </p>
                <div id="lp-map" style={{ height: 220, borderRadius: 12, border: `1.5px solid ${th.cardBorder}`, marginBottom: 10, overflow: 'hidden', position: 'relative', zIndex: 1 }} />
                {pickedLocation && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(59,130,246,0.05)', border: '1.5px solid #3b82f6', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>✅</span>
                    <div style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2, color: '#1e40af' }}>{m.dir === 'rtl' ? 'تم تحديد موقعك' : 'Location pinned'}</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{pickedLocation.address}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {store?.show_quantity && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: th.cardBg, border: `1px solid ${th.cardBorder}`, borderRadius: 8, padding: '10px 14px' }}>
                <span style={{ fontSize: 14, color: th.subtext }}>{m.qtyLabel}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            )}

            {store?.show_note && (
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={m.dir === 'rtl' ? 'ملاحظات إضافية للطلب (اختياري)' : 'Additional notes for your order (optional)'}
                rows={3}
                style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
              />
            )}

            <div style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: th.subtext }}>
                <span>{m.shippingLabel}</span>
                <span style={{ color: shippingCost === 0 ? '#16a34a' : th.text, fontWeight: 600 }}>
                  {shippingCost === 0 ? (m.freeShipping || 'شحن مجاني ✓') : `${shippingCost} ${store?.currency}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: th.text }}>
                <span>{m.totalLabel}</span>
                <span>{total} {store?.currency}</span>
              </div>
            </div>
            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>{formError}</div>
            )}
            <button
              onClick={() => {
                const totalPrice = store?.show_quantity
                  ? parseFloat(product?.price || 0) * qty
                  : parseFloat(product?.price || 0)
                const checkoutQty = store?.show_quantity ? qty : 1
                if (typeof window !== 'undefined') {
                  if ((window as any).fbq) {
                    (window as any).fbq('track', 'InitiateCheckout', { currency: store.currency, value: totalPrice })
                  }
                  if ((window as any).ttq) {
                    (window as any).ttq.track('InitiateCheckout', { content_id: product.id, content_name: product.title, currency: store.currency, value: totalPrice, quantity: checkoutQty })
                  }
                }
                handleSubmit()
              }}
              disabled={submitting}
              style={{ background: submitting ? '#9ca3af' : th.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: 18, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', width: '100%' }}
            >
              {submitting ? '...' : (shippingCost === 0 ? (m.ctaFree || `اطلب الان والتوصيل مجاني ${th.ctaSuffix}`) : (m.cta || `اطلب الان ${th.ctaSuffix}`))}
            </button>
          </div>
        </div>

        {/* All Reviews Section */}
        {showAllReviews && (() => {
          const { reviews, reviewCount } = getReviews()
          return (
            <div ref={allReviewsRef} className="lp-checkout" style={{ paddingBottom: 32 }}>
              <div style={{ background: th.pageBg === '#ffffff' || th.pageBg === '#fff5f8' || th.pageBg === '#fdf6ee' ? '#f8f9fa' : th.cardBg, borderRadius: 16, padding: '20px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>⭐⭐⭐⭐⭐</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: th.text }}>4.9/5</span>
                  <span style={{ color: '#888', fontSize: 14 }}>({reviewCount} {m.dir === 'rtl' ? 'تقييم' : 'reviews'})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reviews.map((review, i) => (
                    <div key={i} style={{ background: th.cardBg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${th.cardBorder}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                            {review.name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: th.text }}>{review.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#f59e0b', fontSize: 12 }}>{'⭐'.repeat(review.rating)}</span>
                              <span style={{ fontSize: 10, color: '#10b981', fontWeight: 500 }}>✓ {m.dir === 'rtl' ? 'مشتري موثق' : 'Verified buyer'}</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{review.date}</span>
                      </div>
                      <p style={{ fontSize: 14, color: th.subtext, lineHeight: 1.5, margin: 0 }}>{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Sticky bottom bar */}
      {showSticky && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: th.cardBg, borderTop: `1px solid ${th.cardBorder}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: th.text }}>{product?.price} {store?.currency}</div>
            {product?.compare_at_price && <div style={{ fontSize: 12, color: '#999', textDecoration: 'line-through' }}>{product.compare_at_price} {store?.currency}</div>}
          </div>
          <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ background: th.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {m.ctaShort} {th.ctaSuffix}
          </button>
        </div>
      )}

      {/* Social proof popup */}
      {showSocial && socialProof && (
        <div style={{ position: 'fixed', bottom: 20, left: 16, background: th.cardBg, border: `1px solid ${th.cardBorder}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 101, maxWidth: 260, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideIn 0.3s ease' }}>
          <div style={{ fontSize: 28 }}>🛍️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: th.text, direction: m.dir as any }}>
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
