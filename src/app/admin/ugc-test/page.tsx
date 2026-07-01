'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Step = 'url' | 'extracting' | 'details' | 'generating' | 'polling' | 'creating_page' | 'review' | 'launching' | 'launched' | 'error'

type Product = { title: string; description: string; images: string[]; price: string | null }
type ProductPage = { productId: string; landingUrl: string; caption: string; titleAr: string; price: number; compareAtPrice: number | null; currency: string }

const FIXED_CREDIT_COST = 50

type IP = { className?: string }
const IconLink     = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const IconDownload = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconChevDown = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="6 9 12 15 18 9"/></svg>
const IconCheck    = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M20 6 9 17l-5-5"/></svg>
const IconExternal = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>

const STEPS = ['Product', 'Video', 'Review', 'Launch'] as const
function stepIndex(s: Step): number {
  if (s === 'url' || s === 'extracting' || s === 'details') return 0
  if (s === 'creating_page' || s === 'generating' || s === 'polling') return 1
  if (s === 'review') return 2
  return 3
}

function defaultStartLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000) // +1h
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function UGCAdWizard() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [url, setUrl] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [step, setStep] = useState<Step>('url')
  const [statusUrl, setStatusUrl] = useState<string | null>(null)
  const [responseUrl, setResponseUrl] = useState<string | null>(null)
  const [veoPrompt, setVeoPrompt] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [productPage, setProductPage] = useState<ProductPage | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [dailyBudget, setDailyBudget] = useState('50')
  const [startAt, setStartAt] = useState(defaultStartLocal())
  const [launchResult, setLaunchResult] = useState<any>(null)
  const [showPixelModal, setShowPixelModal] = useState(false)
  const [pixelInput, setPixelInput] = useState('')
  const [pixelError, setPixelError] = useState<string | null>(null)
  const [savingPixel, setSavingPixel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)
  const productRef = useRef<Product | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/admin/login'); return }
      setAuthed(true)
    })
  }, [router])

  useEffect(() => {
    if (step === 'polling') {
      elapsedRef.current = 0; setElapsed(0)
      timerRef.current = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current) }, 1000)
    } else if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [step])

  const stopPolling = useCallback(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }, [])
  useEffect(() => () => { stopPolling() }, [stopPolling])

  const startPolling = useCallback((sUrl: string, rUrl: string | null) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams({ statusUrl: sUrl })
        if (rUrl) params.set('responseUrl', rUrl)
        const res = await fetch(`/api/admin/ugc-status?${params}`)
        const data = await res.json()
        if (data.status === 'completed') {
          stopPolling(); setVideoUrl(data.videoUrl); setStep('review')
        } else if (data.status === 'failed') {
          stopPolling(); setError(data.error || 'Generation failed'); setStep('error')
        }
      } catch { /* keep polling */ }
    }, 3000)
  }, [stopPolling])

  const generateVideo = useCallback(async (p: Product) => {
    setStep('generating'); setVeoPrompt(null); setVideoUrl(null); setShowPrompt(false)
    try {
      const res = await fetch('/api/admin/ugc-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: p.title, description: p.description, imageUrls: p.images.slice(0, 4), productUrl: url.trim() }),
      })
      const data = await res.json()
      if (data.veoPrompt) setVeoPrompt(data.veoPrompt)
      if (!res.ok) throw new Error(data.error || 'Generation request failed')
      setStatusUrl(data.statusUrl); setResponseUrl(data.responseUrl); setVeoPrompt(data.veoPrompt)
      setStep('polling'); startPolling(data.statusUrl, data.responseUrl)
    } catch (e: any) { setError(e.message); setStep('error') }
  }, [url, startPolling])

  // From the details step: create the Arabic product page (with price + discount), then start the video.
  const startBuild = useCallback(async () => {
    const p = productRef.current
    if (!p) return
    if (!priceInput || !(parseFloat(priceInput) > 0)) { setError('Enter a valid price'); return }
    setStep('creating_page'); setError(null)
    try {
      const res = await fetch('/api/admin/ugc-create-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: p.title, description: p.description, images: p.images, sourceUrl: url.trim(),
          price: parseFloat(priceInput),
          compareAtPrice: discountInput && parseFloat(discountInput) > 0 ? parseFloat(discountInput) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create product page')
      setProductPage(data)
      generateVideo(p)
    } catch (e: any) { setError(e.message); setStep('error') }
  }, [url, priceInput, discountInput, generateVideo])

  async function handleExtract() {
    const trimmed = url.trim()
    if (!trimmed) return
    setStep('extracting'); setError(null); setProduct(null); setVideoUrl(null); setProductPage(null); setLaunchResult(null)
    try {
      const res = await fetch('/api/products/fetch-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to extract product')
      if (data.blocked) throw new Error('This site blocks scraping (e.g. AliExpress). Try another URL.')
      const p: Product = { title: data.title || 'Untitled', description: data.description || '', images: data.images || [], price: data.price ?? null }
      setProduct(p); productRef.current = p
      // Prefill price from the scraped value; user confirms price + discount next
      const scrapedNum = String(data.price ?? '').replace(/[^0-9.]/g, '')
      setPriceInput(scrapedNum || '')
      setDiscountInput('')
      setStep('details')
    } catch (e: any) { setError(e.message); setStep('error') }
  }

  async function handleCreateAd() {
    if (!productPage) return
    setStep('launching'); setError(null)
    try {
      const res = await fetch('/api/admin/ugc-create-ad', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productPage.productId,
          videoUrl,
          caption: productPage.caption,
          dailyBudget: parseFloat(dailyBudget) || 0,
          scheduleStart: startAt,
        }),
      })
      const data = await res.json()
      if (res.status === 400 && data.needsPixel) {
        setStep('review'); setPixelError(null); setShowPixelModal(true); return
      }
      if (!res.ok) throw new Error(data.error || 'Launch failed')
      setLaunchResult(data); setStep('launched')
    } catch (e: any) { setError(e.message); setStep('error') }
  }

  async function savePixelAndLaunch() {
    const id = pixelInput.trim()
    if (!id) { setPixelError('Enter your TikTok Pixel ID'); return }
    setSavingPixel(true); setPixelError(null)
    try {
      const res = await fetch('/api/admin/set-store-pixel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pixelId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save Pixel ID')
      setSavingPixel(false); setShowPixelModal(false)
      handleCreateAd() // retry the launch now that the pixel is saved
    } catch (e: any) { setPixelError(e.message); setSavingPixel(false) }
  }

  function resetAll() {
    stopPolling(); setStep('url'); setProduct(null); productRef.current = null
    setVideoUrl(null); setProductPage(null); setVeoPrompt(null); setLaunchResult(null); setError(null); setElapsed(0)
    setPriceInput(''); setDiscountInput('')
  }

  function handleDownload() {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl; a.download = `ugc-video-${Date.now()}.mp4`; a.target = '_blank'; a.rel = 'noopener noreferrer'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  if (!authed) {
    return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center"><div className="text-[#8b8fa8] text-sm">Loading...</div></div>
  }

  const busy = step === 'extracting' || step === 'generating' || step === 'polling' || step === 'creating_page' || step === 'launching'
  const curIdx = stepIndex(step)

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        <div>
          <h1 className="text-xl font-bold text-white">Create TikTok Ad</h1>
          <p className="text-sm text-[#8b8fa8] mt-1">Paste a product URL — we build the page, the UGC video, and launch the ad.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i <= curIdx ? 'text-white' : 'text-[#4a4d5a]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < curIdx ? 'bg-[#4ade80] text-black' : i === curIdx ? 'bg-[#6366f1] text-white' : 'bg-[#1a1d24] border border-[#2a2d35]'}`}>
                  {i < curIdx ? <IconCheck className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < curIdx ? 'bg-[#4ade80]' : 'bg-[#2a2d35]'}`} />}
            </div>
          ))}
        </div>

        {/* URL input */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-wider">Product URL</div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 focus-within:border-[#6366f1] transition-colors">
              <IconLink className="w-4 h-4 text-[#4a4d5a] shrink-0" />
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !busy && handleExtract()}
                placeholder="https://example.com/product/..."
                className="flex-1 bg-transparent text-sm text-white placeholder-[#4a4d5a] py-2.5 outline-none" disabled={busy} />
            </div>
            <button onClick={handleExtract} disabled={busy || !url.trim()}
              className="px-4 py-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap">
              {step === 'extracting' ? 'Extracting...' : 'Start'}
            </button>
          </div>
        </div>

        {/* Product card */}
        {product && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-[#4ade80]" />
              <span className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-wider">Product</span>
            </div>
            <div className="flex gap-3">
              {product.images[0] && <img src={product.images[0]} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0 border border-[#2a2d35]" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white leading-tight">{product.title}</div>
                {product.price && <div className="text-xs text-[#8b8fa8] mt-1">{product.price}</div>}
                {product.description && <div className="text-xs text-[#8b8fa8] mt-1 line-clamp-2 leading-relaxed">{product.description}</div>}
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {product.images.slice(1, 7).map((img, i) => <img key={i} src={img} alt="" className="w-11 h-11 object-cover rounded-md shrink-0 border border-[#2a2d35]" />)}
              </div>
            )}
          </div>
        )}

        {/* Details — price & discount, then build the Arabic landing page */}
        {step === 'details' && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-4">
            <div className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-wider">Pricing & landing page</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider block mb-1">Selling price</label>
                <input type="number" min="1" step="0.01" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider block mb-1">Compare-at price <span className="text-[#4a4d5a] normal-case">(optional)</span></label>
                <input type="number" min="0" step="0.01" value={discountInput} onChange={e => setDiscountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]" />
              </div>
            </div>
            <p className="text-xs text-[#8b8fa8]">We'll create an Arabic product landing page and generate the UGC video.</p>
            <button onClick={startBuild} disabled={busy}
              className="w-full py-2.5 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
              Create page & video
            </button>
          </div>
        )}

        {/* Video progress */}
        {(step === 'generating' || step === 'polling' || step === 'creating_page') && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin shrink-0" />
                <span className="text-sm font-semibold text-white">
                  {step === 'generating' ? 'Writing prompt & compositing...' : step === 'polling' ? 'Generating UGC video...' : 'Building product page...'}
                </span>
              </div>
              {step === 'polling' && <span className="text-xs text-[#8b8fa8] font-mono tabular-nums">{elapsed}s</span>}
            </div>
            {step === 'polling' && <p className="text-xs text-[#8b8fa8]">Compositing + VEO3 typically takes ~90 seconds. Keep this tab open.</p>}
          </div>
        )}

        {/* Review */}
        {(step === 'review' || step === 'launching') && videoUrl && productPage && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-[#4ade80]" />
              <span className="text-sm font-semibold text-white">Review & Launch</span>
            </div>

            <div className="flex gap-4">
              <video src={videoUrl} controls autoPlay loop playsInline muted
                className="rounded-lg bg-black border border-[#2a2d35] shrink-0" style={{ width: '180px', aspectRatio: '9/16' }} />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider mb-1">Product (Arabic)</div>
                  <div className="text-sm text-white leading-snug" dir="rtl">{productPage.titleAr}</div>
                  <div className="text-xs text-[#8b8fa8] mt-0.5">
                    {productPage.price} {productPage.currency}
                    {productPage.compareAtPrice ? <span className="line-through ml-2 text-[#4a4d5a]">{productPage.compareAtPrice}</span> : null}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider mb-1">Landing page</div>
                  <a href={productPage.landingUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#818cf8] hover:text-[#a5b4fc] flex items-center gap-1 break-all">
                    <IconExternal className="w-3.5 h-3.5 shrink-0" /> {productPage.landingUrl}
                  </a>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider mb-1">Ad caption</div>
                  <div className="text-xs text-white leading-relaxed" dir="rtl">{productPage.caption}</div>
                </div>
                <button onClick={handleDownload} className="text-xs text-[#8b8fa8] hover:text-white flex items-center gap-1 cursor-pointer">
                  <IconDownload className="w-3.5 h-3.5" /> Download video
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider block mb-1">Daily budget ({productPage.currency})</label>
                <input type="number" min="1" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider block mb-1">Start time</label>
                <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]" />
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5">
              <span className="text-xs text-[#8b8fa8]">This ad costs</span>
              <span className="text-sm font-bold text-white">{FIXED_CREDIT_COST} credits</span>
            </div>

            <div className="flex gap-2">
              <button onClick={resetAll} className="px-4 py-2.5 bg-[#0f1117] border border-[#2a2d35] hover:border-[#6366f1] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
                Start over
              </button>
              <button onClick={handleCreateAd} disabled={busy || !dailyBudget}
                className="flex-1 py-2.5 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
                {step === 'launching' ? 'Launching...' : 'Create Ad'}
              </button>
            </div>

            {veoPrompt && (
              <>
                <button onClick={() => setShowPrompt(v => !v)} className="flex items-center gap-1 text-xs text-[#6366f1] hover:text-[#818cf8] cursor-pointer transition-colors">
                  <IconChevDown className={`w-3.5 h-3.5 transition-transform ${showPrompt ? 'rotate-180' : ''}`} /> {showPrompt ? 'Hide' : 'Show'} video prompt
                </button>
                {showPrompt && <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3 text-xs text-[#8b8fa8] whitespace-pre-wrap leading-relaxed">{veoPrompt}</div>}
              </>
            )}
          </div>
        )}

        {/* Launched */}
        {step === 'launched' && (
          <div className="bg-[#1a1d24] border border-[#1e5a2e] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-[#4ade80]" />
              <span className="text-sm font-semibold text-white">Ad launched 🎉</span>
            </div>
            <pre className="text-xs text-[#8b8fa8] leading-relaxed whitespace-pre-wrap break-all bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3 max-h-64 overflow-auto">{JSON.stringify(launchResult, null, 2)}</pre>
            <button onClick={resetAll} className="text-xs text-[#8b8fa8] hover:text-white cursor-pointer underline">Create another</button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && error && (
          <div className="bg-[#1a1d24] border border-[#5a1a1a] rounded-xl p-4 space-y-3">
            <div className="text-sm font-semibold text-[#f87171]">Error</div>
            {error.includes('no_active_account') ? (
              <div className="text-xs text-[#f87171] leading-relaxed space-y-2">
                <p>No TikTok ad account is connected to this store. Connect one to launch the ad.</p>
                <a href="/dashboard/tiktok" target="_blank" rel="noopener noreferrer" className="inline-block text-[#818cf8] hover:text-[#a5b4fc] underline">Connect TikTok account →</a>
              </div>
            ) : (
              <pre className="text-xs text-[#f87171] leading-relaxed whitespace-pre-wrap break-all overflow-auto max-h-64">{error}</pre>
            )}
            <button onClick={resetAll} className="text-xs text-[#8b8fa8] hover:text-white cursor-pointer transition-colors underline">Start over</button>
          </div>
        )}

      </div>

      {/* Pixel modal */}
      {showPixelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !savingPixel && setShowPixelModal(false)}>
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-bold text-white">Connect your TikTok Pixel</h2>
              <p className="text-xs text-[#8b8fa8] mt-1">Orders campaigns need a Pixel with a “Place an Order” event. Paste your Pixel ID below — we’ll save it to your store.</p>
            </div>

            <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3 space-y-1.5">
              <div className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider">Don’t have a Pixel yet?</div>
              <ol className="text-xs text-[#8b8fa8] leading-relaxed list-decimal ml-4 space-y-0.5">
                <li>Open TikTok Ads Manager → Assets → Events → Web Events.</li>
                <li>Click “Set Up Web Events”, choose “TikTok Pixel”, and finish setup.</li>
                <li>Add the “Place an Order” event, then copy the Pixel ID.</li>
              </ol>
              <a href="https://ads.tiktok.com/i18n/events_manager" target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-[#818cf8] hover:text-[#a5b4fc] underline pt-1">Open TikTok Events Manager →</a>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider block mb-1">Pixel ID</label>
              <input value={pixelInput} onChange={e => setPixelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !savingPixel && savePixelAndLaunch()}
                placeholder="e.g. C1A2B3D4E5F6G7H8I9J0"
                className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]" />
              {pixelError && <p className="text-xs text-[#f87171] mt-1.5">{pixelError}</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowPixelModal(false)} disabled={savingPixel}
                className="px-4 py-2.5 bg-[#0f1117] border border-[#2a2d35] hover:border-[#6366f1] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                Cancel
              </button>
              <button onClick={savePixelAndLaunch} disabled={savingPixel || !pixelInput.trim()}
                className="flex-1 py-2.5 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
                {savingPixel ? 'Saving...' : 'Save & Launch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
