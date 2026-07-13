'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Creative = {
  summaryAr?: string
  headline?: string
  gender?: string
  seedancePrompt: string
  voiceover: string
  translationEn: string
  imageUrl: string
  status: 'pending' | 'generating' | 'ready' | 'vo' | 'final' | 'error'
  taskId?: string | null
  videoUrl?: string | null
  mergedUrl?: string | null
  error?: string | null
  showBlocks?: boolean
}

type Product = { title: string; titleAr?: string; description: string; images: string[]; price: string | null }
type ProductPage = { productId: string; landingUrl: string; caption: string; titleAr: string; price: number; compareAtPrice: number | null; currency: string }
type Step = 'idle' | 'extracting' | 'pricing' | 'creating_page' | 'landing' | 'planning' | 'running' | 'launch' | 'launching' | 'launched'

const CREDIT_COST_AD = 50

// Arabic-Indic numerals for display counts.
const toAr = (n: number | string) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])

function defaultStartLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000) // +1h
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── tiny inline icons (no emoji-as-icon) ──────────────────────────────
const Ico = {
  spark: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.6l1.7 4.4a4 4 0 0 0 2.3 2.3L20.4 11l-4.4 1.7a4 4 0 0 0-2.3 2.3L12 19.4l-1.7-4.4a4 4 0 0 0-2.3-2.3L3.6 11l4.4-1.7a4 4 0 0 0 2.3-2.3L12 2.6z" /><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" opacity=".8" /></svg>),
  arrow: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>),
  back: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>),
  play: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.72-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z" /></svg>),
  check: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>),
  ext: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>),
  mic: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" /></svg>),
  rocket: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>),
}

const STEPS = [
  { n: 1, label: 'الرابط' },
  { n: 2, label: 'التفاصيل' },
  { n: 3, label: 'صفحة الهبوط' },
  { n: 4, label: 'الإعلانات' },
  { n: 5, label: 'الإطلاق' },
]

