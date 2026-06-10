'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#3a2800] text-[#fbbf24]',
  confirmed: 'bg-[#14321f] text-[#4ade80]',
  processing: 'bg-[#1a3a5c] text-[#60a5fa]',
  shipped: 'bg-[#1a3a5c] text-[#60a5fa]',
  delivered: 'bg-[#14321f] text-[#4ade80]',
  cancelled: 'bg-[#3a1414] text-[#f87171]',
  returned: 'bg-[#3a1414] text-[#f87171]',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

export default function OrdersPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const [store, setStore] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: storeData } = await supabase
        .from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, products(title, images)')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })
      setOrders(ordersData || [])
      setLoading(false)
    }
    init()
  }, [])

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    setUpdatingId(null)
  }

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter
    const matchesSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.includes(search) ||
      o.products?.title?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const exportCSV = () => {
    const headers = ['Order', 'Customer', 'Phone', 'Product', 'Qty', 'Total', 'Governorate', 'Address', 'Status', 'Date']
    const rows = filteredOrders.map(o => [
      o.order_number || o.id.slice(0, 8),
      o.customer_name,
      o.customer_phone,
      o.products?.title || '',
      o.quantity,
      `${o.total_price} ${o.currency}`,
      o.address_governorate || '',
      o.address_line1 || '',
      o.status,
      new Date(o.created_at).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    revenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_price), 0),
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className="flex-1 p-6 md:p-8 overflow-auto pb-24 md:pb-8 mt-14 md:mt-0">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{tr.ordersTitle}</h1>
            <p className="text-[#8b8fa8] text-sm mt-1">{orders.length} total orders</p>
          </div>
          <button
            onClick={exportCSV}
            className="bg-[#1a1d24] border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {tr.exportCsv}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Pending', value: stats.pending, color: 'text-[#fbbf24]' },
            { label: 'Delivered', value: stats.delivered, color: 'text-[#4ade80]' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-[#f87171]' },
            { label: `Revenue (${store?.currency})`, value: stats.revenue.toLocaleString(), color: 'text-[#4ade80]' },
          ].map((s, i) => (
            <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4">
              <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.color || 'text-white'}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl">
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
              >
                {f === 'all' ? 'All' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tr.searchOrders}
            className="flex-1 bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors min-w-[200px]"
          />
        </div>

        {/* Orders table */}
        {filteredOrders.length === 0 ? (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-white font-medium text-lg mb-2">{tr.noOrders}</h2>
            <p className="text-[#8b8fa8] text-sm">{tr.noOrdersDesc}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden min-w-[700px]">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-[#2a2d35]">
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">#</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.customer}</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.product}</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.address}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.total}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.qty}</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.status}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.date}</span>
            </div>

            {filteredOrders.map(order => (
              <div key={order.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors items-center">

                {/* Order number */}
                <div className="col-span-1">
                  <span className="text-xs text-[#4a4e60] font-mono">#{order.order_number || order.id.slice(0, 6)}</span>
                </div>

                {/* Customer */}
                <div className="col-span-2">
                  <div className="text-sm text-white font-medium truncate">{order.customer_name}</div>
                  <div className="text-xs text-[#4a4e60] mt-0.5">{order.customer_phone}</div>
                </div>

                {/* Product */}
                <div className="col-span-2 flex items-center gap-2">
                  {order.products?.images?.[0] && (
                    <img src={order.products.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
                  )}
                  <span className="text-xs text-[#8b8fa8] truncate">{order.products?.title || '—'}</span>
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <div className="text-xs text-[#8b8fa8] truncate">{order.address_governorate}</div>
                  <div className="text-xs text-[#4a4e60] truncate">{order.address_line1}</div>
                </div>

                {/* Total */}
                <div className="col-span-1">
                  <span className="text-sm text-white font-medium">{order.total_price}</span>
                  <span className="text-xs text-[#4a4e60] ml-1">{order.currency}</span>
                </div>

                {/* Qty */}
                <div className="col-span-1">
                  <span className="text-sm text-[#8b8fa8]">×{order.quantity}</span>
                </div>

                {/* Status dropdown */}
                <div className="col-span-2">
                  <select
                    value={order.status}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    disabled={updatingId === order.id}
                    className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[order.status] || 'bg-[#1f2229] text-[#8b8fa8]'}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="col-span-1">
                  <span className="text-xs text-[#4a4e60]">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>

              </div>
            ))}
          </div>
          </div>
        )}
      </main>
    </div>
  )
}
