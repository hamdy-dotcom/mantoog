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

export default function DashboardPage() {
  const [merchant, setMerchant] = useState<any>(null)
  const [store, setStore] = useState<any>(null)
  const [credits, setCredits] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [stats, setStats] = useState({ orders: 0, revenue: 0, delivered: 0, pending: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { lang, dir } = useLang()
  const tr = t[lang]

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: merchantData } = await supabase.from('merchants').select('*').eq('id', user.id).single()
      setMerchant(merchantData)

      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)

      const { data: creditsData } = await supabase.from('order_credits').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      setCredits(creditsData)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, products(title, images)')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setOrders(ordersData || [])

      const { data: allOrders } = await supabase.from('orders').select('total_price, status').eq('merchant_id', user.id)
      if (allOrders) {
        const revenue = allOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_price), 0)
        setStats({
          orders: allOrders.length,
          revenue,
          delivered: allOrders.filter(o => o.status === 'delivered').length,
          pending: allOrders.filter(o => o.status === 'pending').length,
          cancelled: allOrders.filter(o => o.status === 'cancelled').length,
        })
      }

      const { data: productsData } = await supabase.from('products').select('id, title, images, status').eq('merchant_id', user.id).order('created_at', { ascending: false }).limit(5)
      setProducts(productsData || [])

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

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} credits={credits} />

      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {tr.welcomeBack}{merchant?.full_name ? `, ${merchant.full_name.split(' ')[0]}` : ''} 👋
            </h1>
            <p className="text-[#8b8fa8] text-sm mt-1">{tr.storeToday}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/products/new')}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {tr.addProduct}
          </button>
        </div>

        {/* Credits warning */}
        {credits && credits.credits_remaining <= 20 && credits.credits_remaining > 0 && (
          <div className="mb-6 bg-[#3a2800] border border-[#fbbf24]/30 rounded-xl p-4 flex items-center justify-between">
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
          <div className="mb-6 bg-[#3a1414] border border-[#f87171]/30 rounded-xl p-4 flex items-center justify-between">
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

        {/* KPI Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: tr.totalOrders, value: stats.orders, icon: '🛒', sub: lang === 'ar' ? 'إجمالي الطلبات' : 'All time' },
            { label: tr.revenue, value: `${stats.revenue.toLocaleString()} ${store?.currency}`, icon: '💰', sub: lang === 'ar' ? 'من الطلبات المُسلَّمة' : 'From delivered orders' },
            { label: lang === 'ar' ? 'تم التسليم' : 'Delivered', value: stats.delivered, icon: '✅', sub: lang === 'ar' ? `${stats.orders > 0 ? Math.round((stats.delivered / stats.orders) * 100) : 0}% معدل التسليم` : `${stats.orders > 0 ? Math.round((stats.delivered / stats.orders) * 100) : 0}% delivery rate` },
            { label: tr.freeCreditsLeft, value: credits?.credits_remaining ?? 100, icon: '🎯', sub: lang === 'ar' ? 'طلب متبقي' : 'Orders remaining', highlight: (credits?.credits_remaining ?? 100) <= 20 },
          ].map((s, i) => (
            <div key={i} className={`bg-[#1a1d24] border rounded-xl p-5 ${s.highlight ? 'border-[#f59e0b]/40' : 'border-[#2a2d35]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{s.label}</div>
                <span className="text-xl">{s.icon}</span>
              </div>
              <div className={`text-2xl font-semibold mb-1 ${s.highlight ? 'text-[#f59e0b]' : 'text-white'}`}>{s.value}</div>
              <div className="text-xs text-[#8b8fa8]">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Order status mini stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: lang === 'ar' ? 'قيد الانتظار' : 'Pending', value: stats.pending, color: 'text-[#fbbf24]', bg: 'bg-[#3a2800]' },
            { label: lang === 'ar' ? 'تم التسليم' : 'Delivered', value: stats.delivered, color: 'text-[#4ade80]', bg: 'bg-[#14321f]' },
            { label: lang === 'ar' ? 'ملغي' : 'Cancelled', value: stats.cancelled, color: 'text-[#f87171]', bg: 'bg-[#3a1414]' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border border-[#2a2d35] rounded-xl p-4 flex items-center justify-between`}>
              <span className="text-sm text-[#8b8fa8]">{s.label}</span>
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Recent orders */}
          <div className="col-span-2 bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2d35] flex items-center justify-between">
              <h2 className="text-white font-medium">{lang === 'ar' ? 'آخر الطلبات' : 'Recent orders'}</h2>
              <button onClick={() => router.push('/dashboard/orders')} className="text-xs text-[#3b82f6] hover:underline">
                {lang === 'ar' ? 'عرض الكل' : 'View all'}
              </button>
            </div>
            {orders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <div className="text-white font-medium mb-1">{lang === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}</div>
                <div className="text-[#8b8fa8] text-sm">{lang === 'ar' ? 'ستظهر الطلبات هنا عند وصولها' : 'Orders will appear here when they arrive'}</div>
              </div>
            ) : (
              <div>
                {orders.map(order => (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{order.customer_name}</div>
                      <div className="text-xs text-[#4a4e60]">{order.customer_phone}</div>
                    </div>
                    <div className="text-xs text-[#8b8fa8] truncate max-w-[120px]">{order.products?.title}</div>
                    <div className="text-sm text-white font-medium whitespace-nowrap">{order.total_price} {order.currency}</div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[order.status] || 'bg-[#1f2229] text-[#8b8fa8]'}`}>
                      {order.status}
                    </span>
                    <div className="text-xs text-[#4a4e60] whitespace-nowrap">{new Date(order.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent products */}
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2d35] flex items-center justify-between">
              <h2 className="text-white font-medium">{lang === 'ar' ? 'المنتجات' : 'Products'}</h2>
              <button onClick={() => router.push('/dashboard/products')} className="text-xs text-[#3b82f6] hover:underline">
                {lang === 'ar' ? 'عرض الكل' : 'View all'}
              </button>
            </div>
            {products.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-3">📦</div>
                <div className="text-white font-medium text-sm mb-1">{tr.addFirstProduct}</div>
                <button onClick={() => router.push('/dashboard/products/new')} className="mt-3 text-xs text-[#3b82f6] hover:underline">{tr.addNew}</button>
              </div>
            ) : (
              <div>
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/products/${p.id}`)}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-[#0f1117] border border-[#2a2d35] flex items-center justify-center text-sm shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{p.title}</div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.status === 'active' ? 'bg-[#14321f] text-[#4ade80]' : 'bg-[#1f2229] text-[#8b8fa8]'}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
                <div className="px-5 py-3">
                  <button onClick={() => router.push('/dashboard/products/new')} className="w-full text-xs text-[#3b82f6] hover:text-white border border-dashed border-[#2a2d35] hover:border-[#3b82f6] rounded-lg py-2 transition-colors">
                    {tr.addNew}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Credits modal */}
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
