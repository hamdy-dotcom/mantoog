'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'

export default function AnalyticsPage() {
  const { dir } = useLang()
  const [store, setStore] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: true })
      setOrders(ordersData || [])

      const { data: productsData } = await supabase
        .from('products')
        .select('id, title, images')
        .eq('merchant_id', user.id)

      const { data: landingPagesData } = await supabase
        .from('landing_pages')
        .select('product_id, visits')
        .in('product_id', (productsData || []).map((p: any) => p.id))

      const enrichedProducts = (productsData || []).map((p: any) => ({
        ...p,
        landing_pages: landingPagesData?.filter((lp: any) => lp.product_id === p.id) || [],
      }))

      setProducts(enrichedProducts)
      console.log('Products with landing pages:', JSON.stringify(enrichedProducts.slice(0, 2), null, 2))

      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  // Compute stats
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_price), 0)
  const totalOrders = orders.length
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
  const cancellationRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0

  // Orders by day (last 14 days)
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toISOString().slice(0, 10)
  })

  const ordersByDay = last14Days.map(day => ({
    day: day.slice(5),
    count: orders.filter(o => o.created_at?.slice(0, 10) === day).length,
    revenue: orders.filter(o => o.created_at?.slice(0, 10) === day && o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total_price), 0),
  }))

  const maxOrders = Math.max(...ordersByDay.map(d => d.count), 1)

  // Top products by orders
  const productOrderCounts = products.map(p => {
    const orderCount = orders.filter(o => o.product_id === p.id).length
    const visits = p.landing_pages?.[0]?.visits || 0
    const conversionRate = visits > 0 ? ((orderCount / visits) * 100).toFixed(1) : '0'
    return {
      ...p,
      count: orderCount,
      visits,
      conversionRate,
      revenue: orders.filter(o => o.product_id === p.id && o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_price), 0),
    }
  }).sort((a, b) => b.count - a.count).slice(0, 5)

  // Orders by status
  const statusBreakdown = [
    { label: 'Pending', count: pendingOrders, color: '#fbbf24' },
    { label: 'Delivered', count: deliveredOrders, color: '#4ade80' },
    { label: 'Cancelled', count: cancelledOrders, color: '#f87171' },
    { label: 'Other', count: totalOrders - pendingOrders - deliveredOrders - cancelledOrders, color: '#60a5fa' },
  ]

  // Top governorates
  const govCounts: Record<string, number> = {}
  orders.forEach(o => {
    if (o.address_governorate) {
      govCounts[o.address_governorate] = (govCounts[o.address_governorate] || 0) + 1
    }
  })
  const topGovs = Object.entries(govCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className="flex-1 p-6 md:p-8 overflow-auto pb-24 md:pb-8 mt-14 md:mt-0">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">Store performance overview</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total orders', value: totalOrders, sub: 'All time' },
            { label: 'Revenue', value: `${totalRevenue.toLocaleString()} ${store?.currency}`, sub: 'From delivered orders' },
            { label: 'Delivery rate', value: `${deliveryRate}%`, sub: `${deliveredOrders} delivered`, color: deliveryRate >= 50 ? 'text-[#4ade80]' : 'text-[#f87171]' },
            { label: 'Cancellation rate', value: `${cancellationRate}%`, sub: `${cancelledOrders} cancelled`, color: cancellationRate <= 20 ? 'text-[#4ade80]' : 'text-[#f87171]' },
            { label: 'Avg conversion rate', value: `${products.length > 0 ? (productOrderCounts.reduce((sum, p) => sum + parseFloat(p.conversionRate), 0) / Math.max(productOrderCounts.filter(p => p.visits > 0).length, 1)).toFixed(1) : 0}%`, sub: 'Orders / landing page visits' },
          ].map((kpi, i) => (
            <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
              <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-2">{kpi.label}</div>
              <div className={`text-2xl font-semibold mb-1 ${kpi.color || 'text-white'}`}>{kpi.value}</div>
              <div className="text-xs text-[#8b8fa8]">{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">

          {/* Orders chart — last 14 days */}
          <div className="col-span-2 bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <h2 className="text-white font-medium mb-4">Orders — last 14 days</h2>
            {totalOrders === 0 ? (
              <div className="h-32 flex items-center justify-center text-[#4a4e60] text-sm">No orders yet</div>
            ) : (
              <div className="flex items-end gap-1.5 h-32">
                {ordersByDay.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-[#4a4e60]">{d.count > 0 ? d.count : ''}</div>
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${Math.max((d.count / maxOrders) * 96, d.count > 0 ? 4 : 0)}px`,
                        background: d.count > 0 ? '#3b82f6' : '#1f2229',
                        minHeight: '2px'
                      }}
                    />
                    <div className="text-xs text-[#4a4e60] rotate-0" style={{ fontSize: 9 }}>{d.day}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order status breakdown */}
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <h2 className="text-white font-medium mb-4">Order status</h2>
            {totalOrders === 0 ? (
              <div className="h-32 flex items-center justify-center text-[#4a4e60] text-sm">No orders yet</div>
            ) : (
              <div className="space-y-3">
                {statusBreakdown.filter(s => s.count > 0).map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[#8b8fa8]">{s.label}</span>
                      <span className="text-xs font-medium" style={{ color: s.color }}>{s.count} ({Math.round((s.count / totalOrders) * 100)}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#2a2d35] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(s.count / totalOrders) * 100}%`, background: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">

          {/* Top products */}
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <h2 className="text-white font-medium mb-4">Top products</h2>
            {productOrderCounts.length === 0 ? (
              <div className="text-[#4a4e60] text-sm">No products yet</div>
            ) : (
              <div className="space-y-3">
                {productOrderCounts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs text-[#4a4e60] w-4">{i + 1}</span>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover border border-[#2a2d35]" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#2a2d35] flex items-center justify-center text-xs">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{p.title}</div>
                      <div className="text-xs text-[#4a4e60]">{p.count} orders · {p.visits} visits · <span className={parseFloat(p.conversionRate) >= 2 ? 'text-[#4ade80]' : 'text-[#f87171]'}>{p.conversionRate}% CVR</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top governorates */}
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <h2 className="text-white font-medium mb-4">Top regions</h2>
            {topGovs.length === 0 ? (
              <div className="text-[#4a4e60] text-sm">No orders yet</div>
            ) : (
              <div className="space-y-3">
                {topGovs.map(([gov, count], i) => (
                  <div key={gov}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">{gov}</span>
                      <span className="text-xs text-[#8b8fa8]">{count} orders</span>
                    </div>
                    <div className="h-1.5 bg-[#2a2d35] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3b82f6] rounded-full"
                        style={{ width: `${(count / topGovs[0][1]) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
