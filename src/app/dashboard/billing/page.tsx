'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'

/* ── Icons ── */
type IP = { className?: string; style?: React.CSSProperties }
const IconCard    = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
const IconWallet  = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v4"/><path d="M3 5v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M18 12a2 2 0 0 0 0 4h3v-4Z"/></svg>
const IconBag     = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
const IconVideo   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>
const IconTikTok  = (p:IP) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className} style={p.style}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.3 8.3 0 004.86 1.56V6.8a4.85 4.85 0 01-1.09-.11z"/></svg>
const IconSpark   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z"/><path d="M19 14l.8 2L22 16.8 20 17.6 19 20l-.8-2.4L16 16.8 18 16l1-2Z"/></svg>
const IconCheck   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M20 6 9 17l-5-5"/></svg>
const IconTrend   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
const IconRefresh = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
const IconZap     = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
const IconX       = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>

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
  const [store, setStore]           = useState<any>(null)
  const [creditRows, setCreditRows] = useState<any[]>([])
  const [subRows, setSubRows]       = useState<any[]>([])
  const [activeSubs, setActiveSubs] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [customAmt, setCustomAmt]   = useState(300)
  const [selected, setSelected]     = useState<SelectedItem | null>(null)
  const [method, setMethod]         = useState<'card' | 'vodafone'>('card')
  const [phone, setPhone]           = useState('')
  const [processing, setProcessing] = useState(false)
  const [modal, setModal]           = useState(false)

  const router   = useRouter()
  const supabase = createClient()
  const { lang, dir } = useLang()
  const ar = lang === 'ar'

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      setStore(ctx.store)

      const [{ data: credits }, { data: subs }] = await Promise.all([
        supabase.from('order_credits').select('*').eq('merchant_id', ctx.user.id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').eq('merchant_id', ctx.user.id).eq('status', 'active'),
      ])
      setCreditRows(credits || [])
      setSubRows(subs || [])
      setActiveSubs((subs || []).map((s: any) => s.plan))
      setLoading(false)
    }
    init()
  }, [])

  /* aggregates */
  const totalRemaining  = creditRows.reduce((s, r) => s + (r.credits_remaining ?? 0), 0)
  const totalUsed       = creditRows.reduce((s, r) => s + (r.credits_used       ?? 0), 0)
  const totalEver       = creditRows.reduce((s, r) => s + (r.credits_total      ?? 0), 0)

  /* hint: near a bundle threshold */
  const nearBundle = customAmt >= 800 && customAmt < 1000 ? CREDIT_BUNDLES[0]
                   : customAmt >= 2000 && customAmt < 2500 ? CREDIT_BUNDLES[1]
                   : null

  const openModal = (item: SelectedItem) => { setSelected(item); setModal(true) }

  const modalPrice = !selected ? 0
    : selected.type === 'credit'
      ? (selected.bundle?.price ?? selected.customAmt ?? customAmt)
      : selected.plan.price

  const handlePurchase = async () => {
    setProcessing(true)
    await new Promise(r => setTimeout(r, 1500)) // TODO: Paymob
    setProcessing(false)
    setModal(false)
    alert(ar ? 'تم استلام طلبك! سيُفعَّل الرصيد فور تأكيد الدفع.' : 'Order received! Will be activated after payment confirmation.')
  }

  const isSubActive = (id: string) => activeSubs.includes(id) || activeSubs.includes('both')

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
          {/* Remaining */}
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

          {/* Subscriptions */}
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

          {/* Usage */}
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

                  {/* Icon */}
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
      </main>

      {/* ── Payment modal ── */}
      {modal && selected && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(false)}>
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-white font-semibold">{ar ? 'إتمام الدفع' : 'Complete payment'}</h2>
                <p className="text-xs text-[#4a4e60] mt-0.5">
                  {selected.type === 'credit'
                    ? `${(selected.bundle?.orders ?? selected.customAmt ?? customAmt).toLocaleString()} ${ar ? 'طلب' : 'orders'}`
                    : `${ar ? selected.plan.nameAr : selected.plan.nameEn} · ${ar ? 'شهري' : 'Monthly'}`}
                </p>
              </div>
              <button onClick={() => setModal(false)} className="cursor-pointer text-[#4a4e60] hover:text-white transition-colors mt-0.5">
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4 mb-5 space-y-2.5">
              {selected.type === 'credit' ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b8fa8]">{ar ? 'عدد الطلبات' : 'Orders'}</span>
                    <span className="text-white font-medium tabular-nums">
                      {(selected.bundle?.orders ?? selected.customAmt ?? customAmt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b8fa8]">{ar ? 'السعر الأصلي' : 'Original price'}</span>
                    <span className="text-[#4a4e60] tabular-nums line-through">
                      {(selected.bundle?.orders ?? selected.customAmt ?? customAmt).toLocaleString()} EGP
                    </span>
                  </div>
                  {selected.bundle && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8b8fa8]">{ar ? 'خصم الباقة' : 'Bundle discount'}</span>
                      <span className="text-[#4ade80] font-medium tabular-nums">-{selected.bundle.savings.toLocaleString()} EGP</span>
                    </div>
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
                    <span className="text-[#8b8fa8] text-xs">{ar ? 'شهري تلقائي' : 'Auto monthly'}</span>
                  </div>
                </>
              )}
              <div className="border-t border-[#2a2d35] pt-2.5 flex justify-between">
                <span className="text-[#8b8fa8] text-sm font-medium">{ar ? 'الإجمالي' : 'Total'}</span>
                <span className="text-white font-bold text-lg tabular-nums">{modalPrice.toLocaleString()} EGP</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="mb-5">
              <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-2">
                {ar ? 'طريقة الدفع' : 'Payment method'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod('card')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${method === 'card' ? 'border-[#3b82f6] bg-[#1a3a5c] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6]/50 hover:text-white'}`}>
                  <IconCard className="w-4 h-4" />
                  {ar ? 'بطاقة بنكية' : 'Bank card'}
                </button>
                <button
                  onClick={() => setMethod('vodafone')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${method === 'vodafone' ? 'border-[#ef4444] bg-[#3a1a1a] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#ef4444]/50 hover:text-white'}`}>
                  <IconWallet className="w-4 h-4" />
                  Vodafone Cash
                </button>
              </div>
            </div>

            {method === 'vodafone' && (
              <div className="mb-5">
                <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-1.5">
                  {ar ? 'رقم فودافون كاش' : 'Vodafone Cash number'}
                </div>
                <input
                  value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx" dir="ltr"
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#ef4444] transition-colors"
                />
              </div>
            )}

            {method === 'card' && (
              <div className="mb-5 bg-[#1a3a5c]/50 border border-[#3b82f6]/20 rounded-lg px-4 py-3">
                <p className="text-[#60a5fa] text-xs">
                  {ar ? '🔒 ستتم إعادة توجيهك لبوابة Paymob الآمنة لإتمام الدفع' : '🔒 You will be redirected to Paymob secure gateway'}
                </p>
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={processing || (method === 'vodafone' && !phone.trim())}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2">
              {processing ? (
                <>
                  {ar ? 'جاري المعالجة' : 'Processing'}
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </>
              ) : `${ar ? 'ادفع' : 'Pay'} ${modalPrice.toLocaleString()} EGP`}
            </button>

            <p className="text-center text-xs text-[#4a4e60] mt-3">
              {selected.type === 'credit'
                ? (ar ? 'الرصيد لا ينتهي · يُفعَّل فور تأكيد الدفع' : 'Credits never expire · Activated after payment')
                : (ar ? 'يمكن الإلغاء في أي وقت · تجديد شهري تلقائي' : 'Cancel anytime · Monthly auto-renewal')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
