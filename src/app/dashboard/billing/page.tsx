'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
const WALLET_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  vodafone: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' },
  instapay: { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
  fawry:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
  orange:   { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)' },
  etisalat: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)' },
}
const wStyle = (t: string) => WALLET_STYLE[t] ?? { color: '#8b8fa8', bg: 'rgba(139,143,168,0.12)', border: 'rgba(139,143,168,0.3)' }

/* ── Icons ── */
type IP = { className?: string; style?: React.CSSProperties }
const IconCard        = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
const IconWallet      = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v4"/><path d="M3 5v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M18 12a2 2 0 0 0 0 4h3v-4Z"/></svg>
const IconBag         = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
const IconVideo       = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>
const IconTikTok      = (p:IP) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className} style={p.style}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.3 8.3 0 004.86 1.56V6.8a4.85 4.85 0 01-1.09-.11z"/></svg>
const IconSpark       = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z"/><path d="M19 14l.8 2L22 16.8 20 17.6 19 20l-.8-2.4L16 16.8 18 16l1-2Z"/></svg>
const IconCheck       = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M20 6 9 17l-5-5"/></svg>
const IconTrend       = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
const IconRefresh     = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
const IconZap         = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
const IconX           = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
const IconCopy        = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
const IconUpload      = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const IconCheckCircle = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
const IconLock        = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const IconClock       = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>

/* ── Data ── */
const CREDIT_BUNDLES = [
  { id: 'bundle_1000', orders: 1000, price: 900,  per: 0.90, savings: 100, pct: 10, color: '#3b82f6' },
  { id: 'bundle_2500', orders: 2500, price: 2000, per: 0.80, savings: 500, pct: 20, color: '#7c5cff', popular: true },
]

const SUB_PLANS = [
  {
    id: 'creatives' as const,
    nameAr: 'محرك الإعلانات', nameEn: 'Creative Engine',
    price: 250,
    descAr: 'ابحث عن الفيديوهات الرابحة على تيك توك ويوتيوب',
    descEn: 'Find winning videos on TikTok & YouTube',
    featAr: ['بحث بالكلمة المفتاحية', 'مقارنة المشاهدات والتفاعل', 'تحليل الأداء', 'ربط الفيديو بالمنتج'],
    featEn: ['Keyword search', 'Views & engagement data', 'Performance analysis', 'Link video to product'],
    icon: 'video'  as const,
    color: '#f59e0b',
  },
  {
    id: 'tiktok' as const,
    nameAr: 'إدارة تيك توك', nameEn: 'TikTok Management',
    price: 250,
    descAr: 'أنشئ وتابع حملاتك الإعلانية على تيك توك',
    descEn: 'Create and manage your TikTok ad campaigns',
    featAr: ['ربط حساب الأعمال', 'حملات فردية وجماعية', 'متابعة الإنفاق والعائد', 'مراقب CPA اليومي'],
    featEn: ['Business account link', 'Single & bulk campaigns', 'Spend & ROAS tracking', 'Daily CPA monitor'],
    icon: 'tiktok' as const,
    color: '#25f4ee',
  },
  {
    id: 'both' as const,
    nameAr: 'الحزمة الكاملة', nameEn: 'Full Bundle',
    price: 400,
    savings: 100,
    descAr: 'كل الأدوات في اشتراك واحد — وفر 100 جنيه شهرياً',
    descEn: 'All tools in one — save 100 EGP/month',
    featAr: ['كل مزايا محرك الإعلانات', 'كل مزايا إدارة تيك توك', 'أولوية في الدعم', 'ميزات حصرية مبكرة'],
    featEn: ['Everything in Creative Engine', 'Everything in TikTok Mgmt', 'Priority support', 'Early exclusive features'],
    icon: 'spark'  as const,
    color: '#a78bfa',
    popular: true,
  },
]

type SelectedItem =
  | { type: 'credit'; bundle?: typeof CREDIT_BUNDLES[0]; customAmt?: number }
  | { type: 'sub'; plan: typeof SUB_PLANS[0] }

