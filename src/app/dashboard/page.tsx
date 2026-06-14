'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import DashboardFiltersBar, { DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from '@/components/dashboard/DashboardFiltersBar'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { daysBetween } from '@/lib/dashboard/date-range'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#3a2800] text-[#fbbf24]',
  confirmed: 'bg-[#14321f] text-[#4ade80]',
  processing: 'bg-[#1a3a5c] text-[#60a5fa]',
  shipped: 'bg-[#1a3a5c] text-[#60a5fa]',
  delivered: 'bg-[#14321f] text-[#4ade80]',
  cancelled: 'bg-[#3a1414] text-[#f87171]',
  returned: 'bg-[#3a1414] text-[#f87171]',
}

function yDomain(data: { count: number }[]) {
  const values = data.map(d => d.count)
  if (!values.length) return [0, 1]
  const max = Math.max(...values)
  const pad = max === 0 ? 1 : Math.max(max * 0.15, 1)
  return [0, max + pad]
}

function OrdersChartTooltip({ active, payload, label, lang }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  lang: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
      <div className="text-[#8b8fa8] mb-0.5">{label}</div>
      <div className="text-white font-semibold">
        {payload[0].value} {lang === 'ar' ? 'طلب' : 'orders'}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [merchant, setMerchant] = useState<any>(null)
  const [store, setStore] = useState<any>(null)
  const [credits, setCredits] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS)
  const router = useRouter()
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
    }
    init()
  }, [])

  const filteredOrders = useMemo(
    () => applyOrderFilters(orders, filters),
    [orders, filters]
  )

  const regionOptions = useMemo(() => {
    const regions = new Set<string>()
    orders.forEach(o => {
      if (o.address_governorate) regions.add(o.address_governorate)
    })
    return [...regions].sort((a, b) => a.localeCompare(b, lang === 'ar' ? 'ar' : 'en'))
  }, [orders, lang])

  const recentOrders = useMemo(
    () => [...filteredOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [filteredOrders]
  )

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length
    const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered').length
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length
    const totalRevenue = filteredOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total_price), 0)
    const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
    const cancellationRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0

    const productsInScope = filters.productId
      ? products.filter(p => p.id === filters.productId)
      : products

    const productOrderCounts = productsInScope.map(p => {
      const orderCount = filteredOrders.filter(o => o.product_id === p.id).length
      const visits = p.landing_pages?.[0]?.visits || 0
      const conversionRate = visits > 0 ? (orderCount / visits) * 100 : 0
      return { ...p, count: orderCount, visits, conversionRate }
    }).filter(p => p.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)

    const withVisits = productsInScope
      .map(p => {
        const orderCount = filteredOrders.filter(o => o.product_id === p.id).length
        const visits = p.landing_pages?.[0]?.visits || 0
        return visits > 0 ? (orderCount / visits) * 100 : null
      })
      .filter((r): r is number => r !== null)

    const conversionRate = withVisits.length > 0
      ? withVisits.reduce((sum, r) => sum + r, 0) / withVisits.length
      : 0

    const rangeDays = daysBetween(filters.dateStart, filters.dateEnd)
    const ordersByDay = rangeDays.map(day => ({
      date: day,
      label: day.slice(5),
      count: filteredOrders.filter(o => o.created_at?.slice(0, 10) === day).length,
    }))

    const statusBreakdown = [
      { key: 'pending', label: lang === 'ar' ? 'قيد الانتظار' : 'Pending', count: pendingOrders, color: '#fbbf24' },
      { key: 'delivered', label: lang === 'ar' ? 'تم التسليم' : 'Delivered', count: deliveredOrders, color: '#4ade80' },
      { key: 'cancelled', label: lang === 'ar' ? 'ملغي' : 'Cancelled', count: cancelledOrders, color: '#f87171' },
    ]

    const govCounts: Record<string, number> = {}
    filteredOrders.forEach(o => {
      if (o.address_governorate) {
        govCounts[o.address_governorate] = (govCounts[o.address_governorate] || 0) + 1
      }
    })
    const topGovs = Object.entries(govCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return {
      totalOrders,
      totalRevenue,
      deliveryRate,
      deliveredOrders,
      cancellationRate,
      cancelledOrders,
      conversionRate,
      productOrderCounts,
      ordersByDay,
      statusBreakdown,
      topGovs,
    }
  }, [filteredOrders, products, filters.productId, filters.dateStart, filters.dateEnd, lang])

  const chartDomain = useMemo(() => yDomain(metrics.ordersByDay), [metrics.ordersByDay])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  const periodSub = lang === 'ar' ? 'في الفترة المحددة' : 'In selected period'

  const kpiCards = [
    { label: tr.totalOrders, value: metrics.totalOrders, sub: periodSub },
    { label: tr.revenue, value: `${metrics.totalRevenue.toLocaleString()} ${store?.currency}`, sub: lang === 'ar' ? 'من الطلبات المُسلَّمة' : 'From delivered orders' },
    {
      label: lang === 'ar' ? 'معدل التسليم' : 'Delivery rate',
      value: `${metrics.deliveryRate}%`,
      sub: lang === 'ar' ? `${metrics.deliveredOrders} تم التسليم` : `${metrics.deliveredOrders} delivered`,
      color: metrics.deliveryRate >= 50 ? 'text-[#4ade80]' : 'text-[#f87171]',
    },
    {
      label: lang === 'ar' ? 'معدل الإلغاء' : 'Cancellation rate',
      value: `${metrics.cancellationRate}%`,
      sub: lang === 'ar' ? `${metrics.cancelledOrders} ملغي` : `${metrics.cancelledOrders} cancelled`,
      color: metrics.cancellationRate <= 20 ? 'text-[#4ade80]' : 'text-[#f87171]',
    },
    {
      label: lang === 'ar' ? 'معدل التحويل' : 'Conversion rate',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      sub: lang === 'ar' ? 'طلبات / زيارات الصفحة' : 'Orders / landing page visits',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex w-full min-w-0" dir={dir}>
      <Sidebar store={store} credits={credits} />

      <main className={`${DASHBOARD_MAIN_CLASS} space-y-5`}>

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-white">
              {tr.welcomeBack}{merchant?.full_name ? `, ${merchant.full_name.split(' ')[0]}` : ''} 👋
            </h1>
            <p className="text-[#8b8fa8] text-sm mt-1">{tr.storeToday}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/products/new')}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0 self-start sm:self-auto"
          >
            {tr.addProduct}
          </button>
        </div>

        <DashboardFiltersBar
          lang={lang}
          filters={filters}
          onChange={setFilters}
          products={products.map(p => ({ id: p.id, title: p.title }))}
          regions={regionOptions}
        />

        {/* Credits warning */}
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

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {kpiCards.map((kpi, i) => (
            <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-3 md:p-4">
              <div className="text-[10px] md:text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-1.5">{kpi.label}</div>
              <div className={`text-xl md:text-2xl font-bold mb-0.5 ${kpi.color || 'text-white'}`}>{kpi.value}</div>
              <div className="text-[11px] text-[#8b8fa8]">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Daily orders + Order status */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 md:p-5">
            <h2 className="text-white font-medium text-sm mb-3">
              {lang === 'ar' ? 'الطلبات اليومية' : 'Daily orders'}
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={metrics.ordersByDay}
                margin={{ top: 8, right: dir === 'rtl' ? 0 : 4, left: dir === 'rtl' ? 4 : 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dashboard-orders-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#4a4e60', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis hide domain={chartDomain} allowDecimals={false} />
                <Tooltip content={<OrdersChartTooltip lang={lang} />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#dashboard-orders-gradient)"
                  dot={{ r: 2.5, fill: '#60a5fa', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: '#60a5fa' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 md:p-5 flex flex-col">
            <h2 className="text-white font-medium text-sm mb-3">
              {lang === 'ar' ? 'حالة الطلبات' : 'Order status'}
            </h2>
            {metrics.totalOrders === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[#4a4e60] text-sm min-h-[160px]">
                {lang === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center gap-4 min-h-[160px]">
                {metrics.statusBreakdown.map(s => (
                  <div key={s.key}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-[#8b8fa8]">{s.label}</span>
                      <span className="text-xs font-medium" style={{ color: s.color }}>
                        {s.count} ({metrics.totalOrders > 0 ? Math.round((s.count / metrics.totalOrders) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[#2a2d35] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${metrics.totalOrders > 0 ? (s.count / metrics.totalOrders) * 100 : 0}%`,
                          background: s.color,
                          minWidth: s.count > 0 ? '4px' : 0,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top products + Top regions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 md:p-5">
            <h2 className="text-white font-medium text-sm mb-3">{lang === 'ar' ? 'أفضل المنتجات' : 'Top products'}</h2>
            {metrics.productOrderCounts.length === 0 ? (
              <div className="text-[#4a4e60] text-sm py-4">{lang === 'ar' ? 'لا توجد منتجات بعد' : 'No products yet'}</div>
            ) : (
              <div className="space-y-2.5">
                {metrics.productOrderCounts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs text-[#4a4e60] w-4 shrink-0">{i + 1}</span>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#2a2d35] flex items-center justify-center text-xs shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{p.title}</div>
                      <div className="text-xs text-[#4a4e60]">
                        {p.count} {lang === 'ar' ? 'طلب' : 'orders'} · {p.visits} {lang === 'ar' ? 'زيارة' : 'visits'} ·{' '}
                        <span className={p.conversionRate >= 2 ? 'text-[#4ade80]' : 'text-[#f87171]'}>
                          {p.conversionRate.toFixed(1)}% CVR
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 md:p-5">
            <h2 className="text-white font-medium text-sm mb-3">{lang === 'ar' ? 'أفضل المناطق' : 'Top regions'}</h2>
            {metrics.topGovs.length === 0 ? (
              <div className="text-[#4a4e60] text-sm py-4">{lang === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}</div>
            ) : (
              <div className="space-y-2.5">
                {metrics.topGovs.map(([gov, count]) => (
                  <div key={gov}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white truncate pe-2">{gov}</span>
                      <span className="text-xs text-[#8b8fa8] shrink-0">
                        {count} {lang === 'ar' ? 'طلب' : 'orders'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2a2d35] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3b82f6] rounded-full"
                        style={{ width: `${(count / metrics.topGovs[0][1]) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Latest orders */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#2a2d35] flex items-center justify-between">
            <h2 className="text-white font-medium text-sm">{lang === 'ar' ? 'آخر الطلبات' : 'Latest orders'}</h2>
            <button onClick={() => router.push('/dashboard/orders')} className="text-xs text-[#3b82f6] hover:underline">
              {lang === 'ar' ? 'عرض الكل' : 'View all'}
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-white font-medium text-sm mb-1">{lang === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}</div>
              <div className="text-[#8b8fa8] text-xs">{lang === 'ar' ? 'ستظهر الطلبات هنا عند وصولها' : 'Orders will appear here when they arrive'}</div>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2d35]">
              {recentOrders.map(order => (
                <div key={order.id} className="px-4 sm:px-5 py-3 hover:bg-[#1f2229] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white font-medium truncate">{order.customer_name}</div>
                      <div className="text-xs text-[#4a4e60]">{order.customer_phone}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap shrink-0 ${STATUS_COLORS[order.status] || 'bg-[#1f2229] text-[#8b8fa8]'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8b8fa8]">
                    {order.products?.title && (
                      <span className="truncate max-w-full">{order.products.title}</span>
                    )}
                    <span className="text-sm text-white font-medium whitespace-nowrap">
                      {order.total_price} {order.currency}
                    </span>
                    <span className="text-[#4a4e60] whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreditsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">{lang === 'ar' ? 'شراء رصيد طلبات' : 'Buy order credits'}</h2>
              <button onClick={() => setShowCreditsModal(false)} className="text-[#8b8fa8] hover:text-white text-xl">×</button>
            </div>
            <p className="text-[#8b8fa8] text-sm mb-6">{lang === 'ar' ? 'الرصيد لا ينتهي. كلما اشتريت أكثر، كلما قل السعر لكل طلب.' : 'Credits never expire. The more you buy, the less per order.'}</p>
            <div className="space-y-3 mb-6">
              {[
                { bundle: lang === 'ar' ? '1,000 طلب' : '1,000 orders', price: '299 EGP', per: lang === 'ar' ? '0.30 ج/طلب' : '0.30 EGP/order', popular: false },
                { bundle: lang === 'ar' ? '2,000 طلب' : '2,000 orders', price: '499 EGP', per: lang === 'ar' ? '0.25 ج/طلب' : '0.25 EGP/order', popular: true },
                { bundle: lang === 'ar' ? '5,000 طلب' : '5,000 orders', price: '999 EGP', per: lang === 'ar' ? '0.20 ج/طلب' : '0.20 EGP/order', popular: false },
              ].map((plan, i) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${plan.popular ? 'border-[#3b82f6] bg-[#1a3a5c]' : 'border-[#2a2d35] hover:border-[#3b82f6]'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{plan.bundle}</span>
                      {plan.popular && <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full">{lang === 'ar' ? 'الأفضل قيمة' : 'Best value'}</span>}
                    </div>
                    <div className="text-xs text-[#8b8fa8] mt-0.5">{plan.per}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{plan.price}</div>
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
    </div>
  )
}