export default function SeedancePage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [proxiedImages, setProxiedImages] = useState<string[]>([])
  const [priceInput, setPriceInput] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [productPage, setProductPage] = useState<ProductPage | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  // Launch step
  const [launchIndex, setLaunchIndex] = useState(0)
  const [dailyBudget, setDailyBudget] = useState('50')
  const [startAt, setStartAt] = useState(defaultStartLocal())
  const [launchResult, setLaunchResult] = useState<any>(null)
  const [showPixelModal, setShowPixelModal] = useState(false)
  const [pixelInput, setPixelInput] = useState('')
  const [pixelError, setPixelError] = useState<string | null>(null)
  const [savingPixel, setSavingPixel] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const s = createClient()
    s.auth.getUser().then(({ data: { user } }) => { if (!user) { router.push('/admin/login'); return } setAuthed(true) })
  }, [router])

  const update = useCallback((i: number, patch: Partial<Creative>) => {
    setCreatives(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }, [])

  // Poll generating creatives. Seedance throttles at ~30 requests / 60s per account, so
  // we poll SLOWLY and scale the interval with how many videos are in flight — keeping
  // total status requests to ~12/min and leaving plenty of budget for new generations.
  useEffect(() => {
    const generating = creatives.filter(c => c.status === 'generating' && c.taskId)
    if (!generating.length) return
    const intervalMs = Math.max(10000, generating.length * 5000)
    const id = setInterval(async () => {
      await Promise.all(creatives.map(async (c, i) => {
        if (c.status !== 'generating' || !c.taskId) return
        try {
          const res = await fetch(`/api/admin/seedance-status?taskId=${c.taskId}`)
          const data = await res.json()
          if (data.status === 'completed') update(i, { status: 'ready', videoUrl: data.videoUrl })
          else if (data.status === 'failed') update(i, { status: 'error', error: data.error || 'failed' })
        } catch { /* keep polling */ }
      }))
    }, intervalMs)
    pollRef.current = id
    return () => clearInterval(id)
  }, [creatives, update])

  const safeJson = async (res: Response, label: string) => {
    const txt = await res.text()
    try { return JSON.parse(txt) }
    catch { throw new Error(`${label} (${res.status}): ${txt.slice(0, 200)}`) }
  }

  // Step 1: extract the product, then move to pricing.
  async function handleExtract() {
    const trimmed = url.trim()
    if (!trimmed) return
    setStep('extracting'); setError(null); setCreatives([]); setProduct(null); setProductPage(null); setProxiedImages([]); setLaunchResult(null)
    try {
      const ex = await fetch('/api/products/fetch-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: trimmed }) })
      const p = await safeJson(ex, 'فشل قراءة المنتج')
      if (!p.success) throw new Error(p.error || 'تعذّر قراءة المنتج')
      if (p.blocked) throw new Error('هذا الموقع يمنع الاستخراج. جرّب رابطًا آخر.')
      const imgs: string[] = (p.images || []).slice(0, 9)
      const title: string = p.title || 'بدون عنوان'
      setProduct({ title, description: p.description || '', images: imgs, price: p.price ?? null })
      setImages(imgs)
      setPriceInput(String(p.price ?? '').replace(/[^0-9.]/g, '') || '')
      setDiscountInput('')
      setStep('pricing')
      // Translate the scraped title to Arabic for display (non-blocking).
      fetch('/api/admin/translate-title', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: title }) })
        .then(r => r.json()).then(d => { if (d?.titleAr) setProduct(prev => prev ? { ...prev, titleAr: d.titleAr } : prev) })
        .catch(() => {})
    } catch (e: any) { setError(e.message); setStep('idle') }
  }

  // Step 2: create the Arabic landing page (with price + discount), then show it.
  async function handleContinue() {
    if (!product) return
    if (!priceInput || !(parseFloat(priceInput) > 0)) { setError('أدخل سعرًا صحيحًا'); return }
    setStep('creating_page'); setError(null)
    try {
      const cp = await fetch('/api/admin/ugc-create-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title, description: product.description, images: product.images, sourceUrl: url.trim(),
          price: parseFloat(priceInput),
          compareAtPrice: discountInput && parseFloat(discountInput) > 0 ? parseFloat(discountInput) : null,
        }),
      })
      const page = await safeJson(cp, 'فشل إنشاء صفحة الهبوط')
      if (!cp.ok) throw new Error(page.error || 'تعذّر إنشاء صفحة الهبوط')
      setProductPage(page)

      // Proxy all product images ONCE — reused for every creative so generation is fast.
      const px = await fetch('/api/admin/proxy-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrls: images.slice(0, 9) }) })
      const pxData = await safeJson(px, 'فشل تجهيز الصور')
      if (!px.ok) throw new Error(pxData.error || 'تعذّر تجهيز الصور')
      setProxiedImages(pxData.mediaUrls || [])

      setStep('landing')
    } catch (e: any) { setError(e.message); setStep('pricing') }
  }

  // Step 3 → 4: write the 4 ad angles.
  async function handlePlan() {
    if (!product) return
    setStep('planning'); setError(null)
    try {
      const planImages = (proxiedImages.length ? proxiedImages : images).slice(0, 3)
      const pl = await fetch('/api/admin/seedance-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: product.title, description: product.description, imageUrls: planImages }) })
      const plan = await safeJson(pl, 'فشل كتابة الزوايا')
      if (!pl.ok) throw new Error(plan.error || 'تعذّرت كتابة الزوايا')
      const list: Creative[] = (plan.creatives as any[]).slice(0, 10).map((c, i) => ({
        summaryAr: c.summaryAr || c.headline || `زاوية إعلانية رقم ${i + 1}`,
        headline: c.headline || `الزاوية ${i + 1}`, gender: c.gender || '', seedancePrompt: c.seedancePrompt || '', voiceover: c.voiceover || '', translationEn: c.translationEn || '',
        imageUrl: images[i] || images[0] || '', status: 'pending',
      }))
      setCreatives(list)
      setStep('running')
    } catch (e: any) { setError(e.message); setStep('landing') }
  }

  // Generate the Seedance video for one chosen angle.
  async function generateOne(i: number) {
    const c = creatives[i]
    if (!c || c.status === 'generating') return
    update(i, { status: 'generating', error: null })
    try {
      const g = await fetch('/api/admin/seedance-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaUrls: proxiedImages, imageUrls: images.slice(0, 9), prompt: c.seedancePrompt }) })
      const txt = await g.text()
      let gd: any = {}
      try { gd = JSON.parse(txt) } catch { gd = { error: txt.slice(0, 200) || `HTTP ${g.status}` } }
      if (!g.ok) throw new Error(gd.error || `فشل الإرسال (HTTP ${g.status})`)
      update(i, { taskId: gd.taskId })
    } catch (e: any) { update(i, { status: 'error', error: e.message }) }
  }

  async function addVoiceover(i: number) {
    const c = creatives[i]
    if (!c.videoUrl) return
    update(i, { status: 'vo', error: null })
    try {
      const res = await fetch('/api/admin/seedance-voiceover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: c.videoUrl, voiceover: c.voiceover, gender: c.gender }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشلت إضافة الصوت')
      update(i, { status: 'final', mergedUrl: data.mergedUrl })
    } catch (e: any) { update(i, { status: 'ready', error: e.message }) }
  }

  // Step 5: launch a chosen finished creative as a TikTok ad.
  async function handleCreateAd(launchVideo: string | null) {
    if (!productPage || !launchVideo) return
    setStep('launching'); setError(null)
    try {
      const res = await fetch('/api/admin/ugc-create-ad', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productPage.productId,
          videoUrl: launchVideo,
          caption: productPage.caption,
          dailyBudget: parseFloat(dailyBudget) || 0,
          scheduleStart: startAt,
        }),
      })
      const data = await res.json()
      if (res.status === 400 && data.needsPixel) { setStep('launch'); setPixelError(null); setShowPixelModal(true); return }
      if (!res.ok) throw new Error(data.error || 'فشل إطلاق الإعلان')
      setLaunchResult(data); setStep('launched')
    } catch (e: any) { setError(e.message); setStep('launch') }
  }

  async function savePixelAndLaunch(launchVideo: string | null) {
    const id = pixelInput.trim()
    if (!id) { setPixelError('أدخل معرّف TikTok Pixel'); return }
    setSavingPixel(true); setPixelError(null)
    try {
      const res = await fetch('/api/admin/set-store-pixel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pixelId: id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذّر حفظ معرّف Pixel')
      setSavingPixel(false); setShowPixelModal(false)
      handleCreateAd(launchVideo)
    } catch (e: any) { setPixelError(e.message); setSavingPixel(false) }
  }

  function resetAll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setStep('idle'); setError(null); setProduct(null); setImages([]); setProxiedImages([])
    setProductPage(null); setCreatives([]); setPriceInput(''); setDiscountInput('')
    setLaunchResult(null); setLaunchIndex(0); setShowPixelModal(false); setPixelInput(''); setPixelError(null)
  }

  // Revisit a previous step (only ones whose content already exists).
  function goToStep(n: number) {
    setError(null)
    if (n === 1) setStep('idle')
    else if (n === 2 && product) setStep('pricing')
    else if (n === 3 && productPage) setStep('landing')
    else if (n === 4 && creatives.length) setStep('running')
    else if (n === 5 && creatives.some(c => c.videoUrl || c.mergedUrl)) setStep('launch')
  }

  if (!authed) return <div className="min-h-screen bg-[#08080f] flex items-center justify-center"><div className="text-[#8b8fa8] text-sm">جاري التحميل…</div></div>

  const wizardStep =
    (step === 'launch' || step === 'launching' || step === 'launched') ? 5
    : (step === 'planning' || step === 'running') ? 4
    : (step === 'creating_page' || step === 'landing') ? 3
    : step === 'pricing' ? 2 : 1
  const transitioning = step === 'creating_page' || step === 'planning'
  const statusLabel = step === 'extracting' ? 'نقرأ تفاصيل منتجك…' : step === 'creating_page' ? 'نجهّز صفحة الهبوط…' : step === 'planning' ? 'نحلّل منتجك ونبتكر ١٠ زوايا إعلانية' : ''
  const readyCount = creatives.filter(c => c.videoUrl || c.mergedUrl).length
  // A step is reachable if its data already exists (used for the clickable rail).
  const canGoTo = (n: number) => n === 1 || (n === 2 && !!product) || (n === 3 && !!productPage) || (n === 4 && creatives.length > 0) || (n === 5 && readyCount > 0)

  // Which finished creative will be launched.
  const effIdx = (creatives[launchIndex]?.mergedUrl || creatives[launchIndex]?.videoUrl)
    ? launchIndex
    : creatives.findIndex(c => c.mergedUrl || c.videoUrl)
  const launchVideo = effIdx >= 0 ? (creatives[effIdx]?.mergedUrl || creatives[effIdx]?.videoUrl || null) : null

  return (
    <div dir="rtl" className="ugc-root relative min-h-screen overflow-x-hidden bg-[#08080f] text-[#f8fafc]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400..700&family=Tajawal:wght@400;500;700;800&display=swap');
        .ugc-root{font-family:'Tajawal',system-ui,sans-serif}
        .font-display{font-family:'Baloo Bhaijaan 2','Tajawal',system-ui,sans-serif}
        .flip-x{transform:scaleX(-1)}
        @keyframes ugcBlob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(6%,-8%) scale(1.12)}66%{transform:translate(-6%,6%) scale(.92)}}
        @keyframes ugcRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ugcPulse{0%,100%{opacity:.5;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
        .ugc-blob{animation:ugcBlob 18s ease-in-out infinite}
        .ugc-rise{animation:ugcRise .5s cubic-bezier(.22,1,.36,1) both}
        .ugc-dot{animation:ugcPulse 1.1s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){.ugc-blob,.ugc-rise,.ugc-dot{animation:none!important}}
      `}</style>

      {/* animated background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ugc-blob absolute -top-40 -left-32 h-[38rem] w-[38rem] rounded-full bg-[#6366f1] opacity-[0.18] blur-[120px]" />
        <div className="ugc-blob absolute top-1/3 -right-40 h-[34rem] w-[34rem] rounded-full bg-[#e11d48] opacity-[0.14] blur-[120px]" style={{ animationDelay: '-6s' }} />
        <div className="ugc-blob absolute -bottom-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-[#1e1b4b] opacity-30 blur-[120px]" style={{ animationDelay: '-11s' }} />
      </div>

      {/* progress rail */}
      <header className="fixed top-0 inset-x-0 z-30 bg-[#08080f]/70 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={resetAll} className="flex items-center gap-2 cursor-pointer group shrink-0">
            <span className="grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#e11d48] text-white">{Ico.spark('h-4 w-4')}</span>
            <span className="font-display text-[15px] font-semibold text-white group-hover:opacity-80 transition-opacity hidden sm:block">استوديو الإعلانات</span>
          </button>
          <nav className="flex items-center gap-1 sm:gap-2.5">
            {STEPS.map((s, idx) => {
              const state = wizardStep > s.n ? 'done' : wizardStep === s.n ? 'active' : 'todo'
              const navigable = s.n !== wizardStep && canGoTo(s.n)
              return (
                <div key={s.n} className="flex items-center gap-1 sm:gap-2.5">
                  <button type="button" onClick={() => navigable && goToStep(s.n)} disabled={!navigable} title={navigable ? s.label : undefined}
                    className={`flex items-center gap-2 rounded-full transition-opacity ${navigable ? 'cursor-pointer hover:opacity-100 opacity-90' : state === 'active' ? '' : 'cursor-default'}`}>
                    <span className={`grid place-items-center h-7 w-7 rounded-full text-[12px] font-bold transition-all duration-300 ${
                      state === 'done' ? `bg-[#6366f1] text-white ${navigable ? 'ring-2 ring-transparent hover:ring-[#818cf8]/60' : ''}`
                      : state === 'active' ? 'bg-white text-[#08080f] ring-4 ring-[#6366f1]/30'
                      : 'bg-white/8 text-[#6b7080]'}`}>
                      {state === 'done' ? Ico.check('h-3.5 w-3.5') : toAr(s.n)}
                    </span>
                    <span className={`text-[13px] font-semibold hidden md:block transition-colors ${state === 'todo' ? 'text-[#6b7080]' : 'text-white'}`}>{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && <span className={`h-px w-4 sm:w-7 rounded transition-colors duration-300 ${wizardStep > s.n ? 'bg-[#6366f1]' : 'bg-white/10'}`} />}
                </div>
              )
            })}
          </nav>
        </div>
      </header>

      {/* ── STEP CONTENT ── */}
      <main className="relative z-10">

        {/* STEP 1 — LINK */}
        {wizardStep === 1 && (
          <section key="s1" className="ugc-rise min-h-[100svh] flex flex-col items-center justify-center px-6 pt-16 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-[#a5b4fc]">
              {Ico.spark('h-3.5 w-3.5')} استوديو الإعلانات بالذكاء الاصطناعي
            </span>
            <h1 className="font-display mt-5 text-4xl sm:text-6xl font-semibold leading-[1.15] max-w-3xl">
              من رابط منتجك إلى<br className="hidden sm:block" /> <span className="bg-gradient-to-l from-[#818cf8] via-[#c084fc] to-[#fb7185] bg-clip-text text-transparent">١٠ إعلانات جاهزة</span>
            </h1>
            <p className="mt-4 text-[15px] sm:text-lg text-[#9aa0b4] max-w-xl leading-relaxed">
              الصق رابط المنتج، ونبني لك صفحة هبوط، ثم نحلّل منتجك ونبتكر ١٠ زوايا إعلانية بفيديوهات سينمائية وتعليق صوتي عربي سعودي — جاهزة للإطلاق على TikTok.
            </p>

            <div className="mt-9 w-full max-w-xl">
              <div className="flex flex-col sm:flex-row gap-2.5 rounded-2xl sm:rounded-full bg-white/5 border border-white/10 p-2 focus-within:border-[#6366f1]/60 transition-colors">
                <input type="url" dir="ltr" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && step !== 'extracting' && handleExtract()}
                  placeholder="https://www.amazon.sa/…" disabled={step === 'extracting'} autoFocus
                  className="flex-1 bg-transparent px-4 py-3 text-[15px] text-white placeholder-[#5a5f72] outline-none min-w-0 text-left" />
                <button onClick={handleExtract} disabled={step === 'extracting' || !url.trim()}
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full bg-gradient-to-l from-[#6366f1] to-[#e11d48] px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-[#6366f1]/25 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all">
                  {step === 'extracting'
                    ? (<><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> {statusLabel}</>)
                    : (<>أنشئ الإعلانات {Ico.arrow('h-4 w-4 flip-x')}</>)}
                </button>
              </div>
            </div>

            {/* how it works — the full pipeline at a glance */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
              {[
                { n: '١', t: 'الصق رابط المنتج' },
                { n: '٢', t: 'نبتكر ١٠ زوايا إعلانية' },
                { n: '٣', t: 'فيديو + صوت سعودي' },
                { n: '٤', t: 'إطلاق على TikTok' },
              ].map((s, i, arr) => (
                <div key={s.n} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2">
                    <span className="grid place-items-center h-5 w-5 rounded-full bg-gradient-to-br from-[#6366f1] to-[#e11d48] text-white text-[10px] font-bold">{s.n}</span>
                    <span className="text-[13px] font-semibold text-[#c9cdda]">{s.t}</span>
                  </div>
                  {i < arr.length - 1 && <span className="text-[#5a5f72]">{Ico.arrow('h-3.5 w-3.5 flip-x')}</span>}
                </div>
              ))}
            </div>

            <p className="mt-5 text-[12px] text-[#5a5f72]">كل فيديو ١٥ ثانية · عمودي ٩:١٦ · بصوت عربي سعودي طبيعي</p>

            {error && (
              <div className="mt-6 max-w-xl rounded-xl border border-[#e11d48]/30 bg-[#e11d48]/10 px-4 py-3 text-[13px] text-[#fb7185]">{error}</div>
            )}
          </section>
        )}

        {/* STEP 2 — DETAILS */}
        {wizardStep === 2 && product && (
          <section key="s2" className="ugc-rise min-h-[100svh] flex flex-col justify-center px-6 pt-24 pb-16">
            <div className="max-w-5xl w-full mx-auto">
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold">حدّد السعر</h2>
                <p className="mt-2 text-[15px] text-[#9aa0b4]">أكّد المنتج والسعر — منها نبني صفحة الهبوط.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* product preview */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <div className="aspect-square w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 grid place-items-center">
                    {product.images[0]
                      ? <img src={product.images[0]} alt={product.title} className="h-full w-full object-contain" />
                      : <span className="text-[#5a5f72] text-sm">لا توجد صورة</span>}
                  </div>
                  {product.images.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {product.images.slice(0, 9).map((im, k) => (
                        <img key={k} src={im} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover border border-white/10" />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 text-[15px] font-bold leading-snug">{product.titleAr || product.title}</div>
                  {product.titleAr && <div className="mt-1 text-[11px] text-[#5a5f72] leading-snug" dir="ltr">{product.title}</div>}
                  <div className="mt-1 text-[12px] text-[#6b7080]">{toAr(product.images.length)} صورة · تُرسل إلى Seedance</div>
                </div>

                {/* pricing form */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 flex flex-col">
                  <div className="space-y-5 flex-1">
                    <div>
                      <label className="block text-[12px] font-bold text-[#9aa0b4] mb-2">سعر البيع</label>
                      <div className="flex items-center rounded-xl bg-black/30 border border-white/10 focus-within:border-[#6366f1]/60 transition-colors">
                        <input type="number" dir="ltr" min="1" step="0.01" value={priceInput} onChange={e => setPriceInput(e.target.value)} placeholder="0.00"
                          className="flex-1 bg-transparent px-4 py-3.5 text-lg font-bold text-white outline-none min-w-0 text-right" />
                        <span className="px-4 text-[13px] font-semibold text-[#6b7080]">ر.س</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-[#9aa0b4] mb-2">السعر قبل الخصم <span className="text-[#5a5f72] font-medium">· اختياري</span></label>
                      <div className="flex items-center rounded-xl bg-black/30 border border-white/10 focus-within:border-[#6366f1]/60 transition-colors">
                        <input type="number" dir="ltr" min="0" step="0.01" value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder="0.00"
                          className="flex-1 bg-transparent px-4 py-3.5 text-lg font-bold text-white outline-none min-w-0 text-right" />
                        <span className="px-4 text-[13px] font-semibold text-[#6b7080]">ر.س</span>
                      </div>
                      <p className="mt-1.5 text-[12px] text-[#6b7080]">يظهر مشطوبًا للدلالة على وجود خصم.</p>
                    </div>
                    {error && <div className="rounded-xl border border-[#e11d48]/30 bg-[#e11d48]/10 px-4 py-2.5 text-[13px] text-[#fb7185]">{error}</div>}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button onClick={resetAll} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-3 text-[14px] font-semibold text-[#9aa0b4] hover:text-white hover:border-white/20 cursor-pointer transition-colors">
                      {Ico.back('h-4 w-4 flip-x')} رجوع
                    </button>
                    <button onClick={handleContinue}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#6366f1] to-[#e11d48] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#6366f1]/25 hover:brightness-110 cursor-pointer transition-all">
                      أنشئ صفحة الهبوط {Ico.arrow('h-4 w-4 flip-x')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3 — LANDING PAGE */}
        {wizardStep === 3 && productPage && (
          <section key="s3" className="ugc-rise min-h-[100svh] flex flex-col justify-center px-6 pt-24 pb-16">
            <div className="max-w-5xl w-full mx-auto">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#4ade80]/25 bg-[#4ade80]/10 px-3 py-1 text-[12px] font-bold text-[#4ade80]">
                  {Ico.check('h-3.5 w-3.5')} صفحة الهبوط جاهزة
                </span>
                <h2 className="font-display mt-4 text-3xl sm:text-4xl font-semibold">هذي صفحة منتجك</h2>
                <p className="mt-2 text-[15px] text-[#9aa0b4]">معاينة حيّة لصفحة الهبوط — منها تنطلق إعلاناتك.</p>
              </div>

              <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center justify-items-center">
                {/* phone preview */}
                <div className="w-[280px] max-w-full">
                  <div className="relative rounded-[2.4rem] border-[10px] border-[#17171f] bg-black shadow-2xl overflow-hidden" style={{ aspectRatio: '9/19' }}>
                    <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-10 pointer-events-none">
                      <span className="mt-1.5 h-1.5 w-16 rounded-full bg-white/15" />
                    </div>
                    <iframe src={productPage.landingUrl} title="معاينة صفحة الهبوط" className="absolute inset-0 w-full h-full bg-white" loading="lazy" />
                  </div>
                </div>

                {/* info + continue */}
                <div className="w-full max-w-md space-y-5">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 space-y-4">
                    <div>
                      <div className="text-[11px] font-bold text-[#6b7080] mb-1">عنوان الصفحة</div>
                      <div className="text-[16px] font-bold leading-snug">{productPage.titleAr}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#6b7080] mb-1">وصف الإعلان</div>
                      <div className="text-[13px] text-[#c9cdda] leading-relaxed line-clamp-4">{productPage.caption}</div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <div className="text-[22px] font-extrabold text-white">{toAr(productPage.price)} <span className="text-[13px] font-semibold text-[#6b7080]">{productPage.currency}</span></div>
                      {productPage.compareAtPrice && <div className="text-[14px] text-[#6b7080] line-through">{toAr(productPage.compareAtPrice)}</div>}
                    </div>
                    <a href={productPage.landingUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#a5b4fc] hover:text-white cursor-pointer transition-colors">
                      {Ico.ext('h-4 w-4')} فتح صفحة الهبوط في تبويب جديد
                    </a>
                  </div>

                  {error && <div className="rounded-xl border border-[#e11d48]/30 bg-[#e11d48]/10 px-4 py-2.5 text-[13px] text-[#fb7185]">{error}</div>}

                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep('pricing')} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-3 text-[14px] font-semibold text-[#9aa0b4] hover:text-white hover:border-white/20 cursor-pointer transition-colors">
                      {Ico.back('h-4 w-4 flip-x')} رجوع
                    </button>
                    <button onClick={handlePlan}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#6366f1] to-[#e11d48] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#6366f1]/25 hover:brightness-110 cursor-pointer transition-all">
                      اكتب زوايا الإعلان {Ico.arrow('h-4 w-4 flip-x')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 4 — CREATE (ANGLES) */}
        {wizardStep === 4 && (
          <section key="s4" className="ugc-rise min-h-[100svh] px-6 pt-24 pb-20">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold">اختر الزوايا التي تعجبك</h2>
                  <p className="mt-2 text-[15px] text-[#9aa0b4]">{readyCount > 0 ? `أنشأت ${toAr(readyCount)} من ${toAr(creatives.length)} زاوية.` : `${toAr(creatives.length)} زاوية إعلانية — اقرأ الوصف واضغط «أنشئ الفيديو» لأي واحدة تعجبك.`}</p>
                </div>
                {productPage && (
                  <a href={productPage.landingUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-[#a5b4fc] hover:bg-white/10 hover:text-white cursor-pointer transition-colors">
                    {Ico.ext('h-4 w-4')} صفحة الهبوط
                  </a>
                )}
              </div>

              <div className="space-y-3">
                {creatives.map((c, i) => {
                  const female = c.gender === 'female'
                  const hasVideo = !!(c.videoUrl || c.mergedUrl)
                  const expanded = c.status === 'generating' || hasVideo
                  return (
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.035] hover:border-white/15 transition-colors overflow-hidden">
                      {/* summary row: Arabic description + create button */}
                      <div className="flex items-center gap-3 sm:gap-4 p-4">
                        <span className="shrink-0 grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-[#6366f1] to-[#e11d48] text-white text-[13px] font-bold">{toAr(i + 1)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold leading-snug text-white">{c.summaryAr}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {c.gender && (
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${female ? 'bg-[#e11d48]/15 text-[#fb7185]' : 'bg-[#6366f1]/15 text-[#a5b4fc]'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${female ? 'bg-[#fb7185]' : 'bg-[#a5b4fc]'}`} />{female ? 'أنثى' : 'ذكر'}
                              </span>
                            )}
                            {c.status === 'final' && <span className="text-[11px] font-bold text-[#4ade80]">جاهز بالصوت السعودي</span>}
                          </div>
                          {c.status === 'error' && <p className="mt-1.5 text-[11px] text-[#fb7185] leading-snug">تعذّر الإنشاء — اضغط «إعادة» للمحاولة مرة ثانية</p>}
                        </div>
                        <div className="shrink-0 flex flex-col items-stretch gap-1">
                          {c.status === 'pending' ? (
                            <button onClick={() => generateOne(i)}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#6366f1] to-[#e11d48] px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-[#6366f1]/25 hover:brightness-110 cursor-pointer transition-all">
                              {Ico.play('h-3.5 w-3.5')} أنشئ الفيديو
                            </button>
                          ) : c.status === 'generating' ? (
                            <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white/8 px-4 py-2.5 text-[13px] font-bold text-[#9aa0b4]">
                              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" /> جاري الإنشاء
                            </span>
                          ) : c.status === 'error' ? (
                            <button onClick={() => generateOne(i)} className="rounded-full bg-white/10 hover:bg-white/20 px-5 py-2.5 text-[13px] font-bold text-white cursor-pointer transition-colors">إعادة</button>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#4ade80]/12 px-3.5 py-2.5 text-[12px] font-bold text-[#4ade80]">{Ico.check('h-3.5 w-3.5')} جاهز</span>
                          )}
                          {c.status === 'pending' && <span className="text-[10px] text-[#5a5f72] text-center">~١٨٠ رصيد · ١٥ ث</span>}
                        </div>
                      </div>

                      {/* expanded: video + Saudi voiceover */}
                      {expanded && (
                        <div className="border-t border-white/5 p-4 flex flex-col sm:flex-row gap-4">
                          <div className="shrink-0 mx-auto sm:mx-0 w-[220px] sm:w-[280px] rounded-xl overflow-hidden bg-black/50 border border-white/5" style={{ aspectRatio: '9/16' }}>
                            {c.mergedUrl ? (
                              <video src={c.mergedUrl} controls loop playsInline className="h-full w-full object-cover" />
                            ) : c.videoUrl ? (
                              <video src={c.videoUrl} controls loop playsInline muted className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-[#9aa0b4] text-center px-2">
                                <span className="h-7 w-7 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
                                <span className="text-[11px] font-semibold">جاري الإنشاء…<br />~٢-٤ دقائق</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-3">
                            {hasVideo && (
                              <button onClick={() => addVoiceover(i)} disabled={c.status === 'vo'}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/8 hover:bg-white/14 disabled:opacity-40 py-2.5 text-[13px] font-bold text-white cursor-pointer transition-colors">
                                {c.status === 'vo' ? (<><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> جاري إضافة الصوت…</>) : (<>{Ico.mic('h-4 w-4')} {c.status === 'final' ? 'إعادة إنشاء الصوت السعودي' : 'أضف صوت سعودي'}</>)}
                              </button>
                            )}
                            {c.status === 'ready' && c.error && <p className="text-[12px] text-[#fb7185]" dir="auto">{c.error}</p>}
                            <div className="rounded-xl bg-black/25 border border-white/5 p-3">
                              <div className="text-[10px] font-bold text-[#6b7080] mb-1.5">التعليق الصوتي · عربي سعودي</div>
                              <div className="text-[13px] text-white leading-relaxed">{c.voiceover}</div>
                            </div>
                            <button onClick={() => update(i, { showBlocks: !c.showBlocks })} className="text-[12px] font-semibold text-[#818cf8] hover:text-[#a5b4fc] cursor-pointer transition-colors">
                              {c.showBlocks ? 'إخفاء' : 'عرض'} برومبت Seedance
                            </button>
                            {c.showBlocks && <div className="rounded-lg bg-black/40 border border-white/5 p-3 text-[11px] text-[#9aa0b4] whitespace-pre-wrap leading-relaxed max-h-56 overflow-auto" dir="ltr">{c.seedancePrompt}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* proceed to launch */}
              <div className="mt-10 flex flex-col items-center gap-2">
                <button onClick={() => setStep('launch')} disabled={readyCount === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#6366f1] to-[#e11d48] px-8 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#6366f1]/25 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all">
                  {Ico.rocket('h-4 w-4')} التالي: إطلاق الإعلان
                </button>
                {readyCount === 0 && <span className="text-[12px] text-[#5a5f72]">أنشئ فيديو واحدًا على الأقل للمتابعة</span>}
              </div>
            </div>
          </section>
        )}

        {/* STEP 5 — LAUNCH */}
        {wizardStep === 5 && (
          <section key="s5" className="ugc-rise min-h-[100svh] flex flex-col justify-center px-6 pt-24 pb-16">
            <div className="max-w-3xl w-full mx-auto">
              {step === 'launched' ? (
                <div className="text-center">
                  <div className="mx-auto grid place-items-center h-16 w-16 rounded-full bg-[#4ade80]/15 text-[#4ade80] mb-5">{Ico.check('h-8 w-8')}</div>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold">تم إطلاق الإعلان</h2>
                  <p className="mt-2 text-[15px] text-[#9aa0b4]">إعلانك الآن على TikTok. {launchResult?.creditsRemaining != null && `الرصيد المتبقي: ${toAr(launchResult.creditsRemaining)}.`}</p>
                  <pre className="mt-6 text-right text-[12px] text-[#9aa0b4] leading-relaxed whitespace-pre-wrap break-all bg-black/40 border border-white/10 rounded-2xl p-4 max-h-64 overflow-auto" dir="ltr">{JSON.stringify(launchResult, null, 2)}</pre>
                  <button onClick={resetAll} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/8 hover:bg-white/14 px-6 py-3 text-[14px] font-bold text-white cursor-pointer transition-colors">أنشئ إعلانًا جديدًا</button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="font-display text-3xl sm:text-4xl font-semibold">أطلق إعلانك على TikTok</h2>
                    <p className="mt-2 text-[15px] text-[#9aa0b4]">اختر الفيديو، حدّد الميزانية ووقت البدء.</p>
                  </div>

                  {/* creative picker */}
                  <div className="mb-6">
                    <div className="text-[12px] font-bold text-[#9aa0b4] mb-3">اختر الفيديو الإعلاني</div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {creatives.map((c, i) => {
                        const v = c.mergedUrl || c.videoUrl
                        if (!v) return null
                        const selected = i === effIdx
                        return (
                          <button key={i} onClick={() => setLaunchIndex(i)}
                            className={`relative shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${selected ? 'border-[#6366f1] ring-4 ring-[#6366f1]/25' : 'border-white/10 hover:border-white/25'}`}
                            style={{ width: 96, aspectRatio: '9/16' }}>
                            <video src={v} muted playsInline className="h-full w-full object-cover" />
                            {c.mergedUrl && <span className="absolute bottom-1 inset-x-1 rounded-md bg-black/60 text-[9px] font-bold text-[#4ade80] py-0.5">بالصوت</span>}
                            {selected && <span className="absolute top-1 right-1 grid place-items-center h-5 w-5 rounded-full bg-[#6366f1] text-white">{Ico.check('h-3 w-3')}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-bold text-[#9aa0b4] mb-2">الميزانية اليومية ({productPage?.currency || 'ر.س'})</label>
                        <input type="number" dir="ltr" min="1" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)}
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3.5 text-lg font-bold text-white outline-none focus:border-[#6366f1]/60 text-right" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-[#9aa0b4] mb-2">وقت البدء</label>
                        <input type="datetime-local" dir="ltr" value={startAt} onChange={e => setStartAt(e.target.value)}
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3.5 text-[14px] text-white outline-none focus:border-[#6366f1]/60" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 px-4 py-3">
                      <span className="text-[13px] text-[#9aa0b4]">تكلفة هذا الإعلان</span>
                      <span className="text-[15px] font-extrabold text-white">{toAr(CREDIT_COST_AD)} رصيد</span>
                    </div>

                    {error && (
                      <div className="rounded-xl border border-[#e11d48]/30 bg-[#e11d48]/10 px-4 py-3 text-[13px] text-[#fb7185] space-y-2">
                        <div dir="auto">{error}</div>
                        {(error.includes('TikTok') || error.includes('no_active') || error.includes('reauth')) && (
                          <a href="/dashboard/tiktok" target="_blank" rel="noopener noreferrer" className="inline-block text-[#a5b4fc] hover:text-white underline">ربط حساب TikTok ←</a>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button onClick={() => setStep('running')} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-3 text-[14px] font-semibold text-[#9aa0b4] hover:text-white hover:border-white/20 cursor-pointer transition-colors">
                        {Ico.back('h-4 w-4 flip-x')} رجوع
                      </button>
                      <button onClick={() => handleCreateAd(launchVideo)} disabled={step === 'launching' || !dailyBudget || !launchVideo}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#6366f1] to-[#e11d48] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#6366f1]/25 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all">
                        {step === 'launching' ? (<><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> جاري الإطلاق…</>) : (<>{Ico.rocket('h-4 w-4')} أطلق الإعلان</>)}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>

      {/* transition overlay: building landing page / writing angles */}
      {transitioning && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#08080f]/85 backdrop-blur-md px-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center gap-2 mb-6">
              {[0, 1, 2].map(d => <span key={d} className="ugc-dot h-3 w-3 rounded-full bg-gradient-to-br from-[#6366f1] to-[#e11d48]" style={{ animationDelay: `${d * 0.18}s` }} />)}
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-semibold">{statusLabel}</h3>
            <p className="mt-2 text-[14px] text-[#9aa0b4]">{step === 'planning' ? 'ندرس المنتج ونصمم لكل زاوية فكرة ومشهدًا وتعليقًا صوتيًا مختلفًا…' : 'نرتّب الصور والتفاصيل والسعر…'}</p>
          </div>
        </div>
      )}

      {/* Pixel modal */}
      {showPixelModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !savingPixel && setShowPixelModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111119] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-display text-xl font-semibold">اربط TikTok Pixel</h3>
              <p className="mt-1 text-[13px] text-[#9aa0b4]">حملات الطلبات تحتاج Pixel فيه حدث «Place an Order». الصق معرّف الـ Pixel وبنحفظه لمتجرك.</p>
            </div>
            <div className="rounded-2xl bg-black/30 border border-white/10 p-4 space-y-1.5">
              <div className="text-[11px] font-bold text-[#9aa0b4]">ما عندك Pixel؟</div>
              <ol className="text-[12px] text-[#9aa0b4] leading-relaxed list-decimal mr-4 space-y-0.5">
                <li>افتح TikTok Ads Manager ← Assets ← Events ← Web Events.</li>
                <li>اضغط «Set Up Web Events» واختر «TikTok Pixel» وأكمل الإعداد.</li>
                <li>أضف حدث «Place an Order» ثم انسخ معرّف الـ Pixel.</li>
              </ol>
              <a href="https://ads.tiktok.com/i18n/events_manager" target="_blank" rel="noopener noreferrer" className="inline-block text-[12px] text-[#a5b4fc] hover:text-white underline pt-1">افتح TikTok Events Manager ←</a>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#9aa0b4] mb-1.5">معرّف الـ Pixel</label>
              <input value={pixelInput} dir="ltr" onChange={e => setPixelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !savingPixel && savePixelAndLaunch(launchVideo)}
                placeholder="مثال: C1A2B3D4E5F6G7H8I9J0"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-[14px] text-white outline-none focus:border-[#6366f1]/60 text-left" />
              {pixelError && <p className="mt-1.5 text-[12px] text-[#fb7185]">{pixelError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPixelModal(false)} disabled={savingPixel}
                className="rounded-full border border-white/10 px-5 py-3 text-[14px] font-semibold text-[#9aa0b4] hover:text-white hover:border-white/20 cursor-pointer transition-colors disabled:opacity-40">إلغاء</button>
              <button onClick={() => savePixelAndLaunch(launchVideo)} disabled={savingPixel || !pixelInput.trim()}
                className="flex-1 rounded-full bg-gradient-to-l from-[#6366f1] to-[#e11d48] px-6 py-3 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-40 cursor-pointer transition-all">
                {savingPixel ? 'جاري الحفظ…' : 'احفظ وأطلق'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
