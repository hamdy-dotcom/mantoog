'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Step = 'idle' | 'extracting' | 'extracted' | 'generating' | 'polling' | 'done' | 'error'

type Product = {
  title: string
  description: string
  images: string[]
  price: string | null
}

type IP = { className?: string }
const IconLink     = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const IconVideo    = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
const IconDownload = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconRefresh  = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
const IconChevDown = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="6 9 12 15 18 9"/></svg>
const IconCheck    = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M20 6 9 17l-5-5"/></svg>

export default function UGCTestPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [url, setUrl] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [statusUrl, setStatusUrl] = useState<string | null>(null)
  const [responseUrl, setResponseUrl] = useState<string | null>(null)
  const [veoPrompt, setVeoPrompt] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/admin/login'); return }
      setAuthed(true)
    })
  }, [router])

  useEffect(() => {
    if (step === 'polling') {
      elapsedRef.current = 0
      setElapsed(0)
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsed(elapsedRef.current)
      }, 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [step])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const startPolling = useCallback((reqId: string, sUrl: string, rUrl: string | null) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams({ requestId: reqId, statusUrl: sUrl })
        if (rUrl) params.set('responseUrl', rUrl)
        const res = await fetch(`/api/admin/ugc-status?${params}`)
        const data = await res.json()
        if (data.status === 'completed') {
          stopPolling()
          setVideoUrl(data.videoUrl)
          setElapsed(elapsedRef.current)
          setStep('done')
        } else if (data.status === 'failed') {
          stopPolling()
          setError(data.error || 'Generation failed')
          setStep('error')
        }
      } catch {
        // network blip — keep polling
      }
    }, 3000)
  }, [stopPolling])

  useEffect(() => () => { stopPolling() }, [stopPolling])

  async function handleExtract() {
    const trimmed = url.trim()
    if (!trimmed) return
    setStep('extracting')
    setError(null)
    setProduct(null)
    setVeoPrompt(null)
    setVideoUrl(null)
    try {
      const res = await fetch('/api/products/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to extract product')
      if (data.blocked) throw new Error('This site blocks scraping (e.g. AliExpress). Try another URL.')
      setProduct({
        title: data.title || 'Untitled',
        description: data.description || '',
        images: data.images || [],
        price: data.price ?? null,
      })
      setStep('extracted')
    } catch (e: any) {
      setError(e.message)
      setStep('error')
    }
  }

  async function handleGenerate() {
    if (!product) return
    setStep('generating')
    setError(null)
    setVeoPrompt(null)
    setVideoUrl(null)
    setRequestId(null)
    setShowPrompt(false)
    try {
      const res = await fetch('/api/admin/ugc-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          imageUrls: product.images.slice(0, 3),
          productUrl: url.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation request failed')
      setRequestId(data.requestId)
      setStatusUrl(data.statusUrl)
      setResponseUrl(data.responseUrl)
      setVeoPrompt(data.veoPrompt)
      setStep('polling')
      startPolling(data.requestId, data.statusUrl, data.responseUrl)
    } catch (e: any) {
      setError(e.message)
      setStep('error')
    }
  }

  function handleRegenerate() {
    stopPolling()
    setStep('extracted')
    setVideoUrl(null)
    setRequestId(null)
    setVeoPrompt(null)
    setError(null)
    setElapsed(0)
    setShowPrompt(false)
  }

  function handleDownload() {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `ugc-video-${Date.now()}.mp4`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  const isLoading = step === 'extracting' || step === 'generating' || step === 'polling'

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">UGC Video Test</h1>
          <p className="text-sm text-[#8b8fa8] mt-1">Paste a product URL to generate a Saudi TikTok UGC ad with AI</p>
        </div>

        {/* Step 1 — URL input */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-wider">Product URL</div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 focus-within:border-[#6366f1] transition-colors">
              <IconLink className="w-4 h-4 text-[#4a4d5a] shrink-0" />
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isLoading && handleExtract()}
                placeholder="https://example.com/product/..."
                className="flex-1 bg-transparent text-sm text-white placeholder-[#4a4d5a] py-2.5 outline-none"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleExtract}
              disabled={isLoading || !url.trim()}
              className="px-4 py-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {step === 'extracting' ? 'Extracting...' : 'Extract Product'}
            </button>
          </div>
        </div>

        {/* Step 2 — Product preview */}
        {product && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-[#4ade80]" />
              <span className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-wider">Extracted Product</span>
            </div>
            <div className="flex gap-3">
              {product.images[0] && (
                <img
                  src={product.images[0]}
                  alt=""
                  className="w-16 h-16 object-cover rounded-lg shrink-0 border border-[#2a2d35]"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white leading-tight">{product.title}</div>
                {product.price && (
                  <div className="text-xs text-[#8b8fa8] mt-1">{product.price}</div>
                )}
                {product.description && (
                  <div className="text-xs text-[#8b8fa8] mt-1 line-clamp-2 leading-relaxed">{product.description}</div>
                )}
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {product.images.slice(1, 7).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="w-11 h-11 object-cover rounded-md shrink-0 border border-[#2a2d35]"
                  />
                ))}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-2.5 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <IconVideo className="w-4 h-4" />
              Generate UGC Video
            </button>
          </div>
        )}

        {/* Step 3 — Generating / polling */}
        {(step === 'generating' || step === 'polling') && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin shrink-0" />
                <span className="text-sm font-semibold text-white">
                  {step === 'generating' ? 'Writing prompt with Claude...' : 'Generating video with VEO3...'}
                </span>
              </div>
              {step === 'polling' && (
                <span className="text-xs text-[#8b8fa8] font-mono tabular-nums">{elapsed}s</span>
              )}
            </div>
            {step === 'polling' && (
              <p className="text-xs text-[#8b8fa8]">VEO3 typically takes 60–90 seconds. Keep this tab open.</p>
            )}
            {veoPrompt && (
              <>
                <button
                  onClick={() => setShowPrompt(v => !v)}
                  className="flex items-center gap-1 text-xs text-[#6366f1] hover:text-[#818cf8] cursor-pointer transition-colors"
                >
                  <IconChevDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showPrompt ? 'rotate-180' : ''}`} />
                  {showPrompt ? 'Hide' : 'Show'} generated prompt
                </button>
                {showPrompt && (
                  <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3 text-xs text-[#8b8fa8] whitespace-pre-wrap leading-relaxed">
                    {veoPrompt}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 'done' && videoUrl && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-[#4ade80]" />
              <span className="text-sm font-semibold text-white">Video Ready</span>
              <span className="text-xs text-[#8b8fa8] ml-auto font-mono">{elapsed}s</span>
            </div>
            <div className="flex justify-center">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="rounded-lg bg-black border border-[#2a2d35]"
                style={{ width: '260px', aspectRatio: '9/16' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2 bg-[#0f1117] border border-[#2a2d35] hover:border-[#6366f1] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <IconDownload className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handleRegenerate}
                className="flex-1 py-2 bg-[#6366f1] hover:bg-[#5558e3] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <IconRefresh className="w-4 h-4" />
                Regenerate
              </button>
            </div>
            {veoPrompt && (
              <>
                <button
                  onClick={() => setShowPrompt(v => !v)}
                  className="flex items-center gap-1 text-xs text-[#6366f1] hover:text-[#818cf8] cursor-pointer transition-colors"
                >
                  <IconChevDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showPrompt ? 'rotate-180' : ''}`} />
                  {showPrompt ? 'Hide' : 'Show'} prompt
                </button>
                {showPrompt && (
                  <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3 text-xs text-[#8b8fa8] whitespace-pre-wrap leading-relaxed">
                    {veoPrompt}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Error */}
        {step === 'error' && error && (
          <div className="bg-[#1a1d24] border border-[#5a1a1a] rounded-xl p-4 space-y-2">
            <div className="text-sm font-semibold text-[#f87171]">Error</div>
            <div className="text-xs text-[#f87171] leading-relaxed">{error}</div>
            <button
              onClick={() => { setStep(product ? 'extracted' : 'idle'); setError(null) }}
              className="text-xs text-[#8b8fa8] hover:text-white cursor-pointer transition-colors underline"
            >
              Try again
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
