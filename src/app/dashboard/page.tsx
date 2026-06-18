'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import DashboardFiltersBar, { DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from '@/components/dashboard/DashboardFiltersBar'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { daysBetween } from '@/lib/dashboard/date-range'

/* ── helpers ── */
function applyOrderFilters(orders: any[], filters: DashboardFilters) {
  return orders.filter(o => {
    const day = o.created_at?.slice(0, 10)
    if (!day || day < filters.dateStart || day > filters.dateEnd) return false
    if (filters.productId && o.product_id !== filters.productId) return false
    if (filters.region && o.address_governorate !== filters.region) return false
    if (filters.status && o.status !== filters.status) return false
    return true
  })
}

/* ── icons ── */
type IP = { className?: string; style?: React.CSSProperties }
const I = {
  Package: (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>,
  TrendUp: (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>,
  Check:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M20 6 9 17l-5-5"/></svg>,
  X:       (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Zap:     (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>,
  Map:     (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>,
  Plus:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 5v14M5 12h14"/></svg>,
}

/* ── sparkline ── */
function Sparkline({ data, color = '#3b82f6', h = 120 }: { data: number[]; color?: string; h?: number }) {
  const W = 400, pad = 4
  if (data.length < 2) return <div style={{ height: h }} className="flex items-center justify-center text-[#4a4e60] text-sm">—</div>
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)
    return [x, y] as [number, number]
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`
  const last = pts[pts.length - 1]
  const gid = `sg${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} />
    </svg>
  )
}

/* ── mini sparkline per product row ── */
function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const W = 60, H = 24, pad = 2
  if (data.length < 2 || data.every(v => v === 0)) return <div style={{ width: W, height: H }} />
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2)
    return [x.toFixed(1), y.toFixed(1)]
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── count-up ── */
function useCountUp(target: number, run: boolean, decimals = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0, start = 0
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1000, 1)
      setVal(+(target * (1 - Math.pow(1 - p, 3))).toFixed(decimals))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, run, decimals])
  return val
}

