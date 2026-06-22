'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import { ORDER_ATTRIBUTION_FIELDS, ORDER_ATTRIBUTION_LABELS } from '@/lib/analytics/attribution'

const ADMIN_EMAILS = ['admin@mantoog.com']

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<any>({})
  const [merchants, setMerchants] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [addingCredits, setAddingCredits] = useState(false)
  const [merchantSearch, setMerchantSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [creditSuccess, setCreditSuccess] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  const [viewingMerchant, setViewingMerchant] = useState<any>(null)
  const [merchantProducts, setMerchantProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [merchantsMap, setMerchantsMap] = useState<Record<string, any>>({})
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [viewingProof, setViewingProof] = useState<string | null>(null)
  const [adminWallets, setAdminWallets] = useState<any[]>([])
  const [newWallet, setNewWallet] = useState({ label: '', wallet_type: 'vodafone', number: '' })
  const [savingWallet, setSavingWallet] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!ADMIN_EMAILS.includes(user.email || '')) {
        router.push('/dashboard')
        return
      }
      setAuthorized(true)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async () => {
    const ADMIN_EMAILS = ['admin@mantoog.com']

    // Supabase caps every query at 1000 rows by default — page until exhausted
    const fetchAll = async (query: any) => {
      const PAGE = 1000
      let rows: any[] = []
      let from = 0
      while (true) {
        const { data, error } = await query.range(from, from + PAGE - 1)
        if (error || !data || data.length === 0) break
        rows = rows.concat(data)
        if (data.length < PAGE) break
        from += PAGE
      }
      return rows
    }

    const { data: storesData } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: merchantsData } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false })

    const merchantsMapData = (merchantsData || []).reduce((acc: any, m: any) => {
      acc[m.id] = m
      return acc
    }, {})
    setMerchantsMap(merchantsMapData)

    const { data: creditsData } = await supabase
      .from('order_credits')
      .select('*')

    const ordersData = await fetchAll(
      supabase
        .from('orders')
        .select('*, stores(name, currency, merchant_id), products(title)')
        .order('created_at', { ascending: false })
    )

    const productsData = await fetchAll(
      supabase
        .from('products')
        .select('*, stores(name, slug, merchant_id)')
        .order('created_at', { ascending: false })
    )

    const { data: allLandingPages } = await supabase
      .from('landing_pages')
      .select('product_id, visits')

    const enrichedAllProducts = productsData.map((p: any) => ({
      ...p,
      landing_pages: allLandingPages?.filter((lp: any) => lp.product_id === p.id) || [],
    }))
    setAllProducts(enrichedAllProducts)

    const o = ordersData
    const allStores = storesData || []
    const allCredits = creditsData || []
    const allMerchants = (merchantsData || [])
      .filter(m => !ADMIN_EMAILS.includes(m.email?.toLowerCase() || ''))

    const enriched = allMerchants.map(m => {
      const store = allStores.find(s => s.merchant_id === m.id) || null
      const credit = allCredits.find(c => c.merchant_id === m.id) || null
      return {
        ...m,
        stores: store ? [store] : [],
        order_credits: credit ? [credit] : [],
      }
    })

    setMerchants(enriched)
    setOrders(o)

    const delivered = o.filter(x => x.status === 'delivered').length
    const today = new Date().toDateString()
    const lowCredits = enriched.filter(m => (m.order_credits?.[0]?.credits_remaining ?? 101) <= 10)

    setStats({
      totalMerchants: enriched.length,
      activeStores: enriched.filter(m => m.stores.length > 0).length,
      totalOrders: o.length,
      deliveryRate: o.length > 0 ? Math.round((delivered / o.length) * 100) : 0,
      totalRevenue: o.reduce((s, x) => s + (Number(x.total_price) || 0), 0).toFixed(0),
      newToday: enriched.filter(m => new Date(m.created_at).toDateString() === today).length,
      lowCredits: lowCredits.length,
      lowCreditsMerchants: lowCredits,
    })

    setChartData(buildChartData(enriched, o))

    const [prRes, walletsRes] = await Promise.all([
      fetch('/api/admin/payment-requests'),
      fetch('/api/admin/wallets'),
    ])
    if (prRes.ok) setPaymentRequests((await prRes.json()).requests ?? [])
    if (walletsRes.ok) setAdminWallets((await walletsRes.json()).wallets ?? [])
  }

  const buildChartData = (merchants: any[], orders: any[]) => {
    const days: Record<string, any> = {}

    // Last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      days[key] = { date: key, signups: 0, orders: 0, activeStores: new Set() }
    }

    merchants.forEach(m => {
      const key = new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      if (days[key]) days[key].signups += 1
    })

    orders.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      if (days[key]) {
        days[key].orders += 1
        if (o.store_id) days[key].activeStores.add(o.store_id)
      }
    })

    return Object.values(days).map(d => ({
      date: d.date,
      signups: d.signups,
      orders: d.orders,
      activeStores: d.activeStores.size,
    }))
  }

  const handleAddCredits = async () => {
    if (!selectedMerchant || !creditAmount) return
    setAddingCredits(true)
    try {
      const res = await fetch('/api/admin/add-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: selectedMerchant.id,
          amount: parseInt(creditAmount),
        }),
      })
      const data = await res.json()
      if (data.success) {
        await loadData()
        setCreditAmount('')
        setSelectedMerchant(null)
        setCreditSuccess(true)
        setTimeout(() => setCreditSuccess(false), 3000)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (err) {
      alert('Failed to add credits')
    }
    setAddingCredits(false)
  }

  const refreshWallets = async () => {
    const r = await fetch('/api/admin/wallets')
    if (r.ok) setAdminWallets((await r.json()).wallets ?? [])
  }

  const addWallet = async () => {
    if (!newWallet.label || !newWallet.number) return
    setSavingWallet(true)
    const r = await fetch('/api/admin/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWallet),
    })
    if (r.ok) { setNewWallet({ label: '', wallet_type: 'vodafone', number: '' }); await refreshWallets() }
    setSavingWallet(false)
  }

  const toggleWallet = async (id: string, is_active: boolean) => {
    await fetch(`/api/admin/wallets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    })
    await refreshWallets()
  }

  const deleteWallet = async (id: string) => {
    if (!confirm('Delete this wallet?')) return
    await fetch(`/api/admin/wallets/${id}`, { method: 'DELETE' })
    await refreshWallets()
  }

  const processPayment = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingPayment(requestId)
    try {
      const res = await fetch('/api/admin/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action, admin_notes: adminNotes[requestId] || null }),
      })
      const json = await res.json()
      if (!res.ok) { alert('Error: ' + json.error); return }
      // Refresh payment requests
      const prRes = await fetch('/api/admin/payment-requests')
      if (prRes.ok) setPaymentRequests((await prRes.json()).requests ?? [])
    } catch {
      alert('Failed to process payment')
    } finally {
      setProcessingPayment(null)
    }
  }

  const loadMerchantProducts = async (merchant: any) => {
    setLoadingProducts(true)
    setViewingMerchant(merchant)
    const store = merchant.stores?.[0]
    if (!store) { setLoadingProducts(false); return }
    const { data } = await supabase
      .from('products')
      .select('*, landing_pages(visits)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
    setMerchantProducts(data || [])
    setLoadingProducts(false)
  }

  const csvCell = (value: unknown) => {
    const str = value == null ? '' : String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const attributionRow = (order: any) =>
    ORDER_ATTRIBUTION_FIELDS.map(field => order[field] ?? '')

  const exportOrdersCSV = () => {
    const filtered = filteredOrders
    const headers = [
      'Store', 'Customer', 'Phone', 'Product', 'Governorate', 'Amount', 'Currency', 'Status', 'Date',
      ...ORDER_ATTRIBUTION_FIELDS.map(field => ORDER_ATTRIBUTION_LABELS[field]),
    ]
    const rows = filtered.map(o => [
      o.stores?.name || '',
      o.customer_name || '',
      o.customer_phone || '',
      o.upsell_item ? `${o.products?.title || ''} + ${o.upsell_item.product_title}` : (o.products?.title || ''),
      o.address_governorate || '',
      o.total_price || '',
      o.stores?.currency || '',
      o.status || '',
      new Date(o.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }),
      ...attributionRow(o),
    ])
    const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mantoog-orders-${Date.now()}.csv`
    a.click()
  }

  const exportOrdersExcel = () => {
    const rows = filteredOrders.map((order: any) => ({
      'الاسم': order.customer_name || '',
      'الهاتف': order.customer_phone || '',
      'المنتج': order.upsell_item ? `${order.products?.title || ''} + ${order.upsell_item.product_title}` : (order.products?.title || ''),
      'العنوان': [order.address_line1, order.address_governorate].filter(Boolean).join(', ') || '',
      'المبلغ': order.total_price || '',
      'العملة': order.currency || '',
      'الحالة': order.status || '',
      'التاريخ': new Date(order.created_at).toLocaleString('ar-EG'),
      'المتجر': order.stores?.name || '',
      'رابط الموقع': order.map_link || '',
      ...Object.fromEntries(
        ORDER_ATTRIBUTION_FIELDS.map(field => [ORDER_ATTRIBUTION_LABELS[field], order[field] ?? ''])
      ),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const filteredMerchants = merchants.filter(m =>
    !merchantSearch ||
    m.email?.toLowerCase().includes(merchantSearch.toLowerCase()) ||
    m.stores?.[0]?.name?.toLowerCase().includes(merchantSearch.toLowerCase())
  )

  const filteredOrders = orders.filter(o => {
    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter
    const matchSearch = !orderSearch ||
      o.customer_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer_phone?.includes(orderSearch) ||
      o.stores?.name?.toLowerCase().includes(orderSearch.toLowerCase())
    return matchStatus && matchSearch
  })

  const ORDER_STATUSES = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']

  const statusColor = (s: string) => {
    if (s === 'delivered') return 'bg-[#14321f] text-[#4ade80]'
    if (s === 'shipped') return 'bg-[#1a3a5c] text-[#60a5fa]'
    if (s === 'confirmed') return 'bg-[#1a3a2c] text-[#34d399]'
    if (s === 'cancelled' || s === 'returned') return 'bg-[#3a1414] text-[#f87171]'
    return 'bg-[#1f2229] text-[#8b8fa8]'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-[#8b8fa8] text-sm">Loading admin panel...</div>
    </div>
  )

  if (!authorized) return null

  const pendingPaymentsCount = paymentRequests.filter(r => r.status === 'pending').length

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'merchants', label: '👥 Merchants' },
    { id: 'products', label: '📦 Products' },
    { id: 'orders', label: '🛒 Orders' },
    { id: 'credits', label: '💳 Credits' },
    { id: 'payments', label: '💰 Payments', badge: pendingPaymentsCount },
    { id: 'wallets',  label: '🏦 Wallets' },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <style>{`
  .admin-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #1a1d24; border-bottom: 1px solid #2a2d35; flex-wrap: wrap; gap: 8px; }
  .admin-tabs { display: flex; overflow-x: auto; gap: 4px; padding: 12px 16px; border-bottom: 1px solid #2a2d35; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .admin-tabs::-webkit-scrollbar { display: none; }
  .admin-tab { white-space: nowrap; flex-shrink: 0; }
  .admin-content { padding: 16px; }
  .admin-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .admin-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; border: 1px solid #2a2d35; }
  .admin-table-wrap table { min-width: 700px; }
  .admin-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .admin-search { width: 100%; }
  @media (min-width: 768px) {
    .admin-content { padding: 24px; }
    .admin-stats-grid { grid-template-columns: repeat(4, 1fr); }
    .admin-search { width: 256px; }
    .admin-table-wrap table { min-width: unset; }
  }
`}</style>
      {/* Header */}
      <div className="admin-header sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Mantoog" className="w-16 h-16 object-contain" />
          <div>
            <div className="font-semibold text-sm">Mantoog Admin</div>
            <div className="text-xs text-[#4a4e60]">Platform management</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="text-xs text-[#8b8fa8] hover:text-white border border-[#2a2d35] px-3 py-1.5 rounded-lg transition-colors">
            🔄 Refresh
          </button>
          <button onClick={async () => {
            await supabase.auth.signOut()
            router.push('/admin/login')
          }} className="text-xs text-[#f87171] hover:text-white border border-[#f87171]/30 hover:border-[#f87171] px-3 py-1.5 rounded-lg transition-colors">
            Logout →
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Tabs */}
        <div className="admin-tabs mb-8">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`admin-tab px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}>
              {tab.label}
              {'badge' in tab && (tab.badge ?? 0) > 0 && (
                <span className="text-[10px] font-bold bg-[#f87171] text-white rounded-full px-1.5 py-0.5 leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="admin-stats-grid">
              {[
                { label: 'Total Merchants', value: stats.totalMerchants, color: '#60a5fa' },
                { label: 'Active Stores', value: stats.activeStores, color: '#4ade80' },
                { label: 'Total Orders', value: stats.totalOrders, color: '#fbbf24' },
                { label: 'Delivery Rate', value: `${stats.deliveryRate}%`, color: '#4ade80' },
                { label: 'New Today', value: stats.newToday, color: '#a78bfa' },
                { label: 'Low Credits ⚠️', value: stats.lowCredits, color: '#f87171' },
              ].map((s, i) => (
                <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4">
                  <div className="text-xs text-[#4a4e60] mb-2">{s.label}</div>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value ?? '—'}</div>
                </div>
              ))}
            </div>

            {/* Growth charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { title: 'Daily Signups', dataKey: 'signups', color: '#60a5fa' },
                { title: 'Daily Orders', dataKey: 'orders', color: '#4ade80' },
                { title: 'Active Stores (with orders)', dataKey: 'activeStores', color: '#f97316' },
              ].map((chart, i) => (
                <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
                  <div className="text-sm font-medium text-white mb-1">{chart.title}</div>
                  <div className="text-xs text-[#4a4e60] mb-4">Last 30 days</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4a4e60' }} tickLine={false} axisLine={false} interval={6} />
                      <YAxis tick={{ fontSize: 10, fill: '#4a4e60' }} tickLine={false} axisLine={false} width={20} />
                      <Tooltip
                        contentStyle={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#8b8fa8' }}
                        itemStyle={{ color: chart.color }}
                      />
                      <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>

            {/* Low credits alert */}
            {stats.lowCreditsMerchants?.length > 0 && (
              <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-xl p-5">
                <div className="font-semibold text-[#f87171] mb-3 text-sm">⚠️ Merchants with low credits (≤10)</div>
                <div className="space-y-2">
                  {stats.lowCreditsMerchants.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-white">{m.email}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#f87171] font-bold">{m.order_credits?.[0]?.credits_remaining ?? 0} left</span>
                        <button onClick={() => { setSelectedMerchant(m); setActiveTab('credits') }}
                          className="text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-1 rounded-lg transition-colors">
                          + Credits
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent merchants */}
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2d35] flex items-center justify-between">
                <span className="font-medium text-sm">Recent signups</span>
                <span className="text-xs text-[#4a4e60]">{merchants.length} total</span>
              </div>
              {merchants.slice(0, 10).map((m) => {
                const credits = m.order_credits?.[0]
                const store = m.stores?.[0]
                return (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center text-xs font-bold text-[#60a5fa]">
                        {m.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{m.email || '—'}</div>
                        <div className="text-xs text-[#4a4e60]">{store?.name || 'No store'} · {store?.currency || '—'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${(credits?.credits_remaining ?? 0) <= 10 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                        {credits?.credits_remaining ?? 0} credits
                      </div>
                      <div className="text-xs text-[#4a4e60]">{new Date(m.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MERCHANTS */}
        {activeTab === 'merchants' && (
          <div className="space-y-4">
            <div className="admin-filters">
              <input value={merchantSearch} onChange={e => setMerchantSearch(e.target.value)}
                placeholder="Search by email or store name..."
                className="admin-search bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]" />
              <span className="text-xs text-[#4a4e60]">{filteredMerchants.length} merchants</span>
            </div>

            <div className="bg-[#1a1d24] rounded-xl overflow-hidden">
              <div className="admin-table-wrap">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2d35]">
                      {['Email', 'Store', 'Currency', 'Credits Left', 'Used', 'Orders', 'Joined', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-[#4a4e60] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerchants.map(m => {
                      const credits = m.order_credits?.[0]
                      const store = m.stores?.[0]
                      const merchantOrders = orders.filter(o => o.store_id === store?.id).length
                      return (
                        <tr key={m.id} className="border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                          <td className="px-4 py-3 text-sm">{m.email || '—'}</td>
                          <td className="px-4 py-3 text-sm text-[#8b8fa8]">{store?.name || <span className="text-[#f87171] text-xs">No store</span>}</td>
                          <td className="px-4 py-3 text-xs text-[#8b8fa8]">{store?.currency || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-bold ${(credits?.credits_remaining ?? 0) <= 10 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                              {credits?.credits_remaining ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#8b8fa8]">{credits?.credits_used ?? 0}</td>
                          <td className="px-4 py-3 text-sm text-[#fbbf24]">{merchantOrders}</td>
                          <td className="px-4 py-3 text-xs text-[#4a4e60] whitespace-nowrap">{new Date(m.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => { setSelectedMerchant(m); setActiveTab('credits') }}
                                className="text-xs bg-[#1f2229] hover:bg-[#3b82f6] border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                + Credits
                              </button>
                              <button onClick={() => loadMerchantProducts(m)}
                                className="text-xs bg-[#1f2229] hover:bg-[#1a3a5c] border border-[#2a2d35] hover:border-[#60a5fa] text-[#8b8fa8] hover:text-[#60a5fa] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                👁️ Products
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

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="admin-filters">
              <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                placeholder="Search customer, phone, store..."
                className="admin-search bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]" />
              <div className="flex gap-1 flex-wrap">
                {ORDER_STATUSES.map(s => (
                  <button key={s} onClick={() => setOrderStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${orderStatusFilter === s ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-xs text-[#4a4e60]">{filteredOrders.length} orders</span>
              </div>
              <div className="flex gap-2">
                <button onClick={exportOrdersCSV}
                  className="text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                  📥 CSV
                </button>
                <button onClick={exportOrdersExcel}
                  className="text-xs bg-[#14321f] hover:bg-[#1a4a2a] border border-[#4ade80]/20 text-[#4ade80] hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                  📊 Excel
                </button>
              </div>
            </div>

            <div className="bg-[#1a1d24] rounded-xl overflow-hidden">
              <div className="admin-table-wrap">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2d35]">
                      {['Store', 'Product', 'Customer', 'Phone', 'Address', 'Merchant', 'Amount', 'Qty', 'Status', 'Date', '📍', ...ORDER_ATTRIBUTION_FIELDS.map(f => ORDER_ATTRIBUTION_LABELS[f])].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-[#4a4e60] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 100).map((order) => (
                      <tr key={order.id} className="border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                        <td className="px-4 py-3 text-xs text-[#8b8fa8] whitespace-nowrap">{order.stores?.name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#8b8fa8] whitespace-nowrap">
                          {order.products?.title || '—'}
                          {order.upsell_item && <span className="text-[#a78bfa]"> + {order.upsell_item.product_title}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">{order.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#8b8fa8]">{order.customer_phone || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#8b8fa8]">
                          {[order.address_line1, order.address_governorate].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#8b8fa8]">
                          {merchantsMap[order.stores?.merchant_id]?.full_name || merchantsMap[order.stores?.merchant_id]?.email || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#4ade80] whitespace-nowrap">
                          {order.total_price} {order.stores?.currency || ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#8b8fa8]">×{order.quantity || 1}</span>
                          {order.applied_offer && (
                            <div className="text-[10px] text-[#fbbf24] font-medium mt-0.5 bg-[#fbbf24]/10 px-1.5 py-0.5 rounded w-fit whitespace-nowrap">
                              Bundle ×{order.applied_offer.quantity}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#4a4e60] whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          {order.map_link ? (
                            <a href={order.map_link} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-white bg-[#1a3a5c] hover:bg-[#3b82f6] px-2.5 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap">
                              🗺️ Location
                            </a>
                          ) : (
                            <span className="text-xs text-[#4a4e60]">—</span>
                          )}
                        </td>
                        {ORDER_ATTRIBUTION_FIELDS.map(field => (
                          <td key={field} className="px-4 py-3 text-xs text-[#8b8fa8] max-w-[200px] truncate whitespace-nowrap" title={order[field] ?? ''}>
                            {order[field] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredOrders.length > 100 && (
                <div className="px-5 py-3 border-t border-[#2a2d35] text-xs text-[#4a4e60] text-center">
                  Showing 100 of {filteredOrders.length} orders
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREDITS */}
        {activeTab === 'credits' && (
          <div className="max-w-xl space-y-5">
            {creditSuccess && (
              <div className="bg-[#14321f] border border-[#4ade80]/20 rounded-xl p-4 text-[#4ade80] text-sm font-medium">
                ✅ Credits added successfully!
              </div>
            )}

            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
              <h2 className="font-semibold mb-5 text-sm">Add credits to merchant</h2>

              {/* Merchant selector */}
              <div className="mb-4">
                <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">Select merchant</label>
                <select value={selectedMerchant?.id || ''} onChange={e => setSelectedMerchant(merchants.find(m => m.id === e.target.value) || null)}
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]">
                  <option value="">-- Select merchant --</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.email} — {m.stores?.[0]?.name || 'No store'} ({m.order_credits?.[0]?.credits_remaining ?? 0} left)
                    </option>
                  ))}
                </select>
              </div>

              {/* Merchant info */}
              {selectedMerchant && (
                <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4 mb-4">
                  <div className="text-sm font-medium mb-1">{selectedMerchant.email}</div>
                  <div className="text-xs text-[#8b8fa8] mb-3">Store: {selectedMerchant.stores?.[0]?.name || 'No store'} · {selectedMerchant.stores?.[0]?.currency || '—'}</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Remaining', value: selectedMerchant.order_credits?.[0]?.credits_remaining ?? 0, color: '#4ade80' },
                      { label: 'Used', value: selectedMerchant.order_credits?.[0]?.credits_used ?? 0, color: '#fbbf24' },
                      { label: 'Total ever', value: selectedMerchant.order_credits?.[0]?.credits_total ?? 0, color: '#60a5fa' },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <div className="text-xs text-[#4a4e60] mb-1">{s.label}</div>
                        <div className="font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick amounts */}
              <div className="mb-4">
                <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">Credits to add</label>
                <div className="flex gap-2 flex-wrap mb-3">
                  {[100, 500, 1000, 2000, 5000].map(n => (
                    <button key={n} onClick={() => setCreditAmount(String(n))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${creditAmount === String(n) ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                      +{n.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
                  placeholder="Or enter custom amount"
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
              </div>

              <button onClick={handleAddCredits} disabled={!selectedMerchant || !creditAmount || addingCredits}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
                {addingCredits ? 'Adding...' : `Add ${creditAmount ? parseInt(creditAmount).toLocaleString() : '0'} credits`}
              </button>
            </div>

            {/* Credits history */}
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2d35]">
                <span className="font-medium text-sm">All credit records</span>
              </div>
              {merchants
                .filter(m => m.order_credits?.length > 0)
                .flatMap(m => m.order_credits.map((c: any) => ({ ...c, email: m.email, storeName: m.stores?.[0]?.name })))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 30)
                .map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229]">
                    <div>
                      <div className="text-sm">{c.email}</div>
                      <div className="text-xs text-[#4a4e60]">{c.storeName || 'No store'} · {new Date(c.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#4ade80]">+{c.credits_total}</div>
                      <div className="text-xs text-[#4a4e60]">{c.credits_remaining} remaining</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2 items-center">
              {(['pending', 'approved', 'rejected', 'all'] as const).map(f => {
                const count = f === 'all' ? paymentRequests.length : paymentRequests.filter(r => r.status === f).length
                return (
                  <button key={f} onClick={() => setPaymentFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize flex items-center gap-1.5 ${paymentFilter === f ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                    {f}
                    <span className={`text-[10px] font-bold px-1.5 rounded-full ${paymentFilter === f ? 'bg-white/20 text-white' : 'bg-[#2a2d35] text-[#4a4e60]'}`}>{count}</span>
                  </button>
                )
              })}
              <button onClick={async () => {
                const r = await fetch('/api/admin/payment-requests')
                if (r.ok) setPaymentRequests((await r.json()).requests ?? [])
              }} className="text-xs text-[#8b8fa8] hover:text-white border border-[#2a2d35] px-3 py-1.5 rounded-lg transition-colors ml-auto">
                🔄 Refresh
              </button>
            </div>

            {/* Requests list */}
            {paymentRequests.filter(r => paymentFilter === 'all' || r.status === paymentFilter).length === 0 ? (
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center">
                <div className="text-[#4a4e60] text-sm">No {paymentFilter === 'all' ? '' : paymentFilter} payment requests</div>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentRequests
                  .filter(r => paymentFilter === 'all' || r.status === paymentFilter)
                  .map(req => {
                    const merchant = merchantsMap[req.merchant_id]
                    const isPending = req.status === 'pending'
                    return (
                      <div key={req.id}
                        className="bg-[#1a1d24] border rounded-xl overflow-hidden"
                        style={{ borderColor: isPending ? '#f59e0b50' : req.status === 'approved' ? '#4ade8050' : '#2a2d35' }}>

                        {/* Header row */}
                        <div className="flex flex-wrap items-start gap-4 p-5">
                          {/* Status badge */}
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${req.status === 'pending' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : req.status === 'approved' ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-[#f87171]/15 text-[#f87171]'}`}>
                            {req.status.toUpperCase()}
                          </span>

                          {/* Key info */}
                          <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <div className="text-[#4a4e60] mb-0.5">Merchant</div>
                              <div className="text-white font-medium truncate">{merchant?.email ?? req.merchant_id.slice(0, 8) + '...'}</div>
                            </div>
                            <div>
                              <div className="text-[#4a4e60] mb-0.5">Type</div>
                              <div className="text-white font-medium">
                                {req.item_type === 'credits'
                                  ? `${(req.credits_amount ?? 0).toLocaleString()} orders`
                                  : `Sub: ${req.sub_plan}`}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#4a4e60] mb-0.5">Amount</div>
                              <div className="text-[#fbbf24] font-bold">{req.amount_egp} EGP</div>
                            </div>
                            <div>
                              <div className="text-[#4a4e60] mb-0.5">Wallet · Sender</div>
                              <div className="text-white capitalize">{req.payment_method} · <span className="font-mono" dir="ltr">{req.sender_phone || '—'}</span></div>
                            </div>
                          </div>

                          {/* Date */}
                          <div className="text-xs text-[#4a4e60] shrink-0 self-center">
                            {new Date(req.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Proof + notes + actions */}
                        <div className="border-t border-[#2a2d35] px-5 py-4 flex flex-wrap items-start gap-4">
                          {/* Proof */}
                          {req.proof_url ? (
                            <button
                              onClick={() => setViewingProof(req.proof_url)}
                              className="flex items-center gap-1.5 text-xs text-[#60a5fa] hover:text-white border border-[#3b82f6]/30 hover:border-[#3b82f6] px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0">
                              🖼️ View proof
                            </button>
                          ) : (
                            <span className="text-xs text-[#4a4e60]">No proof</span>
                          )}

                          {/* Merchant notes */}
                          {req.merchant_notes && (
                            <div className="text-xs text-[#8b8fa8] bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 flex-1">
                              <span className="text-[#4a4e60]">Merchant note: </span>{req.merchant_notes}
                            </div>
                          )}

                          {/* Admin notes + actions (pending only) */}
                          {isPending && (
                            <div className="flex items-center gap-2 ms-auto flex-wrap">
                              <input
                                value={adminNotes[req.id] ?? ''}
                                onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                                placeholder="Admin notes (optional)"
                                className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] w-48"
                              />
                              <button
                                onClick={() => processPayment(req.id, 'approve')}
                                disabled={processingPayment === req.id}
                                className="text-xs bg-[#14321f] hover:bg-[#4ade80] border border-[#4ade80]/30 hover:border-[#4ade80] text-[#4ade80] hover:text-[#0f1117] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
                                {processingPayment === req.id ? '...' : '✓ Approve'}
                              </button>
                              <button
                                onClick={() => processPayment(req.id, 'reject')}
                                disabled={processingPayment === req.id}
                                className="text-xs bg-[#3a1414] hover:bg-[#f87171] border border-[#f87171]/30 hover:border-[#f87171] text-[#f87171] hover:text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
                                {processingPayment === req.id ? '...' : '✗ Reject'}
                              </button>
                            </div>
                          )}

                          {/* Processed info (approved/rejected) */}
                          {!isPending && (
                            <div className="text-xs text-[#4a4e60] ms-auto">
                              {req.status} by {req.processed_by || '—'} ·{' '}
                              {req.processed_at ? new Date(req.processed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                              {req.admin_notes && <span className="block mt-0.5 text-[#8b8fa8]">"{req.admin_notes}"</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* WALLETS */}
        {activeTab === 'wallets' && (
          <div className="max-w-2xl space-y-6">

            {/* Add wallet form */}
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
              <h2 className="font-semibold text-sm mb-5">Add wallet</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
                <div>
                  <label className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1.5 block">Display name</label>
                  <input
                    value={newWallet.label}
                    onChange={e => setNewWallet(p => ({ ...p, label: e.target.value }))}
                    placeholder="e.g. Vodafone Cash"
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1.5 block">Type</label>
                  <select
                    value={newWallet.wallet_type}
                    onChange={e => setNewWallet(p => ({ ...p, wallet_type: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="vodafone">Vodafone Cash</option>
                    <option value="instapay">InstaPay</option>
                    <option value="fawry">Fawry</option>
                    <option value="orange">Orange Cash</option>
                    <option value="etisalat">Etisalat Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#4a4e60] uppercase tracking-wider mb-1.5 block">Number / Username</label>
                  <input
                    value={newWallet.number}
                    onChange={e => setNewWallet(p => ({ ...p, number: e.target.value }))}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] font-mono"
                  />
                </div>
              </div>
              <button
                onClick={addWallet}
                disabled={!newWallet.label || !newWallet.number || savingWallet}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {savingWallet ? 'Adding...' : '+ Add wallet'}
              </button>
            </div>

            {/* Wallets list */}
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2d35] flex items-center justify-between">
                <span className="font-medium text-sm">Active wallets shown to merchants</span>
                <span className="text-xs text-[#4a4e60]">{adminWallets.length} total</span>
              </div>
              {adminWallets.length === 0 ? (
                <div className="p-10 text-center text-[#4a4e60] text-sm">No wallets yet — add one above</div>
              ) : (
                adminWallets.map(w => {
                  const COLORS: Record<string, string> = { vodafone: '#ef4444', instapay: '#10b981', fawry: '#f59e0b', orange: '#f97316', etisalat: '#22c55e' }
                  const color = COLORS[w.wallet_type] ?? '#8b8fa8'
                  return (
                    <div key={w.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
                        <span className="text-xs font-bold" style={{ color }}>{w.wallet_type.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{w.label}</div>
                        <div className="text-xs text-[#4a4e60] font-mono mt-0.5" dir="ltr">{w.number}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleWallet(w.id, !w.is_active)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${w.is_active ? 'bg-[#14321f] border-[#4ade80]/30 text-[#4ade80] hover:bg-[#1a4a28]' : 'bg-[#1f2229] border-[#2a2d35] text-[#4a4e60] hover:border-[#3b82f6] hover:text-white'}`}>
                          {w.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => deleteWallet(w.id)}
                          className="text-xs text-[#f87171] hover:text-white border border-[#f87171]/20 hover:border-[#f87171] hover:bg-[#3a1414] px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <p className="text-xs text-[#4a4e60]">
              Only "Active" wallets are shown to merchants. Toggle to hide without deleting.
            </p>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="admin-filters">
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="Search by product name or merchant..."
                className="admin-search bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]" />
              <span className="text-xs text-[#4a4e60]">
                {allProducts.filter(p => !productSearch || p.title?.toLowerCase().includes(productSearch.toLowerCase()) || p.stores?.name?.toLowerCase().includes(productSearch.toLowerCase())).length} products
              </span>
            </div>

            <div className="bg-[#1a1d24] rounded-xl overflow-hidden">
              <div className="admin-table-wrap">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2d35]">
                      {['Product', 'Merchant', 'Store', 'Price', 'Status', 'Visits', 'Source', 'Date', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-[#4a4e60] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allProducts
                      .filter(p => !productSearch ||
                        p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
                        p.stores?.name?.toLowerCase().includes(productSearch.toLowerCase())
                      )
                      .map((product, i) => {
                        const visits = product.landing_pages?.[0]?.visits || 0
                        const merchant = merchants.find(m => m.stores?.[0]?.id === product.store_id)
                        return (
                          <tr key={product.id} className="border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#0f1117] flex-shrink-0 overflow-hidden">
                                  {product.images?.[0] ? (
                                    <img src={product.images[0]} alt="" className="w-full h-full object-contain p-0.5" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-white truncate max-w-[180px]">{product.title}</div>
                                  <div className="text-xs text-[#4a4e60] font-mono truncate max-w-[180px]">{product.id.slice(0, 8)}...</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#8b8fa8] whitespace-nowrap">{merchant?.email || '—'}</td>
                            <td className="px-4 py-3 text-xs text-[#8b8fa8] whitespace-nowrap">{product.stores?.name || '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-bold text-white">{product.price} {product.currency}</div>
                              {product.compare_at_price && (
                                <div className="text-xs text-[#4a4e60] line-through">{product.compare_at_price}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.status === 'active' ? 'bg-[#14321f] text-[#4ade80]' : product.status === 'draft' ? 'bg-[#1f2229] text-[#8b8fa8]' : 'bg-[#3a1414] text-[#f87171]'}`}>
                                {product.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-[#60a5fa]">{visits}</td>
                            <td className="px-4 py-3 text-xs text-[#8b8fa8]">{product.source_platform || 'manual'}</td>
                            <td className="px-4 py-3 text-xs text-[#4a4e60] whitespace-nowrap">
                              {new Date(product.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <a href={`/${product.stores?.slug}/${product.id}`} target="_blank" rel="noopener noreferrer"
                                  className="text-xs bg-[#1f2229] hover:bg-[#3b82f6] border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                  👁️ Page
                                </a>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Proof image lightbox */}
      {viewingProof && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setViewingProof(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingProof(null)}
              className="absolute -top-10 right-0 text-[#8b8fa8] hover:text-white text-2xl">×</button>
            {viewingProof.match(/\.(pdf)$/i) ? (
              <iframe src={viewingProof} className="w-full h-[70vh] rounded-xl border border-[#2a2d35]" />
            ) : (
              <img src={viewingProof} alt="Payment proof" className="w-full rounded-xl border border-[#2a2d35] max-h-[80vh] object-contain" />
            )}
            <a href={viewingProof} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex justify-center text-xs text-[#60a5fa] hover:underline">
              Open in new tab ↗
            </a>
          </div>
        </div>
      )}

      {viewingMerchant && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d35]">
              <div>
                <div className="font-semibold text-white">{viewingMerchant.email}</div>
                <div className="text-xs text-[#4a4e60]">{viewingMerchant.stores?.[0]?.name} · {merchantProducts.length} products</div>
              </div>
              <button onClick={() => { setViewingMerchant(null); setMerchantProducts([]) }}
                className="text-[#8b8fa8] hover:text-white text-2xl leading-none transition-colors">×</button>
            </div>

            {/* Products list */}
            <div className="overflow-y-auto flex-1">
              {loadingProducts && (
                <div className="flex items-center justify-center py-12 text-[#8b8fa8] text-sm">Loading...</div>
              )}
              {!loadingProducts && merchantProducts.length === 0 && (
                <div className="flex items-center justify-center py-12 text-[#4a4e60] text-sm">No products yet</div>
              )}
              {!loadingProducts && merchantProducts.map((product, i) => {
                const visits = product.landing_pages?.[0]?.visits || 0
                return (
                  <div key={product.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                    {/* Image */}
                    <div className="w-14 h-14 rounded-xl bg-[#0f1117] flex-shrink-0 overflow-hidden">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{product.title}</div>
                      <div className="text-xs text-[#4a4e60] mt-0.5">
                        {product.price} {product.currency} · {product.source_platform || 'manual'}
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-right flex-shrink-0">
                      <div>
                        <div className="text-xs text-[#4a4e60]">Visits</div>
                        <div className="text-sm font-bold text-[#60a5fa]">{visits}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#4a4e60]">Status</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.status === 'active' ? 'bg-[#14321f] text-[#4ade80]' : 'bg-[#1f2229] text-[#8b8fa8]'}`}>
                          {product.status}
                        </span>
                      </div>
                      <a href={`/${viewingMerchant.stores?.[0]?.slug}/${product.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#3b82f6] hover:underline whitespace-nowrap">
                        View page ↗
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
