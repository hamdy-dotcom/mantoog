'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/* ── icons ── */
type IP = { className?: string; style?: React.CSSProperties }
const I = {
  Grid:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Box:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Search:  (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Video:   (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>,
  Cart:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  TikTok:  (p:IP) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className}><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07Z"/></svg>,
  CreditCard: (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect width="22" height="16" x="1" y="4" rx="2"/><line x1="1" x2="23" y1="10" y2="10"/></svg>,
  Settings:(p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Plus:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 5v14M5 12h14"/></svg>,
  TrendUp: (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>,
  Package: (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>,
  Check:   (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M20 6 9 17l-5-5"/></svg>,
  Clock:   (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Menu:    (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>,
  Store:   (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>,
  Cal:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Filter:  (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  ChevD:   (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m6 9 6 6 6-6"/></svg>,
  Map:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>,
  Zap:     (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>,
}

/* ── mock data ── */
const ORDERS_14 = [18, 24, 15, 32, 28, 41, 36, 29, 44, 38, 52, 47, 58, 42]
const ORDERS_7  = [36, 29, 44, 38, 52, 47, 42]
const ORDERS_30 = [12,18,14,22,19,28,24,16,32,28,41,36,29,44,38,52,47,58,42,35,39,43,50,46,55,48,62,57,44,42]

const PRODUCTS = [
  { name: 'ساعة ذكية رياضية', orders: 94, visits: 1240, cvr: '7.6', trend: [12,18,22,16,28,24,30], color: '#3b82f6' },
  { name: 'سماعة لاسلكية بلوتوث', orders: 67, visits: 890, cvr: '7.5', trend: [8,14,10,18,16,22,20], color: '#7c5cff' },
  { name: 'شاحن سريع 65W', orders: 51, visits: 720, cvr: '7.1', trend: [6,10,8,14,12,16,14], color: '#10b981' },
  { name: 'نظارة شمسية فاخرة', orders: 38, visits: 610, cvr: '6.2', trend: [4,8,6,10,8,12,10], color: '#f59e0b' },
]

const LATEST_ORDERS = [
  { name: 'محمد علي', status: 'delivered', product: 'ساعة ذكية', price: '٧٤٩', city: 'القاهرة', ago: 'منذ ٣ د' },
  { name: 'فاطمة حسن', status: 'pending', product: 'سماعة لاسلكية', price: '٣٩٩', city: 'الرياض', ago: 'منذ ٧ د' },
  { name: 'عمر خالد', status: 'pending', product: 'شاحن سريع', price: '٢٤٩', city: 'الإسكندرية', ago: 'منذ ١٢ د' },
  { name: 'نورا سعيد', status: 'cancelled', product: 'ساعة ذكية', price: '٧٤٩', city: 'جدة', ago: 'منذ ١٨ د' },
  { name: 'أحمد رضا', status: 'delivered', product: 'شاحن سريع', price: '٢٤٩', city: 'الجيزة', ago: 'منذ ٢٤ د' },
]

const REGIONS = [
  { name: 'القاهرة', orders: 142, pct: 100 },
  { name: 'الرياض', orders: 98, pct: 69 },
  { name: 'الإسكندرية', orders: 76, pct: 54 },
  { name: 'جدة', orders: 64, pct: 45 },
  { name: 'الجيزة', orders: 48, pct: 34 },
]

const TIKTOK_CAMPAIGNS = [
  { name: 'حملة رمضان', spend: '١٬٢٤٠', roas: 3.8, status: true },
  { name: 'ساعة رياضية', spend: '٨٩٠', roas: 4.2, status: true },
  { name: 'حملة الصيف', spend: '٣٢٠', roas: 2.1, status: false },
]

const DATE_RANGES = ['آخر 7 أيام', 'آخر 14 يوم', 'آخر 30 يوم']
const STATUSES = ['الكل', 'مُسلَّم', 'قيد التنفيذ', 'ملغي']

const NAV = [
  { label: 'لوحة التحكم', icon: 'Grid' },
  { label: 'المنتجات', icon: 'Box' },
  { label: 'البحث عن منتج', icon: 'Search' },
  { label: 'الإبداعات', icon: 'Video' },
  { label: 'الطلبات', icon: 'Cart' },
  { label: 'إعلانات تيك توك', icon: 'TikTok' },
  { label: 'الفواتير', icon: 'CreditCard' },
  { label: 'الإعدادات', icon: 'Settings' },
]

/* ── sparkline ── */
function Sparkline({ data, color = '#3b82f6', h = 60 }: { data: number[]; color?: string; h?: number }) {
  const W = 300, pad = 4
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)
    return [x, y] as [number, number]
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${color.replace('#','')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  )
}

/* ── mini sparkline for product rows ── */
function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const W = 60, H = 24, pad = 2
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
function useCountUp(target: number, run: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0, start = 0
    const step = (t: number) => {
      if (!start) start = t
      const p = Math.min((t - start) / 1200, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return val
}

/* ── status badge ── */
function Badge({ s }: { s: string }) {
  const m: Record<string, string> = {
    delivered: 'bg-emerald-500/15 text-emerald-400',
    pending:   'bg-amber-500/15 text-amber-400',
    cancelled: 'bg-red-500/15 text-red-400',
  }
  const l: Record<string, string> = { delivered: 'مُسلَّم', pending: 'قيد التنفيذ', cancelled: 'ملغي' }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${m[s] ?? 'bg-white/10 text-white'}`}>{l[s] ?? s}</span>
}

/* ── page ── */
export default function DashboardDemo() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dateRange, setDateRange] = useState(1)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [activeStatus, setActiveStatus] = useState(0)
  const [activeProduct, setActiveProduct] = useState<number|null>(null)
  const [countRun, setCountRun] = useState(false)
  const kpiRef = useRef<HTMLDivElement>(null)

  const data = [ORDERS_7, ORDERS_14, ORDERS_30][Math.min(dateRange, 2)]
  const total = data.reduce((a, b) => a + b, 0)

  const orders504 = useCountUp(total, countRun)
  const rev = useCountUp(47850, countRun)
  const del = useCountUp(78, countRun)
  const pend = useCountUp(24, countRun)

  useEffect(() => {
    const el = kpiRef.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setCountRun(true); obs.disconnect() } }, { threshold: 0.3 })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  // trigger count-up immediately on mount
  useEffect(() => { setCountRun(true) }, [])

  const KPIS = [
    { label: 'إجمالي الطلبات', value: orders504.toLocaleString(), raw: total, sub: '+12% عن الفترة السابقة', icon: 'Package', color: '#3b82f6', up: true },
    { label: 'الإيرادات', value: `${rev.toLocaleString()} ج.م`, raw: 47850, sub: '+8% عن الفترة السابقة', icon: 'TrendUp', color: '#10b981', up: true },
    { label: 'معدل التوصيل', value: `${del}%`, raw: 78, sub: `${Math.round(total * 0.78)} طلب مُسلَّم`, icon: 'Check', color: '#a78bfa', up: true },
    { label: 'الطلبات المعلقة', value: pend.toString(), raw: 24, sub: 'يحتاج متابعة', icon: 'Clock', color: '#f59e0b', up: false },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-[#0f1117] text-white flex font-ar select-none">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ── Sidebar ── */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 h-screen w-56 flex-shrink-0 bg-[#1a1d24] border-l border-[#2a2d35] flex flex-col z-40 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#2a2d35]">
          <img src="/logo.svg" alt="Mantoog" className="h-8 w-8 object-contain" />
          <span className="font-bold text-sm">Mantoog</span>
          <span className="ms-auto text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold">DEMO</span>
        </div>
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-[#0f1117] border border-[#2a2d35] px-3 py-2 cursor-pointer hover:border-[#3b3f4e] transition-colors">
          <I.Store className="w-4 h-4 text-[#8b8fa8] shrink-0" />
          <span className="text-xs text-[#8b8fa8] truncate">متجر أحمد</span>
          <I.ChevD className="w-3 h-3 text-[#4a4e60] ms-auto shrink-0" />
        </div>
        <nav className="flex-1 px-2 pt-3 space-y-0.5 overflow-y-auto">
          {NAV.map((n, i) => {
            const Icon = (I as Record<string, (p: IP) => React.JSX.Element>)[n.icon]
            const active = activeNav === i
            return (
              <button key={i} onClick={() => { setActiveNav(i); setSidebarOpen(false) }}
                className={`w-full cursor-pointer flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-start ${active ? 'bg-[#3b82f6]/15 text-[#60a5fa] font-semibold' : 'text-[#8b8fa8] hover:bg-[#1f2229] hover:text-white'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {n.label}
                {i === 4 && <span className="ms-auto text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">24</span>}
              </button>
            )
          })}
        </nav>
        <div className="m-3 rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/30 to-[#7c5cff]/20" />
          <div className="relative p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <I.Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-white">جرّب المتجر الحقيقي</span>
            </div>
            <p className="text-[10px] text-white/60 mb-2.5">100 طلب مجاني — بدون بطاقة</p>
            <button onClick={() => router.push('/signup')}
              className="cursor-pointer w-full bg-white hover:bg-white/90 text-[#0f1117] text-xs font-bold py-2 rounded-lg transition-colors">
              ابدأ مجاناً ←
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#0f1117]/95 backdrop-blur border-b border-[#2a2d35] px-4 sm:px-6 py-3 flex items-center gap-3">
          <button className="lg:hidden cursor-pointer text-[#8b8fa8] hover:text-white p-1" onClick={() => setSidebarOpen(true)}>
            <I.Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-none">أهلاً، متجر أحمد 👋</h1>
              <p className="text-[10px] text-[#8b8fa8] mt-0.5">نسخة تجريبية — البيانات وهمية</p>
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <button onClick={() => router.push('/signup')}
              className="cursor-pointer inline-flex items-center gap-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
              <I.Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إضافة منتج</span>
            </button>
          </div>
        </header>

        {/* ── Filters bar ── */}
        <div className="border-b border-[#2a2d35] bg-[#0f1117] px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-2">
          {/* Date range chips + custom */}
          <div className="flex items-center gap-1 bg-[#1a1d24] border border-[#2a2d35] rounded-lg p-0.5">
            {DATE_RANGES.map((d, i) => (
              <button key={i} onClick={() => setDateRange(i)}
                className={`cursor-pointer text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${dateRange === i ? 'bg-[#2a2d35] text-white' : 'text-[#8b8fa8] hover:text-white'}`}>
                {d}
              </button>
            ))}
            <button onClick={() => setDateRange(3)}
              className={`cursor-pointer flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${dateRange === 3 ? 'bg-[#2a2d35] text-white' : 'text-[#8b8fa8] hover:text-white'}`}>
              <I.Cal className="w-3 h-3" />
              تخصيص
            </button>
          </div>

          {/* Custom date range inputs */}
          {dateRange === 3 && (
            <div className="flex items-center gap-1.5 bg-[#1a1d24] border border-[#3b82f6]/30 rounded-lg px-2.5 py-1.5 animate-[fadeIn_0.15s_ease]">
              <I.Cal className="w-3 h-3 text-[#60a5fa] shrink-0" />
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="bg-transparent text-[11px] text-white border-none outline-none [color-scheme:dark] cursor-pointer"
                style={{ width: 110 }}
              />
              <span className="text-[10px] text-[#4a4e60] shrink-0">←</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="bg-transparent text-[11px] text-white border-none outline-none [color-scheme:dark] cursor-pointer"
                style={{ width: 110 }}
              />
              {customFrom && customTo && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo(''); setDateRange(1) }}
                  className="cursor-pointer text-[10px] text-[#4a4e60] hover:text-red-400 transition-colors ms-1">✕</button>
              )}
            </div>
          )}

          {/* Product filter */}
          <button className="cursor-pointer flex items-center gap-1.5 text-[11px] text-[#8b8fa8] hover:text-white border border-[#2a2d35] hover:border-[#3b3f4e] bg-[#1a1d24] px-3 py-1.5 rounded-lg transition-colors">
            <I.Box className="w-3 h-3" />
            كل المنتجات
            <I.ChevD className="w-3 h-3" />
          </button>
          {/* Region filter */}
          <button className="cursor-pointer flex items-center gap-1.5 text-[11px] text-[#8b8fa8] hover:text-white border border-[#2a2d35] hover:border-[#3b3f4e] bg-[#1a1d24] px-3 py-1.5 rounded-lg transition-colors">
            <I.Map className="w-3 h-3" />
            كل المناطق
            <I.ChevD className="w-3 h-3" />
          </button>
          {/* Status pills */}
          <div className="flex items-center gap-1">
            {STATUSES.map((s, i) => (
              <button key={i} onClick={() => setActiveStatus(i)}
                className={`cursor-pointer text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${activeStatus === i ? 'bg-[#3b82f6]/15 border-[#3b82f6]/40 text-[#60a5fa]' : 'border-[#2a2d35] text-[#8b8fa8] hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
          <span className="ms-auto text-[10px] text-[#4a4e60] hidden sm:inline">
            <I.Cal className="w-3 h-3 inline ms-1" />{' '}
            {dateRange === 3
              ? (customFrom && customTo ? `${customFrom} ← ${customTo}` : 'حدّد الفترة')
              : dateRange === 0 ? '12–18 يونيو 2026'
              : dateRange === 1 ? '4–18 يونيو 2026'
              : 'مايو–يونيو 2026'}
          </span>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-5 space-y-4 overflow-auto">

          {/* KPI cards */}
          <div ref={kpiRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {KPIS.map((k, i) => {
              const Icon = (I as Record<string, (p: IP) => React.JSX.Element>)[k.icon]
              return (
                <div key={i} className="rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4 hover:border-[#3b3f4e] transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-[#8b8fa8]">{k.label}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: k.color + '20' }}>
                      <Icon className="w-4 h-4" style={{ color: k.color }} />
                    </div>
                  </div>
                  <div className="font-bold text-xl sm:text-2xl">{k.value}</div>
                  <div className={`text-[11px] mt-1 ${k.up ? 'text-emerald-400' : 'text-amber-400'}`}>{k.sub}</div>
                </div>
              )
            })}
          </div>

          {/* Chart + Status + TikTok row */}
          <div className="grid lg:grid-cols-3 gap-3">
            {/* Main chart */}
            <div className="lg:col-span-2 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="font-semibold text-sm">الطلبات اليومية</h2>
                  <p className="text-xs text-[#8b8fa8] mt-0.5">{DATE_RANGES[dateRange]}</p>
                </div>
                <div className="text-2xl font-bold">{orders504.toLocaleString()}</div>
              </div>
              <Sparkline data={data} color="#3b82f6" h={72} />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-[#4a4e60]">{dateRange === 0 ? '12 يونيو' : dateRange === 1 ? '4 يونيو' : '19 مايو'}</span>
                <span className="text-[9px] text-[#4a4e60]">اليوم</span>
              </div>
            </div>

            {/* Status + TikTok stacked */}
            <div className="flex flex-col gap-3">
              {/* Order status */}
              <div className="flex-1 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
                <h2 className="font-semibold text-sm mb-3">حالة الطلبات</h2>
                <div className="space-y-3">
                  {[
                    { label: 'مُسلَّم', pct: 78, color: '#10b981' },
                    { label: 'قيد التنفيذ', pct: 14, color: '#f59e0b' },
                    { label: 'ملغي', pct: 8, color: '#ef4444' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#8b8fa8]">{s.label}</span>
                        <span className="font-semibold">{s.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#2a2d35]">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TikTok Ads mini */}
              <div className="rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center">
                    <I.TikTok className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="font-semibold text-sm">إعلانات تيك توك</h2>
                </div>
                <div className="space-y-2">
                  {TIKTOK_CAMPAIGNS.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status ? 'bg-emerald-400' : 'bg-[#4a4e60]'}`} />
                      <span className="flex-1 text-[#8b8fa8] truncate">{c.name}</span>
                      <span className={`font-bold shrink-0 ${c.roas >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>{c.roas}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Products + Orders + Regions */}
          <div className="grid lg:grid-cols-5 gap-3">
            {/* Top products — 2 cols */}
            <div className="lg:col-span-2 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <h2 className="font-semibold text-sm mb-3">أفضل المنتجات</h2>
              <div className="space-y-3">
                {PRODUCTS.map((p, i) => (
                  <div key={i}
                    onClick={() => setActiveProduct(activeProduct === i ? null : i)}
                    className={`flex items-center gap-2.5 rounded-xl px-2 py-2 cursor-pointer transition-colors ${activeProduct === i ? 'bg-[#2a2d35]' : 'hover:bg-[#1f2229]'}`}>
                    <span className="text-xs text-[#4a4e60] w-4 shrink-0 text-center">#{i+1}</span>
                    <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: `${p.color}30`, border: `1px solid ${p.color}40` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      <div className="text-[10px] text-[#8b8fa8]">CVR {p.cvr}%</div>
                    </div>
                    <MiniSpark data={p.trend} color={p.color} />
                    <div className="text-sm font-bold shrink-0" style={{ color: p.color }}>{p.orders}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest orders — 2 cols */}
            <div className="lg:col-span-2 rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">آخر الطلبات</h2>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مباشر
                </span>
              </div>
              <div className="space-y-2.5">
                {LATEST_ORDERS.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b82f6]/40 to-[#7c5cff]/40 flex items-center justify-center text-xs font-bold shrink-0">
                      {o.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium">{o.name}</span>
                        <Badge s={o.status} />
                      </div>
                      <div className="text-[10px] text-[#8b8fa8]">{o.product} · {o.city}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-xs font-semibold">{o.price} ج.م</div>
                      <div className="text-[9px] text-[#4a4e60]">{o.ago}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top regions — 1 col */}
            <div className="rounded-2xl bg-[#1a1d24] border border-[#2a2d35] p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <I.Map className="w-4 h-4 text-[#8b8fa8]" />
                <h2 className="font-semibold text-sm">أكثر المناطق</h2>
              </div>
              <div className="space-y-3">
                {REGIONS.map((r, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8b8fa8]">{r.name}</span>
                      <span className="font-semibold">{r.orders}</span>
                    </div>
                    <div className="h-1 rounded-full bg-[#2a2d35]">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#3b82f6] to-[#7c5cff] transition-all duration-700"
                           style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl border border-[#3b82f6]/25 bg-gradient-to-l from-[#3b82f6]/10 to-[#7c5cff]/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">جاهز للبيع الحقيقي؟</div>
              <div className="text-xs text-[#8b8fa8] mt-0.5">أنشئ متجرك وابدأ باستقبال طلبات حقيقية — 100 طلب مجاني بدون بطاقة</div>
            </div>
            <button onClick={() => router.push('/signup')}
              className="cursor-pointer shrink-0 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25">
              ابدأ مجاناً ←
            </button>
          </div>

        </main>
      </div>

      <style jsx global>{`
        .font-ar, .font-ar * { font-family: 'Noto Sans Arabic', system-ui, sans-serif; }
        .font-ar h1, .font-ar h2, .font-ar .font-bold, .font-ar .font-semibold { font-family: 'Noto Kufi Arabic', system-ui, sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