/* ── status badge ── */
function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const styles: Record<string, string> = {
    pending:    'bg-amber-500/15 text-amber-400',
    confirmed:  'bg-emerald-500/15 text-emerald-400',
    processing: 'bg-blue-500/15 text-blue-400',
    shipped:    'bg-blue-500/15 text-blue-400',
    delivered:  'bg-emerald-500/15 text-emerald-400',
    cancelled:  'bg-red-500/15 text-red-400',
    returned:   'bg-red-500/15 text-red-400',
  }
  const ar: Record<string, string> = { pending: 'قيد الانتظار', confirmed: 'مؤكد', processing: 'جاري', shipped: 'مشحون', delivered: 'مُسلَّم', cancelled: 'ملغي', returned: 'مرتجع' }
  const en: Record<string, string> = { pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' }
  const label = (lang === 'ar' ? ar : en)[status] ?? status
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${styles[status] ?? 'bg-white/10 text-white'}`}>{label}</span>
}

const PRODUCT_COLORS = ['#3b82f6', '#7c5cff', '#10b981', '#f59e0b', '#ec4899']

export default function DashboardPage() {
  const [merchant, setMerchant]     = useState<any>(null)
  const [store, setStore]           = useState<any>(null)
  const [credits, setCredits]       = useState<any>(null)
  const [orders, setOrders]         = useState<any[]>([])
  const [products, setProducts]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [countRun, setCountRun]     = useState(false)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [filters, setFilters]       = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS)
  const router   = useRouter()
  const supabase = createClient()
  const { lang, dir } = useLang()
  const tr = t[lang]

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      const { user, store: storeData } = ctx

      const [
        { data: merchantData },
        { data: creditsData },
        { data: ordersData },
        { data: productsData },
      ] = await Promise.all([
        supabase.from('merchants').select('*').eq('id', user.id).single(),
        supabase.from('order_credits').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('orders').select('*, products(title, images)').eq('merchant_id', user.id).order('created_at', { ascending: true }),
        supabase.from('products').select('id, title, images, status, created_at').eq('merchant_id', user.id).order('created_at', { ascending: false }),
      ])

      setMerchant(merchantData)
      setStore(storeData)
      setCredits(creditsData)
      setOrders(ordersData || [])

      const productList = productsData || []
      if (productList.length) {
        const { data: landingPagesData } = await supabase
          .from('landing_pages')
          .select('product_id, visits')
          .in('product_id', productList.map(p => p.id))
        setProducts(productList.map(p => ({
          ...p,
          landing_pages: landingPagesData?.filter(lp => lp.product_id === p.id) || [],
        })))
      } else {
        setProducts([])
      }

      setLoading(false)
      setCountRun(true)
    }
    init()
  }, [])

  const filteredOrders = useMemo(() => applyOrderFilters(orders, filters), [orders, filters])

  const regionOptions = useMemo(() => {
    const regions = new Set<string>()
    orders.forEach(o => { if (o.address_governorate) regions.add(o.address_governorate) })
    return [...regions].sort((a, b) => a.localeCompare(b, lang === 'ar' ? 'ar' : 'en'))
  }, [orders, lang])

  const recentOrders = useMemo(
    () => [...filteredOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [filteredOrders]
  )

  const metrics = useMemo(() => {
    const totalOrders      = filteredOrders.length
    const deliveredOrders  = filteredOrders.filter(o => o.status === 'delivered').length
    const cancelledOrders  = filteredOrders.filter(o => o.status === 'cancelled').length
    const pendingOrders    = filteredOrders.filter(o => o.status === 'pending').length
    const totalRevenue     = filteredOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total_price), 0)
    const deliveryRate     = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
    const cancellationRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0

    const productsInScope = filters.productId ? products.filter(p => p.id === filters.productId) : products

    const productOrderCounts = productsInScope.map(p => {
      const count   = filteredOrders.filter(o => o.product_id === p.id).length
      const visits  = p.landing_pages?.[0]?.visits || 0
      const cvr     = visits > 0 ? (count / visits) * 100 : 0
      return { ...p, count, visits, cvr }
    }).filter(p => p.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)

    const withVisits = productsInScope.map(p => {
      const count  = filteredOrders.filter(o => o.product_id === p.id).length
      const visits = p.landing_pages?.[0]?.visits || 0
      return visits > 0 ? (count / visits) * 100 : null
    }).filter((r): r is number => r !== null)
    const conversionRate = withVisits.length > 0 ? withVisits.reduce((s, r) => s + r, 0) / withVisits.length : 0

    const rangeDays  = daysBetween(filters.dateStart, filters.dateEnd)
    const ordersByDay = rangeDays.map(day => ({
      date:  day,
      label: day.slice(5),
      count: filteredOrders.filter(o => o.created_at?.slice(0, 10) === day).length,
    }))

    const statusBreakdown = [
      { key: 'pending',   label: lang === 'ar' ? 'قيد الانتظار' : 'Pending',   count: pendingOrders,   color: '#fbbf24' },
      { key: 'delivered', label: lang === 'ar' ? 'تم التسليم'   : 'Delivered', count: deliveredOrders, color: '#4ade80' },
      { key: 'cancelled', label: lang === 'ar' ? 'ملغي'          : 'Cancelled', count: cancelledOrders, color: '#f87171' },
    ]

    const govCounts: Record<string, number> = {}
    filteredOrders.forEach(o => { if (o.address_governorate) govCounts[o.address_governorate] = (govCounts[o.address_governorate] || 0) + 1 })
    const topGovs = Object.entries(govCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    // per-product daily trend for mini sparklines
    const productTrends: Record<string, number[]> = {}
    productOrderCounts.forEach(p => {
      productTrends[p.id] = ordersByDay.map(d =>
        filteredOrders.filter(o => o.created_at?.slice(0, 10) === d.date && o.product_id === p.id).length
      )
    })

    return { totalOrders, totalRevenue, deliveryRate, deliveredOrders, cancellationRate, cancelledOrders, conversionRate, productOrderCounts, ordersByDay, statusBreakdown, topGovs, productTrends }
  }, [filteredOrders, products, filters.productId, filters.dateStart, filters.dateEnd, lang])

  const totalOrdersAnim  = useCountUp(metrics.totalOrders,      countRun)
  const revenueAnim      = useCountUp(metrics.totalRevenue,     countRun)
  const deliveryAnim     = useCountUp(metrics.deliveryRate,     countRun)
  const cancellationAnim = useCountUp(metrics.cancellationRate, countRun)
  const conversionAnim   = useCountUp(metrics.conversionRate,   countRun, 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm animate-pulse">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    )
  }

  const KPIS = [
    { label: tr.totalOrders,                                           value: totalOrdersAnim.toLocaleString(),                   sub: lang === 'ar' ? 'في الفترة المحددة' : 'In selected period',           icon: 'Package', color: '#3b82f6', up: true },
    { label: tr.revenue,                                               value: `${revenueAnim.toLocaleString()} ${store?.currency ?? ''}`, sub: lang === 'ar' ? 'من الطلبات المُسلَّمة' : 'From delivered',  icon: 'TrendUp', color: '#10b981', up: true },
    { label: lang === 'ar' ? 'معدل التسليم'    : 'Delivery rate',     value: `${deliveryAnim}%`,                                 sub: lang === 'ar' ? `${metrics.deliveredOrders} تم التسليم` : `${metrics.deliveredOrders} delivered`,      icon: 'Check',   color: '#a78bfa', up: metrics.deliveryRate >= 50 },
    { label: lang === 'ar' ? 'معدل الإلغاء'   : 'Cancellation',      value: `${cancellationAnim}%`,                             sub: lang === 'ar' ? `${metrics.cancelledOrders} ملغي` : `${metrics.cancelledOrders} cancelled`,           icon: 'X',       color: '#f59e0b', up: metrics.cancellationRate <= 20 },
    { label: lang === 'ar' ? 'معدل التحويل'   : 'Conversion',        value: `${conversionAnim.toFixed(1)}%`,                   sub: lang === 'ar' ? 'طلبات / زيارات الصفحة' : 'Orders / page visits',   icon: 'Zap',     color: '#ec4899', up: true },
  ]

  return (
    <div dir={dir} className="min-h-screen bg-[#0f1117] text-white flex">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet" />

      <Sidebar store={store} credits={credits} />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#0f1117]/95 backdrop-blur border-b border-[#2a2d35] px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-none">
                {lang === 'ar'
                  ? `أهلاً، ${merchant?.full_name?.split(' ')[0] ?? ''} 👋`
                  : `Welcome, ${merchant?.full_name?.split(' ')[0] ?? ''} 👋`}
              </h1>
              <p className="text-[10px] text-[#8b8fa8] mt-0.5">
                {lang === 'ar' ? 'إليك ما يحدث في متجرك اليوم' : "Here's what's happening today"}
              </p>
            </div>
          </div>
          <div className="ms-auto">
            <button
              onClick={() => router.push('/dashboard/products/new')}
              className="cursor-pointer inline-flex items-center gap-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              <I.Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'إضافة منتج' : 'Add product'}</span>
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="border-b border-[#2a2d35] bg-[#0f1117] px-4 sm:px-6 py-3">
          <DashboardFiltersBar
            lang={lang}
            filters={filters}
            onChange={setFilters}
            products={products.map(p => ({ id: p.id, title: p.title }))}
            regions={regionOptions}
          />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-5 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-5 space-y-4">

          {/* Credits warnings */}
          {credits && credits.credits_remaining <= 20 && credits.credits_remaining > 0 && (
            <div className="bg-[#3a2800] border border-[#fbbf24]/30 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="text-[#fbbf24] font-medium text-sm">{lang === 'ar' ? 'رصيدك يوشك على النفاد' : 'Running low on credits'}</div>
                  <div className="text-[#fbbf24]/70 text-xs mt-0.5">{lang === 'ar' ? `تبقى لك ${credits.credits_remaining} طلب مجاني` : `${credits.credits_remaining} free orders left`}</div>
                </div>
              </div>
              <button onClick={() => setShowCreditsModal(true)} className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1a1000] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                {lang === 'ar' ? 'شراء رصيد' : 'Buy credits'}
              </button>
            </div>
          )}
          {credits && credits.credits_remaining === 0 && (
            <div className="bg-[#3a1414] border border-[#f87171]/30 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚫</span>
                <div>
                  <div className="text-[#f87171] font-medium text-sm">{lang === 'ar' ? 'نفد رصيدك المجاني' : 'Free credits exhausted'}</div>
                  <div className="text-[#f87171]/70 text-xs mt-0.5">{lang === 'ar' ? 'اشتري رصيداً للاستمرار في استقبال الطلبات' : 'Purchase credits to keep receiving orders'}</div>
                </div>
              </div>
              <button onClick={() => setShowCreditsModal(true)} className="bg-[#f87171] hover:bg-[#ef4444] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                {lang === 'ar' ? 'شراء رصيد الآن' : 'Buy credits now'}
              </button>
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {KPIS.map((k, i) => {
              const Icon = (I as Record<string, (p: IP) => React.JSX.Element>)[k.icon]
              return (
                <div key={i} className="rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4 hover:border-[#3b3f4e] transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-[#8b8fa8] leading-snug">{k.label}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ms-2 transition-transform group-hover:scale-110" style={{ background: k.color + '20' }}>
                      <Icon className="w-4 h-4" style={{ color: k.color }} />
                    </div>
                  </div>
                  <div className="font-bold text-xl sm:text-2xl">{k.value}</div>
                  <div className={`text-[11px] mt-1 ${k.up ? 'text-emerald-400' : 'text-amber-400'}`}>{k.sub}</div>
                </div>
              )
            })}
          </div>

          {/* Chart + Status */}
          <div className="grid lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="font-semibold text-sm">{lang === 'ar' ? 'الطلبات اليومية' : 'Daily orders'}</h2>
                  <p className="text-xs text-[#8b8fa8] mt-0.5">{filters.dateStart} – {filters.dateEnd}</p>
                </div>
                <div className="text-2xl font-bold">{totalOrdersAnim.toLocaleString()}</div>
              </div>
              <Sparkline data={metrics.ordersByDay.map(d => d.count)} color="#3b82f6" h={130} />
              {metrics.ordersByDay.length >= 2 && (
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-[#4a4e60]">{metrics.ordersByDay[0]?.label}</span>
                  <span className="text-[10px] text-[#4a4e60]">{metrics.ordersByDay[metrics.ordersByDay.length - 1]?.label}</span>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <h2 className="font-semibold text-sm mb-4">{lang === 'ar' ? 'حالة الطلبات' : 'Order status'}</h2>
              {metrics.totalOrders === 0 ? (
                <div className="flex items-center justify-center h-24 text-[#4a4e60] text-sm">
                  {lang === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.statusBreakdown.map(s => (
                    <div key={s.key}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#8b8fa8]">{s.label}</span>
                        <span className="font-semibold" style={{ color: s.color }}>
                          {s.count} ({metrics.totalOrders > 0 ? Math.round((s.count / metrics.totalOrders) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#2a2d35]">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${metrics.totalOrders > 0 ? (s.count / metrics.totalOrders) * 100 : 0}%`, background: s.color, minWidth: s.count > 0 ? '4px' : 0 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Products + Orders + Regions */}
          <div className="grid lg:grid-cols-5 gap-3">

            {/* Top products */}
            <div className="lg:col-span-2 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <h2 className="font-semibold text-sm mb-3">{lang === 'ar' ? 'أفضل المنتجات' : 'Top products'}</h2>
              {metrics.productOrderCounts.length === 0 ? (
                <div className="text-[#4a4e60] text-sm py-4">{lang === 'ar' ? 'لا توجد منتجات بعد' : 'No products yet'}</div>
              ) : (
                <div className="space-y-2">
                  {metrics.productOrderCounts.map((p, i) => {
                    const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
                    const trend = metrics.productTrends[p.id] ?? []
                    return (
                      <div key={p.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[#1f2229] transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/products/${p.id}`)}>
                        <span className="text-xs text-[#4a4e60] w-4 shrink-0 text-center">#{i + 1}</span>
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
                          : <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: color + '30', border: `1px solid ${color}40` }} />
                        }
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{p.title}</div>
                          <div className="text-[10px] text-[#8b8fa8]">CVR {p.cvr.toFixed(1)}%</div>
                        </div>
                        <MiniSpark data={trend} color={color} />
                        <div className="text-sm font-bold shrink-0" style={{ color }}>{p.count}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Latest orders */}
            <div className="lg:col-span-2 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">{lang === 'ar' ? 'آخر الطلبات' : 'Latest orders'}</h2>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {lang === 'ar' ? 'مباشر' : 'Live'}
                  </span>
                  <button onClick={() => router.push('/dashboard/orders')} className="text-xs text-[#3b82f6] hover:underline cursor-pointer">
                    {lang === 'ar' ? 'الكل' : 'View all'}
                  </button>
                </div>
              </div>
              {recentOrders.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">📋</div>
                  <div className="text-sm text-[#8b8fa8]">{lang === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}</div>
                  <div className="text-xs text-[#4a4e60] mt-1">{lang === 'ar' ? 'ستظهر الطلبات هنا عند وصولها' : 'Orders will appear here when they arrive'}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map(order => (
                    <div key={order.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b82f6]/40 to-[#7c5cff]/40 flex items-center justify-center text-xs font-bold shrink-0">
                        {order.customer_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium">{order.customer_name}</span>
                          <StatusBadge status={order.status} lang={lang} />
                        </div>
                        <div className="text-[10px] text-[#8b8fa8] truncate">
                          {order.products?.title ?? ''}{order.address_governorate ? ` · ${order.address_governorate}` : ''}
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="text-xs font-semibold">{order.total_price} {order.currency}</div>
                        <div className="text-[9px] text-[#4a4e60]">{new Date(order.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top regions */}
            <div className="rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <I.Map className="w-4 h-4 text-[#8b8fa8]" />
                <h2 className="font-semibold text-sm">{lang === 'ar' ? 'أكثر المناطق' : 'Top regions'}</h2>
              </div>
              {metrics.topGovs.length === 0 ? (
                <div className="text-[#4a4e60] text-sm py-4">{lang === 'ar' ? 'لا توجد بيانات' : 'No data yet'}</div>
              ) : (
                <div className="space-y-3">
                  {metrics.topGovs.map(([gov, count]) => (
                    <div key={gov}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#8b8fa8] truncate pe-2">{gov}</span>
                        <span className="font-semibold shrink-0">{count}</span>
                      </div>
                      <div className="h-1.5 bg-[#2a2d35] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-[#3b82f6] to-[#7c5cff] transition-all duration-700"
                          style={{ width: `${(count / metrics.topGovs[0][1]) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* Credits modal */}
      {showCreditsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">{lang === 'ar' ? 'شراء رصيد طلبات' : 'Buy order credits'}</h2>
              <button onClick={() => setShowCreditsModal(false)} className="text-[#8b8fa8] hover:text-white text-xl cursor-pointer">×</button>
            </div>
            <p className="text-[#8b8fa8] text-sm mb-6">{lang === 'ar' ? 'الرصيد لا ينتهي. كلما اشتريت أكثر، كلما قل السعر لكل طلب.' : 'Credits never expire. The more you buy, the less per order.'}</p>
            <div className="space-y-3 mb-6">
              {[
                { bundle: lang === 'ar' ? '1,000 طلب' : '1,000 orders', price: '299 EGP', per: lang === 'ar' ? '0.30 ج/طلب' : '0.30 EGP/order', popular: false },
                { bundle: lang === 'ar' ? '2,000 طلب' : '2,000 orders', price: '499 EGP', per: lang === 'ar' ? '0.25 ج/طلب' : '0.25 EGP/order', popular: true  },
                { bundle: lang === 'ar' ? '5,000 طلب' : '5,000 orders', price: '999 EGP', per: lang === 'ar' ? '0.20 ج/طلب' : '0.20 EGP/order', popular: false },
              ].map((plan, i) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${plan.popular ? 'border-[#3b82f6] bg-[#1a3a5c]' : 'border-[#2a2d35] hover:border-[#3b82f6]'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.bundle}</span>
                      {plan.popular && <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full">{lang === 'ar' ? 'الأفضل قيمة' : 'Best value'}</span>}
                    </div>
                    <div className="text-xs text-[#8b8fa8] mt-0.5">{plan.per}</div>
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                    <div className="font-semibold">{plan.price}</div>
                    <button className="text-xs text-[#3b82f6] hover:underline mt-1">{lang === 'ar' ? 'اختر' : 'Select'} →</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3 text-xs text-[#8b8fa8] text-center">
              💳 {lang === 'ar' ? 'تكامل الدفع قريباً — تواصل مع الدعم للشراء يدوياً' : 'Payment integration coming soon — contact support to purchase manually'}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        body { font-family: 'Noto Sans Arabic', system-ui, sans-serif; }
        h1, h2, h3, .font-bold, .font-semibold { font-family: 'Noto Kufi Arabic', system-ui, sans-serif; }
      `}</style>
    </div>
  )
}
