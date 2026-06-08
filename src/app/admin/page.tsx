'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

    const { data: storesData } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: merchantsData } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: creditsData } = await supabase
      .from('order_credits')
      .select('*')

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, stores(name, currency)')
      .order('created_at', { ascending: false })
      .limit(500)

    const o = ordersData || []
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
    const { data: credits } = await supabase
      .from('order_credits')
      .select('*')
      .eq('merchant_id', selectedMerchant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (credits) {
      await supabase.from('order_credits')
        .update({ credits_total: credits.credits_total + parseInt(creditAmount) })
        .eq('id', credits.id)
    } else {
      await supabase.from('order_credits').insert({
        merchant_id: selectedMerchant.id,
        credits_total: parseInt(creditAmount),
        credits_used: 0,
        bundle_type: 'manual',
        price_paid: 0,
      })
    }

    await loadData()
    setCreditAmount('')
    setSelectedMerchant(null)
    setAddingCredits(false)
    setCreditSuccess(true)
    setTimeout(() => setCreditSuccess(false), 3000)
  }

  const exportOrdersCSV = () => {
    const filtered = filteredOrders
    const headers = ['Store', 'Customer', 'Phone', 'Governorate', 'Amount', 'Currency', 'Status', 'Date']
    const rows = filtered.map(o => [
      o.stores?.name || '',
      o.customer_name || '',
      o.customer_phone || '',
      o.address_governorate || '',
      o.total_price || '',
      o.stores?.currency || '',
      o.status || '',
      new Date(o.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mantoog-orders-${Date.now()}.csv`
    a.click()
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

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'merchants', label: '👥 Merchants' },
    { id: 'orders', label: '🛒 Orders' },
    { id: 'credits', label: '💳 Credits' },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-[#2a2d35] px-8 py-4 flex items-center justify-between sticky top-0 bg-[#0f1117] z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center text-sm font-bold">M</div>
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

      <div className="p-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl w-fit mb-8">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <div className="flex items-center gap-3">
              <input value={merchantSearch} onChange={e => setMerchantSearch(e.target.value)}
                placeholder="Search by email or store name..."
                className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] w-72" />
              <span className="text-xs text-[#4a4e60]">{filteredMerchants.length} merchants</span>
            </div>

            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
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
                            <button onClick={() => { setSelectedMerchant(m); setActiveTab('credits') }}
                              className="text-xs bg-[#1f2229] hover:bg-[#3b82f6] border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                              + Credits
                            </button>
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
            <div className="flex items-center gap-3 flex-wrap">
              <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                placeholder="Search customer, phone, store..."
                className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] w-64" />
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
              <button onClick={exportOrdersCSV}
                className="text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-2 rounded-lg transition-colors">
                📥 Export CSV
              </button>
            </div>

            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2d35]">
                      {['Store', 'Customer', 'Phone', 'Governorate', 'Amount', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-[#4a4e60] uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 100).map((order) => (
                      <tr key={order.id} className="border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                        <td className="px-4 py-3 text-xs text-[#8b8fa8] whitespace-nowrap">{order.stores?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm">{order.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#8b8fa8]">{order.customer_phone || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#8b8fa8]">{order.address_governorate || '—'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#4ade80] whitespace-nowrap">
                          {order.total_price} {order.stores?.currency || ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#4a4e60] whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                        </td>
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
      </div>
    </div>
  )
}
