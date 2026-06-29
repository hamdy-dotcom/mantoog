'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import * as XLSX from 'xlsx'
import { ORDER_ATTRIBUTION_FIELDS, ORDER_ATTRIBUTION_LABELS } from '@/lib/analytics/attribution'

const ADMIN_EMAILS = ['admin@mantoog.com']
const ORDERS_PER_PAGE = 50

/* ── Icons ── */
type IP = { className?: string; style?: React.CSSProperties }
const IconGrid    = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const IconUsers   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconBox     = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
const IconCart    = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
const IconCredit  = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
const IconMoney   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
const IconWallet  = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v4"/><path d="M3 5v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M18 12a2 2 0 0 0 0 4h3v-4Z"/></svg>
const IconCheck   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M20 6 9 17l-5-5"/></svg>
const IconX       = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
const IconRefresh = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
const IconLogout  = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IconSearch  = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconEye     = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconDownload= (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconAlert   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconMap     = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
const IconPlus    = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconTrash   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IconChevL   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polyline points="15 18 9 12 15 6"/></svg>
const IconChevR   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polyline points="9 18 15 12 9 6"/></svg>
const IconTrend   = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
const IconTrendD  = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
const IconCalendar= (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IconFilter  = (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
const IconBarChart= (p:IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>

/* ── helpers ── */
const todayStr     = () => new Date().toDateString()
const yesterdayStr = () => new Date(Date.now() - 86400000).toDateString()
const nDaysAgo     = (n: number) => new Date(Date.now() - n * 86400000)
const fmtDate      = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtShort     = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

function Delta({ now, prev, label = 'vs prev' }: { now: number; prev: number; label?: string }) {
  const diff = now - prev
  if (prev === 0 && now === 0) return null
  const pct = prev === 0 ? 100 : Math.round(Math.abs(diff / prev) * 100)
  const up  = diff >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${up ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f87171]/10 text-[#f87171]'}`}>
      {up ? <IconTrend className="w-2.5 h-2.5" /> : <IconTrendD className="w-2.5 h-2.5" />}
      {pct}% {label}
    </span>
  )
}

export default function AdminPage() {
  /* ── core state ── */
  const [loading, setLoading]           = useState(true)
  const [authorized, setAuthorized]     = useState(false)
  const [activeTab, setActiveTab]       = useState('overview')
  const [merchants, setMerchants]       = useState<any[]>([])
  const [orders, setOrders]             = useState<any[]>([])
  const [allProducts, setAllProducts]   = useState<any[]>([])
  const [allCreditRows, setAllCreditRows] = useState<any[]>([])
  const [merchantsMap, setMerchantsMap] = useState<Record<string, any>>({})
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [adminWallets, setAdminWallets] = useState<any[]>([])
  const [chartRange, setChartRange]     = useState<7|30|90>(30)

  /* ── missed orders tab ── */
  const [abandonedCheckouts, setAbandonedCheckouts] = useState<any[]>([])
  const [abandonedSearch, setAbandonedSearch]       = useState('')
  const [abandonedMerchantFilter, setAbandonedMerchantFilter] = useState('')
  const [abandonedDateFrom, setAbandonedDateFrom]   = useState('')
  const [abandonedDateTo, setAbandonedDateTo]       = useState('')
  const [abandonedStatusFilter, setAbandonedStatusFilter] = useState<'unrecovered'|'all'|'recovered'>('unrecovered')

  /* ── credits state ── */
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null)
  const [creditAmount, setCreditAmount]   = useState('')
  const [addingCredits, setAddingCredits] = useState(false)
  const [creditSuccess, setCreditSuccess] = useState(false)
  const [creditSearch, setCreditSearch]   = useState('')

  /* ── merchants tab ── */
  const [merchantSearch, setMerchantSearch]   = useState('')
  const [merchantSortKey, setMerchantSortKey] = useState<'joined'|'orders_today'|'orders_month'|'credits'>('joined')

  /* ── products tab ── */
  const [productSearch, setProductSearch]             = useState('')
  const [productMerchantFilter, setProductMerchantFilter] = useState('')
  const [productDateFrom, setProductDateFrom]         = useState('')
  const [productDateTo, setProductDateTo]             = useState('')
  const [productPriceMin, setProductPriceMin]         = useState(0)
  const [productPriceMax, setProductPriceMax]         = useState(999999)
  const [viewingMerchant, setViewingMerchant]         = useState<any>(null)
  const [merchantProducts, setMerchantProducts]       = useState<any[]>([])
  const [loadingProducts, setLoadingProducts]         = useState(false)

  /* ── orders tab ── */
  const [orderSearch, setOrderSearch]               = useState('')
  const [orderStatusFilter, setOrderStatusFilter]   = useState('all')
  const [orderMerchantFilter, setOrderMerchantFilter] = useState('')
  const [orderDateFrom, setOrderDateFrom]           = useState('')
  const [orderDateTo, setOrderDateTo]               = useState('')
  const [ordersPage, setOrdersPage]                 = useState(1)

  /* ── payments tab ── */
  const [paymentFilter, setPaymentFilter]   = useState<'all'|'pending'|'approved'|'rejected'>('pending')
  const [processingPayment, setProcessingPayment] = useState<string|null>(null)
  const [adminNotes, setAdminNotes]         = useState<Record<string,string>>({})
  const [viewingProof, setViewingProof]     = useState<string|null>(null)

  /* ── wallets tab ── */
  const [newWallet, setNewWallet]     = useState({ label:'', wallet_type:'vodafone', number:'' })
  const [savingWallet, setSavingWallet] = useState(false)

  /* ── overview extras ── */
  const [ovPreset, setOvPreset]       = useState<'today'|'yesterday'|'7d'|'30d'|'month'|'all'|'custom'>('30d')
  const [ovMerchant, setOvMerchant]   = useState('')
  const [ovCustomFrom, setOvCustomFrom] = useState('')
  const [ovCustomTo, setOvCustomTo]   = useState('')

  const router   = useRouter()
  const supabase = createClient()

  /* ── reset orders page when any filter changes ── */
  useEffect(() => { setOrdersPage(1) }, [orderSearch, orderStatusFilter, orderMerchantFilter, orderDateFrom, orderDateTo])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!ADMIN_EMAILS.includes(user.email || '')) { router.push('/dashboard'); return }
      setAuthorized(true)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async () => {
    const fetchAll = async (query: any) => {
      const PAGE = 1000; let rows: any[] = []; let from = 0
      while (true) {
        const { data, error } = await query.range(from, from + PAGE - 1)
        if (error || !data || data.length === 0) break
        rows = rows.concat(data); if (data.length < PAGE) break; from += PAGE
      }
      return rows
    }

    const [{ data: storesData }, { data: merchantsData }, { data: creditsData }] = await Promise.all([
      supabase.from('stores').select('*').order('created_at', { ascending: false }),
      supabase.from('merchants').select('*').order('created_at', { ascending: false }),
      supabase.from('order_credits').select('id, merchant_id, credits_remaining, credits_total, credits_used, bundle_type, price_paid, created_at').order('created_at', { ascending: false }),
    ])

    const mMap = (merchantsData || []).reduce((acc: any, m: any) => { acc[m.id] = m; return acc }, {})
    setMerchantsMap(mMap)
    setAllCreditRows(creditsData || [])

    const [ordersData, productsJson, { data: allLandingPages }] = await Promise.all([
      fetchAll(supabase.from('orders').select('*, stores(name, currency, merchant_id, slug), products(title)').order('created_at', { ascending: false })),
      fetch('/api/admin/products').then(r => r.json()).catch(() => ({ data: [] })),
      supabase.from('landing_pages').select('product_id, visits'),
    ])
    const productsData = productsJson.data ?? []

    setAllProducts(productsData.map((p: any) => ({ ...p, landing_pages: allLandingPages?.filter((lp: any) => lp.product_id === p.id) || [] })))
    setOrders(ordersData)

    const allStores   = storesData   || []
    const allCredits  = creditsData  || []
    const allMerchants = (merchantsData || []).filter(m => !ADMIN_EMAILS.includes(m.email?.toLowerCase() || ''))
    const enriched = allMerchants.map(m => ({
      ...m,
      stores: [allStores.find(s => s.merchant_id === m.id)].filter(Boolean),
      order_credits: [allCredits.find(c => c.merchant_id === m.id)].filter(Boolean),
    }))
    setMerchants(enriched)

    const [prRes, wRes, abRes] = await Promise.all([fetch('/api/admin/payment-requests'), fetch('/api/admin/wallets'), fetch('/api/admin/abandoned-checkouts')])
    if (prRes.ok) setPaymentRequests((await prRes.json()).requests ?? [])
    if (wRes.ok)  setAdminWallets((await wRes.json()).wallets ?? [])
    if (abRes.ok) setAbandonedCheckouts((await abRes.json()).data ?? [])
  }

  /* ── computed analytics ── */
  const analytics = useMemo(() => {
    const td = todayStr(); const yd = yesterdayStr()
    const now = new Date()
    const startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
    const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // ── Period range for overview filters ──
    type Bounds = { from: Date|null; to: Date|null }
    const customFrom = ovCustomFrom ? new Date(ovCustomFrom + 'T00:00:00') : null
    const customTo   = ovCustomTo   ? new Date(ovCustomTo + 'T23:59:59') : null
    const customDur  = (customFrom && customTo) ? customTo.getTime() - customFrom.getTime() : null
    const bounds: Record<string, Bounds> = {
      today:     { from: startOfToday,     to: null },
      yesterday: { from: startOfYesterday, to: startOfToday },
      '7d':      { from: nDaysAgo(7),      to: null },
      '30d':     { from: nDaysAgo(30),     to: null },
      month:     { from: startOfMonth,     to: null },
      all:       { from: null,             to: null },
      custom:    { from: customFrom,       to: customTo },
    }
    const prevBounds: Record<string, Bounds> = {
      today:     { from: startOfYesterday,                                to: startOfToday },
      yesterday: { from: new Date(startOfYesterday.getTime()-86400000),   to: startOfYesterday },
      '7d':      { from: nDaysAgo(14),     to: nDaysAgo(7) },
      '30d':     { from: nDaysAgo(60),     to: nDaysAgo(30) },
      month:     { from: startOfLastMonth, to: startOfMonth },
      all:       { from: null,             to: null },
      custom:    { from: customFrom && customDur ? new Date(customFrom.getTime()-customDur) : null, to: customFrom },
    }
    const { from: ovFrom, to: ovTo } = bounds[ovPreset] ?? bounds['30d']
    const { from: pvFrom, to: pvTo } = prevBounds[ovPreset] ?? prevBounds['30d']

    const inBounds = (d: Date, f: Date|null, t: Date|null) =>
      (!f || d >= f) && (!t || d < t)

    const ovOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      if (ovMerchant && o.stores?.merchant_id !== ovMerchant) return false
      return inBounds(d, ovFrom, ovTo)
    })
    const pvOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      if (ovMerchant && o.stores?.merchant_id !== ovMerchant) return false
      return inBounds(d, pvFrom, pvTo)
    })
    const ovMerchants = merchants.filter(m => inBounds(new Date(m.created_at), ovFrom, ovTo))
    const pvMerchants = merchants.filter(m => inBounds(new Date(m.created_at), pvFrom, pvTo))
    const ovActiveStores = new Set(ovOrders.map(o => o.stores?.merchant_id).filter(Boolean)).size
    const pvActiveStores = new Set(pvOrders.map(o => o.stores?.merchant_id).filter(Boolean)).size

    // ── Revenue = what merchants paid Mantoog (approved payment requests) ──
    const ovRevenue = paymentRequests.filter(r => r.status === 'approved' && inBounds(new Date(r.created_at), ovFrom, ovTo)).reduce((s, r) => s + (Number(r.amount_egp) || 0), 0)
    const pvRevenue = paymentRequests.filter(r => r.status === 'approved' && inBounds(new Date(r.created_at), pvFrom, pvTo)).reduce((s, r) => s + (Number(r.amount_egp) || 0), 0)

    // ── Sales by country (grouped by store currency = merchant's country) ──
    const CURR_MAP: Record<string, { name: string; flag: string }> = {
      EGP: { name:'Egypt',        flag:'🇪🇬' }, SAR: { name:'Saudi Arabia', flag:'🇸🇦' },
      AED: { name:'UAE',          flag:'🇦🇪' }, USD: { name:'USA',          flag:'🇺🇸' },
      KWD: { name:'Kuwait',       flag:'🇰🇼' }, QAR: { name:'Qatar',        flag:'🇶🇦' },
      OMR: { name:'Oman',         flag:'🇴🇲' }, BHD: { name:'Bahrain',      flag:'🇧🇭' },
      JOD: { name:'Jordan',       flag:'🇯🇴' }, MAD: { name:'Morocco',      flag:'🇲🇦' },
      GBP: { name:'UK',           flag:'🇬🇧' }, EUR: { name:'Europe',       flag:'🇪🇺' },
      TND: { name:'Tunisia',      flag:'🇹🇳' }, DZD: { name:'Algeria',      flag:'🇩🇿' },
      LYD: { name:'Libya',        flag:'🇱🇾' }, SDG: { name:'Sudan',        flag:'🇸🇩' },
    }
    const countryAcc: Record<string, { orders: number; revenue: number }> = {}
    ovOrders.forEach(o => {
      const cur = o.stores?.currency || 'Unknown'
      if (!countryAcc[cur]) countryAcc[cur] = { orders: 0, revenue: 0 }
      countryAcc[cur].orders++
      countryAcc[cur].revenue += Number(o.total_price) || 0
    })
    const salesByCountry = Object.entries(countryAcc)
      .sort(([,a],[,b]) => b.orders - a.orders)
      .map(([currency, { orders, revenue }]) => ({
        currency, orders, revenue: Math.round(revenue),
        country: CURR_MAP[currency]?.name || currency,
        flag:    CURR_MAP[currency]?.flag || '🌍',
      }))

    // ── Credit health distribution (all merchants, not period-filtered) ──
    const creditHealth = {
      zero:    merchants.filter(m => (m.order_credits?.[0]?.credits_remaining ?? 0) === 0 && m.order_credits?.length).length,
      low:     merchants.filter(m => { const c = m.order_credits?.[0]?.credits_remaining ?? -1; return c > 0 && c <= 10 }).length,
      medium:  merchants.filter(m => { const c = m.order_credits?.[0]?.credits_remaining ?? -1; return c > 10 && c <= 100 }).length,
      healthy: merchants.filter(m => (m.order_credits?.[0]?.credits_remaining ?? 0) > 100).length,
      none:    merchants.filter(m => !m.order_credits?.length).length,
    }

    // ── Recent signups (in selected period, sorted newest first) ──
    const recentSignups = [...merchants]
      .filter(m => inBounds(new Date(m.created_at), ovFrom, ovTo))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)

    // ── Hourly distribution (all-time or filtered period) ──
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({
      hour: h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`,
      count: ovOrders.filter(o => new Date(o.created_at).getHours() === h).length,
    }))

    // ── Status breakdown ──
    const statusColors: Record<string,string> = { delivered:'#4ade80', confirmed:'#34d399', shipped:'#60a5fa', pending:'#fbbf24', cancelled:'#f87171', returned:'#fb923c' }
    const statusBreakdown = Object.entries(
      ovOrders.reduce((acc: Record<string,number>, o) => { acc[o.status]=(acc[o.status]||0)+1; return acc }, {})
    ).sort(([,a],[,b])=>b-a).map(([s,c]) => ({ status:s, count:c as number, color: statusColors[s]||'#8b8fa8', pct: ovOrders.length ? Math.round((c as number)/ovOrders.length*100) : 0 }))

    // ── Chart data (period-aware) ──
    let chartData: any[] = []
    if (ovPreset === 'today' || ovPreset === 'yesterday') {
      chartData = Array.from({ length: 24 }, (_, h) => {
        const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`
        return { date: label, orders: ovOrders.filter(o => new Date(o.created_at).getHours() === h).length, signups: 0 }
      })
    } else {
      const days: Record<string, any> = {}
      const n = ovPreset === '7d' ? 7 : ovPreset === '30d' ? 30 : ovPreset === 'month' ? new Date(now.getFullYear(), now.getMonth()+1, 0).getDate() : 30
      for (let i = n-1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i)
        const k = d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
        days[k] = { date: k, orders: 0, signups: 0 }
      }
      ovOrders.forEach(o => { const k = new Date(o.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}); if (days[k]) days[k].orders++ })
      ovMerchants.forEach(m => { const k = new Date(m.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}); if (days[k]) days[k].signups++ })
      chartData = Object.values(days)
    }

    // ── Top merchants — uses the same period filter as the rest of overview ──
    const topOrdersMap: Record<string,number> = {}
    ovOrders.forEach(o => {
      const mid = o.stores?.merchant_id; if (!mid) return
      topOrdersMap[mid] = (topOrdersMap[mid]||0)+1
    })
    const topMerchants = Object.entries(topOrdersMap).sort(([,a],[,b])=>(b as number)-(a as number)).slice(0,10)
      .map(([mid,count]) => ({ email: merchantsMap[mid]?.email||merchants.find(m=>m.id===mid)?.email||mid.slice(0,8)+'…', store: merchants.find(m=>m.id===mid)?.stores?.[0]?.name||'—', count: count as number, mid }))

    // ── Per-merchant order stats (for merchants tab) ──
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
    const merchantOrderStats: Record<string,{today:number;month:number;last:string}> = {}
    orders.forEach(o => {
      const mid = o.stores?.merchant_id; if (!mid) return
      if (!merchantOrderStats[mid]) merchantOrderStats[mid] = { today:0, month:0, last:'' }
      const oDate = new Date(o.created_at)
      if (oDate.toDateString() === td) merchantOrderStats[mid].today++
      if (oDate >= monthStart) merchantOrderStats[mid].month++
      if (!merchantOrderStats[mid].last || oDate > new Date(merchantOrderStats[mid].last)) merchantOrderStats[mid].last = o.created_at
    })

    const lowCredits  = merchants.filter(m => (m.order_credits?.[0]?.credits_remaining ?? 101) <= 10)
    const totalOrders = orders.length
    const delivered   = orders.filter(o => o.status === 'delivered').length

    return {
      ovOrders: ovOrders.length, pvOrders: pvOrders.length,
      ovMerchants: ovMerchants.length, pvMerchants: pvMerchants.length,
      ovActiveStores, pvActiveStores, ovRevenue, pvRevenue,
      salesByCountry, creditHealth, recentSignups, hourlyData, chartData,
      topMerchants, merchantOrderStats, lowCredits,
      totalMerchants: merchants.length, activeStores: merchants.filter(m=>m.stores.length>0).length,
      totalOrders, deliveryRate: totalOrders > 0 ? Math.round(delivered/totalOrders*100) : 0,
      ordersToday: orders.filter(o=>new Date(o.created_at).toDateString()===td).length,
      ordersYesterday: orders.filter(o=>new Date(o.created_at).toDateString()===yd).length,
      storesToday: new Set(orders.filter(o=>new Date(o.created_at).toDateString()===td).map(o=>o.stores?.slug).filter(Boolean)).size,
      merchToday: merchants.filter(m=>new Date(m.created_at).toDateString()===td).length,
      merchYesterday: merchants.filter(m=>new Date(m.created_at).toDateString()===yd).length,
    }
  }, [orders, merchants, merchantsMap, paymentRequests, ovPreset, ovMerchant, ovCustomFrom, ovCustomTo])

  /* ── filtered + paginated orders ── */
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false
      if (orderMerchantFilter && o.stores?.merchant_id !== orderMerchantFilter) return false
      if (orderSearch) {
        const q = orderSearch.toLowerCase()
        if (!o.customer_name?.toLowerCase().includes(q) && !o.customer_phone?.includes(q) && !o.stores?.name?.toLowerCase().includes(q) && !o.products?.title?.toLowerCase().includes(q)) return false
      }
      if (orderDateFrom) { const d = new Date(o.created_at); if (d < new Date(orderDateFrom + 'T00:00:00')) return false }
      if (orderDateTo)   { const d = new Date(o.created_at); if (d > new Date(orderDateTo + 'T23:59:59')) return false }
      return true
    })
  }, [orders, orderSearch, orderStatusFilter, orderMerchantFilter, orderDateFrom, orderDateTo])

  const totalPages  = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)
  const pagedOrders = filteredOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE)

  const orderSummary = useMemo(() => ({
    total: filteredOrders.length,
    delivered:  filteredOrders.filter(o => o.status === 'delivered').length,
    confirmed:  filteredOrders.filter(o => o.status === 'confirmed').length,
    shipped:    filteredOrders.filter(o => o.status === 'shipped').length,
    pending:    filteredOrders.filter(o => o.status === 'pending').length,
    cancelled:  filteredOrders.filter(o => o.status === 'cancelled').length,
  }), [filteredOrders])

  /* ── filtered merchants ── */
  const filteredMerchants = useMemo(() => {
    const list = merchants.filter(m => {
      if (!merchantSearch) return true
      const q = merchantSearch.toLowerCase()
      return m.email?.toLowerCase().includes(q) || m.stores?.[0]?.name?.toLowerCase().includes(q)
    })
    return [...list].sort((a, b) => {
      const as = analytics.merchantOrderStats
      if (merchantSortKey === 'orders_today') return (as[b.id]?.today||0) - (as[a.id]?.today||0)
      if (merchantSortKey === 'orders_month') return (as[b.id]?.month||0) - (as[a.id]?.month||0)
      if (merchantSortKey === 'credits') return (b.order_credits?.[0]?.credits_remaining||0) - (a.order_credits?.[0]?.credits_remaining||0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [merchants, merchantSearch, merchantSortKey, analytics.merchantOrderStats])

  /* ── handlers ── */
  const handleAddCredits = async () => {
    if (!selectedMerchant || !creditAmount) return
    setAddingCredits(true)
    const res  = await fetch('/api/admin/add-credits', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ merchant_id: selectedMerchant.id, amount: parseInt(creditAmount) }) })
    const data = await res.json()
    if (data.success) { await loadData(); setCreditAmount(''); setSelectedMerchant(null); setCreditSuccess(true); setTimeout(() => setCreditSuccess(false), 3000) }
    else alert('Error: ' + data.error)
    setAddingCredits(false)
  }

  const refreshWallets = async () => { const r = await fetch('/api/admin/wallets'); if (r.ok) setAdminWallets((await r.json()).wallets ?? []) }
  const addWallet = async () => {
    if (!newWallet.label || !newWallet.number) return
    setSavingWallet(true)
    const r = await fetch('/api/admin/wallets', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newWallet) })
    if (r.ok) { setNewWallet({ label:'', wallet_type:'vodafone', number:'' }); await refreshWallets() }
    setSavingWallet(false)
  }
  const toggleWallet = async (id: string, is_active: boolean) => { await fetch(`/api/admin/wallets/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ is_active }) }); await refreshWallets() }
  const deleteWallet = async (id: string) => { if (!confirm('Delete this wallet?')) return; await fetch(`/api/admin/wallets/${id}`, { method:'DELETE' }); await refreshWallets() }

  const processPayment = async (requestId: string, action: 'approve'|'reject') => {
    setProcessingPayment(requestId)
    const res  = await fetch('/api/admin/process-payment', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ request_id: requestId, action, admin_notes: adminNotes[requestId] || null }) })
    const json = await res.json()
    if (!res.ok) { alert('Error: ' + json.error) } else {
      const prRes = await fetch('/api/admin/payment-requests')
      if (prRes.ok) setPaymentRequests((await prRes.json()).requests ?? [])
    }
    setProcessingPayment(null)
  }

  const loadMerchantProducts = async (merchant: any) => {
    setLoadingProducts(true); setViewingMerchant(merchant)
    const store = merchant.stores?.[0]; if (!store) { setLoadingProducts(false); return }
    const json = await fetch(`/api/admin/products?store_id=${store.id}`).then(r => r.json()).catch(() => ({ data: [] }))
    setMerchantProducts(json.data ?? []); setLoadingProducts(false)
  }

  const exportOrdersCSV = () => {
    const headers = ['Store','Customer','Phone','Product','Governorate','Amount','Currency','Status','Date',...ORDER_ATTRIBUTION_FIELDS.map(f => ORDER_ATTRIBUTION_LABELS[f])]
    const rows = filteredOrders.map(o => [o.stores?.name||'',o.customer_name||'',o.customer_phone||'',o.upsell_item?`${o.products?.title||''}+${o.upsell_item.product_title}`:(o.products?.title||''),o.address_governorate||'',o.total_price||'',o.stores?.currency||'',o.status||'',new Date(o.created_at).toLocaleString('en-GB'),...ORDER_ATTRIBUTION_FIELDS.map(f=>o[f]??'')])
    const csv  = [headers,...rows].map(r=>r.map((v:unknown)=>{const s=String(v??'');return s.includes(',')||s.includes('"')?`"${s.replace(/"/g,'""')}"`:s}).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`orders-${Date.now()}.csv`; a.click()
  }

  const exportOrdersExcel = () => {
    const rows = filteredOrders.map((o:any) => ({ 'الاسم':o.customer_name||'','الهاتف':o.customer_phone||'','المنتج':o.products?.title||'','العنوان':[o.address_line1,o.address_governorate].filter(Boolean).join(', '),'المبلغ':o.total_price||'','العملة':o.currency||'','الحالة':o.status||'','التاريخ':new Date(o.created_at).toLocaleString('ar-EG'),'المتجر':o.stores?.name||'',...Object.fromEntries(ORDER_ATTRIBUTION_FIELDS.map(f=>[ORDER_ATTRIBUTION_LABELS[f],o[f]??''])) }))
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Orders'); XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const statusBadge = (s: string) => {
    const map: Record<string,string> = { delivered:'bg-[#14321f] text-[#4ade80]', shipped:'bg-[#1a3a5c] text-[#60a5fa]', confirmed:'bg-[#1a3a2c] text-[#34d399]', cancelled:'bg-[#3a1414] text-[#f87171]', returned:'bg-[#3a1414] text-[#f87171]', pending:'bg-[#3a2e14] text-[#fbbf24]' }
    return map[s] ?? 'bg-[#1f2229] text-[#8b8fa8]'
  }

  const pendingCount = paymentRequests.filter(r => r.status === 'pending').length

  if (loading) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center"><div className="text-center"><div className="w-10 h-10 rounded-full border-2 border-[#3b82f6] border-t-transparent animate-spin mx-auto mb-4" /><p className="text-[#4a4e60] text-sm">Loading admin panel...</p></div></div>
  if (!authorized) return null

  const NAV = [
    { id:'overview',  label:'Overview',  Icon:IconGrid },
    { id:'merchants', label:'Merchants', Icon:IconUsers },
    { id:'products',  label:'Products',  Icon:IconBox },
    { id:'orders',    label:'Orders',    Icon:IconCart },
    { id:'credits',   label:'Credits',   Icon:IconCredit },
    { id:'payments',  label:'Payments',  Icon:IconMoney,  badge: pendingCount },
    { id:'wallets',   label:'Wallets',   Icon:IconWallet },
    { id:'missed-orders', label:'Missed Orders', Icon:IconAlert, badge: abandonedCheckouts.filter(o => !o.recovered && !o.contacted).length || undefined },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex text-white">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r border-[#2a2d35] bg-[#0c0e14]">
        <div className="px-5 py-5 border-b border-[#2a2d35]">
          <img src="/logo.svg" alt="Mantoog" className="h-8 object-contain" />
          <div className="text-[10px] text-[#4a4e60] mt-1.5 uppercase tracking-widest">Admin Panel</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, Icon, badge }) => {
            const active = activeTab === id
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer relative ${active ? 'bg-[#3b82f6]/15 text-white' : 'text-[#4a4e60] hover:text-[#8b8fa8] hover:bg-[#1a1d24]'}`}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#3b82f6] rounded-r-full" />}
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#3b82f6' : undefined }} />
                {label}
                {(badge ?? 0) > 0 && <span className="ml-auto text-[10px] font-bold bg-[#f87171] text-white rounded-full px-1.5 py-0.5 leading-none">{badge}</span>}
              </button>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-[#2a2d35] space-y-1">
          <button onClick={loadData} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#4a4e60] hover:text-white hover:bg-[#1a1d24] transition-all cursor-pointer">
            <IconRefresh className="w-4 h-4 shrink-0" /> Refresh data
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/admin/login') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#f87171]/70 hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all cursor-pointer">
            <IconLogout className="w-4 h-4 shrink-0" /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-[#0f1117]/80 backdrop-blur border-b border-[#2a2d35] px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold">{NAV.find(n => n.id === activeTab)?.label ?? activeTab}</h1>
            <p className="text-[#4a4e60] text-xs mt-0.5">
              {activeTab === 'overview'  && `${analytics.totalMerchants} merchants · ${analytics.totalOrders} orders · ${analytics.ordersToday} today`}
              {activeTab === 'merchants' && `${filteredMerchants.length} merchants`}
              {activeTab === 'products'  && `${allProducts.length} products`}
              {activeTab === 'orders'    && `${filteredOrders.length} of ${orders.length} orders · page ${ordersPage}/${totalPages||1}`}
              {activeTab === 'credits'   && `${allCreditRows.length} credit records`}
              {activeTab === 'payments'  && `${pendingCount} pending · ${paymentRequests.length} total`}
              {activeTab === 'wallets'       && `${adminWallets.filter(w=>w.is_active).length} active wallets`}
              {activeTab === 'missed-orders' && (() => { const u = abandonedCheckouts.filter(o=>!o.recovered); const pct = orders.length ? Math.round(u.length/(orders.length+u.length)*100) : 0; return `${u.length} unrecovered · ${pct}% miss rate` })()}
            </p>
          </div>
          <div className="text-xs text-[#4a4e60]">{new Date().toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })}</div>
        </header>

        <div className="p-8">

          {/* ════════════════ OVERVIEW ════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-5">

              {/* ── Filter bar ── */}
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl px-5 py-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <IconFilter className="w-3.5 h-3.5 text-[#4a4e60] shrink-0" />
                  {([['today','Today'],['yesterday','Yesterday'],['7d','7 days'],['30d','30 days'],['month','This month'],['all','All time'],['custom','Custom']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setOvPreset(v)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${ovPreset===v?'bg-[#3b82f6] border-[#3b82f6] text-white':'border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6]'}`}>
                      {l}
                    </button>
                  ))}
                  <div className="h-4 w-px bg-[#2a2d35] mx-1" />
                  <select value={ovMerchant} onChange={e => setOvMerchant(e.target.value)}
                    className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3b82f6]">
                    <option value="">All merchants</option>
                    {merchants.map(m => <option key={m.id} value={m.id}>{m.email}</option>)}
                  </select>
                  {ovMerchant && (
                    <button onClick={() => setOvMerchant('')} className="text-xs text-[#f87171] hover:text-white flex items-center gap-1 cursor-pointer">
                      <IconX className="w-3 h-3" /> Clear
                    </button>
                  )}
                  <span className="ml-auto text-[10px] text-[#4a4e60]">{analytics.ovOrders} orders in period</span>
                </div>

                {/* Custom date range row */}
                {ovPreset === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#2a2d35]">
                    <IconCalendar className="w-3.5 h-3.5 text-[#4a4e60] shrink-0" />
                    <span className="text-xs text-[#4a4e60]">From</span>
                    <input type="date" value={ovCustomFrom} onChange={e => setOvCustomFrom(e.target.value)}
                      className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3b82f6]" />
                    <span className="text-xs text-[#4a4e60]">to</span>
                    <input type="date" value={ovCustomTo} onChange={e => setOvCustomTo(e.target.value)}
                      min={ovCustomFrom}
                      className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3b82f6]" />
                    {(ovCustomFrom || ovCustomTo) && (
                      <button onClick={() => { setOvCustomFrom(''); setOvCustomTo('') }}
                        className="text-xs text-[#f87171] hover:text-white flex items-center gap-1 cursor-pointer">
                        <IconX className="w-3 h-3" /> Clear dates
                      </button>
                    )}
                    {ovCustomFrom && ovCustomTo && (
                      <span className="text-[10px] text-[#4ade80] ml-2">
                        {Math.round((new Date(ovCustomTo).getTime() - new Date(ovCustomFrom).getTime()) / 86400000) + 1} days selected
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ── KPI cards (period-aware) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label:'Orders',         now: analytics.ovOrders,      prev: analytics.pvOrders,       color:'#4ade80', glow:'#4ade8015' },
                  { label:'Mantoog revenue (EGP)', now: Math.round(analytics.ovRevenue), prev: Math.round(analytics.pvRevenue), color:'#fbbf24', glow:'#fbbf2415', fmt:(v:number)=>v.toLocaleString() },
                  { label:'New merchants',  now: analytics.ovMerchants,   prev: analytics.pvMerchants,    color:'#60a5fa', glow:'#3b82f615' },
                  { label:'Active merchants',now:analytics.ovActiveStores,prev: analytics.pvActiveStores, color:'#a78bfa', glow:'#a78bfa15' },
                ].map((k,i) => (
                  <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl" style={{ background: k.glow }} />
                    <div className="text-xs text-[#4a4e60] mb-2">{k.label}</div>
                    <div className="text-3xl font-bold tabular-nums mb-2" style={{ color: k.color }}>
                      {(k as any).fmt ? (k as any).fmt(k.now) : k.now}
                    </div>
                    {ovPreset !== 'all' && <Delta now={k.now} prev={k.prev} label="vs prev period" />}
                  </div>
                ))}
              </div>

              {/* ── Trend chart + Sales by country | Recent signups ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Left: chart + country data fills remaining height */}
                <div className="lg:col-span-2 bg-[#1a1d24] border border-[#2a2d35] rounded-2xl flex flex-col">
                  <div className="p-5 pb-3">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-medium text-sm">Orders over time</div>
                      <div className="flex gap-4 text-xs text-[#4a4e60]">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#4ade80] inline-block rounded" /> Orders</span>
                        {ovPreset !== 'today' && ovPreset !== 'yesterday' && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#60a5fa] inline-block rounded" /> Signups</span>}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={analytics.chartData} margin={{ left:4, right:4, top:4, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize:10, fill:'#4a4e60' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(analytics.chartData.length/7)-1)} />
                        <YAxis hide allowDecimals={false} />
                        <Tooltip contentStyle={{ background:'#1a1d24', border:'1px solid #2a2d35', borderRadius:8, fontSize:12 }} labelStyle={{ color:'#8b8fa8' }} />
                        <Line type="monotone" dataKey="orders" stroke="#4ade80" strokeWidth={2} dot={false} name="Orders" />
                        {ovPreset !== 'today' && ovPreset !== 'yesterday' && <Line type="monotone" dataKey="signups" stroke="#60a5fa" strokeWidth={2} dot={false} name="Signups" />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Sales by country fills the leftover space */}
                  <div className="flex-1 border-t border-[#2a2d35] px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-white">Sales by country</span>
                      <span className="text-[10px] text-[#4a4e60]">native currency</span>
                    </div>
                    {analytics.salesByCountry.length === 0
                      ? <div className="text-xs text-[#4a4e60]">No orders in period</div>
                      : <div className="space-y-2.5">
                          {analytics.salesByCountry.map(c => {
                            const maxRev = analytics.salesByCountry[0]?.revenue || 1
                            return (
                              <div key={c.currency} className="flex items-center gap-3">
                                <span className="text-base leading-none w-6 text-center shrink-0">{c.flag}</span>
                                <div className="w-24 shrink-0">
                                  <div className="text-xs text-white font-medium truncate">{c.country}</div>
                                  <div className="text-[10px] text-[#4a4e60]">{c.orders.toLocaleString()} orders</div>
                                </div>
                                <div className="flex-1 h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#fbbf24] rounded-full" style={{ width:`${(c.revenue/maxRev)*100}%` }} />
                                </div>
                                <div className="text-xs font-bold text-[#fbbf24] tabular-nums shrink-0 text-right w-32">
                                  {c.revenue.toLocaleString()} <span className="text-[#4a4e60] font-normal text-[10px]">{c.currency}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                    }
                  </div>
                </div>

                {/* Right: Top merchants by orders (follows overview filter) */}
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#2a2d35] flex items-center justify-between">
                    <span className="font-medium text-sm flex items-center gap-2"><IconBarChart className="w-4 h-4 text-[#4ade80]" /> Top merchants</span>
                    <span className="text-[10px] text-[#4a4e60]">by orders in period</span>
                  </div>
                  {analytics.topMerchants.length === 0
                    ? <div className="p-8 text-center text-xs text-[#4a4e60]">No orders in period</div>
                    : analytics.topMerchants.map((m, i) => {
                        const max = analytics.topMerchants[0]?.count || 1
                        return (
                          <div key={m.mid} className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                            <span className="text-xs text-[#4a4e60] w-4 text-center font-mono shrink-0">{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-white truncate">{m.email}</div>
                              <div className="mt-1.5 h-1 bg-[#0f1117] rounded-full overflow-hidden">
                                <div className="h-full bg-[#3b82f6] rounded-full" style={{ width:`${(m.count/max)*100}%` }} />
                              </div>
                            </div>
                            <span className="text-sm font-bold text-[#4ade80] tabular-nums shrink-0">{m.count}</span>
                          </div>
                        )
                      })
                  }
                </div>
              </div>

              {/* ── Credit health + Peak hours ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Credit health */}
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5">
                  <div className="font-medium text-sm mb-1">Credit health</div>
                  <div className="text-xs text-[#4a4e60] mb-5">All merchants · current credit balance</div>
                  <div className="space-y-3">
                    {[
                      { label:'No credits left',  count: analytics.creditHealth.zero,    color:'#ef4444', bg:'#ef444415', desc:'Burned out' },
                      { label:'Critical (1–10)',   count: analytics.creditHealth.low,     color:'#f87171', bg:'#f8717115', desc:'Needs urgent top-up' },
                      { label:'Low (11–100)',      count: analytics.creditHealth.medium,  color:'#fbbf24', bg:'#fbbf2415', desc:'Worth monitoring' },
                      { label:'Healthy (100+)',    count: analytics.creditHealth.healthy, color:'#4ade80', bg:'#4ade8015', desc:'Good to go' },
                      { label:'No record yet',    count: analytics.creditHealth.none,    color:'#4a4e60', bg:'#4a4e6015', desc:'Never purchased' },
                    ].map(row => {
                      const total = analytics.totalMerchants || 1
                      const pct   = Math.round(row.count / total * 100)
                      return (
                        <div key={row.label}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-[#8b8fa8]">{row.label}</span>
                            <span className="font-bold tabular-nums" style={{ color: row.color }}>{row.count} <span className="text-[#4a4e60] font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${pct}%`, background: row.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#2a2d35] flex items-center justify-between">
                    <span className="text-xs text-[#4a4e60]">{analytics.creditHealth.zero + analytics.creditHealth.low} merchants need attention</span>
                    <button onClick={() => setActiveTab('credits')}
                      className="text-xs text-[#60a5fa] hover:underline cursor-pointer">Manage credits →</button>
                  </div>
                </div>

                {/* Peak hours */}
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5">
                  <div className="font-medium text-sm mb-1">Peak order hours</div>
                  <div className="text-xs text-[#4a4e60] mb-4">When orders are placed · filtered by period</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={analytics.hourlyData} barSize={8}>
                      <XAxis dataKey="hour" tick={{ fontSize:9, fill:'#4a4e60' }} tickLine={false} axisLine={false} interval={2} />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip contentStyle={{ background:'#1a1d24', border:'1px solid #2a2d35', borderRadius:8, fontSize:12 }} labelStyle={{ color:'#8b8fa8' }} cursor={{ fill:'#ffffff08' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[2,2,0,0]} name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                  {(() => {
                    const peak = analytics.hourlyData.reduce((m,h) => h.count>m.count?h:m, analytics.hourlyData[0])
                    return peak?.count > 0
                      ? <div className="mt-3 text-xs text-[#4a4e60]">Peak: <span className="text-white font-medium">{peak.hour}</span> · <span className="text-[#4ade80] font-bold">{peak.count}</span> orders</div>
                      : <div className="mt-3 text-xs text-[#4a4e60]">No orders in this period</div>
                  })()}
                </div>
              </div>

              {/* ── New merchants + Low credits ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#2a2d35] flex items-center justify-between">
                    <span className="font-medium text-sm">New merchants</span>
                    <span className="text-xs font-bold text-[#60a5fa] bg-[#3b82f6]/10 px-2 py-0.5 rounded-full">{analytics.recentSignups.length}</span>
                  </div>
                  {analytics.recentSignups.length === 0
                    ? <div className="p-8 text-center text-xs text-[#4a4e60]">No signups in period</div>
                    : <div className="divide-y divide-[#2a2d35]">
                        {analytics.recentSignups.map(m => (
                          <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#1f2229] transition-colors">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b82f6]/20 to-[#7c5cff]/20 border border-[#3b82f6]/15 flex items-center justify-center text-[10px] font-bold text-[#60a5fa] shrink-0">
                              {m.email?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-white truncate">{m.email}</div>
                              <div className="text-[10px] text-[#4a4e60] truncate">{m.stores?.[0]?.name || 'No store yet'}</div>
                            </div>
                            <div className="text-[10px] text-[#4a4e60] shrink-0">{fmtShort(m.created_at)}</div>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                <div className="space-y-4">
                  {analytics.lowCredits.length > 0 && (
                    <div className="bg-[#f87171]/5 border border-[#f87171]/20 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-[#f87171]/15 flex items-center gap-2 text-[#f87171] text-sm font-semibold">
                        <IconAlert className="w-4 h-4" /> Low credits ({analytics.lowCredits.length})
                      </div>
                      {analytics.lowCredits.slice(0,5).map(m => (
                        <div key={m.id} className="flex items-center justify-between px-5 py-3 border-b border-[#f87171]/10 last:border-0 hover:bg-[#f87171]/5 transition-colors">
                          <div>
                            <div className="text-xs text-white">{m.email}</div>
                            <div className="text-[10px] text-[#4a4e60]">{m.stores?.[0]?.name || 'No store'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#f87171]">{m.order_credits?.[0]?.credits_remaining ?? 0}</span>
                            <button onClick={() => { setSelectedMerchant(m); setActiveTab('credits') }}
                              className="text-[10px] bg-[#3b82f6] hover:bg-[#2563eb] text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer">
                              + Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 grid grid-cols-2 gap-4">
                    {[
                      { label:'Total merchants', v: analytics.totalMerchants, c:'#60a5fa' },
                      { label:'Stores created',  v: analytics.activeStores,   c:'#4ade80' },
                      { label:'All-time orders', v: analytics.totalOrders,    c:'#fbbf24' },
                      { label:'Delivery rate',   v: `${analytics.deliveryRate}%`, c:'#a78bfa' },
                    ].map((k,i) => (
                      <div key={i}>
                        <div className="text-[10px] text-[#4a4e60] mb-1">{k.label}</div>
                        <div className="text-xl font-bold tabular-nums" style={{ color: k.c }}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ MERCHANTS ════════════════ */}
          {activeTab === 'merchants' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4e60]" />
                  <input value={merchantSearch} onChange={e => setMerchantSearch(e.target.value)} placeholder="Search by email or store..."
                    className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] w-64" />
                </div>
                <div className="flex items-center gap-1.5 ml-auto text-xs text-[#4a4e60]">
                  Sort:
                  {([['joined','Joined'],['orders_today','Orders today'],['orders_month','This month'],['credits','Credits']] as const).map(([k,l]) => (
                    <button key={k} onClick={() => setMerchantSortKey(k)}
                      className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${merchantSortKey===k?'bg-[#3b82f6] border-[#3b82f6] text-white':'border-[#2a2d35] text-[#4a4e60] hover:text-white'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ minWidth: 900 }}>
                    <thead>
                      <tr className="border-b border-[#2a2d35]">
                        {['Merchant','Store','Today','Month','Credits left','Used','Last order','Joined','Actions'].map(h => (
                          <th key={h} className="text-left px-5 py-3.5 text-xs text-[#4a4e60] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMerchants.map(m => {
                        const credits = m.order_credits?.[0]
                        const store   = m.stores?.[0]
                        const ost     = analytics.merchantOrderStats[m.id] || { today:0, month:0, last:'' }
                        const activeToday = ost.today > 0
                        return (
                          <tr key={m.id} className="border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6]/20 to-[#7c5cff]/20 border border-[#3b82f6]/15 flex items-center justify-center text-xs font-bold text-[#60a5fa] shrink-0">
                                  {m.email?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm text-white">{m.email}</div>
                                  {activeToday && <span className="text-[9px] font-bold text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded-full">active today</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-[#8b8fa8]">{store?.name || <span className="text-[#f87171]/60 text-xs">No store</span>}</td>
                            <td className="px-5 py-4 text-sm font-bold tabular-nums" style={{ color: ost.today > 0 ? '#4ade80' : '#4a4e60' }}>{ost.today}</td>
                            <td className="px-5 py-4 text-sm font-bold tabular-nums text-[#fbbf24]">{ost.month}</td>
                            <td className="px-5 py-4">
                              <span className={`text-sm font-bold tabular-nums ${(credits?.credits_remaining ?? 0) <= 10 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                                {credits?.credits_remaining ?? 0}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-[#8b8fa8] tabular-nums">{credits?.credits_used ?? 0}</td>
                            <td className="px-5 py-4 text-xs text-[#4a4e60]">{ost.last ? fmtShort(ost.last) : <span className="text-[#2a2d35]">—</span>}</td>
                            <td className="px-5 py-4 text-xs text-[#4a4e60]">{fmtDate(m.created_at)}</td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <button onClick={() => { setSelectedMerchant(m); setActiveTab('credits') }}
                                  className="text-xs bg-[#3b82f6]/10 hover:bg-[#3b82f6] border border-[#3b82f6]/30 hover:border-[#3b82f6] text-[#60a5fa] hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                                  + Credits
                                </button>
                                <button onClick={() => loadMerchantProducts(m)}
                                  className="text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
                                  <IconEye className="w-3.5 h-3.5" /> Products
                                </button>
                                <button onClick={() => { setOrderMerchantFilter(m.id); setActiveTab('orders') }}
                                  className="text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
                                  <IconCart className="w-3.5 h-3.5" /> Orders
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ PRODUCTS ════════════════ */}
          {activeTab === 'products' && (() => {
            const maxPrice = Math.max(...allProducts.map(p => Number(p.price)||0), 100)
            const effectivePriceMax = productPriceMax >= 999999 ? maxPrice : productPriceMax
            const filtered = allProducts.filter(p => {
              const price    = Number(p.price) || 0
              const merchant = merchants.find(m => m.stores?.[0]?.id === p.store_id)
              if (productSearch) {
                const q = productSearch.toLowerCase()
                if (!p.title?.toLowerCase().includes(q) && !p.stores?.name?.toLowerCase().includes(q) && !merchant?.email?.toLowerCase().includes(q)) return false
              }
              if (productMerchantFilter && merchant?.id !== productMerchantFilter) return false
              if (productDateFrom && new Date(p.created_at) < new Date(productDateFrom + 'T00:00:00')) return false
              if (productDateTo   && new Date(p.created_at) > new Date(productDateTo+'T23:59:59')) return false
              if (price < productPriceMin) return false
              if (productPriceMax < 999999 && price > productPriceMax) return false
              return true
            })
            const hasFilter = productSearch || productMerchantFilter || productDateFrom || productDateTo || productPriceMin > 0 || productPriceMax < 999999
            const leftPct  = (productPriceMin / maxPrice) * 100
            const rightPct = (Math.min(effectivePriceMax, maxPrice) / maxPrice) * 100
            return (
              <div className="space-y-4">
                {/* Filter bar */}
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                      <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4e60]" />
                      <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search product or merchant..."
                        className="bg-[#0f1117] border border-[#2a2d35] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] w-56" />
                    </div>
                    <select value={productMerchantFilter} onChange={e => setProductMerchantFilter(e.target.value)}
                      className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]">
                      <option value="">All merchants</option>
                      {merchants.map(m => <option key={m.id} value={m.id}>{m.email} ({m.stores?.[0]?.name||'no store'})</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <IconCalendar className="w-4 h-4 text-[#4a4e60] shrink-0" />
                      <input type="date" value={productDateFrom} onChange={e => setProductDateFrom(e.target.value)}
                        className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                      <span className="text-xs text-[#4a4e60]">to</span>
                      <input type="date" value={productDateTo} onChange={e => setProductDateTo(e.target.value)} min={productDateFrom}
                        className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                    </div>
                    {hasFilter && (
                      <button onClick={() => { setProductSearch(''); setProductMerchantFilter(''); setProductDateFrom(''); setProductDateTo(''); setProductPriceMin(0); setProductPriceMax(999999) }}
                        className="flex items-center gap-1 text-xs text-[#f87171] hover:text-white border border-[#f87171]/20 hover:bg-[#3a1414] px-2.5 py-2 rounded-xl transition-colors cursor-pointer">
                        <IconX className="w-3.5 h-3.5" /> Clear
                      </button>
                    )}
                    <span className="ml-auto text-xs text-[#4a4e60]">{filtered.length} of {allProducts.length} products</span>
                  </div>

                  {/* Price range slider */}
                  <div className="flex items-center gap-5">
                    <span className="text-xs text-[#4a4e60] shrink-0 w-20">Price range</span>
                    <div className="flex-1 relative" style={{ paddingTop: 2, paddingBottom: 2 }}>
                      {/* Track */}
                      <div className="h-1.5 w-full bg-[#2a2d35] rounded-full relative">
                        <div className="absolute h-full bg-[#3b82f6] rounded-full" style={{ left:`${leftPct}%`, right:`${100-rightPct}%` }} />
                      </div>
                      {/* Invisible range inputs for interaction */}
                      <input type="range" min={0} max={maxPrice} step={Math.max(1,Math.floor(maxPrice/200))}
                        value={productPriceMin}
                        onChange={e => setProductPriceMin(Math.min(Number(e.target.value), effectivePriceMax-1))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" style={{ zIndex: productPriceMin > maxPrice*0.7 ? 5 : 3 }} />
                      <input type="range" min={0} max={maxPrice} step={Math.max(1,Math.floor(maxPrice/200))}
                        value={effectivePriceMax}
                        onChange={e => { const v=Number(e.target.value); setProductPriceMax(Math.max(v, productPriceMin+1)) }}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" style={{ zIndex: 4 }} />
                      {/* Visual thumbs */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#3b82f6] border-2 border-[#0c0e14] rounded-full pointer-events-none shadow-lg" style={{ left:`calc(${leftPct}% - 8px)` }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#3b82f6] border-2 border-[#0c0e14] rounded-full pointer-events-none shadow-lg" style={{ left:`calc(${rightPct}% - 8px)` }} />
                    </div>
                    <div className="text-xs text-white font-medium shrink-0 tabular-nums w-32 text-right">
                      {productPriceMin.toLocaleString()} – {productPriceMax >= 999999 ? `${maxPrice.toLocaleString()}+` : effectivePriceMax.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: 800 }}>
                      <thead>
                        <tr className="border-b border-[#2a2d35]">
                          {['Product','Store','Merchant','Price','Status','Visits','Date',''].map(h => (
                            <th key={h} className="text-left px-5 py-3.5 text-xs text-[#4a4e60] uppercase tracking-wider font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(p => {
                          const visits   = p.landing_pages?.[0]?.visits || 0
                          const merchant = merchants.find(m => m.stores?.[0]?.id === p.store_id)
                          return (
                            <tr key={p.id} className="border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-[#0f1117] shrink-0 overflow-hidden border border-[#2a2d35]">
                                    {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-contain p-0.5" /> : <div className="w-full h-full flex items-center justify-center text-[#2a2d35]"><IconBox className="w-4 h-4" /></div>}
                                  </div>
                                  <div><div className="text-sm font-medium text-white truncate max-w-[180px]">{p.title}</div><div className="text-xs text-[#4a4e60] font-mono">{p.id.slice(0,8)}…</div></div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-xs text-[#8b8fa8]">{p.stores?.name||'—'}</td>
                              <td className="px-5 py-4 text-xs text-[#8b8fa8]">{merchant?.email||'—'}</td>
                              <td className="px-5 py-4 text-sm font-bold text-white tabular-nums">{p.price} <span className="text-[#4a4e60] font-normal text-xs">{p.currency}</span></td>
                              <td className="px-5 py-4"><span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${p.status==='active'?'bg-[#14321f] text-[#4ade80]':p.status==='draft'?'bg-[#1f2229] text-[#8b8fa8]':'bg-[#3a1414] text-[#f87171]'}`}>{p.status}</span></td>
                              <td className="px-5 py-4 text-sm font-bold text-[#60a5fa] tabular-nums">{visits}</td>
                              <td className="px-5 py-4 text-xs text-[#4a4e60]">{fmtShort(p.created_at)}</td>
                              <td className="px-5 py-4"><a href={`/${p.stores?.slug}/${p.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-[#60a5fa] hover:text-white transition-colors"><IconEye className="w-3.5 h-3.5" /></a></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filtered.length === 0 && <div className="p-12 text-center text-sm text-[#4a4e60]">No products match the current filters</div>}
                </div>
              </div>
            )
          })()}

          {/* ════════════════ ORDERS ════════════════ */}
          {activeTab === 'orders' && (
            <div className="space-y-4">

              {/* Filters row */}
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4e60]" />
                    <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Customer, phone, store, product..."
                      className="bg-[#0f1117] border border-[#2a2d35] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] w-56" />
                  </div>
                  <select value={orderMerchantFilter} onChange={e => setOrderMerchantFilter(e.target.value)}
                    className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]">
                    <option value="">All merchants</option>
                    {merchants.map(m => <option key={m.id} value={m.id}>{m.email} ({m.stores?.[0]?.name || 'no store'})</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <IconCalendar className="w-4 h-4 text-[#4a4e60] shrink-0" />
                    <input type="date" value={orderDateFrom} onChange={e => setOrderDateFrom(e.target.value)}
                      className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                    <span className="text-[#4a4e60] text-xs">to</span>
                    <input type="date" value={orderDateTo} onChange={e => setOrderDateTo(e.target.value)}
                      className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                    {(orderDateFrom || orderDateTo || orderMerchantFilter || orderSearch) && (
                      <button onClick={() => { setOrderDateFrom(''); setOrderDateTo(''); setOrderMerchantFilter(''); setOrderSearch('') }}
                        className="text-xs text-[#f87171] hover:text-white border border-[#f87171]/20 hover:bg-[#3a1414] px-2.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1">
                        <IconX className="w-3.5 h-3.5" /> Clear
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button onClick={exportOrdersCSV} className="flex items-center gap-1.5 text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-2 rounded-xl transition-colors cursor-pointer">
                      <IconDownload className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button onClick={exportOrdersExcel} className="flex items-center gap-1.5 text-xs bg-[#14321f] hover:bg-[#1a4a2a] border border-[#4ade80]/20 text-[#4ade80] px-3 py-2 rounded-xl transition-colors cursor-pointer">
                      <IconDownload className="w-3.5 h-3.5" /> Excel
                    </button>
                  </div>
                </div>
                {/* Status chips */}
                <div className="flex gap-1.5 flex-wrap">
                  {['all','pending','confirmed','shipped','delivered','cancelled','returned'].map(s => (
                    <button key={s} onClick={() => setOrderStatusFilter(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors capitalize cursor-pointer ${orderStatusFilter===s?'bg-[#3b82f6] border-[#3b82f6] text-white':'border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary stats strip */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { label:'Total',     v: orderSummary.total,     c:'#8b8fa8' },
                  { label:'Delivered', v: orderSummary.delivered, c:'#4ade80' },
                  { label:'Confirmed', v: orderSummary.confirmed, c:'#34d399' },
                  { label:'Shipped',   v: orderSummary.shipped,   c:'#60a5fa' },
                  { label:'Pending',   v: orderSummary.pending,   c:'#fbbf24' },
                  { label:'Cancelled', v: orderSummary.cancelled, c:'#f87171' },
                ].map(k => (
                  <div key={k.label} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-3 py-2.5 text-center">
                    <div className="text-[10px] text-[#4a4e60] mb-1">{k.label}</div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>

              {/* Missed orders contribution strip */}
              {(() => {
                const unrecovered = abandonedCheckouts.filter(o => !o.recovered)
                const filteredMissed = unrecovered.filter(o => {
                  if (orderMerchantFilter && o.merchant_id !== orderMerchantFilter) return false
                  if (orderDateFrom && new Date(o.created_at) < new Date(orderDateFrom + 'T00:00:00')) return false
                  if (orderDateTo   && new Date(o.created_at) > new Date(orderDateTo + 'T23:59:59')) return false
                  return true
                })
                const totalOpportunity = filteredOrders.length + filteredMissed.length
                const missRate = totalOpportunity > 0 ? Math.round(filteredMissed.length / totalOpportunity * 100) : 0
                const convRate = totalOpportunity > 0 ? Math.round(filteredOrders.length / totalOpportunity * 100) : 0
                const estLost  = filteredMissed.reduce((s, o) => s + (Number(o.total_price) || 0), 0)
                return (
                  <div className="bg-[#1a1d24] border border-[#fbbf24]/20 rounded-xl p-4 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 text-xs text-[#fbbf24] font-semibold">
                      <IconAlert className="w-4 h-4" /> Missed Orders Impact
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <div className="h-2 flex-1 rounded-full bg-[#0f1117] overflow-hidden flex">
                        <div className="h-full bg-[#4ade80] rounded-l-full transition-all" style={{ width: `${convRate}%` }} />
                        <div className="h-full bg-[#fbbf24]" style={{ width: `${missRate}%` }} />
                      </div>
                      <span className="text-xs text-[#4ade80] font-bold whitespace-nowrap">{convRate}% submitted</span>
                      <span className="text-xs text-[#fbbf24] font-bold whitespace-nowrap">{missRate}% missed</span>
                    </div>
                    <div className="flex gap-6 text-xs shrink-0">
                      <div className="text-center">
                        <div className="text-[#4a4e60] mb-0.5">Missed (filter)</div>
                        <div className="font-bold text-[#fbbf24] text-base">{filteredMissed.length}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[#4a4e60] mb-0.5">Est. Revenue Lost</div>
                        <div className="font-bold text-[#f87171] text-base">{estLost.toLocaleString()}</div>
                      </div>
                      <button onClick={() => setActiveTab('missed-orders')}
                        className="text-xs text-[#60a5fa] hover:underline self-center cursor-pointer whitespace-nowrap">
                        View all →
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Table */}
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ minWidth: 900 }}>
                    <thead>
                      <tr className="border-b border-[#2a2d35]">
                        {['Store','Product','Customer','Phone','Address','Amount','Status','Date','Map',...ORDER_ATTRIBUTION_FIELDS.map(f => ORDER_ATTRIBUTION_LABELS[f])].map(h => (
                          <th key={h} className="text-left px-4 py-3.5 text-xs text-[#4a4e60] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedOrders.map(o => (
                        <tr key={o.id} className="border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                          <td className="px-4 py-3.5 text-xs text-[#8b8fa8] whitespace-nowrap">{o.stores?.name||'—'}</td>
                          <td className="px-4 py-3.5 text-xs text-[#8b8fa8] whitespace-nowrap max-w-[160px] truncate">
                            {o.products?.title||'—'}{o.upsell_item&&<span className="text-[#a78bfa]"> +{o.upsell_item.product_title}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-white whitespace-nowrap">{o.customer_name||'—'}</td>
                          <td className="px-4 py-3.5 text-xs text-[#8b8fa8] font-mono whitespace-nowrap">{o.customer_phone||'—'}</td>
                          <td className="px-4 py-3.5 text-xs text-[#8b8fa8] max-w-[140px] truncate">{[o.address_line1,o.address_governorate].filter(Boolean).join(', ')||'—'}</td>
                          <td className="px-4 py-3.5 text-sm font-bold text-[#4ade80] whitespace-nowrap tabular-nums">{o.total_price} {o.stores?.currency||''}</td>
                          <td className="px-4 py-3.5"><span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${statusBadge(o.status)}`}>{o.status}</span></td>
                          <td className="px-4 py-3.5 text-xs text-[#4a4e60] whitespace-nowrap">{new Date(o.created_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                          <td className="px-4 py-3.5">{o.map_link ? <a href={o.map_link} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6]"><IconMap className="w-3.5 h-3.5" /></a> : <span className="text-[#2a2d35]">—</span>}</td>
                          {ORDER_ATTRIBUTION_FIELDS.map(f => (
                            <td key={f} className="px-4 py-3.5 text-xs text-[#8b8fa8] max-w-[140px] truncate" title={o[f]??''}>{o[f]||'—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-[#2a2d35]">
                    <div className="text-xs text-[#4a4e60]">
                      Showing {(ordersPage-1)*ORDERS_PER_PAGE+1}–{Math.min(ordersPage*ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setOrdersPage(1)} disabled={ordersPage===1}
                        className="px-2 py-1.5 rounded-lg border border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs">
                        «
                      </button>
                      <button onClick={() => setOrdersPage(p => Math.max(1, p-1))} disabled={ordersPage===1}
                        className="p-1.5 rounded-lg border border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                        <IconChevL className="w-4 h-4" />
                      </button>
                      {/* Page number pills */}
                      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                        let page: number
                        if (totalPages <= 7) page = i + 1
                        else if (ordersPage <= 4) page = i + 1
                        else if (ordersPage >= totalPages - 3) page = totalPages - 6 + i
                        else page = ordersPage - 3 + i
                        return (
                          <button key={page} onClick={() => setOrdersPage(page)}
                            className={`w-8 h-8 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${ordersPage===page?'bg-[#3b82f6] border-[#3b82f6] text-white':'border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6]'}`}>
                            {page}
                          </button>
                        )
                      })}
                      <button onClick={() => setOrdersPage(p => Math.min(totalPages, p+1))} disabled={ordersPage===totalPages}
                        className="p-1.5 rounded-lg border border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                        <IconChevR className="w-4 h-4" />
                      </button>
                      <button onClick={() => setOrdersPage(totalPages)} disabled={ordersPage===totalPages}
                        className="px-2 py-1.5 rounded-lg border border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs">
                        »
                      </button>
                    </div>
                  </div>
                )}
                {pagedOrders.length === 0 && (
                  <div className="p-14 text-center text-sm text-[#4a4e60]">No orders match the current filters</div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════ CREDITS ════════════════ */}
          {activeTab === 'credits' && (() => {
            const enriched = allCreditRows.map(c => ({ ...c, email: merchantsMap[c.merchant_id]?.email??'—', storeName: merchants.find(m=>m.id===c.merchant_id)?.stores?.[0]?.name??'—' }))
            const filtered = enriched.filter(c => !creditSearch || c.email.toLowerCase().includes(creditSearch.toLowerCase()) || c.storeName.toLowerCase().includes(creditSearch.toLowerCase()))
            const totalGranted = enriched.reduce((s,c) => s+(c.credits_total??0),0)
            const totalUsed    = enriched.reduce((s,c) => s+(c.credits_used??0),0)
            const totalRevenue = enriched.reduce((s,c) => s+(Number(c.price_paid)||0),0)
            return (
              <div className="space-y-6">
                {creditSuccess && <div className="bg-[#14321f] border border-[#4ade80]/20 rounded-2xl p-4 text-[#4ade80] text-sm font-medium flex items-center gap-2"><IconCheck className="w-4 h-4" /> Credits added successfully!</div>}
                <div className="grid grid-cols-3 gap-4">
                  {[{ label:'Total granted', v:totalGranted.toLocaleString(), c:'#4ade80' },{ label:'Total used', v:totalUsed.toLocaleString(), c:'#fbbf24' },{ label:'Revenue (EGP)', v:Number(totalRevenue).toLocaleString(), c:'#60a5fa' }].map((k,i) => (
                    <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5">
                      <div className="text-xs text-[#4a4e60] mb-2">{k.label}</div>
                      <div className="text-2xl font-bold tabular-nums" style={{ color: k.c }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 space-y-4 self-start">
                    <h3 className="font-semibold text-sm">Add credits manually</h3>
                    <div>
                      <label className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1.5 block">Merchant</label>
                      <select value={selectedMerchant?.id||''} onChange={e => setSelectedMerchant(merchants.find(m=>m.id===e.target.value)||null)}
                        className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]">
                        <option value="">— Select —</option>
                        {merchants.map(m => <option key={m.id} value={m.id}>{m.email} ({m.order_credits?.[0]?.credits_remaining??0} left)</option>)}
                      </select>
                    </div>
                    {selectedMerchant && (
                      <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                        {[['Left','credits_remaining','#4ade80'],['Used','credits_used','#fbbf24'],['Total','credits_total','#60a5fa']].map(([l,k,c]:any) => (
                          <div key={l}><div className="text-[10px] text-[#4a4e60] mb-1">{l}</div><div className="font-bold text-sm" style={{color:c}}>{selectedMerchant.order_credits?.[0]?.[k]??0}</div></div>
                        ))}
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1.5 block">Amount</label>
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {[100,500,1000,2000,5000].map(n => (
                          <button key={n} onClick={()=>setCreditAmount(String(n))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${creditAmount===String(n)?'bg-[#3b82f6] border-[#3b82f6] text-white':'border-[#2a2d35] text-[#4a4e60] hover:border-[#3b82f6] hover:text-white'}`}>
                            +{n.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <input type="number" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)} placeholder="Custom amount"
                        className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                    </div>
                    <button onClick={handleAddCredits} disabled={!selectedMerchant||!creditAmount||addingCredits}
                      className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer">
                      {addingCredits?'Adding…':`Add ${creditAmount?parseInt(creditAmount).toLocaleString():'0'} credits`}
                    </button>
                  </div>
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4e60]" />
                        <input value={creditSearch} onChange={e=>setCreditSearch(e.target.value)} placeholder="Search merchant or store…"
                          className="w-full bg-[#1a1d24] border border-[#2a2d35] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]" />
                      </div>
                      <span className="text-xs text-[#4a4e60] whitespace-nowrap">{filtered.length} records</span>
                    </div>
                    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full" style={{ minWidth: 600 }}>
                          <thead>
                            <tr className="border-b border-[#2a2d35]">
                              {['Merchant','Store','Granted','Used','Remaining','Type','Paid EGP','Date'].map(h => (
                                <th key={h} className="text-left px-4 py-3.5 text-xs text-[#4a4e60] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.slice(0,100).map((c:any) => (
                              <tr key={c.id} className="border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                                <td className="px-4 py-3.5 text-sm text-white">{c.email}</td>
                                <td className="px-4 py-3.5 text-xs text-[#8b8fa8]">{c.storeName}</td>
                                <td className="px-4 py-3.5 text-sm font-bold text-[#4ade80] tabular-nums">+{(c.credits_total??0).toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-sm text-[#fbbf24] tabular-nums">{(c.credits_used??0).toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-sm tabular-nums" style={{color:(c.credits_remaining??0)<=10?'#f87171':'#8b8fa8'}}>{(c.credits_remaining??0).toLocaleString()}</td>
                                <td className="px-4 py-3.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bundle_type==='free'?'bg-[#a78bfa]/15 text-[#a78bfa]':'bg-[#3b82f6]/15 text-[#60a5fa]'}`}>{c.bundle_type==='free'?'Free':c.bundle_type??'custom'}</span></td>
                                <td className="px-4 py-3.5 text-sm text-white tabular-nums">{Number(c.price_paid)>0?Number(c.price_paid).toLocaleString():<span className="text-[#4a4e60]">—</span>}</td>
                                <td className="px-4 py-3.5 text-xs text-[#4a4e60] whitespace-nowrap">{fmtDate(c.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {filtered.length === 0 && <div className="p-10 text-center text-xs text-[#4a4e60]">No records</div>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ════════════════ PAYMENTS ════════════════ */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['pending','approved','rejected','all'] as const).map(f => {
                  const count = f==='all'?paymentRequests.length:paymentRequests.filter(r=>r.status===f).length
                  return (
                    <button key={f} onClick={()=>setPaymentFilter(f)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors capitalize cursor-pointer flex items-center gap-2 ${paymentFilter===f?'bg-[#3b82f6] border-[#3b82f6] text-white':'border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6]'}`}>
                      {f} <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${paymentFilter===f?'bg-white/20':'bg-[#2a2d35]'}`}>{count}</span>
                    </button>
                  )
                })}
                <button onClick={async()=>{ const r=await fetch('/api/admin/payment-requests'); if(r.ok) setPaymentRequests((await r.json()).requests??[]) }}
                  className="ml-auto flex items-center gap-1.5 text-xs text-[#4a4e60] hover:text-white border border-[#2a2d35] px-3 py-2 rounded-xl transition-colors cursor-pointer">
                  <IconRefresh className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              {paymentRequests.filter(r=>paymentFilter==='all'||r.status===paymentFilter).length===0
                ? <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-14 text-center"><IconMoney className="w-8 h-8 text-[#2a2d35] mx-auto mb-3" /><div className="text-[#4a4e60] text-sm">No {paymentFilter==='all'?'':paymentFilter} requests</div></div>
                : <div className="space-y-3">
                    {paymentRequests.filter(r=>paymentFilter==='all'||r.status===paymentFilter).map(req => {
                      const merchant  = merchantsMap[req.merchant_id]
                      const isPending = req.status === 'pending'
                      const sc = req.status==='pending'?{color:'#f59e0b',bg:'#f59e0b15',border:'#f59e0b30'}:req.status==='approved'?{color:'#4ade80',bg:'#4ade8015',border:'#4ade8030'}:{color:'#f87171',bg:'#f8717115',border:'#f8717130'}
                      return (
                        <div key={req.id} className="bg-[#1a1d24] border rounded-2xl overflow-hidden" style={{ borderColor: sc.border }}>
                          <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                            <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background:sc.bg, color:sc.color }}>{req.status.toUpperCase()}</span>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div><div className="text-[#4a4e60] mb-0.5">Merchant</div><div className="text-white font-medium truncate">{merchant?.email??req.merchant_id.slice(0,8)+'…'}</div></div>
                              <div><div className="text-[#4a4e60] mb-0.5">Type</div><div className="text-white font-medium">{req.item_type==='credits'?`${(req.credits_amount??0).toLocaleString()} orders`:`Sub · ${req.sub_plan}`}</div></div>
                              <div><div className="text-[#4a4e60] mb-0.5">Amount</div><div className="text-[#fbbf24] font-bold">{req.amount_egp} EGP</div></div>
                              <div><div className="text-[#4a4e60] mb-0.5">Wallet</div><div className="text-white capitalize">{req.payment_method}</div></div>
                            </div>
                            <div className="text-xs text-[#4a4e60]">{new Date(req.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                          </div>
                          <div className="border-t border-[#2a2d35] px-6 py-3.5 flex flex-wrap items-center gap-3">
                            {req.proof_url ? (
                              <button onClick={()=>setViewingProof(req.proof_url)} className="flex items-center gap-1.5 text-xs text-[#60a5fa] hover:text-white border border-[#3b82f6]/20 hover:border-[#3b82f6] px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                                <IconEye className="w-3.5 h-3.5" /> View proof
                              </button>
                            ) : <span className="text-xs text-[#4a4e60]">No proof</span>}
                            {req.merchant_notes && <div className="text-xs text-[#8b8fa8] bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-1.5 flex-1">"{req.merchant_notes}"</div>}
                            {isPending && (
                              <div className="flex items-center gap-2 ml-auto">
                                <input value={adminNotes[req.id]??''} onChange={e=>setAdminNotes(p=>({...p,[req.id]:e.target.value}))} placeholder="Admin note (optional)"
                                  className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] w-44" />
                                <button onClick={()=>processPayment(req.id,'approve')} disabled={processingPayment===req.id}
                                  className="flex items-center gap-1.5 text-xs bg-[#14321f] hover:bg-[#4ade80] border border-[#4ade80]/30 hover:border-[#4ade80] text-[#4ade80] hover:text-[#0f1117] font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                                  <IconCheck className="w-3.5 h-3.5" /> {processingPayment===req.id?'…':'Approve'}
                                </button>
                                <button onClick={()=>processPayment(req.id,'reject')} disabled={processingPayment===req.id}
                                  className="flex items-center gap-1.5 text-xs bg-[#3a1414] hover:bg-[#f87171] border border-[#f87171]/30 hover:border-[#f87171] text-[#f87171] hover:text-white font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                                  <IconX className="w-3.5 h-3.5" /> {processingPayment===req.id?'…':'Reject'}
                                </button>
                              </div>
                            )}
                            {!isPending && (
                              <div className="text-xs text-[#4a4e60] ml-auto">
                                {req.processed_at?new Date(req.processed_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}
                                {req.admin_notes&&<div className="text-[#8b8fa8] mt-0.5">"{req.admin_notes}"</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
              }
            </div>
          )}

          {/* ════════════════ WALLETS ════════════════ */}
          {activeTab === 'wallets' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6">
                <h3 className="font-semibold text-sm mb-5">Add wallet</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1.5 block">Display name</label>
                    <input value={newWallet.label} onChange={e=>setNewWallet(p=>({...p,label:e.target.value}))} placeholder="e.g. Vodafone Cash"
                      className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1.5 block">Number</label>
                    <input value={newWallet.number} onChange={e=>setNewWallet(p=>({...p,number:e.target.value}))} placeholder="01xxxxxxxxx" dir="ltr"
                      className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1.5 block">Type</label>
                    <select value={newWallet.wallet_type} onChange={e=>setNewWallet(p=>({...p,wallet_type:e.target.value}))}
                      className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]">
                      {['vodafone','instapay','fawry','orange','etisalat'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={addWallet} disabled={!newWallet.label||!newWallet.number||savingWallet}
                  className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2">
                  <IconPlus className="w-4 h-4" /> {savingWallet?'Adding…':'Add wallet'}
                </button>
              </div>
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#2a2d35] flex items-center justify-between">
                  <span className="font-medium text-sm">Configured wallets</span>
                  <span className="text-xs text-[#4a4e60]">{adminWallets.filter(w=>w.is_active).length} active · {adminWallets.length} total</span>
                </div>
                {adminWallets.length === 0 ? <div className="p-12 text-center text-[#4a4e60] text-sm">No wallets yet</div>
                  : adminWallets.map(w => {
                    const C: Record<string,string> = { vodafone:'#ef4444', instapay:'#10b981', fawry:'#f59e0b', orange:'#f97316', etisalat:'#22c55e' }
                    const color = C[w.wallet_type] ?? '#8b8fa8'
                    return (
                      <div key={w.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold" style={{ background:color+'20', color }}>
                          {w.wallet_type.slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{w.label}</div>
                          <div className="text-xs font-mono text-[#4a4e60] mt-0.5" dir="ltr">{w.number}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={()=>toggleWallet(w.id,!w.is_active)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${w.is_active?'bg-[#14321f] border-[#4ade80]/30 text-[#4ade80]':'bg-[#1f2229] border-[#2a2d35] text-[#4a4e60] hover:border-[#3b82f6] hover:text-white'}`}>
                            {w.is_active?'Active':'Inactive'}
                          </button>
                          <button onClick={()=>deleteWallet(w.id)}
                            className="text-xs text-[#f87171] hover:text-white border border-[#f87171]/20 hover:bg-[#3a1414] hover:border-[#f87171] px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                            <IconTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
              <p className="text-xs text-[#4a4e60]">Only "Active" wallets are shown to merchants in the billing modal.</p>
            </div>
          )}

        </div>
      </main>

      {/* ── Proof lightbox ── */}
      {viewingProof && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={()=>setViewingProof(null)}>
          <div className="relative max-w-2xl w-full" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setViewingProof(null)} className="absolute -top-10 right-0 text-[#8b8fa8] hover:text-white text-2xl cursor-pointer">×</button>
            {viewingProof.match(/\.pdf$/i)
              ? <iframe src={viewingProof} className="w-full h-[70vh] rounded-2xl border border-[#2a2d35]" />
              : <img src={viewingProof} alt="Payment proof" className="w-full rounded-2xl border border-[#2a2d35] max-h-[80vh] object-contain" />}
            <a href={viewingProof} target="_blank" rel="noopener noreferrer" className="mt-3 flex justify-center text-xs text-[#60a5fa] hover:underline">Open in new tab ↗</a>
          </div>
        </div>
      )}

      {/* ── Merchant products modal ── */}
          {/* ════════════════ MISSED ORDERS ════════════════ */}
          {activeTab === 'missed-orders' && (() => {
            const filteredAbandoned = abandonedCheckouts.filter(o => {
              if (abandonedStatusFilter === 'unrecovered' && o.recovered) return false
              if (abandonedStatusFilter === 'recovered'   && !o.recovered) return false
              if (abandonedMerchantFilter && o.merchant_id !== abandonedMerchantFilter) return false
              if (abandonedDateFrom && new Date(o.created_at) < new Date(abandonedDateFrom + 'T00:00:00')) return false
              if (abandonedDateTo   && new Date(o.created_at) > new Date(abandonedDateTo + 'T23:59:59')) return false
              if (abandonedSearch) {
                const q = abandonedSearch.toLowerCase()
                if (!o.customer_phone?.includes(q) && !o.customer_name?.toLowerCase().includes(q) && !o.products?.title?.toLowerCase().includes(q) && !o.stores?.name?.toLowerCase().includes(q) && !(merchantsMap[o.merchant_id]?.email||'').toLowerCase().includes(q)) return false
              }
              return true
            })
            const totalUnrecovered = abandonedCheckouts.filter(o => !o.recovered).length
            const totalRecovered   = abandonedCheckouts.filter(o => o.recovered).length
            const estRevenueLost   = abandonedCheckouts.filter(o => !o.recovered).reduce((s, o) => s + (Number(o.total_price) || 0), 0)
            const recoveryRate     = abandonedCheckouts.length > 0 ? Math.round(totalRecovered / abandonedCheckouts.length * 100) : 0
            const missRate         = orders.length + totalUnrecovered > 0 ? Math.round(totalUnrecovered / (orders.length + totalUnrecovered) * 100) : 0
            const total            = orders.length + totalUnrecovered
            const convPct          = total > 0 ? (orders.length / total) * 100 : 0
            const missPct          = total > 0 ? (totalUnrecovered / total) * 100 : 0

            return (
              <div className="space-y-4">

                {/* Filters — FIRST, matches Orders tab layout */}
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                      <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4e60]" />
                      <input value={abandonedSearch} onChange={e => setAbandonedSearch(e.target.value)}
                        placeholder="Customer, phone, product, store, merchant..."
                        className="bg-[#0f1117] border border-[#2a2d35] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] w-72" />
                    </div>
                    <select value={abandonedMerchantFilter} onChange={e => setAbandonedMerchantFilter(e.target.value)}
                      className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]">
                      <option value="">All merchants</option>
                      {merchants.map(m => <option key={m.id} value={m.id}>{m.email} ({m.stores?.[0]?.name || 'no store'})</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <IconCalendar className="w-4 h-4 text-[#4a4e60] shrink-0" />
                      <input type="date" value={abandonedDateFrom} onChange={e => setAbandonedDateFrom(e.target.value)}
                        className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                      <span className="text-[#4a4e60] text-xs">to</span>
                      <input type="date" value={abandonedDateTo} onChange={e => setAbandonedDateTo(e.target.value)}
                        className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                      {(abandonedDateFrom || abandonedDateTo || abandonedMerchantFilter || abandonedSearch) && (
                        <button onClick={() => { setAbandonedDateFrom(''); setAbandonedDateTo(''); setAbandonedMerchantFilter(''); setAbandonedSearch('') }}
                          className="text-xs text-[#f87171] hover:text-white border border-[#f87171]/20 hover:bg-[#3a1414] px-2.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1">
                          <IconX className="w-3.5 h-3.5" /> Clear
                        </button>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-[#4a4e60]">{filteredAbandoned.length} of {abandonedCheckouts.length}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {([['unrecovered','Unrecovered'],['all','All'],['recovered','Recovered (converted)']] as const).map(([k, l]) => (
                      <button key={k} onClick={() => setAbandonedStatusFilter(k)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${abandonedStatusFilter===k?'bg-[#3b82f6] border-[#3b82f6] text-white':'border-[#2a2d35] text-[#4a4e60] hover:text-white hover:border-[#3b82f6]'}`}>
                        {l}
                      </button>
                    ))}
                    <div className="ml-auto flex items-center gap-3 text-xs text-[#4a4e60]">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#4ade80] inline-block" />{orders.length.toLocaleString()} submitted</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#fbbf24] inline-block" /><span className="text-[#fbbf24]">{totalUnrecovered.toLocaleString()}</span> missed</span>
                      <div className="w-20 h-1.5 bg-[#0f1117] rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#4ade80]" style={{ width: `${convPct}%` }} />
                        <div className="h-full bg-[#fbbf24]" style={{ width: `${missPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI cards — SECOND, same compact style as Orders tab */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { label: 'Total Missed',      v: abandonedCheckouts.length,       c: '#fbbf24' },
                    { label: 'Unrecovered',        v: totalUnrecovered,                c: '#f87171' },
                    { label: 'Recovered',          v: totalRecovered,                  c: '#4ade80' },
                    { label: 'Recovery Rate',      v: `${recoveryRate}%`,              c: '#a78bfa' },
                    { label: 'Platform Miss Rate', v: `${missRate}%`,                  c: '#fb923c' },
                    { label: 'Est. Revenue Lost',  v: estRevenueLost.toLocaleString(), c: '#f87171' },
                  ].map((k, i) => (
                    <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-3 py-2.5 text-center">
                      <div className="text-[10px] text-[#4a4e60] mb-1 uppercase tracking-wider">{k.label}</div>
                      <div className="text-lg font-bold tabular-nums" style={{ color: k.c }}>{k.v}</div>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: 1100 }}>
                      <thead>
                        <tr className="border-b border-[#2a2d35]">
                          {['Merchant','Store','Product','Phone','Name','Address','Qty','Value','Date','Contacted','Status'].map(h => (
                            <th key={h} className="text-left px-4 py-3.5 text-xs text-[#4a4e60] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAbandoned.map(o => {
                          const merchantEmail = merchantsMap[o.merchant_id]?.email || o.merchant_id?.slice(0, 8) + '…'
                          return (
                            <tr key={o.id} className={`border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors ${o.recovered ? 'opacity-40' : ''}`}>
                              <td className="px-4 py-3 text-xs text-[#8b8fa8] max-w-[160px]">
                                <div className="truncate" title={merchantEmail}>{merchantEmail}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#8b8fa8] whitespace-nowrap">{o.stores?.name || '—'}</td>
                              <td className="px-4 py-3 text-xs text-[#8b8fa8] max-w-[180px]">
                                <div className="truncate" title={o.products?.title}>{o.products?.title || '—'}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-white font-mono whitespace-nowrap">{o.customer_phone || '—'}</td>
                              <td className="px-4 py-3 text-xs text-[#8b8fa8] max-w-[120px]">
                                <div className="truncate" title={o.customer_name}>{o.customer_name || '—'}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#8b8fa8] max-w-[160px]">
                                <div className="truncate" title={o.customer_address}>{o.customer_address || '—'}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#8b8fa8] whitespace-nowrap">×{o.qty}</td>
                              <td className="px-4 py-3 text-sm font-bold text-[#fbbf24] whitespace-nowrap tabular-nums">
                                {o.total_price ? Number(o.total_price).toLocaleString() : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-[#4a4e60] whitespace-nowrap">
                                {new Date(o.created_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${o.contacted ? 'bg-[#14321f] text-[#4ade80]' : 'bg-[#1f2229] text-[#4a4e60]'}`}>
                                  {o.contacted ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${o.recovered ? 'bg-[#14321f] text-[#4ade80]' : 'bg-[#3a2800] text-[#fbbf24]'}`}>
                                  {o.recovered ? 'Recovered' : 'Missed'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredAbandoned.length === 0 && (
                    <div className="p-14 text-center text-sm text-[#4a4e60]">No missed orders match the current filters</div>
                  )}
                </div>
              </div>
            )
          })()}

      {viewingMerchant && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d35]">
              <div>
                <div className="font-semibold text-white">{viewingMerchant.email}</div>
                <div className="text-xs text-[#4a4e60]">{viewingMerchant.stores?.[0]?.name} · {merchantProducts.length} products</div>
              </div>
              <button onClick={()=>{setViewingMerchant(null);setMerchantProducts([])}} className="text-[#4a4e60] hover:text-white transition-colors cursor-pointer">
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingProducts && <div className="flex items-center justify-center py-12 text-[#4a4e60] text-sm">Loading…</div>}
              {!loadingProducts && merchantProducts.length===0 && <div className="flex items-center justify-center py-12 text-[#4a4e60] text-sm">No products yet</div>}
              {!loadingProducts && merchantProducts.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-[#0f1117] border border-[#2a2d35] shrink-0 overflow-hidden">
                    {p.images?.[0]?<img src={p.images[0]} alt={p.title} className="w-full h-full object-contain p-1" />:<div className="w-full h-full flex items-center justify-center"><IconBox className="w-5 h-5 text-[#2a2d35]" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{p.title}</div>
                    <div className="text-xs text-[#4a4e60] mt-0.5">{p.price} {p.currency} · {p.source_platform||'manual'}</div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center"><div className="text-xs text-[#4a4e60]">Visits</div><div className="text-sm font-bold text-[#60a5fa]">{p.landing_pages?.[0]?.visits||0}</div></div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status==='active'?'bg-[#14321f] text-[#4ade80]':'bg-[#1f2229] text-[#8b8fa8]'}`}>{p.status}</span>
                    <a href={`/${viewingMerchant.stores?.[0]?.slug}/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3b82f6] hover:underline flex items-center gap-1"><IconEye className="w-3.5 h-3.5" /></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
