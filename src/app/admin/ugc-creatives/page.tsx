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
  /** Set only for known, curated failure reasons (e.g. person_in_image) — gates error display. */
  errorCode?: string | null
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
  chev: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>),
  heart: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>),
  comment: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.8 1.49 5.29 3.81 6.9-.13 1.09-.52 2.55-1.55 3.62 1.98-.13 3.6-.9 4.74-1.68.96.24 1.97.36 3 .36 5.52 0 10-3.94 10-8.8S17.52 2 12 2z" /></svg>),
  share: (c = '') => (<svg className={c} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13.5 4.5v3.2C7.9 8.3 4 12 3 17.5c2.4-3.1 5.7-4.7 10.5-4.7v3.7L21 9l-7.5-4.5z" /></svg>),
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
  // AI Studio premium landing (self-contained HTML) — previewed via srcDoc, no live-URL iframe.
  const [geniusHtml, setGeniusHtml] = useState<string | null>(null)
  const [geniusConfig, setGeniusConfig] = useState<any>(null)
  const [geniusWarning, setGeniusWarning] = useState<string | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  // Launch step
  const [launchIndex, setLaunchIndex] = useState(0)
  const [dailyBudget, setDailyBudget] = useState('50')
  const [startAt, setStartAt] = useState(defaultStartLocal())
  const [smartPlus, setSmartPlus] = useState(true)
  // Editable ad text (falls back to the AI caption) + optional advanced overrides.
  const [adCaption, setAdCaption] = useState<string | null>(null)
  const [advOpen, setAdvOpen] = useState(false)
  const [optComments, setOptComments] = useState(true)   // allow comments
  const [optDownload, setOptDownload] = useState(true)   // allow video download
  const [optShare, setOptShare] = useState(true)         // allow sharing
  const [optPangle, setOptPangle] = useState(false)      // extend placement to Pangle
  const [optBidMode, setOptBidMode] = useState<'auto' | 'cost_cap'>('auto')
  const [optBidCap, setOptBidCap] = useState('')
  // Manual clean-photos flow — offered only when generation failed with person_in_image.
  const [personPhotos, setPersonPhotos] = useState<'none' | 'needed' | 'uploading' | 'done'>('none')
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  // AI agents activation (post-launch): مراقب الإنفاق + محلل الأداء
  const [agentGuardian, setAgentGuardian] = useState(true)
  const [agentReporter, setAgentReporter] = useState(true)
  const [agentTargetCpa, setAgentTargetCpa] = useState('')
  const [agentEmail, setAgentEmail] = useState('')
  const [agentsState, setAgentsState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [agentsErr, setAgentsErr] = useState<string | null>(null)
  const [launchResult, setLaunchResult] = useState<any>(null)
  // Connected TikTok ad account — its currency drives the budget field (may differ from store currency).
  const [adAccount, setAdAccount] = useState<{ advertiser_id: string; currency: string | null; name: string | null; identity?: { display_name: string | null; profile_image: string | null } | null } | null>(null)
  const [showPixelModal, setShowPixelModal] = useState(false)
  const [pixelInput, setPixelInput] = useState('')
  const [pixelError, setPixelError] = useState<string | null>(null)
  const [savingPixel, setSavingPixel] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const s = createClient()
    s.auth.getUser().then(({ data: { user } }) => { if (!user) { router.push('/admin/login'); return } setAuthed(true) })
  }, [router])

  // Load the connected ad account (currency for the budget field, id for Ads Manager links).
  useEffect(() => {
    if (!authed) return
    fetch('/api/admin/tiktok-ad-account')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.advertiser_id) setAdAccount(d) })
      .catch(() => {})
  }, [authed])

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

      // AI Studio premium landing: art-direct + AI images (prepare) → assemble + save (finish).
      // Overwrites the basic landing on this product with the self-contained custom_html page.
      // If it fails we keep the basic landing as a safe fallback.
      try {
        const gBody = {
          title: product.title, price: parseFloat(priceInput),
          compareAtPrice: discountInput && parseFloat(discountInput) > 0 ? parseFloat(discountInput) : null,
          description: product.description, features: [], images: images.slice(0, 6), currency: page.currency,
        }
        const prep = await fetch('/api/ai/landing-genius/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gBody) })
        const pd = await safeJson(prep, 'تعذّر تجهيز صفحة الهبوط المميزة')
        if (!prep.ok) throw new Error(pd.error || 'تعذّر تجهيز صفحة الهبوط المميزة')
        const fin = await fetch('/api/ai/landing-genius', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: page.productId, ...gBody, art: pd.art, generated: pd.generated, cutoutUrl: pd.cutoutUrl }),
        })
        const fd = await safeJson(fin, 'تعذّر إنشاء صفحة الهبوط المميزة')
        if (!fin.ok) throw new Error(fd.error || 'تعذّر إنشاء صفحة الهبوط المميزة')
        if (fd.html) { setGeniusHtml(fd.html); setGeniusConfig(fd.landingConfig || null); setGeniusWarning(null) }
      } catch (ge: any) {
        // Non-fatal: the basic landing already exists. Surface WHY (e.g. رصيد غير كافٍ)
        // so the fallback is never silent — the user always knows what happened.
        console.warn('AI Studio landing generation failed, using basic landing:', ge?.message)
        setGeniusWarning(ge?.message || 'تعذّر إنشاء صفحة الهبوط المميزة')
      }

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
      if (!g.ok) {
        // person_in_image is unfixable by retry — offer the manual clean-photos path.
        if (gd.code === 'person_in_image') setPersonPhotos(s => s === 'done' ? s : 'needed')
        update(i, { status: 'error', error: gd.error || null, errorCode: gd.code || null })
        return
      }
      update(i, { taskId: gd.taskId })
    } catch (e: any) { update(i, { status: 'error', error: e.message, errorCode: null }) }
  }

  // Deploy the Phase-1 agents on the campaign that was just launched.
  async function deployAgents() {
    if (!launchResult?.campaign_id) return
    const agents = [agentGuardian && 'guardian', agentReporter && 'reporter'].filter(Boolean)
    if (!agents.length) { setAgentsErr('اختر وكيلًا واحدًا على الأقل'); return }
    if (agentGuardian && !(parseFloat(agentTargetCpa) > 0)) { setAgentsErr('أدخل تكلفة الطلب المستهدفة'); return }
    if (!/.+@.+\..+/.test(agentEmail)) { setAgentsErr('أدخل بريدًا صحيحًا للتنبيهات'); return }
    setAgentsState('saving'); setAgentsErr(null)
    try {
      const r = await fetch('/api/admin/agent-deployments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: launchResult.campaign_id,
          campaignName: productPage?.titleAr || null,
          smartPlus,
          agents,
          targetCpa: parseFloat(agentTargetCpa) || null,
          alertEmail: agentEmail.trim(),
          currency: adAccount?.currency || productPage?.currency || '',
        }),
      })
      const d = await safeJson(r, 'فشل تفعيل الوكلاء')
      if (!r.ok) throw new Error(d.error || 'تعذّر تفعيل الوكلاء')
      setAgentsState('done')
    } catch (e: any) { setAgentsState('idle'); setAgentsErr(e.message) }
  }

  // Merchant-supplied product-only photos (offered when Seedance rejects photos with a
  // real person). Replaces the generation image set and resets the blocked angles.
  async function uploadCleanPhotos(files: FileList | null) {
    if (!files || !files.length) return
    setPersonPhotos('uploading'); setUploadErr(null)
    try {
      const fd = new FormData()
      Array.from(files).slice(0, 9).forEach(f => fd.append('files', f))
      const r = await fetch('/api/admin/upload-images', { method: 'POST', body: fd })
      const d = await safeJson(r, 'فشل رفع الصور')
      if (!r.ok) throw new Error(d.error || 'تعذّر رفع الصور')
      setProxiedImages(d.mediaUrls || [])
      setCreatives(prev => prev.map(c => c.errorCode === 'person_in_image'
        ? { ...c, status: 'pending', error: null, errorCode: null }
        : c))
      setPersonPhotos('done')
    } catch (e: any) { setPersonPhotos('needed'); setUploadErr(e.message) }
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
          caption: (adCaption ?? productPage.caption).trim() || productPage.caption,
          dailyBudget: parseFloat(dailyBudget) || 0,
          scheduleStart: startAt,
          smartPlus,
          advanced: {
            commentDisabled: !optComments,
            downloadDisabled: !optDownload,
            shareDisabled: !optShare,
            pangle: optPangle,
            bidStrategy: optBidMode,
            bidCap: optBidMode === 'cost_cap' ? parseFloat(optBidCap) || null : null,
          },
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
    setAdCaption(null); setAdvOpen(false); setOptComments(true); setOptDownload(true); setOptShare(true)
    setOptPangle(false); setOptBidMode('auto'); setOptBidCap('')
    setPersonPhotos('none'); setUploadErr(null)
    setAgentGuardian(true); setAgentReporter(true); setAgentTargetCpa(''); setAgentEmail(''); setAgentsState('idle'); setAgentsErr(null)
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
  const statusLabel = step === 'extracting' ? 'نقرأ تفاصيل منتجك…' : step === 'creating_page' ? 'نصمم صفحة هبوط احترافية بالذكاء الاصطناعي…' : step === 'planning' ? 'نحلّل منتجك ونبتكر ١٠ زوايا إعلانية' : ''
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
                    {geniusHtml ? (
                      <iframe
                        srcDoc={geniusHtml.replace('<head>', `<head><script>window.LANDING_CONFIG=${JSON.stringify(geniusConfig || {})};</script>`)}
                        title="معاينة صفحة الهبوط"
                        className="absolute inset-0 w-full h-full bg-white"
                      />
                    ) : (
                      <iframe src={productPage.landingUrl} title="معاينة صفحة الهبوط" className="absolute inset-0 w-full h-full bg-white" loading="lazy" />
                    )}
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

                  {geniusWarning && (
                    <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-[13px] text-[#fbbf24] leading-relaxed">
                      تعذّر إنشاء صفحة الهبوط المميزة (استوديو الإعلانات) — عُرضت الصفحة الأساسية بدلاً منها.<br />
                      <span className="text-[12px] text-[#fcd34d]/80">السبب: {geniusWarning}</span>
                    </div>
                  )}

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

              {/* clean-photos fallback — shown only for the person_in_image rejection */}
              {personPhotos !== 'none' && (
                <div className={`mb-6 rounded-2xl border p-5 ${personPhotos === 'done' ? 'border-[#4ade80]/25 bg-[#4ade80]/8' : 'border-[#f59e0b]/30 bg-[#f59e0b]/10'}`}>
                  {personPhotos === 'done' ? (
                    <p className="text-[13.5px] font-semibold text-[#4ade80]">تم استبدال صور الفيديو بالصور المرفوعة — اضغط «أنشئ الفيديو» أو «إعادة» على أي زاوية للمتابعة.</p>
                  ) : (
                    <>
                      <p className="text-[13.5px] font-bold text-[#fbbf24]">صور المنتج تحتوي على شخص (موديل) — وخدمة الفيديو ترفض الصور التي فيها أشخاص.</p>
                      <p className="mt-1 text-[12.5px] text-[#fcd34d]/80 leading-relaxed">ارفع صور المنتج فقط (بدون موديل — مثل صورة مسطّحة أو على علاقة ملابس) وسنستخدمها للفيديو بدل صور الصفحة.</p>
                      <div className="mt-3.5 flex items-center gap-3">
                        <label className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${personPhotos === 'uploading' ? 'bg-white/10 text-[#9aa0b4] pointer-events-none' : 'bg-[#f59e0b]/20 text-[#fbbf24] hover:bg-[#f59e0b]/30'}`}>
                          {personPhotos === 'uploading'
                            ? (<><span className="h-3.5 w-3.5 rounded-full border-2 border-[#fbbf24]/40 border-t-[#fbbf24] animate-spin" /> جاري الرفع…</>)
                            : 'ارفع صور المنتج (بدون موديل)'}
                          <input type="file" accept="image/*" multiple className="hidden" disabled={personPhotos === 'uploading'}
                            onChange={e => { uploadCleanPhotos(e.target.files); e.target.value = '' }} />
                        </label>
                        {uploadErr && <span className="text-[12px] text-[#fb7185]" dir="auto">{uploadErr}</span>}
                      </div>
                    </>
                  )}
                </div>
              )}

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
                          {c.status === 'error' && <p className="mt-1.5 text-[11px] text-[#fb7185] leading-snug" dir="auto">{c.errorCode && c.error ? c.error : 'تعذّر الإنشاء — اضغط «إعادة» للمحاولة مرة ثانية'}</p>}
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
                <div className="max-w-lg mx-auto text-center">
                  <div className="mx-auto grid place-items-center h-20 w-20 rounded-full bg-gradient-to-br from-[#4ade80]/25 to-[#4ade80]/5 ring-1 ring-[#4ade80]/30 text-[#4ade80] mb-6">{Ico.check('h-9 w-9')}</div>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold">تم إطلاق حملتك</h2>
                  <p className="mt-2.5 text-[15px] text-[#9aa0b4] leading-relaxed">أنشأنا الحملة والمجموعة الإعلانية والإعلان على TikTok.</p>

                  {/* live-after-review notice */}
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#4ade80]/25 bg-[#4ade80]/10 px-4 py-2 text-[12.5px] font-bold text-[#4ade80]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                    الحملة نشطة — يبدأ العرض بعد اجتياز مراجعة TikTok
                  </div>

                  {/* launch summary */}
                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] overflow-hidden text-right">
                    {[
                      { label: 'الحملة', value: launchResult?.campaign_id },
                      { label: 'المجموعة الإعلانية', value: launchResult?.adgroup_id },
                      { label: 'الإعلان', value: launchResult?.ad_id },
                    ].filter(r => r.value).map((r, i) => (
                      <div key={r.label} className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                        <span className="text-[13px] font-bold text-[#9aa0b4] shrink-0">{r.label}</span>
                        <span className="font-mono text-[12.5px] text-white/85 truncate" dir="ltr">{r.value}</span>
                      </div>
                    ))}
                    {launchResult?.creditsCharged != null && (
                      <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-white/5 bg-black/20">
                        <span className="text-[13px] font-bold text-[#9aa0b4]">الرصيد</span>
                        <span className="text-[13px] font-bold text-white">
                          خُصم {toAr(launchResult.creditsCharged)}
                          {launchResult?.creditsRemaining != null && <span className="text-[#9aa0b4] font-semibold"> · المتبقي {toAr(launchResult.creditsRemaining)}</span>}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI agents — Phase 1: مراقب الإنفاق + محلل الأداء */}
                  <div className="mt-6 rounded-3xl border border-[#6366f1]/25 bg-[#6366f1]/[0.07] p-5 text-right">
                    <div className="flex items-center justify-between mb-1">
                      <span className="rounded-full bg-[#6366f1]/20 px-2.5 py-1 text-[10px] font-bold text-[#a5b4fc]">جديد</span>
                      <h3 className="text-[15px] font-bold text-white">وكلاء الذكاء لهذه الحملة</h3>
                    </div>
                    {agentsState === 'done' ? (
                      <p className="text-[13px] text-[#4ade80] font-semibold leading-relaxed">تم تفعيل الوكلاء — مراقب الإنفاق يبدأ بوضع المراقبة ٤٨ ساعة (تنبيهات فقط) ثم يتصرف تلقائيًا، والتقرير اليومي يصلك صباحًا على بريدك.</p>
                    ) : (
                      <>
                        <p className="text-[12.5px] text-[#9aa0b4] leading-relaxed mb-4">وكلاء يراقبون حملتك تلقائيًا على مدار الساعة:</p>
                        <div className="space-y-2.5 mb-4">
                          <button type="button" onClick={() => setAgentGuardian(v => !v)}
                            className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-right cursor-pointer transition-colors ${agentGuardian ? 'border-[#6366f1]/50 bg-[#6366f1]/12' : 'border-white/10 bg-black/20'}`}>
                            <span className={`mt-0.5 grid place-items-center h-5 w-5 rounded-md shrink-0 ${agentGuardian ? 'bg-[#6366f1] text-white' : 'bg-white/10 text-transparent'}`}>{Ico.check('h-3 w-3')}</span>
                            <span className="flex-1">
                              <span className="block text-[13px] font-bold text-white">مراقب الإنفاق</span>
                              <span className="block text-[11.5px] text-[#9aa0b4] mt-0.5">يوقف الحملة تلقائيًا إذا صرفت دون طلبات أو تجاوزت تكلفة الطلب المستهدفة بـ ٥٠٪</span>
                            </span>
                          </button>
                          <button type="button" onClick={() => setAgentReporter(v => !v)}
                            className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-right cursor-pointer transition-colors ${agentReporter ? 'border-[#6366f1]/50 bg-[#6366f1]/12' : 'border-white/10 bg-black/20'}`}>
                            <span className={`mt-0.5 grid place-items-center h-5 w-5 rounded-md shrink-0 ${agentReporter ? 'bg-[#6366f1] text-white' : 'bg-white/10 text-transparent'}`}>{Ico.check('h-3 w-3')}</span>
                            <span className="flex-1">
                              <span className="block text-[13px] font-bold text-white">محلل الأداء</span>
                              <span className="block text-[11.5px] text-[#9aa0b4] mt-0.5">تقرير يومي على بريدك: الإنفاق، الطلبات الفعلية، وكل إجراء نفذه الوكلاء</span>
                            </span>
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                          {agentGuardian && (
                            <input type="number" dir="ltr" min="1" value={agentTargetCpa} onChange={e => setAgentTargetCpa(e.target.value)}
                              placeholder={`تكلفة الطلب المستهدفة (${adAccount?.currency || 'ر.س'})`}
                              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-[13px] font-bold text-white outline-none focus:border-[#6366f1]/60 text-right placeholder:font-semibold placeholder:text-[#5a5f72]" />
                          )}
                          <input type="email" dir="ltr" value={agentEmail} onChange={e => setAgentEmail(e.target.value)}
                            placeholder="بريد التنبيهات والتقارير"
                            className={`w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-[13px] font-bold text-white outline-none focus:border-[#6366f1]/60 text-right placeholder:font-semibold placeholder:text-[#5a5f72] ${agentGuardian ? '' : 'sm:col-span-2'}`} />
                        </div>
                        {agentsErr && <p className="text-[12px] text-[#fb7185] mb-2" dir="auto">{agentsErr}</p>}
                        <button onClick={deployAgents} disabled={agentsState === 'saving'}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-50 px-6 py-3 text-[13.5px] font-bold text-white cursor-pointer transition-colors">
                          {agentsState === 'saving' ? (<><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> جاري التفعيل…</>) : 'فعّل الوكلاء'}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="mt-7 flex flex-col sm:flex-row-reverse items-center justify-center gap-3">
                    <a href={`https://ads.tiktok.com/i18n/manage/campaign${adAccount?.advertiser_id ? `?aadvid=${adAccount.advertiser_id}` : ''}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#6366f1] to-[#e11d48] px-7 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-[#6366f1]/25 hover:brightness-110 cursor-pointer transition-all">
                      {Ico.ext('h-4 w-4')} افتح TikTok Ads Manager
                    </a>
                    <button onClick={resetAll} className="inline-flex items-center gap-2 rounded-full border border-white/10 hover:border-white/25 px-6 py-3.5 text-[14px] font-bold text-[#c9cdda] hover:text-white cursor-pointer transition-colors">
                      أنشئ إعلانًا جديدًا
                    </button>
                  </div>
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

                  <div className="grid md:grid-cols-[236px_1fr] gap-6 items-start">
                  {/* TikTok-style preview — how the ad looks to the customer */}
                  <div className="mx-auto md:mx-0 w-[236px] max-w-full">
                    <div className="relative rounded-[2rem] border-8 border-[#17171f] bg-black shadow-2xl overflow-hidden" style={{ aspectRatio: '9/17' }}>
                      {launchVideo && <video key={launchVideo} src={launchVideo} muted autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover" />}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
                      {/* action rail */}
                      <div className="absolute right-2 bottom-[86px] flex flex-col items-center gap-3.5 text-white">
                        {adAccount?.identity?.profile_image
                          ? <img src={adAccount.identity.profile_image} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover" />
                          : <span className="grid place-items-center h-9 w-9 rounded-full border-2 border-white bg-white/20 text-[13px] font-bold">{(adAccount?.identity?.display_name || 'م').slice(0, 1)}</span>}
                        <span className="flex flex-col items-center gap-0.5">{Ico.heart('h-6 w-6 drop-shadow')}<b className="text-[9px]">12.4K</b></span>
                        <span className="flex flex-col items-center gap-0.5">{Ico.comment('h-6 w-6 drop-shadow')}<b className="text-[9px]">341</b></span>
                        <span className="flex flex-col items-center gap-0.5">{Ico.share('h-6 w-6 drop-shadow')}<b className="text-[9px]">96</b></span>
                      </div>
                      {/* caption + CTA */}
                      <div className="absolute bottom-2.5 left-2.5 right-12 text-white space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold drop-shadow truncate">{adAccount?.identity?.display_name || productPage?.titleAr || 'متجرك'}</span>
                          <span className="shrink-0 rounded-[3px] bg-white/25 px-1 py-px text-[7.5px] font-bold">ممول</span>
                        </div>
                        <p className="text-[10.5px] leading-snug text-white/90 line-clamp-2 drop-shadow">{adCaption ?? productPage?.caption}</p>
                        <div className="rounded-md bg-[#FE2C55] text-center text-[11px] font-bold py-1.5">اطلب الآن</div>
                      </div>
                    </div>
                    <p className="mt-2 text-center text-[10.5px] text-[#5a5f72]">معاينة تقريبية لشكل الإعلان عند العميل — قد يبدّل TikTok زر الإجراء تلقائيًا</p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-bold text-[#9aa0b4] mb-2">الميزانية اليومية ({adAccount?.currency || productPage?.currency || 'ر.س'})</label>
                        <input type="number" dir="ltr" min="1" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)}
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3.5 text-lg font-bold text-white outline-none focus:border-[#6366f1]/60 text-right" />
                        {adAccount?.currency && productPage?.currency && adAccount.currency !== productPage.currency && (
                          <p className="mt-1.5 text-[11px] text-[#fbbf24]">عملة الحساب الإعلاني ({adAccount.currency}) تختلف عن عملة متجرك ({productPage.currency}) — الميزانية تُخصم بعملة الحساب الإعلاني.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-[#9aa0b4] mb-2">وقت البدء</label>
                        <input type="datetime-local" dir="ltr" value={startAt} onChange={e => setStartAt(e.target.value)}
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3.5 text-[14px] text-white outline-none focus:border-[#6366f1]/60" />
                      </div>
                    </div>

                    {/* editable ad text (shown under the video in the ad + live in the preview) */}
                    <div>
                      <label className="block text-[12px] font-bold text-[#9aa0b4] mb-2">نص الإعلان <span className="font-semibold text-[#5a5f72]">— يظهر تحت الفيديو</span></label>
                      <textarea dir="auto" rows={2} maxLength={100}
                        value={adCaption ?? productPage?.caption ?? ''}
                        onChange={e => setAdCaption(e.target.value)}
                        className="w-full resize-none rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-[13.5px] leading-relaxed text-white outline-none focus:border-[#6366f1]/60" />
                      <div className="mt-1 flex items-center justify-between text-[10.5px] text-[#5a5f72]">
                        <span>{toAr((adCaption ?? productPage?.caption ?? '').length)}/١٠٠</span>
                        {adCaption != null && adCaption !== productPage?.caption && (
                          <button onClick={() => setAdCaption(null)} className="text-[#818cf8] hover:text-[#a5b4fc] cursor-pointer transition-colors">استعادة النص الأصلي</button>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSmartPlus(v => !v)}
                      className="w-full flex items-center justify-between rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-right cursor-pointer hover:border-white/20 transition-colors"
                    >
                      <span className={`relative inline-block w-11 h-6 rounded-full transition-colors ${smartPlus ? 'bg-[#6366f1]' : 'bg-white/15'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${smartPlus ? 'right-0.5' : 'right-[22px]'}`} />
                      </span>
                      <span className="flex-1 mr-3">
                        <span className="block text-[13.5px] font-bold text-white">حملة Smart+ (ذكية) ⚡</span>
                        <span className="block text-[11.5px] text-[#9aa0b4] mt-0.5">تتولى TikTok الاستهداف والمزايدة والتوزيع تلقائيًا. تنطلق الحملة مباشرة ويبدأ العرض بعد اجتياز مراجعة TikTok.</span>
                      </span>
                    </button>

                    {/* advanced options — optional; defaults match the proven auto setup */}
                    <div className="rounded-xl bg-black/30 border border-white/10 overflow-hidden">
                      <button type="button" onClick={() => setAdvOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 text-right cursor-pointer hover:bg-white/[0.03] transition-colors">
                        <span className={`text-[#9aa0b4] transition-transform ${advOpen ? 'rotate-180' : ''}`}>{Ico.chev('h-4 w-4')}</span>
                        <span>
                          <span className="block text-[13px] font-bold text-white">خيارات متقدمة</span>
                          <span className="block text-[11px] text-[#6b7080] mt-0.5">اختياري — التعليقات، أماكن العرض، المزايدة. اتركها كما هي وتنطلق بالإعداد الموصى به.</span>
                        </span>
                      </button>
                      {advOpen && (
                        <div className="border-t border-white/5 px-4 py-4 space-y-4">
                          {/* interaction toggles */}
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { label: 'التعليقات', on: optComments, set: setOptComments },
                              { label: 'تنزيل الفيديو', on: optDownload, set: setOptDownload },
                              { label: 'المشاركة', on: optShare, set: setOptShare },
                            ] as const).map(t => (
                              <button key={t.label} type="button" onClick={() => t.set(v => !v)}
                                className={`rounded-lg border px-2 py-2.5 text-[11.5px] font-bold cursor-pointer transition-colors ${t.on ? 'border-[#6366f1]/50 bg-[#6366f1]/15 text-white' : 'border-white/10 bg-black/20 text-[#6b7080]'}`}>
                                {t.label}
                                <span className={`block mt-0.5 text-[9.5px] font-semibold ${t.on ? 'text-[#a5b4fc]' : 'text-[#5a5f72]'}`}>{t.on ? 'مسموحة' : 'موقوفة'}</span>
                              </button>
                            ))}
                          </div>

                          {/* placement */}
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-bold text-[#9aa0b4]">أماكن العرض</span>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-bold text-white">TikTok</span>
                              <button type="button" onClick={() => setOptPangle(v => !v)}
                                className={`rounded-full px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-colors ${optPangle ? 'bg-[#6366f1]/25 text-[#a5b4fc] ring-1 ring-[#6366f1]/40' : 'bg-black/25 text-[#6b7080] ring-1 ring-white/10'}`}>
                                + Pangle
                              </button>
                            </div>
                          </div>

                          {/* bidding */}
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-bold text-[#9aa0b4]">المزايدة</span>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setOptBidMode('auto')}
                                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-colors ${optBidMode === 'auto' ? 'bg-[#6366f1]/25 text-[#a5b4fc] ring-1 ring-[#6366f1]/40' : 'bg-black/25 text-[#6b7080] ring-1 ring-white/10'}`}>
                                  تلقائية (موصى بها)
                                </button>
                                <button type="button" onClick={() => setOptBidMode('cost_cap')}
                                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-colors ${optBidMode === 'cost_cap' ? 'bg-[#6366f1]/25 text-[#a5b4fc] ring-1 ring-[#6366f1]/40' : 'bg-black/25 text-[#6b7080] ring-1 ring-white/10'}`}>
                                  حد تكلفة
                                </button>
                              </div>
                            </div>
                            {optBidMode === 'cost_cap' && (
                              <div className="mt-2.5">
                                <input type="number" dir="ltr" min="1" step="any" value={optBidCap} onChange={e => setOptBidCap(e.target.value)}
                                  placeholder={`أقصى تكلفة للطلب الواحد (${adAccount?.currency || 'ر.س'})`}
                                  className="w-full rounded-lg bg-black/25 border border-white/10 px-3 py-2.5 text-[13px] font-bold text-white outline-none focus:border-[#6366f1]/60 text-right placeholder:font-semibold placeholder:text-[#5a5f72]" />
                                <p className="mt-1 text-[10.5px] text-[#5a5f72]">يحاول TikTok إبقاء تكلفة الطلب تحت هذا الحد — قد يقل الوصول إذا كان الحد منخفضًا.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
            <p className="mt-2 text-[14px] text-[#9aa0b4]">{step === 'planning' ? 'ندرس المنتج ونصمم لكل زاوية فكرة ومشهدًا وتعليقًا صوتيًا مختلفًا…' : 'نبني صور المنتج ونركّب صفحة هبوط كاملة — قد يستغرق دقيقتين…'}</p>
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