/* ── Page ── */
export default function BillingPage() {
  const [store, setStore]                   = useState<any>(null)
  const [creditRows, setCreditRows]         = useState<any[]>([])
  const [subRows, setSubRows]               = useState<any[]>([])
  const [activeSubs, setActiveSubs]         = useState<string[]>([])
  const [loading, setLoading]               = useState(true)
  const [paymentReqs, setPaymentReqs]       = useState<any[]>([])
  const [customAmt, setCustomAmt]           = useState(300)
  const [selected, setSelected]             = useState<SelectedItem | null>(null)
  const [method, setMethod]                 = useState<'card' | 'wallet'>('wallet')
  const [selectedWallet, setSelectedWallet] = useState<string>('')
  const [wallets, setWallets]               = useState<any[]>([])
  const [walletsLoading, setWalletsLoading] = useState(false)
  const [notes, setNotes]                   = useState('')
  const [proofFile, setProofFile]           = useState<File | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [submitError, setSubmitError]       = useState('')
  const [submitted, setSubmitted]           = useState(false)
  const [modal, setModal]                   = useState(false)
  const [copied, setCopied]                 = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const router   = useRouter()
  const supabase = createClient()
  const { lang, dir } = useLang()
  const ar = lang === 'ar'

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      setStore(ctx.store)

      const [{ data: credits }, { data: subs }, { data: reqs }] = await Promise.all([
        supabase.from('order_credits').select('*').eq('merchant_id', ctx.user.id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').eq('merchant_id', ctx.user.id).eq('status', 'active'),
        supabase.from('payment_requests').select('*').eq('merchant_id', ctx.user.id).order('created_at', { ascending: false }),
      ])
      setCreditRows(credits || [])
      setSubRows(subs || [])
      setActiveSubs((subs || []).map((s: any) => s.plan))
      setPaymentReqs(reqs || [])
      setLoading(false)
    }
    init()
  }, [])

  /* aggregates */
  const totalRemaining  = creditRows.reduce((s, r) => s + (r.credits_remaining ?? 0), 0)
  const totalUsed       = creditRows.reduce((s, r) => s + (r.credits_used       ?? 0), 0)
  const totalEver       = creditRows.reduce((s, r) => s + (r.credits_total      ?? 0), 0)

  const nearBundle = customAmt >= 800 && customAmt < 1000 ? CREDIT_BUNDLES[0]
                   : customAmt >= 2000 && customAmt < 2500 ? CREDIT_BUNDLES[1]
                   : null

  const openModal = async (item: SelectedItem) => {
    setSelected(item)
    setMethod('wallet')
    setSelectedWallet('')
    setNotes('')
    setProofFile(null)
    setSubmitError('')
    setSubmitted(false)
    setModal(true)
    setWalletsLoading(true)
    const res = await fetch('/api/wallets')
    if (res.ok) setWallets((await res.json()).wallets ?? [])
    setWalletsLoading(false)
  }

  const closeModal = () => { setModal(false) }

  const modalPrice = !selected ? 0
    : selected.type === 'credit'
      ? (selected.bundle?.price ?? selected.customAmt ?? customAmt)
      : selected.plan.price

  const copyNumber = (num: string, id: string) => {
    navigator.clipboard.writeText(num)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleWalletSubmit = async () => {
    if (!selected || !selectedWallet || !proofFile) return
    setProofUploading(true)
    setSubmitError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      /* upload proof to Supabase Storage */
      const ext = proofFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}_proof.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, proofFile, { upsert: false })
      if (uploadErr) throw new Error(uploadErr.message)

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(path)

      /* build request body */
      const w = wallets.find(x => x.id === selectedWallet)
      const body: Record<string, unknown> = {
        item_type: selected.type === 'credit' ? 'credits' : 'subscription',
        amount_egp: modalPrice,
        payment_method: w?.wallet_type ?? selectedWallet,
        proof_url: publicUrl,
        merchant_notes: notes.trim() || null,
      }
      if (selected.type === 'credit') {
        body.credits_amount = selected.bundle?.orders ?? selected.customAmt ?? customAmt
        body.bundle_id = selected.bundle?.id ?? 'custom'
      } else {
        body.sub_plan = selected.plan.id
      }

      const res = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit')

      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err.message || 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setProofUploading(false)
    }
  }

  const isSubActive = (id: string) => activeSubs.includes(id) || activeSubs.includes('both')
  const canSubmit   = !!selectedWallet && !!proofFile && !proofUploading

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-[#3b82f6] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} credits={{ credits_remaining: totalRemaining, credits_total: totalEver }} />

      <main className={DASHBOARD_MAIN_CLASS}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">{ar ? 'المدفوعات والاشتراكات' : 'Billing & Subscriptions'}</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">{ar ? 'رصيد الطلبات والاشتراكات الشهرية' : 'Order credits and monthly subscriptions'}</p>
        </div>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <div className="flex items-center gap-2 text-[10px] text-[#4a4e60] uppercase tracking-wider mb-3">
              <IconBag className="w-3.5 h-3.5" />
              {ar ? 'رصيد الطلبات' : 'Order credits'}
            </div>
            <div className={`text-3xl font-bold mb-2 tabular-nums ${totalRemaining <= 20 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
              {totalRemaining.toLocaleString()}
            </div>
            <div className="h-1.5 bg-[#2a2d35] rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all ${totalRemaining <= 20 ? 'bg-[#f87171]' : 'bg-[#4ade80]'}`}
                style={{ width: `${Math.min(totalEver > 0 ? (totalRemaining / totalEver) * 100 : 100, 100)}%` }} />
            </div>
            <div className="text-xs text-[#4a4e60]">{totalUsed.toLocaleString()} {ar ? 'مستخدم' : 'used'}</div>
          </div>

          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <div className="flex items-center gap-2 text-[10px] text-[#4a4e60] uppercase tracking-wider mb-3">
              <IconRefresh className="w-3.5 h-3.5" />
              {ar ? 'الاشتراكات النشطة' : 'Active subscriptions'}
            </div>
            <div className="text-3xl font-bold text-white mb-2">{activeSubs.length}</div>
            {activeSubs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {activeSubs.map(id => {
                  const p = SUB_PLANS.find(x => x.id === id)
                  return p ? (
                    <span key={id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: p.color + '20', color: p.color }}>
                      {ar ? p.nameAr : p.nameEn}
                    </span>
                  ) : null
                })}
              </div>
            ) : (
              <div className="text-xs text-[#4a4e60]">{ar ? 'لا توجد اشتراكات' : 'No active subscriptions'}</div>
            )}
          </div>

          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <div className="flex items-center gap-2 text-[10px] text-[#4a4e60] uppercase tracking-wider mb-3">
              <IconTrend className="w-3.5 h-3.5" />
              {ar ? 'إجمالي الطلبات' : 'Total orders'}
            </div>
            <div className="text-3xl font-bold text-white mb-2 tabular-nums">{totalUsed.toLocaleString()}</div>
            <div className="text-xs text-[#4a4e60]">
              {ar ? `من أصل ${totalEver.toLocaleString()} طلب مشترى` : `of ${totalEver.toLocaleString()} purchased`}
            </div>
          </div>
        </div>

        {/* ── Order Credits ── */}
        <div className="mb-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold">{ar ? 'رصيد الطلبات' : 'Order Credits'}</h2>
              <p className="text-[#8b8fa8] text-xs mt-0.5">{ar ? '1 طلب = 1 جنيه — الرصيد لا ينتهي' : '1 order = 1 EGP — credits never expire'}</p>
            </div>
            <span className="text-xs text-[#4a4e60] border border-[#2a2d35] px-3 py-1.5 rounded-lg font-mono">
              1 EGP / {ar ? 'طلب' : 'order'}
            </span>
          </div>

          {/* Custom top-up */}
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6 mb-4">
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1">{ar ? 'مبلغ مخصص' : 'Custom amount'}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tabular-nums">{customAmt.toLocaleString()}</span>
                  <span className="text-[#8b8fa8] text-sm">{ar ? 'طلب' : 'orders'}</span>
                </div>
              </div>
              <div className="text-end">
                <div className="text-2xl font-bold text-white tabular-nums">
                  {customAmt.toLocaleString()} <span className="text-sm text-[#8b8fa8]">EGP</span>
                </div>
                <div className="text-xs text-[#4a4e60]">1.00 EGP / {ar ? 'طلب' : 'order'}</div>
              </div>
            </div>

            <input
              type="range" min={50} max={5000} step={50} value={customAmt}
              onChange={e => setCustomAmt(+e.target.value)}
              className="w-full accent-[#3b82f6] cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-[#4a4e60] mt-1.5 tabular-nums">
              <span>50</span><span>1,000</span><span>2,500</span><span>5,000</span>
            </div>

            {nearBundle && (
              <div className="mt-4 flex items-start gap-2 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-lg px-3 py-2.5">
                <IconZap className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                <span className="text-xs text-[#60a5fa]">
                  {ar
                    ? `أضف ${(nearBundle.orders - customAmt).toLocaleString()} طلب أكثر وادفع ${nearBundle.price.toLocaleString()} جنيه بدل ${nearBundle.orders.toLocaleString()} — وفر ${nearBundle.savings} جنيه!`
                    : `Add ${(nearBundle.orders - customAmt).toLocaleString()} more and pay ${nearBundle.price.toLocaleString()} EGP for ${nearBundle.orders.toLocaleString()} orders — save ${nearBundle.savings} EGP!`}
                </span>
              </div>
            )}

            <button
              onClick={() => openModal({ type: 'credit', customAmt })}
              className="mt-5 w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
            >
              {ar
                ? `شراء ${customAmt.toLocaleString()} طلب — ${customAmt.toLocaleString()} جنيه`
                : `Buy ${customAmt.toLocaleString()} orders — ${customAmt.toLocaleString()} EGP`}
            </button>
          </div>

          {/* Bundle cards */}
          <div className="grid grid-cols-2 gap-4">
            {CREDIT_BUNDLES.map(b => (
              <div key={b.id} onClick={() => openModal({ type: 'credit', bundle: b })}
                className="relative bg-[#1a1d24] border rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ borderColor: b.popular ? b.color + '50' : '#2a2d35' }}>

                {b.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap text-white"
                    style={{ background: b.color }}>
                    {ar ? 'الأفضل قيمة' : 'Best value'}
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-2xl font-bold text-white tabular-nums">{b.orders.toLocaleString()}</div>
                    <div className="text-xs text-[#8b8fa8]">{ar ? 'طلب' : 'orders'}</div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full tabular-nums"
                    style={{ background: b.color + '20', color: b.color }}>
                    -{b.pct}%
                  </span>
                </div>

                <div className="text-xl font-bold text-white tabular-nums">
                  {b.price.toLocaleString()} <span className="text-sm text-[#8b8fa8]">EGP</span>
                </div>
                <div className="text-xs text-[#4a4e60] mt-0.5 tabular-nums">{b.per.toFixed(2)} EGP / {ar ? 'طلب' : 'order'}</div>
                <div className="text-xs text-[#4ade80] mt-3 font-medium">
                  {ar ? `وفر ${b.savings.toLocaleString()} جنيه` : `Save ${b.savings.toLocaleString()} EGP`}
                </div>

                <button className="mt-4 w-full py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer"
                  style={{ borderColor: b.color + '40', background: b.color + '15', color: b.color }}>
                  {ar ? 'شراء الباقة' : 'Buy bundle'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Subscriptions ── */}
        <div className="mb-10">
          <div className="mb-5">
            <h2 className="text-white font-semibold">{ar ? 'الاشتراكات الشهرية' : 'Monthly Subscriptions'}</h2>
            <p className="text-[#8b8fa8] text-xs mt-0.5">
              {ar ? 'فعّل الأدوات المتقدمة — قابلة للإلغاء في أي وقت' : 'Unlock advanced tools — cancel anytime'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {SUB_PLANS.map(plan => {
              const active = isSubActive(plan.id)
              return (
                <div key={plan.id}
                  className="relative flex flex-col rounded-xl p-5 border transition-all"
                  style={{
                    background: `linear-gradient(160deg, ${plan.color}18 0%, #0f1117 60%)`,
                    borderColor: active ? plan.color + '50' : '#2a2d35',
                    boxShadow: plan.popular ? `0 0 0 1px ${plan.color}30` : undefined,
                  }}>

                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap text-white"
                      style={{ background: plan.color }}>
                      {ar ? 'الأشمل' : 'Best value'}
                    </div>
                  )}

                  {active && (
                    <div className="absolute top-3 end-3 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: plan.color + '25', color: plan.color }}>
                      <IconCheck className="w-3 h-3" />
                      {ar ? 'نشط' : 'Active'}
                    </div>
                  )}

                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: plan.color + '20' }}>
                    {plan.icon === 'video'  && <IconVideo  className="w-5 h-5" style={{ color: plan.color }} />}
                    {plan.icon === 'tiktok' && <IconTikTok className="w-5 h-5" style={{ color: plan.color }} />}
                    {plan.icon === 'spark'  && <IconSpark  className="w-5 h-5" style={{ color: plan.color }} />}
                  </div>

                  <div className="font-bold text-white text-sm mb-1">{ar ? plan.nameAr : plan.nameEn}</div>
                  <div className="text-xs text-[#8b8fa8] leading-relaxed mb-4">{ar ? plan.descAr : plan.descEn}</div>

                  <div className="mb-1">
                    <span className="text-2xl font-bold text-white tabular-nums">{plan.price}</span>
                    <span className="text-sm text-[#8b8fa8]"> EGP / {ar ? 'شهر' : 'mo'}</span>
                  </div>
                  {'savings' in plan && plan.savings && (
                    <div className="text-xs text-[#4ade80] mb-4">
                      {ar ? `وفر ${plan.savings} جنيه شهرياً` : `Save ${plan.savings} EGP/month`}
                    </div>
                  )}

                  <ul className="space-y-2 mb-5 flex-1">
                    {(ar ? plan.featAr : plan.featEn).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        <IconCheck className="w-3.5 h-3.5 shrink-0" style={{ color: plan.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !active && openModal({ type: 'sub', plan })}
                    disabled={active}
                    className="w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:cursor-default"
                    style={active
                      ? { background: plan.color + '15', color: plan.color, border: `1px solid ${plan.color}30` }
                      : { background: plan.color, color: '#0f1117' }}>
                    {active ? (ar ? 'مفعّل' : 'Active') : (ar ? 'اشترك الآن' : 'Subscribe')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Transaction history ── */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2a2d35]">
            <h2 className="text-white font-medium text-sm">{ar ? 'سجل المعاملات' : 'Transaction history'}</h2>
          </div>

          {creditRows.length === 0 && subRows.length === 0 ? (
            <div className="p-12 text-center">
              <IconBag className="w-8 h-8 text-[#2a2d35] mx-auto mb-3" />
              <div className="text-[#4a4e60] text-sm">{ar ? 'لا توجد معاملات بعد' : 'No transactions yet'}</div>
            </div>
          ) : (
            <div>
              {creditRows.map(tx => (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center shrink-0">
                    <IconBag className="w-4 h-4 text-[#3b82f6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">
                      {tx.bundle_type === 'free'
                        ? (ar ? 'رصيد مجاني' : 'Free credits')
                        : `${tx.credits_total?.toLocaleString()} ${ar ? 'طلب' : 'orders'}`}
                    </div>
                    <div className="text-xs text-[#4a4e60] mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-sm text-[#4ade80] font-medium tabular-nums">+{tx.credits_total?.toLocaleString()}</div>
                    <div className="text-xs text-[#4a4e60] tabular-nums">
                      {tx.price_paid > 0 ? `${tx.price_paid?.toLocaleString()} EGP` : (ar ? 'مجاني' : 'Free')}
                    </div>
                  </div>
                </div>
              ))}
              {subRows.map((sub: any) => {
                const plan = SUB_PLANS.find(p => p.id === sub.plan)
                return (
                  <div key={sub.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: (plan?.color || '#8b8fa8') + '20' }}>
                      <IconRefresh className="w-4 h-4" style={{ color: plan?.color || '#8b8fa8' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">
                        {ar ? (plan?.nameAr || sub.plan) : (plan?.nameEn || sub.plan)}
                      </div>
                      <div className="text-xs text-[#4a4e60] mt-0.5">
                        {ar ? 'اشتراك شهري' : 'Monthly subscription'} ·{' '}
                        {new Date(sub.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: (plan?.color || '#8b8fa8') + '20', color: plan?.color || '#8b8fa8' }}>
                        {ar ? 'نشط' : 'Active'}
                      </span>
                      <div className="text-xs text-[#4a4e60] mt-1 tabular-nums">{sub.price_egp} EGP/{ar ? 'شهر' : 'mo'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Payment requests status ── */}
        {paymentReqs.length > 0 && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-[#2a2d35] flex items-center justify-between">
              <div>
                <h2 className="text-white font-medium text-sm">{ar ? 'طلبات الدفع' : 'Payment requests'}</h2>
                <p className="text-xs text-[#4a4e60] mt-0.5">{ar ? 'حالة طلباتك المرسلة' : 'Status of your submitted requests'}</p>
              </div>
              {paymentReqs.filter(r => r.status === 'pending').length > 0 && (
                <span className="text-[10px] font-bold bg-[#f59e0b]/20 text-[#f59e0b] px-2.5 py-1 rounded-full">
                  {paymentReqs.filter(r => r.status === 'pending').length} {ar ? 'قيد المراجعة' : 'pending'}
                </span>
              )}
            </div>
            <div>
              {paymentReqs.map(req => {
                const isPending  = req.status === 'pending'
                const isApproved = req.status === 'approved'
                const statusConfig = isPending
                  ? { label: ar ? 'قيد المراجعة' : 'Pending',  color: '#f59e0b', bg: '#f59e0b20' }
                  : isApproved
                  ? { label: ar ? 'تمت الموافقة' : 'Approved', color: '#4ade80', bg: '#4ade8020' }
                  : { label: ar ? 'مرفوض' : 'Rejected',        color: '#f87171', bg: '#f8717120' }

                return (
                  <div key={req.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusConfig.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">
                        {req.item_type === 'credits'
                          ? `${(req.credits_amount ?? 0).toLocaleString()} ${ar ? 'طلب' : 'orders'}`
                          : `${ar ? 'اشتراك' : 'Subscription'} · ${req.sub_plan}`}
                      </div>
                      <div className="text-xs text-[#4a4e60] mt-0.5 flex items-center gap-2">
                        <span className="capitalize">{req.payment_method}</span>
                        <span>·</span>
                        <span>{new Date(req.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {req.admin_notes && (
                          <>
                            <span>·</span>
                            <span className="text-[#f87171]">{req.admin_notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-sm font-bold text-white tabular-nums">{req.amount_egp} EGP</div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: statusConfig.bg, color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Payment modal ── */}
      {modal && selected && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeModal}>
          <div
            className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between p-6 pb-0">
              <div>
                <h2 className="text-white font-semibold">{ar ? 'إتمام الدفع' : 'Complete payment'}</h2>
                <p className="text-xs text-[#4a4e60] mt-0.5">
                  {selected.type === 'credit'
                    ? `${(selected.bundle?.orders ?? selected.customAmt ?? customAmt).toLocaleString()} ${ar ? 'طلب' : 'orders'}`
                    : `${ar ? selected.plan.nameAr : selected.plan.nameEn} · ${ar ? 'شهري' : 'Monthly'}`}
                </p>
              </div>
              <button onClick={closeModal} className="cursor-pointer text-[#4a4e60] hover:text-white transition-colors mt-0.5">
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* ── SUCCESS STATE ── */}
              {submitted ? (
                <div className="py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#4ade80]/15 flex items-center justify-center mx-auto mb-4">
                    <IconCheckCircle className="w-8 h-8 text-[#4ade80]" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">
                    {ar ? 'تم استلام طلبك!' : 'Request received!'}
                  </h3>
                  <p className="text-[#8b8fa8] text-sm leading-relaxed max-w-xs mx-auto">
                    {ar
                      ? 'سيراجع فريقنا إثبات الدفع ويُفعَّل الرصيد خلال 24 ساعة.'
                      : 'Our team will review your payment proof and activate your credits within 24 hours.'}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-[#4a4e60]">
                    <IconClock className="w-3.5 h-3.5" />
                    {ar ? 'عادةً خلال بضع ساعات في أوقات الدوام' : 'Usually within a few hours during business hours'}
                  </div>
                  <button
                    onClick={closeModal}
                    className="mt-6 px-6 py-2.5 bg-[#2a2d35] hover:bg-[#32363f] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    {ar ? 'حسناً، شكراً' : 'Got it, thanks'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Order summary */}
                  <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4 space-y-2.5">
                    {selected.type === 'credit' ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#8b8fa8]">{ar ? 'عدد الطلبات' : 'Orders'}</span>
                          <span className="text-white font-medium tabular-nums">
                            {(selected.bundle?.orders ?? selected.customAmt ?? customAmt).toLocaleString()}
                          </span>
                        </div>
                        {selected.bundle && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#8b8fa8]">{ar ? 'السعر الأصلي' : 'Original price'}</span>
                              <span className="text-[#4a4e60] tabular-nums line-through">
                                {selected.bundle.orders.toLocaleString()} EGP
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#8b8fa8]">{ar ? 'خصم الباقة' : 'Bundle discount'}</span>
                              <span className="text-[#4ade80] font-medium tabular-nums">-{selected.bundle.savings.toLocaleString()} EGP</span>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#8b8fa8]">{ar ? 'الخطة' : 'Plan'}</span>
                          <span className="text-white font-medium">{ar ? selected.plan.nameAr : selected.plan.nameEn}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#8b8fa8]">{ar ? 'التجديد' : 'Renewal'}</span>
                          <span className="text-[#8b8fa8] text-xs">{ar ? 'شهري' : 'Monthly'}</span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-[#2a2d35] pt-2.5 flex justify-between">
                      <span className="text-[#8b8fa8] text-sm font-medium">{ar ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-white font-bold text-lg tabular-nums">{modalPrice.toLocaleString()} EGP</span>
                    </div>
                  </div>

                  {/* Payment method tabs */}
                  <div>
                    <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-2">
                      {ar ? 'طريقة الدفع' : 'Payment method'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setMethod('wallet')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${method === 'wallet' ? 'border-[#3b82f6] bg-[#1a3a5c] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6]/50 hover:text-white'}`}>
                        <IconWallet className="w-4 h-4" />
                        {ar ? 'محافظ رقمية' : 'Mobile wallets'}
                      </button>
                      <button
                        onClick={() => setMethod('card')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${method === 'card' ? 'border-[#2a2d35] bg-[#1a1d24] text-[#4a4e60]' : 'border-[#2a2d35] text-[#4a4e60] hover:border-[#2a2d35]'}`}>
                        <IconCard className="w-4 h-4" />
                        {ar ? 'بطاقة بنكية' : 'Bank card'}
                      </button>
                    </div>
                  </div>

                  {/* ── CARD METHOD: coming soon ── */}
                  {method === 'card' && (
                    <div className="space-y-3">
                      <div className="bg-[#1f2229] border border-[#2a2d35] rounded-xl p-5 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#2a2d35] flex items-center justify-center mx-auto mb-3">
                          <IconLock className="w-5 h-5 text-[#4a4e60]" />
                        </div>
                        <p className="text-[#8b8fa8] text-sm font-medium mb-1">
                          {ar ? 'الدفع بالبطاقة قيد التطوير' : 'Card payment coming soon'}
                        </p>
                        <p className="text-[#4a4e60] text-xs">
                          {ar
                            ? 'نعمل على تفعيل الدفع الإلكتروني. في الوقت الحالي، استخدم المحافظ الرقمية.'
                            : "We’re working on card payment integration. Use mobile wallets for now."}
                        </p>
                      </div>
                      <button
                        disabled
                        className="w-full bg-[#2a2d35] text-[#4a4e60] font-bold py-3 rounded-xl text-sm cursor-not-allowed flex items-center justify-center gap-2">
                        <IconLock className="w-4 h-4" />
                        {ar ? 'قريباً' : 'Coming soon'}
                      </button>
                    </div>
                  )}

                  {/* ── WALLET METHOD ── */}
                  {method === 'wallet' && (
                    <div className="space-y-4">

                      {/* Step 1: choose wallet */}
                      <div>
                        <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-3">
                          {ar ? '١. اختر المحفظة للتحويل إليها' : '1. Choose wallet to transfer to'}
                        </div>

                        {walletsLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <span className="w-5 h-5 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : wallets.length === 0 ? (
                          <div className="bg-[#1f2229] border border-[#2a2d35] rounded-xl p-5 text-center">
                            <IconWallet className="w-6 h-6 text-[#4a4e60] mx-auto mb-2" />
                            <p className="text-sm text-[#8b8fa8] font-medium">
                              {ar ? 'لا توجد محافظ نشطة حالياً' : 'No active wallets available'}
                            </p>
                            <p className="text-xs text-[#4a4e60] mt-1">
                              {ar ? 'تواصل مع الدعم لإتمام الدفع' : 'Contact support to complete your payment'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {wallets.map(w => {
                              const s = wStyle(w.wallet_type)
                              return (
                                <div
                                  key={w.id}
                                  onClick={() => setSelectedWallet(w.id)}
                                  className="flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all"
                                  style={{
                                    borderColor: selectedWallet === w.id ? s.border : '#2a2d35',
                                    background: selectedWallet === w.id ? s.bg : 'transparent',
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                      style={{ background: s.color + '25' }}>
                                      <IconWallet className="w-4 h-4" style={{ color: s.color }} />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-white">{w.label}</div>
                                      <div className="text-xs text-[#4a4e60] font-mono mt-0.5" dir="ltr">{w.number}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={e => { e.stopPropagation(); copyNumber(w.number, w.id) }}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                      style={{
                                        background: copied === w.id ? s.color + '30' : '#2a2d35',
                                        color: copied === w.id ? s.color : '#8b8fa8',
                                      }}
                                    >
                                      <IconCopy className="w-3.5 h-3.5" />
                                      {copied === w.id ? (ar ? 'تم النسخ' : 'Copied!') : (ar ? 'نسخ' : 'Copy')}
                                    </button>
                                    <div
                                      className="w-4 h-4 rounded-full border-2 transition-colors shrink-0"
                                      style={{
                                        borderColor: selectedWallet === w.id ? s.color : '#4a4e60',
                                        background: selectedWallet === w.id ? s.color : 'transparent',
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Step 2: transfer instructions (shown after wallet selected) */}
                      {selectedWallet && (
                        <>
                          <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3.5">
                            <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-2">
                              {ar ? '٢. حوّل المبلغ' : '2. Transfer amount'}
                            </div>
                            {(() => {
                              const w = wallets.find(x => x.id === selectedWallet)
                              if (!w) return null
                              const s = wStyle(w.wallet_type)
                              return (
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-[#8b8fa8] leading-relaxed max-w-[200px]">
                                    {ar
                                      ? `حوّل ${modalPrice.toLocaleString()} جنيه بالضبط إلى ${w.label} على الرقم:`
                                      : `Send exactly ${modalPrice.toLocaleString()} EGP to ${w.label} at:`}
                                  </p>
                                  <div className="text-end">
                                    <div className="font-bold font-mono text-sm" style={{ color: s.color }} dir="ltr">
                                      {w.number}
                                    </div>
                                    <div className="text-xl font-bold text-white tabular-nums mt-0.5">
                                      {modalPrice.toLocaleString()} <span className="text-sm text-[#8b8fa8]">EGP</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>

                          {/* Step 3: proof & details */}
                          <div>
                            <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-3">
                              {ar ? '٣. أرفق إثبات الدفع' : '3. Attach payment proof'}
                            </div>
                            <div className="space-y-3">

                              {/* Proof file upload */}
                              <div>
                                <input
                                  ref={fileRef}
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                                />
                                <div
                                  onClick={() => fileRef.current?.click()}
                                  className={`w-full border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${proofFile ? 'border-[#4ade80]/40 bg-[#4ade80]/5' : 'border-[#2a2d35] hover:border-[#3a3d45]'}`}
                                >
                                  {proofFile ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <IconCheckCircle className="w-4 h-4 text-[#4ade80]" />
                                      <span className="text-sm text-[#4ade80] font-medium truncate max-w-[220px]">{proofFile.name}</span>
                                    </div>
                                  ) : (
                                    <>
                                      <IconUpload className="w-5 h-5 text-[#4a4e60] mx-auto mb-1.5" />
                                      <p className="text-xs text-[#4a4e60]">
                                        {ar ? 'انقر لرفع صورة أو PDF لإثبات التحويل' : 'Click to upload screenshot or PDF of transfer'}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Notes (optional) */}
                              <div>
                                <label className="block text-xs text-[#4a4e60] mb-1.5">
                                  {ar ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                                </label>
                                <input
                                  value={notes}
                                  onChange={e => setNotes(e.target.value)}
                                  placeholder={ar ? 'أي تفاصيل إضافية...' : 'Any additional details...'}
                                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Error */}
                          {submitError && (
                            <div className="bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg px-3 py-2.5">
                              <p className="text-xs text-[#f87171]">{submitError}</p>
                            </div>
                          )}

                          {/* Submit */}
                          <button
                            onClick={handleWalletSubmit}
                            disabled={!canSubmit}
                            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            {proofUploading ? (
                              <>
                                {ar ? 'جاري الإرسال...' : 'Submitting...'}
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              </>
                            ) : (
                              ar ? 'إرسال طلب الدفع' : 'Submit payment request'
                            )}
                          </button>

                          <p className="text-center text-xs text-[#4a4e60]">
                            {ar
                              ? 'سيراجع فريقنا إثبات الدفع ويُفعَّل الرصيد خلال 24 ساعة'
                              : 'Our team will review and activate your credits within 24 hours'}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
