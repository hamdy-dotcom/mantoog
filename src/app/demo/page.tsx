'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/* ─────────────────────────── ICONS ─────────────────────────── */
type IP = { className?: string }
const I = {
  Link:      (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Sparkles:  (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z"/><path d="M19 14l.8 2L22 16.8 20 17.6 19 20l-.8-2.4L16 16.8 18 16l1-2Z"/></svg>,
  Rocket:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  Globe:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>,
  Bolt:      (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>,
  Box:       (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Chart:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  Wallet:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v4"/><path d="M3 5v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M18 12a2 2 0 0 0 0 4h3v-4Z"/></svg>,
  Megaphone: (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m3 11 18-5v12L3 14v-3Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
  Palette:   (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2a10 10 0 1 0 0 20 1.5 1.5 0 0 0 1.06-2.56A1.5 1.5 0 0 1 14 17h2a4 4 0 0 0 4-4 10 10 0 0 0-8-9Z"/></svg>,
  Shield:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/></svg>,
  Check:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M20 6 9 17l-5-5"/></svg>,
  Star:      (p:IP) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className}><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.6 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9L12 2.5Z"/></svg>,
  ArrowL:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>,
  Chevron:   (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m6 9 6 6 6-6"/></svg>,
  Store:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>,
  Refresh:   (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>,
  Target:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Video:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>,
  Search:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Play:      (p:IP) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Eye:       (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
}

/* ─────────────────────── LOGO HALO ─────────────────────── */
function LogoHalo() {
  return (
    <div className="relative inline-flex items-center justify-center mb-8">
      {/* Pulse rings */}
      <span className="absolute w-36 h-36 rounded-full border border-blue-400/20 animate-[ping_3s_ease-in-out_infinite]" />
      <span className="absolute w-48 h-48 rounded-full border border-violet-400/10 animate-[ping_3s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
      {/* Glow */}
      <div className="absolute w-20 h-20 rounded-full bg-blue-500/25 blur-2xl animate-pulse" />
      {/* Orbit 1 — blue dot, clockwise */}
      <div className="absolute w-32 h-32 rounded-full border border-dashed border-white/8" style={{ animation: 'spin-ring 7s linear infinite' }}>
        <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
      </div>
      {/* Orbit 2 — violet + amber dots, counter-clockwise */}
      <div className="absolute w-44 h-44 rounded-full border border-dashed border-white/5" style={{ animation: 'spin-ring 11s linear infinite reverse' }}>
        <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_#a78bfa]" />
        <div className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_#fcd34d]" />
      </div>
      {/* Logo */}
      <img
        src="/logo.svg" alt="Mantoog"
        className="relative z-10 w-16 h-16 object-contain"
        style={{ filter: 'drop-shadow(0 0 14px rgba(99,102,241,0.55)) drop-shadow(0 0 30px rgba(59,130,246,0.2))' }}
      />
    </div>
  )
}

/* ─────────────────────── MOCK: STORE CREATION ─────────────────────── */
function MockStore() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const steps = ['اسم المتجر', 'العملة', 'الشعار', 'الشحن']
  const stepContent = [
    { label: 'اسم المتجر', val: 'متجر أحمد الإلكتروني' },
    { label: 'العملة والسوق', val: 'جنيه مصري — EGP 🇪🇬' },
    { label: 'شعار المتجر', val: '✓ تم رفع الشعار' },
    { label: 'تكلفة الشحن', val: '٣٠ جنيه — ثابت' },
  ]
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>
    const cycle = () => {
      setStep(0); setDone(false)
      t1 = setTimeout(() => setStep(1), 1800)
      setTimeout(() => setStep(2), 3400)
      setTimeout(() => setStep(3), 5000)
      setTimeout(() => setDone(true), 6400)
      t2 = setTimeout(cycle, 9500)
    }
    cycle()
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  return (
    <div className="rounded-3xl border border-white/10 bg-[#12151c]/80 backdrop-blur-xl p-5 shadow-2xl shadow-black/40 max-w-md mx-auto">
      {/* 100 orders banner */}
      <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 mb-4">
        <span className="text-emerald-400 text-xs font-semibold">🎁 100 طلب مجاني — بدون بطاقة</span>
        <span className="text-xs text-[#9aa0b4]">لكل متجر جديد</span>
      </div>
      {/* Step indicators */}
      <div className="flex items-center gap-1.5 mb-5">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full h-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#3b82f6]' : 'bg-white/10'}`} />
            <span className={`text-[10px] transition-colors ${i === step ? 'text-white' : 'text-[#5b6072]'}`}>{s}</span>
          </div>
        ))}
      </div>
      {/* Step content */}
      {!done ? (
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4 min-h-[90px]">
          <div className="text-xs text-[#8b8fa8] mb-2">{stepContent[step].label}</div>
          <div className="font-semibold text-sm transition-all duration-300">{stepContent[step].val}</div>
          <div className="mt-3 h-8 rounded-lg bg-[#3b82f6] flex items-center justify-center text-xs font-bold text-white">
            {step < 3 ? 'التالي ←' : 'إنشاء المتجر'}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <I.Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <div className="font-bold text-sm text-emerald-300">متجرك جاهز!</div>
          <div className="text-xs text-[#9aa0b4] mt-1">رابطك: mantoog.com/store-ahmed</div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── MOCK: MIGRATION ─────────────────────── */
function MockMigration() {
  const [tab, setTab] = useState<'url'|'api'|'json'>('url')
  const [state, setState] = useState<'idle'|'loading'|'done'>('idle')
  const products = ['ساعة ذكية رياضية', 'سماعة لاسلكية', 'شاحن سريع 65W']
  useEffect(() => {
    let ts: ReturnType<typeof setTimeout>[]= []
    const cycle = () => {
      setState('idle')
      ts.push(setTimeout(() => setState('loading'), 1500))
      ts.push(setTimeout(() => setState('done'), 3200))
      ts.push(setTimeout(cycle, 7500))
    }
    cycle()
    return () => ts.forEach(clearTimeout)
  }, [])
  return (
    <div className="rounded-3xl border border-white/10 bg-[#12151c]/80 backdrop-blur-xl p-5 shadow-2xl shadow-black/40 max-w-md mx-auto">
      <div className="text-sm font-bold mb-3">استيراد من متجرك القديم</div>
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-[#0b0d12] p-1 mb-4">
        {(['url','api','json'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`cursor-pointer flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${tab===t ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}>
            {t === 'url' ? 'رابط URL' : t === 'api' ? 'API Key' : 'JSON'}
          </button>
        ))}
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b0d12] px-3 py-2.5 mb-3">
        <I.Link className="w-4 h-4 text-[#8b8fa8] shrink-0" />
        <span className="text-sm text-[#9aa0b4] font-mono" dir="ltr">
          {tab==='url' ? 'myoldstore.com' : tab==='api' ? 'sk-xxxxxxxxxxxx' : 'orders.json'}
        </span>
      </div>
      <button className={`w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2 ${state==='loading' ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
        <I.Refresh className={`w-4 h-4 ${state==='loading' ? 'animate-spin' : ''}`} />
        {state==='idle' ? 'استيراد المنتجات والطلبات' : state==='loading' ? 'جارٍ الاستيراد…' : '✓ تم الاستيراد'}
      </button>
      {/* Products */}
      <div className={`mt-3 space-y-2 transition-all duration-500 ${state==='done' ? 'opacity-100' : 'opacity-0'}`}>
        {products.map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-[#0b0d12] px-3 py-2"
               style={{ transitionDelay: `${i*80}ms` }}>
            <I.Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs text-white/80">{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────── MOCK: TIKTOK ADS ─────────────────────── */
function MockAds() {
  const [selected, setSelected] = useState<number[]>([])
  const campaigns = [
    { n: 'حملة رمضان', spend: '١٬٢٤٠', roas: '3.8x', ctr: '2.9%', active: true },
    { n: 'حملة الشاشة', spend: '٨٩٠', roas: '2.1x', ctr: '1.7%', active: true },
    { n: 'منتج ساعة ذكية', spend: '٣٢٠', roas: '4.2x', ctr: '3.4%', active: false },
  ]
  return (
    <div className="rounded-3xl border border-white/10 bg-[#12151c]/80 backdrop-blur-xl p-5 shadow-2xl shadow-black/40 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold">إعلانات تيك توك</span>
        <button className="cursor-pointer inline-flex items-center gap-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
          <span>+ إنشاء</span>
        </button>
      </div>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 mb-2 text-[10px] text-[#5b6072] uppercase tracking-wide">
        <span>الحملة</span><span>الإنفاق</span><span>العائد</span><span>الحالة</span>
      </div>
      <div className="space-y-1.5">
        {campaigns.map((c, i) => (
          <div key={i}
            onClick={() => setSelected(s => s.includes(i) ? s.filter(x=>x!==i) : [...s, i])}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center rounded-xl px-2 py-2.5 cursor-pointer transition-colors ${selected.includes(i) ? 'bg-[#3b82f6]/10 border border-[#3b82f6]/30' : 'hover:bg-white/5 border border-transparent'}`}>
            <span className="text-xs font-medium truncate">{c.n}</span>
            <span className="text-xs text-[#9aa0b4] font-mono" dir="ltr">{c.spend}</span>
            <span className={`text-xs font-bold ${parseFloat(c.roas) >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>{c.roas}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-[#8b8fa8]'}`}>{c.active ? 'نشط' : 'متوقف'}</span>
          </div>
        ))}
      </div>
      {/* Bulk bar */}
      <div className={`mt-3 rounded-xl border px-3 py-2 flex items-center justify-between transition-all ${selected.length ? 'border-[#3b82f6]/40 bg-[#3b82f6]/5' : 'border-white/5 bg-[#0b0d12]'}`}>
        <span className="text-xs text-[#8b8fa8]">{selected.length ? `${selected.length} محدد` : 'انقر لتحديد الحملات'}</span>
        {selected.length > 0 && (
          <div className="flex gap-2">
            <span className="text-xs text-emerald-400 font-medium cursor-pointer">تفعيل</span>
            <span className="text-xs text-red-400 font-medium cursor-pointer">إيقاف</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── MOCK: CREATIVE SEARCH ─────────────────────── */
function MockCreativeSearch() {
  const [active, setActive] = useState(0)
  const [platform, setPlatform] = useState<'tiktok'|'youtube'>('tiktok')
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % 4), 1800)
    return () => clearInterval(t)
  }, [])
  const cards = [
    { views: '٢.٤M', likes: '١٨٧K', grad: 'from-[#0ea5e9]/40 to-[#1e293b]' },
    { views: '٩٨٠K', likes: '٧٤K', grad: 'from-[#7c5cff]/40 to-[#1e293b]' },
    { views: '١.٧M', likes: '١٣٢K', grad: 'from-[#ec4899]/40 to-[#1e293b]' },
    { views: '٣.١M', likes: '٢٤٠K', grad: 'from-[#f59e0b]/40 to-[#1e293b]' },
  ]
  return (
    <div className="rounded-3xl border border-white/10 bg-[#12151c]/80 backdrop-blur-xl p-5 shadow-2xl shadow-black/40 max-w-md mx-auto">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b0d12] px-3 py-2.5 mb-3">
        <I.Search className="w-4 h-4 text-[#8b8fa8] shrink-0" />
        <span className="text-sm text-white/70">ساعة ذكية رياضية...</span>
      </div>
      {/* Platform pills */}
      <div className="flex gap-2 mb-4">
        {(['tiktok','youtube'] as const).map(p => (
          <button key={p} onClick={() => setPlatform(p)}
            className={`cursor-pointer flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${platform===p ? 'border-white/25 bg-white/10 text-white' : 'border-white/8 text-[#8b8fa8]'}`}>
            <span className={`w-2 h-2 rounded-full ${p==='tiktok' ? 'bg-[#25f4ee]' : 'bg-red-500'}`} />
            {p === 'tiktok' ? 'TikTok' : 'YouTube'}
          </button>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c, i) => (
          <div key={i}
            className={`rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer ${active===i ? 'border-white/30 scale-[1.02] shadow-lg' : 'border-white/8'}`}>
            <div className={`aspect-[9/14] bg-gradient-to-br ${c.grad} flex items-end p-2`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${active===i ? 'bg-white/20' : 'bg-white/10'}`}>
                <I.Play className="w-3 h-3 text-white ms-0.5" />
              </div>
            </div>
            <div className="bg-[#0b0d12] px-2 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9aa0b4] font-mono">{c.views}</span>
                <div className="flex items-center gap-0.5">
                  <I.Eye className="w-3 h-3 text-[#5b6072]" />
                  <span className="text-[9px] text-[#5b6072]">{c.likes}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────── CONTENT ─────────────────────── */
const COPY = {
  ar: {
    dir: 'rtl' as const,
    nav: { signin: 'تسجيل الدخول', start: 'ابدأ مجاناً', features: 'المميزات', how: 'كيف يعمل', pricing: 'الأسعار' },
    badge: 'مجاني حتى 100 طلب — بدون بطاقة ائتمان',
    h1a: 'حوّل أي رابط منتج إلى',
    h1grad: 'متجر عربي يبيع',
    h1b: 'في 60 ثانية',
    sub: 'الذكاء الاصطناعي يكتب صفحة هبوط احترافية، يجهّز الدفع عند الاستلام، ويربطك بإعلانات تيك توك ومتا وجوجل وسناب — كل ذلك من لوحة واحدة.',
    cta: 'ابدأ الآن — 0 جنيه',
    cta2: 'شاهد كيف يعمل',
    trust: ['بدون بطاقة ائتمان', '100 طلب مجاني', 'إلغاء في أي وقت'],
    mockTitle: 'الصق رابط المنتج',
    mockUrl: 'aliexpress.com/item/...',
    mockBtn: 'توليد بالذكاء الاصطناعي',
    mockGen: 'جارٍ التوليد…',
    mockProduct: 'ساعة ذكية رياضية',
    mockPrice: '٧٤٩ ج.م',
    mockOld: '١٢٠٠ ج.م',
    mockCod: 'اطلب الآن — الدفع عند الاستلام',
    marqueeLabel: 'يستورد من',
    marquee: ['AliExpress', 'Amazon', 'EasyOrders', 'TikTok Shop', 'أي رابط منتج', 'Shopify'],
    spotsTitle: 'كل أداة تحتاجها — في مكان واحد',
    spotsSub: 'من إنشاء المتجر إلى إطلاق الإعلانات — بدون أدوات خارجية.',
    spots: [
      {
        tag: 'إنشاء المتجر', icon: 'Store', accent: '#3b82f6',
        title: 'متجرك جاهز في دقيقتين — مع 100 طلب مجاني',
        desc: 'اسم المتجر، العملة، الشعار، الشحن — خطوات بسيطة وينطلق متجرك فوراً.',
        bullets: ['قالب يدعم RTL ولهجتك العربية', 'صفحة هبوط ذكية من كل منتج', '100 طلب مجاني لكل متجر جديد — بدون بطاقة'],
      },
      {
        tag: 'هجرة المتجر', icon: 'Refresh', accent: '#7c5cff',
        title: 'انقل كل منتجاتك وتاريخ طلباتك بنقرة واحدة',
        desc: 'هجرة من أي منصة عبر رابط URL أو API Key أو تحميل JSON — الصور والأسعار والطلبات تنتقل كاملة.',
        bullets: ['استيراد من EasyOrders وأي متجر عبر URL', 'كل تاريخ الطلبات يُحفظ تلقائياً', 'معاينة المنتجات قبل الاستيراد النهائي'],
      },
      {
        tag: 'إعلانات تيك توك', icon: 'Megaphone', accent: '#06b6d4',
        title: 'أنشئ وتابع حملاتك — مفرد أو جماعي — في دقيقتين',
        desc: 'ربط حساب الأعمال، وإطلاق الحملات، وتعديل الميزانيات، وتتبع العائد كله من لوحة تحكم واحدة.',
        bullets: ['إطلاق حملات فردية وجماعية Bulk Launch', 'متابعة الإنفاق والعائد والـ CTR لحظة بلحظة', 'كشف Smart+ وإجراءات جماعية سريعة'],
      },
      {
        tag: 'محرك الإبداعات', icon: 'Video', accent: '#f59e0b',
        title: 'اعثر على الفيديوهات الفائزة قبل منافسيك',
        desc: 'بحث في TikTok وYouTube Shorts عن الإبداعات الأكثر أداءً — ثم حوّلها إلى إلهام لإعلاناتك.',
        bullets: ['بحث بالكلمة المفتاحية عبر تيك توك ويوتيوب', 'عرض المشاهدات والتفاعلات بشكل مقارن', 'ربط الإبداع بالمنتج مباشرة'],
      },
    ],
    platformsTitle: 'كل منصاتك الإعلانية في لوحة واحدة',
    platformsSub: 'ربط البكسل، تتبع التحويلات، وكتالوج Google — كله جاهز بخطوة واحدة.',
    platforms: [
      { name: 'TikTok Ads', desc: 'إعلانات فيديو + تتبع التحويلات', color: '#25f4ee' },
      { name: 'Meta Ads', desc: 'فيسبوك وإنستغرام + بكسل ميتا', color: '#1877f2' },
      { name: 'Google Ads', desc: 'إعلانات البحث + تتبع الإحالات', color: '#ea4335' },
      { name: 'Google Shopping', desc: 'فيد المنتجات يُولَّد تلقائياً', color: '#34a853' },
      { name: 'Snapchat Ads', desc: 'بكسل سناب + أحداث الشراء', color: '#fffc00' },
    ],
    howTitle: 'ثلاث خطوات. بدون كود.',
    howSub: 'من فكرة إلى أول طلب أسرع مما تتخيّل.',
    steps: [
      { t: 'الصق الرابط', d: 'من AliExpress أو Amazon أو أي متجر — ننسخ الصور والسعر تلقائياً.' },
      { t: 'الذكاء الاصطناعي يصمّم', d: 'عنوان، وصف، مميزات، وصور — بلهجتك العربية وجاهزة للتحويل.' },
      { t: 'انشر وابدأ البيع', d: 'رابط جاهز للإعلانات، طلبات تصل فوراً للوحة التحكم.' },
    ],
    themesTitle: 'قوالب تبدو وكأن مصمّماً صنعها',
    themesSub: 'اختر القالب المناسب لمنتجك بنقرة واحدة.',
    themes: [
      { name: 'كلاسيك', tag: 'لكل المنتجات' },
      { name: 'أزياء', tag: 'مقاسات وألوان' },
      { name: 'جمال', tag: 'منتجات التجميل' },
      { name: 'منزل', tag: 'جدول مواصفات' },
    ],
    statsTitle: 'أرقام تتكلم',
    stats: [
      { v: 0, suffix: '٪', label: 'عمولة على مبيعاتك' },
      { v: 60, suffix: 'ث', label: 'لبناء صفحة' },
      { v: 10, suffix: '+', label: 'سوق مدعوم' },
      { v: 99, suffix: '%', label: 'جاهزية النظام' },
    ],
    testTitle: 'تجّار يثقون بـ Mantoog',
    tests: [
      { q: 'أطلقت أول حملة في نفس اليوم. الصفحة العربية كانت أنظف من اللي كنت أعملها يدوياً.', n: 'أحمد م.', r: 'تاجر إلكترونيات — القاهرة' },
      { q: 'الدفع عند الاستلام وإدارة الطلبات في مكان واحد وفّرت عليّ أدوات كتير.', n: 'سارة ك.', r: 'متجر إكسسوارات — الرياض' },
      { q: 'ربط تيك توك مباشرة بالمتجر غيّر طريقة شغلي بالكامل.', n: 'يوسف ب.', r: 'دروبشيبينج — الدار البيضاء' },
    ],
    pricingTitle: 'ابدأ مجاناً. ادفع حسب نموّك.',
    pricingSub: 'بدون رسوم شهرية. بدون مفاجآت.',
    plans: [
      { name: 'المجاني', price: '0', unit: 'جنيه', tag: 'للبداية', feats: ['100 طلب مجاني', 'صفحات هبوط بالذكاء الاصطناعي', 'الدفع عند الاستلام', 'لوحة تحكم كاملة', 'جميع البكسلات'], cta: 'ابدأ مجاناً', highlight: false },
      { name: 'النمو', price: 'حسب الاستخدام', unit: '', tag: 'الأكثر شيوعاً', feats: ['كل مزايا المجاني', 'طلبات غير محدودة', 'إعلانات تيك توك', 'هجرة المتجر', 'تحليلات متقدمة', 'دعم أولوية'], cta: 'ابدأ الآن', highlight: true },
    ],
    faqTitle: 'أسئلة شائعة',
    faqs: [
      { q: 'هل أحتاج بطاقة ائتمان للبدء؟', a: 'لا. تبدأ مجاناً تماماً حتى أول 100 طلب بدون أي بيانات دفع.' },
      { q: 'هل يمكنني نقل متجري القديم إلى Mantoog؟', a: 'نعم، تستطيع استيراد منتجاتك وطلباتك عبر رابط URL أو API Key أو ملف JSON بنقرة واحدة.' },
      { q: 'ما منصات الإعلانات المدعومة؟', a: 'TikTok وMeta وGoogle Ads وGoogle Shopping وSnapchat — كل البكسلات والتتبع من لوحة واحدة.' },
      { q: 'هل يمكنني ربط إعلانات تيك توك وإنشاء حملات جديدة؟', a: 'نعم، تربط حساب الأعمال وتطلق حملات فردية أو جماعية مباشرةً من لوحة Mantoog.' },
    ],
    finalTitle: 'متجرك القادم على بُعد رابط واحد',
    finalSub: 'انضم للتجّار الذين يطلقون متاجرهم العربية في دقائق.',
    footer: { tagline: 'متجرك العربي في 60 ثانية.', rights: 'جميع الحقوق محفوظة.', cols: [
      { h: 'المنتج', links: ['المميزات', 'الأسعار', 'القوالب'] },
      { h: 'الشركة', links: ['من نحن', 'تواصل معنا', 'المدونة'] },
      { h: 'قانوني', links: ['سياسة الخصوصية', 'الشروط'] },
    ]},
  },
  en: {
    dir: 'ltr' as const,
    nav: { signin: 'Sign in', start: 'Start free', features: 'Features', how: 'How it works', pricing: 'Pricing' },
    badge: 'Free until 100 orders — no credit card',
    h1a: 'Turn any product link into',
    h1grad: 'an Arabic store that sells',
    h1b: 'in 60 seconds',
    sub: 'AI writes a professional landing page, sets up cash-on-delivery, and connects your TikTok, Meta, Google, and Snapchat ads — all from one dashboard.',
    cta: 'Start now — 0 EGP',
    cta2: 'See how it works',
    trust: ['No credit card', '100 free orders', 'Cancel anytime'],
    mockTitle: 'Paste a product URL',
    mockUrl: 'aliexpress.com/item/...',
    mockBtn: 'Generate with AI',
    mockGen: 'Generating…',
    mockProduct: 'Smart Sport Watch',
    mockPrice: 'EGP 749',
    mockOld: 'EGP 1200',
    mockCod: 'Order now — Cash on delivery',
    marqueeLabel: 'Imports from',
    marquee: ['AliExpress', 'Amazon', 'EasyOrders', 'TikTok Shop', 'Any product URL', 'Shopify'],
    spotsTitle: 'Every tool you need — in one place',
    spotsSub: 'From store creation to ad launch — no external tools.',
    spots: [
      {
        tag: 'Store creation', icon: 'Store', accent: '#3b82f6',
        title: 'Your store ready in 2 minutes — with 100 free orders',
        desc: 'Name, currency, logo, shipping — simple steps and your store launches instantly.',
        bullets: ['RTL-ready template in your Arabic dialect', 'AI landing page from every product URL', '100 free orders per new store — no card needed'],
      },
      {
        tag: 'Store migration', icon: 'Refresh', accent: '#7c5cff',
        title: 'Move all your products and order history in one click',
        desc: 'Migrate from any platform via URL, API Key, or JSON upload — images, prices, and orders transfer completely.',
        bullets: ['Import from EasyOrders and any store via URL', 'Full order history preserved automatically', 'Preview products before final import'],
      },
      {
        tag: 'TikTok Ads', icon: 'Megaphone', accent: '#06b6d4',
        title: 'Create and manage campaigns — single or bulk — in 2 minutes',
        desc: 'Connect your business account, launch campaigns, adjust budgets, and track ROAS from one dashboard.',
        bullets: ['Single and bulk campaign launch', 'Live spend, ROAS, and CTR tracking', 'Smart+ detection and fast bulk actions'],
      },
      {
        tag: 'Creative Engine', icon: 'Video', accent: '#f59e0b',
        title: 'Find winning videos before your competitors',
        desc: 'Search TikTok and YouTube Shorts for top-performing creatives — then turn them into inspiration for your ads.',
        bullets: ['Keyword search across TikTok and YouTube', 'Views and engagement comparison', 'Link creative directly to your product'],
      },
    ],
    platformsTitle: 'All your ad platforms in one dashboard',
    platformsSub: 'Connect pixels, track conversions, auto-generate Google feed — one step.',
    platforms: [
      { name: 'TikTok Ads', desc: 'Video ads + conversion tracking', color: '#25f4ee' },
      { name: 'Meta Ads', desc: 'Facebook & Instagram + Meta Pixel', color: '#1877f2' },
      { name: 'Google Ads', desc: 'Search ads + conversion tracking', color: '#ea4335' },
      { name: 'Google Shopping', desc: 'Product feed auto-generated', color: '#34a853' },
      { name: 'Snapchat Ads', desc: 'Snap Pixel + purchase events', color: '#fffc00' },
    ],
    howTitle: 'Three steps. Zero code.',
    howSub: 'From idea to first order faster than you think.',
    steps: [
      { t: 'Paste the link', d: 'From AliExpress, Amazon, or any store — we pull images and price automatically.' },
      { t: 'AI designs it', d: 'Headline, description, benefits, and images — in your Arabic dialect, built to convert.' },
      { t: 'Publish & sell', d: 'An ad-ready link, orders landing straight in your dashboard.' },
    ],
    themesTitle: 'Themes that look designer-made',
    themesSub: 'Pick the right one for your product in a click.',
    themes: [
      { name: 'Classic', tag: 'Any product' },
      { name: 'Fashion', tag: 'Sizes & colors' },
      { name: 'Beauty', tag: 'Beauty products' },
      { name: 'Home', tag: 'Spec table' },
    ],
    statsTitle: 'Numbers that talk',
    stats: [
      { v: 0, suffix: '%', label: 'Commission on sales' },
      { v: 60, suffix: 's', label: 'To build a page' },
      { v: 10, suffix: '+', label: 'Markets supported' },
      { v: 99, suffix: '%', label: 'Uptime' },
    ],
    testTitle: 'Merchants trust Mantoog',
    tests: [
      { q: 'Launched my first campaign same day. The Arabic page was cleaner than what I made by hand.', n: 'Ahmed M.', r: 'Electronics — Cairo' },
      { q: 'COD and order management in one place saved me a stack of tools.', n: 'Sara K.', r: 'Accessories — Riyadh' },
      { q: 'Connecting TikTok straight to the store completely changed my workflow.', n: 'Youssef B.', r: 'Dropshipping — Casablanca' },
    ],
    pricingTitle: 'Start free. Pay as you grow.',
    pricingSub: 'No monthly fees. No surprises.',
    plans: [
      { name: 'Free', price: '0', unit: 'EGP', tag: 'To start', feats: ['100 free orders', 'AI landing pages', 'Cash on delivery', 'Full dashboard', 'All pixels'], cta: 'Start free', highlight: false },
      { name: 'Growth', price: 'Usage-based', unit: '', tag: 'Most popular', feats: ['Everything in Free', 'Unlimited orders', 'TikTok Ads', 'Store migration', 'Advanced analytics', 'Priority support'], cta: 'Get started', highlight: true },
    ],
    faqTitle: 'Frequently asked',
    faqs: [
      { q: 'Do I need a credit card to start?', a: 'No. You start completely free for your first 100 orders with no payment details.' },
      { q: 'Can I move my existing store to Mantoog?', a: 'Yes, import your products and orders via URL, API Key, or JSON file in one click.' },
      { q: 'Which ad platforms are supported?', a: 'TikTok, Meta, Google Ads, Google Shopping, and Snapchat — all pixels and tracking from one dashboard.' },
      { q: 'Can I connect TikTok Ads and create new campaigns?', a: 'Yes, connect your business account and launch single or bulk campaigns directly from Mantoog.' },
    ],
    finalTitle: 'Your next store is one link away',
    finalSub: 'Join the merchants launching Arabic stores in minutes.',
    footer: { tagline: 'Your Arabic store in 60 seconds.', rights: 'All rights reserved.', cols: [
      { h: 'Product', links: ['Features', 'Pricing', 'Themes'] },
      { h: 'Company', links: ['About', 'Contact', 'Blog'] },
      { h: 'Legal', links: ['Privacy Policy', 'Terms'] },
    ]},
  },
}

/* ─────────────────────── COUNT-UP ─────────────────────── */
function useCountUp(target: number, run: boolean, ms = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0, start = 0
    const step = (t: number) => {
      if (!start) start = t
      const p = Math.min((t - start) / ms, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, run, ms])
  return val
}
function StatItem({ v, suffix, label, run }: { v: number; suffix: string; label: string; run: boolean }) {
  const n = useCountUp(v, run)
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white to-[#9aa6ff] bg-clip-text text-transparent">
        {v >= 1000 ? n.toLocaleString() : n}{suffix}
      </div>
      <div className="text-sm text-[#8b8fa8] mt-2">{label}</div>
    </div>
  )
}

/* ─────────────────────── PAGE ─────────────────────── */
export default function DemoPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'ar'|'en'>('ar')
  const [mounted, setMounted] = useState(false)
  const [genState, setGenState] = useState<'idle'|'gen'|'done'>('idle')
  const [openFaq, setOpenFaq] = useState<number|null>(0)
  const [statsRun, setStatsRun] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const c = COPY[lang]
  const ar = lang === 'ar'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let ts: ReturnType<typeof setTimeout>[] = []
    const cycle = () => {
      setGenState('idle')
      ts.push(setTimeout(() => setGenState('gen'), 1200))
      ts.push(setTimeout(() => setGenState('done'), 3000))
      ts.push(setTimeout(cycle, 7000))
    }
    cycle()
    return () => ts.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const el = statsRef.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsRun(true); obs.disconnect() } }, { threshold: 0.3 })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  const go = (p: string) => router.push(p)

  return (
    <div dir={c.dir} className={`min-h-screen bg-[#0b0d12] text-white overflow-x-hidden ${ar ? 'font-ar' : ''}`}>
      {/* Arabic fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none -z-0" aria-hidden>
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="aurora aurora-3" />
        <div className="grid-overlay" />
      </div>


      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 pt-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0b0d12]/70 backdrop-blur-xl px-4 sm:px-6 py-3 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Mantoog" className="h-9 w-9 object-contain" />
            <span className="font-extrabold text-lg tracking-tight">Mantoog</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-[#9aa0b4]">
            <a href="#features" className="hover:text-white transition-colors">{c.nav.features}</a>
            <a href="#how" className="hover:text-white transition-colors">{c.nav.how}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{c.nav.pricing}</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              className="cursor-pointer text-xs font-medium border border-white/10 hover:border-white/25 text-[#9aa0b4] hover:text-white px-3 py-1.5 rounded-lg transition-colors">
              {ar ? 'EN' : 'ع'}
            </button>
            <button onClick={() => go('/login')} className="cursor-pointer hidden sm:inline text-sm text-[#9aa0b4] hover:text-white transition-colors px-3 py-1.5">
              {c.nav.signin}
            </button>
            <button onClick={() => go('/signup')} className="cursor-pointer text-sm font-semibold bg-white text-[#0b0d12] hover:bg-white/90 px-4 py-2 rounded-xl transition-colors">
              {c.nav.start}
            </button>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 pt-36 pb-20 px-5">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className={`text-center lg:text-start ${mounted ? 'reveal' : 'pre'}`}>
            {/* Logo halo — brand focal point */}
            <div className="flex justify-center lg:justify-start">
              <LogoHalo />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#9ab4ff] text-xs font-medium px-3 py-1.5 mb-7">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]" />
              </span>
              {c.badge}
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
              {c.h1a}{' '}
              <span className="bg-gradient-to-r from-[#60a5fa] via-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">{c.h1grad}</span>{' '}
              {c.h1b}
            </h1>
            <p className="mt-6 text-lg text-[#9aa0b4] leading-relaxed max-w-xl mx-auto lg:mx-0">{c.sub}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button onClick={() => go('/signup')}
                className="group cursor-pointer inline-flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold px-7 py-3.5 rounded-xl text-base transition-all hover:shadow-xl hover:shadow-blue-500/25">
                {c.cta}
                <I.ArrowL className={`w-4 h-4 transition-transform ${ar ? 'group-hover:-translate-x-1' : 'rotate-180 group-hover:translate-x-1'}`} />
              </button>
              <a href="#how" className="cursor-pointer inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/90 hover:text-white font-medium px-6 py-3.5 rounded-xl text-base transition-colors">
                {c.cta2}
              </a>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-[#8b8fa8]">
              {c.trust.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <I.Check className="w-4 h-4 text-emerald-400" />{t}
                </span>
              ))}
            </div>
          </div>

          {/* Hero mock — AI landing page generator */}
          <div className={`relative ${mounted ? 'reveal reveal-2' : 'pre'}`}>
            <div className="float-card relative mx-auto max-w-md rounded-3xl border border-white/10 bg-[#12151c]/80 backdrop-blur-xl p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b0d12] px-3 py-2.5">
                <I.Link className="w-4 h-4 text-[#8b8fa8] shrink-0" />
                <span className="text-sm text-[#9aa0b4] truncate font-mono" dir="ltr">{c.mockUrl}</span>
              </div>
              <button className="mt-3 w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#7c5cff] text-white font-semibold py-2.5 text-sm">
                <I.Sparkles className={`w-4 h-4 ${genState === 'gen' ? 'animate-spin-slow text-amber-300' : ''}`} />
                {genState === 'gen' ? c.mockGen : c.mockBtn}
              </button>
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0d12] p-3 overflow-hidden">
                <div className="relative rounded-xl bg-[#15181f] aspect-[4/5] overflow-hidden">
                  {genState !== 'done' && (
                    <div className="absolute inset-0 p-3 space-y-2">
                      <div className="h-28 rounded-lg shimmer" />
                      <div className="h-3 w-2/3 rounded shimmer" />
                      <div className="h-3 w-1/2 rounded shimmer" />
                      <div className="h-8 w-full rounded-lg shimmer mt-3" />
                    </div>
                  )}
                  <div className={`absolute inset-0 p-3 flex flex-col transition-all duration-500 ${genState === 'done' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <div className="h-28 rounded-lg bg-gradient-to-br from-[#3b82f6]/30 to-[#7c5cff]/30 border border-white/10 flex items-center justify-center">
                      <I.Box className="w-10 h-10 text-white/40" />
                    </div>
                    <div className="mt-2 font-bold text-sm">{c.mockProduct}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[#60a5fa] font-bold">{c.mockPrice}</span>
                      <span className="text-xs text-[#8b8fa8] line-through">{c.mockOld}</span>
                    </div>
                    <div className="mt-auto rounded-lg bg-emerald-500 text-white text-[11px] font-bold text-center py-2">{c.mockCod}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-3 -start-3 rounded-xl border border-white/10 bg-[#12151c]/90 backdrop-blur px-3 py-2 text-xs font-semibold shadow-lg float-chip">
              <span className="inline-flex items-center gap-1.5"><I.Bolt className="w-3.5 h-3.5 text-amber-300" /> 60s</span>
            </div>
            <div className="absolute -bottom-3 -end-3 rounded-xl border border-white/10 bg-[#12151c]/90 backdrop-blur px-3 py-2 text-xs font-semibold shadow-lg float-chip float-chip-2">
              <span className="inline-flex items-center gap-1.5"><I.Wallet className="w-3.5 h-3.5 text-emerald-400" /> COD</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <section className="relative z-10 py-8 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-5 flex items-center gap-6">
          <span className="text-xs uppercase tracking-widest text-[#5b6072] shrink-0">{c.marqueeLabel}</span>
          <div className="marquee-mask flex-1 overflow-hidden">
            <div className="marquee-track flex items-center gap-10 w-max">
              {[...c.marquee, ...c.marquee].map((m, i) => (
                <span key={i} className="text-[#9aa0b4] font-semibold text-lg whitespace-nowrap">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Spotlights ── */}
      <section id="features" className="relative z-10 py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <SectionHead title={c.spotsTitle} sub={c.spotsSub} />
          <div className="mt-20 space-y-28">
            {c.spots.map((sp, i) => {
              const Icon = (I as Record<string, (p: IP) => React.JSX.Element>)[sp.icon]
              const flip = i % 2 === 1
              const MockComponents = [MockStore, MockMigration, MockAds, MockCreativeSearch]
              const MockComp = MockComponents[i]
              return (
                <div key={i} className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                  {/* Text */}
                  <div className={flip ? 'lg:order-2' : ''}>
                    <div className="inline-flex items-center gap-2 rounded-full border text-xs font-medium px-3 py-1.5 mb-5"
                         style={{ borderColor: sp.accent + '40', background: sp.accent + '15', color: sp.accent }}>
                      <Icon className="w-3.5 h-3.5" />
                      {sp.tag}
                    </div>
                    <h2 className="text-3xl sm:text-[2rem] font-extrabold tracking-tight leading-[1.15] mb-4">{sp.title}</h2>
                    <p className="text-[#9aa0b4] mb-7 leading-relaxed">{sp.desc}</p>
                    <ul className="space-y-3">
                      {sp.bullets.map((b, bi) => (
                        <li key={bi} className="flex items-start gap-3 text-sm">
                          <I.Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-white/85">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Mock */}
                  <div className={flip ? 'lg:order-1' : ''}>
                    <MockComp />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Platform Strip ── */}
      <section className="relative z-10 py-20 px-5 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <SectionHead title={c.platformsTitle} sub={c.platformsSub} />
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {c.platforms.map((p, i) => (
              <div key={i} className="group rounded-2xl border border-white/10 bg-[#12151c]/60 p-4 text-center hover:border-white/25 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                {/* Color dot acting as platform brand mark */}
                <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                     style={{ background: p.color + '20', border: `1px solid ${p.color}30` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}80` }} />
                </div>
                <div className="font-bold text-sm mb-1">{p.name}</div>
                <div className="text-[11px] text-[#8b8fa8] leading-snug">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 py-20 px-5 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <SectionHead title={c.howTitle} sub={c.howSub} />
          <div className="relative grid md:grid-cols-3 gap-6 mt-14">
            <div className="hidden md:block absolute top-9 inset-x-[16%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            {c.steps.map((s, i) => {
              const Icon = [I.Link, I.Sparkles, I.Rocket][i]
              return (
                <div key={i} className="relative text-center md:text-start">
                  <div className="relative z-10 mx-auto md:mx-0 w-16 h-16 rounded-2xl bg-[#12151c] border border-white/10 flex items-center justify-center mb-5">
                    <Icon className="w-7 h-7 text-[#60a5fa]" />
                    <span className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{s.t}</h3>
                  <p className="text-sm text-[#9aa0b4] leading-relaxed">{s.d}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Themes ── */}
      <section className="relative z-10 py-20 px-5 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <SectionHead title={c.themesTitle} sub={c.themesSub} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
            {c.themes.map((t, i) => {
              const grads = ['from-[#3b82f6]/25 to-[#1e293b]','from-[#ec4899]/25 to-[#1e293b]','from-[#a855f7]/25 to-[#1e293b]','from-[#10b981]/25 to-[#1e293b]']
              return (
                <div key={i} className="group cursor-pointer rounded-2xl border border-white/10 bg-[#12151c]/60 overflow-hidden transition-all hover:-translate-y-1 hover:border-white/25">
                  <div className={`aspect-[3/4] bg-gradient-to-br ${grads[i]} p-4 flex flex-col`}>
                    <div className="h-3 w-12 rounded bg-white/30 mb-2" />
                    <div className="flex-1 rounded-lg bg-white/10 border border-white/10 group-hover:bg-white/15 transition-colors" />
                    <div className="mt-3 h-7 rounded-md bg-white/80 group-hover:bg-white transition-colors" />
                  </div>
                  <div className="p-4">
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-[#8b8fa8] mt-0.5">{t.tag}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section ref={statsRef} className="relative z-10 py-16 px-5">
        <div className="max-w-5xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-[#12151c] to-[#0b0d12] p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {c.stats.map((s, i) => <StatItem key={i} v={s.v} suffix={s.suffix} label={s.label} run={statsRun} />)}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 py-20 px-5 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <SectionHead title={c.testTitle} sub="" />
          <div className="grid md:grid-cols-3 gap-5 mt-14">
            {c.tests.map((t, i) => (
              <figure key={i} className="rounded-2xl border border-white/10 bg-[#12151c]/60 p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4 text-amber-400">
                  {Array.from({length:5}).map((_,s) => <I.Star key={s} className="w-4 h-4" />)}
                </div>
                <blockquote className="text-[15px] leading-relaxed text-white/90 flex-1">"{t.q}"</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center font-bold text-sm">
                    {t.n.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.n}</div>
                    <div className="text-xs text-[#8b8fa8]">{t.r}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 py-20 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <SectionHead title={c.pricingTitle} sub={c.pricingSub} />
          <div className="grid md:grid-cols-2 gap-5 mt-14 max-w-3xl mx-auto">
            {c.plans.map((p, i) => (
              <div key={i} className={`relative rounded-3xl border p-8 ${p.highlight ? 'border-[#3b82f6]/60 bg-gradient-to-br from-[#16203a] to-[#12151c] shadow-2xl shadow-blue-500/10' : 'border-white/10 bg-[#12151c]/60'}`}>
                {p.highlight && <span className="absolute -top-3 inset-x-0 mx-auto w-max rounded-full bg-[#3b82f6] text-white text-xs font-bold px-3 py-1">{p.tag}</span>}
                <div className="text-sm text-[#9aa0b4] mb-1">{p.name}</div>
                <div className="flex items-end gap-1.5 mb-6">
                  <span className="text-4xl font-extrabold">{p.price}</span>
                  {p.unit && <span className="text-[#8b8fa8] mb-1.5 text-sm">{p.unit}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {p.feats.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2.5 text-sm text-white/85">
                      <I.Check className="w-4 h-4 text-emerald-400 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => go('/signup')}
                  className={`w-full cursor-pointer font-bold py-3 rounded-xl transition-all ${p.highlight ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white hover:shadow-lg hover:shadow-blue-500/25' : 'bg-white/10 hover:bg-white/15 text-white'}`}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="relative z-10 py-20 px-5 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <SectionHead title={c.faqTitle} sub="" />
          <div className="mt-12 space-y-3">
            {c.faqs.map((f, i) => {
              const open = openFaq === i
              return (
                <div key={i} className="rounded-2xl border border-white/10 bg-[#12151c]/60 overflow-hidden">
                  <button onClick={() => setOpenFaq(open ? null : i)}
                    className="cursor-pointer w-full flex items-center justify-between gap-4 px-5 py-4 text-start">
                    <span className="font-semibold text-sm sm:text-base">{f.q}</span>
                    <I.Chevron className={`w-5 h-5 text-[#8b8fa8] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-[#9aa0b4] leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 py-20 px-5 border-t border-white/5">
        <div className="max-w-4xl mx-auto relative rounded-[2rem] border border-white/10 overflow-hidden p-10 sm:p-16 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/20 via-[#7c5cff]/10 to-transparent" />
          {/* Logo watermark inside CTA */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
            <img src="/logo.svg" alt="" className="w-64 h-64 object-contain" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">{c.finalTitle}</h2>
            <p className="text-[#9aa0b4] mb-8 max-w-xl mx-auto">{c.finalSub}</p>
            <button onClick={() => go('/signup')}
              className="cursor-pointer inline-flex items-center gap-2 bg-white text-[#0b0d12] hover:bg-white/90 font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-[1.03]">
              {c.cta}
              <I.ArrowL className={`w-5 h-5 ${ar ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/10 px-5 py-14">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.svg" alt="Mantoog" className="h-8 w-8 object-contain" />
              <span className="font-extrabold text-lg">Mantoog</span>
            </div>
            <p className="text-sm text-[#8b8fa8] max-w-xs">{c.footer.tagline}</p>
          </div>
          {c.footer.cols.map((col, i) => (
            <div key={i}>
              <div className="font-semibold text-sm mb-3">{col.h}</div>
              <ul className="space-y-2">
                {col.links.map((l, li) => (
                  <li key={li}><a href="#" className="text-sm text-[#8b8fa8] hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5b6072]">
          <span>© 2026 Mantoog. {c.footer.rights}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {ar ? 'نسخة المعاينة' : 'Preview build'}
          </span>
        </div>
      </footer>

      {/* ── Styles ── */}
      <style jsx global>{`
        .font-ar, .font-ar * { font-family: 'Noto Sans Arabic', 'Geist', system-ui, sans-serif; }
        .font-ar h1, .font-ar h2, .font-ar h3, .font-ar .font-extrabold { font-family: 'Noto Kufi Arabic', 'Geist', system-ui, sans-serif; }

        .aurora { position: absolute; border-radius: 9999px; filter: blur(110px); opacity: 0.28; }
        .aurora-1 { width:40vw;height:40vw;left:-8vw;top:-6vw; background:radial-gradient(circle,#3b82f6,transparent 70%); animation:drift1 22s ease-in-out infinite; }
        .aurora-2 { width:35vw;height:35vw;right:-6vw;top:18vh; background:radial-gradient(circle,#7c5cff,transparent 70%); animation:drift2 26s ease-in-out infinite; }
        .aurora-3 { width:32vw;height:32vw;left:25vw;top:55vh; background:radial-gradient(circle,#0ea5e9,transparent 70%); opacity:0.15; animation:drift1 30s ease-in-out infinite; }
        .grid-overlay { position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,black,transparent 75%); }

        @keyframes drift1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(4vw,3vh) scale(1.1)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-4vw,4vh) scale(1.08)} }

        @keyframes spin-ring { to { transform: rotate(360deg); } }

        .pre{opacity:0;transform:translateY(24px)}
        .reveal{animation:revealUp .8s cubic-bezier(.22,1,.36,1) forwards}
        .reveal-2{animation:revealUp .8s cubic-bezier(.22,1,.36,1) .15s forwards;opacity:0}
        @keyframes revealUp{to{opacity:1;transform:translateY(0)}}

        .float-card{}
        .float-chip{}
        .float-chip-2{}

        .shimmer{background:linear-gradient(90deg,#1b1f28 25%,#262b36 50%,#1b1f28 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
        @keyframes shimmer{0%{background-position:200% 0} 100%{background-position:-200% 0}}

        .animate-spin-slow{animation:spin .9s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}

        .marquee-mask{mask-image:linear-gradient(90deg,transparent,black 8%,black 92%,transparent)}
        .marquee-track{animation:marquee 22s linear infinite}
        [dir='rtl'] .marquee-track{animation-direction:reverse}
        @keyframes marquee{from{transform:translateX(0)} to{transform:translateX(-50%)}}

        @media (prefers-reduced-motion:reduce){
          .aurora,.float-card,.float-chip,.marquee-track,.animate-spin-slow,.shimmer{animation:none!important}
          .reveal,.reveal-2{animation:none!important;opacity:1!important;transform:none!important}
        }
      `}</style>
    </div>
  )
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h2>
      {sub && <p className="mt-3 text-[#9aa0b4]">{sub}</p>}
      <div className="mt-5 mx-auto w-14 h-1 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#7c5cff]" />
    </div>
  )
}
