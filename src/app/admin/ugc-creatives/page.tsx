'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Creative = {
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

type Step = 'idle' | 'extracting' | 'planning' | 'running' | 'error'

export default function SeedancePage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [url, setUrl] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const s = createClient()
    s.auth.getUser().then(({ data: { user } }) => { if (!user) { router.push('/admin/login'); return } setAuthed(true) })
  }, [router])

  const update = useCallback((i: number, patch: Partial<Creative>) => {
    setCreatives(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }, [])

  // Poll all generating creatives
  useEffect(() => {
    const anyGenerating = creatives.some(c => c.status === 'generating' && c.taskId)
    if (!anyGenerating) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } return }
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const snapshot = creatives
      await Promise.all(snapshot.map(async (c, i) => {
        if (c.status !== 'generating' || !c.taskId) return
        try {
          const res = await fetch(`/api/admin/seedance-status?taskId=${c.taskId}`)
          const data = await res.json()
          if (data.status === 'completed') update(i, { status: 'ready', videoUrl: data.videoUrl })
          else if (data.status === 'failed') update(i, { status: 'error', error: data.error || 'failed' })
        } catch { /* keep polling */ }
      }))
    }, 4000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [creatives, update])

  async function handleStart() {
    const trimmed = url.trim()
    if (!trimmed) return
    setStep('extracting'); setError(null); setCreatives([])
    const safeJson = async (res: Response, label: string) => {
      const txt = await res.text()
      try { return JSON.parse(txt) }
      catch { throw new Error(`${label} failed (${res.status}): ${txt.slice(0, 200)}`) }
    }
    try {
      // 1) scrape
      const ex = await fetch('/api/products/fetch-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: trimmed }) })
      const p = await safeJson(ex, 'Extract')
      if (!p.success) throw new Error(p.error || 'Failed to extract product')
      if (p.blocked) throw new Error('This site blocks scraping. Try another URL.')
      const images: string[] = (p.images || []).slice(0, 8)

      // 2) plan 4 creatives
      setStep('planning')
      const pl = await fetch('/api/admin/seedance-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: p.title, description: p.description, imageUrls: images.slice(0, 4) }) })
      const plan = await safeJson(pl, 'Planning')
      if (!pl.ok) throw new Error(plan.error || 'Planning failed')
      const list: Creative[] = (plan.creatives as any[]).slice(0, 4).map((c, i) => ({
        headline: c.headline || `Angle ${i + 1}`, gender: c.gender || '', seedancePrompt: c.seedancePrompt || '', voiceover: c.voiceover || '', translationEn: c.translationEn || '',
        imageUrl: images[i] || images[0] || '', status: 'pending',
      }))
      setCreatives(list)
      setStep('running')
      // Do NOT auto-generate — the user picks which angles to produce.
    } catch (e: any) { setError(e.message); setStep('error') }
  }

  // Generate the Seedance video for one chosen angle.
  async function generateOne(i: number) {
    const c = creatives[i]
    if (!c || c.status === 'generating') return
    update(i, { status: 'generating', error: null })
    try {
      const g = await fetch('/api/admin/seedance-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: c.imageUrl, prompt: c.seedancePrompt }) })
      const gd = await g.json()
      if (!g.ok) throw new Error(gd.error || 'Seedance submit failed')
      update(i, { taskId: gd.taskId })
    } catch (e: any) { update(i, { status: 'error', error: e.message }) }
  }

  async function addVoiceover(i: number) {
    const c = creatives[i]
    if (!c.videoUrl) return
    update(i, { status: 'vo', error: null })
    try {
      const res = await fetch('/api/admin/seedance-voiceover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: c.videoUrl, voiceover: c.voiceover, gender: c.gender, voiceId: voiceId.trim() || undefined }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Voiceover failed')
      update(i, { status: 'final', mergedUrl: data.mergedUrl })
    } catch (e: any) { update(i, { status: 'ready', error: e.message }) }
  }

  if (!authed) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center"><div className="text-[#8b8fa8] text-sm">Loading...</div></div>

  const busy = step === 'extracting' || step === 'planning'
  const statusLabel = step === 'extracting' ? 'Extracting product…' : step === 'planning' ? 'Writing 4 creatives…' : ''

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold">UGC Creatives</h1>
          <p className="text-sm text-[#8b8fa8] mt-1">Paste a product URL → 4 cinematic Seedance ads (15s, ambient) → add a Najdi voiceover per creative.</p>
        </div>

        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && handleStart()}
              placeholder="https://www.amazon.sa/…" disabled={busy}
              className="flex-1 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4d5a] outline-none focus:border-[#6366f1]" />
            <button onClick={handleStart} disabled={busy || !url.trim()}
              className="px-4 py-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-40 text-white text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap">
              {busy ? statusLabel : 'Generate 4'}
            </button>
          </div>
          <input value={voiceId} onChange={e => setVoiceId(e.target.value)} placeholder="Force a specific voice_id (optional — otherwise auto male/female per product)"
            className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs text-white placeholder-[#4a4d5a] outline-none focus:border-[#6366f1]" />
        </div>

        {step === 'error' && error && (
          <div className="bg-[#1a1d24] border border-[#5a1a1a] rounded-xl p-4">
            <pre className="text-xs text-[#f87171] whitespace-pre-wrap break-all">{error}</pre>
          </div>
        )}

        {creatives.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creatives.map((c, i) => (
              <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-wider flex items-center gap-1.5">
                    Creative {i + 1}
                    {c.gender && <span className="text-[10px] normal-case font-medium text-[#a5b4fc] bg-[#6366f1]/15 px-1.5 py-0.5 rounded">{c.gender === 'female' ? '♀ female' : '♂ male'}</span>}
                  </span>
                  <span className="text-[11px] text-[#4a4d5a]">
                    {c.status === 'generating' ? 'Generating…' : c.status === 'ready' ? 'Ready' : c.status === 'vo' ? 'Adding voice…' : c.status === 'final' ? 'Final ✓' : c.status === 'error' ? 'Error' : 'Pick to generate'}
                  </span>
                </div>

                {/* Headline (the angle) */}
                <div className="text-sm font-semibold text-white leading-snug">{c.headline}</div>

                <div className="flex justify-center bg-black/30 rounded-lg overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: 320 }}>
                  {c.mergedUrl ? (
                    <video src={c.mergedUrl} controls loop playsInline className="h-full rounded-lg" />
                  ) : c.videoUrl ? (
                    <video src={c.videoUrl} controls loop playsInline muted className="h-full rounded-lg" />
                  ) : c.status === 'error' ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
                      <div className="text-xs text-[#f87171]">{c.error}</div>
                      <button onClick={() => generateOne(i)} className="text-xs text-[#818cf8] hover:text-white underline cursor-pointer">Retry</button>
                    </div>
                  ) : c.status === 'generating' ? (
                    <div className="flex flex-col items-center justify-center gap-2 w-full text-[#8b8fa8]">
                      <span className="w-6 h-6 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
                      <span className="text-[11px]">Generating… ~2-4 min</span>
                    </div>
                  ) : (
                    <button onClick={() => generateOne(i)}
                      className="flex flex-col items-center justify-center gap-2 w-full h-full text-[#8b8fa8] hover:text-white hover:bg-[#6366f1]/10 transition-colors cursor-pointer group">
                      <span className="w-10 h-10 rounded-full bg-[#6366f1] group-hover:bg-[#5558e3] flex items-center justify-center text-white text-lg">▶</span>
                      <span className="text-xs font-semibold">Generate this video</span>
                      <span className="text-[10px] text-[#4a4d5a]">~235 credits</span>
                    </button>
                  )}
                </div>

                {(c.status === 'ready' || c.status === 'final' || c.status === 'vo') && (
                  <button onClick={() => addVoiceover(i)} disabled={c.status === 'vo'}
                    className="w-full py-2 bg-[#6366f1] hover:bg-[#5558e3] disabled:opacity-40 text-white text-xs font-semibold rounded-lg cursor-pointer">
                    {c.status === 'vo' ? 'Adding voiceover…' : c.status === 'final' ? 'Re-generate voiceover' : 'Add Najdi voiceover'}
                  </button>
                )}
                {c.status === 'ready' && c.error && <p className="text-xs text-[#f87171]">{c.error}</p>}

                <div>
                  <div className="text-[11px] font-semibold text-[#8b8fa8] uppercase tracking-wider mb-1">Voiceover (Najdi)</div>
                  <div className="text-xs text-white leading-relaxed" dir="rtl">{c.voiceover}</div>
                  <div className="text-[11px] text-[#4a4d5a] mt-1 leading-relaxed">{c.translationEn}</div>
                </div>

                <button onClick={() => update(i, { showBlocks: !c.showBlocks })} className="text-[11px] text-[#6366f1] hover:text-[#818cf8] cursor-pointer">
                  {c.showBlocks ? 'Hide' : 'Show'} Seedance prompt
                </button>
                {c.showBlocks && <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-2.5 text-[11px] text-[#8b8fa8] whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">{c.seedancePrompt}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
