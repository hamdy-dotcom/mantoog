'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

const BUNDLES = [
  { id: 'starter_1000', orders: 1000, price: 299, per: 0.30, popular: false },
  { id: 'growth_2000', orders: 2000, price: 499, per: 0.25, popular: true },
  { id: 'scale_5000', orders: 5000, price: 999, per: 0.20, popular: false },
]

export default function BillingPage() {
  const [store, setStore] = useState<any>(null)
  const [credits, setCredits] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBundle, setSelectedBundle] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card')
  const [phone, setPhone] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { lang, dir } = useLang()
  const tr = t[lang]

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)
      const { data: creditsData } = await supabase.from('order_credits').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false })
      if (creditsData?.length) setCredits(creditsData[0])
      setTransactions(creditsData || [])
      setLoading(false)
    }
    init()
  }, [])

  const handlePurchase = async () => {
    if (!selectedBundle) return
    if (paymentMethod === 'wallet' && !phone.trim()) return
    setProcessing(true)

    // For now show a pending state — Paymob integration coming
    await new Promise(r => setTimeout(r, 1500))

    setProcessing(false)
    setShowModal(false)
    alert(lang === 'ar'
      ? 'تم استلام طلبك! سيتم تفعيل الرصيد خلال دقائق بعد تأكيد الدفع.'
      : 'Order received! Credits will be activated within minutes after payment confirmation.'
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-[#8b8fa8] text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} credits={credits} />

      <main className="flex-1 p-6 md:p-8 overflow-auto pb-24 md:pb-8 mt-14 md:mt-0">

        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">{lang === 'ar' ? 'الفواتير والرصيد' : 'Billing & Credits'}</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">{lang === 'ar' ? 'إدارة رصيد الطلبات وسجل المعاملات' : 'Manage your order credits and transaction history'}</p>
        </div>

        {/* Current credits */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <div className="text-xs text-[#4a4e60] uppercase tracking-wider mb-2">{lang === 'ar' ? 'الرصيد المتبقي' : 'Credits remaining'}</div>
            <div className={`text-3xl font-bold mb-1 ${(credits?.credits_remaining ?? 100) <= 20 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
              {credits?.credits_remaining ?? 100}
            </div>
            <div className="h-1.5 bg-[#2a2d35] rounded-full overflow-hidden mt-3">
              <div className={`h-full rounded-full ${(credits?.credits_remaining ?? 100) <= 20 ? 'bg-[#f87171]' : 'bg-[#4ade80]'}`}
                style={{ width: `${Math.min(((credits?.credits_remaining ?? 100) / (credits?.credits_total ?? 100)) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <div className="text-xs text-[#4a4e60] uppercase tracking-wider mb-2">{lang === 'ar' ? 'إجمالي الرصيد' : 'Total credits'}</div>
            <div className="text-3xl font-bold text-white mb-1">{credits?.credits_total ?? 100}</div>
            <div className="text-xs text-[#8b8fa8] mt-3">{lang === 'ar' ? 'منذ بداية الاشتراك' : 'Since account creation'}</div>
          </div>
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
            <div className="text-xs text-[#4a4e60] uppercase tracking-wider mb-2">{lang === 'ar' ? 'تم استخدامه' : 'Credits used'}</div>
            <div className="text-3xl font-bold text-white mb-1">{credits?.credits_used ?? 0}</div>
            <div className="text-xs text-[#8b8fa8] mt-3">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total orders processed'}</div>
          </div>
        </div>

        {/* Bundles */}
        <div className="mb-8">
          <h2 className="text-white font-medium mb-4">{lang === 'ar' ? 'شراء رصيد إضافي' : 'Purchase more credits'}</h2>
          <div className="grid grid-cols-3 gap-4">
            {BUNDLES.map(bundle => (
              <div
                key={bundle.id}
                onClick={() => { setSelectedBundle(bundle); setShowModal(true) }}
                className={`relative bg-[#1a1d24] border rounded-xl p-6 cursor-pointer transition-all hover:border-[#3b82f6] hover:bg-[#1f2229] ${bundle.popular ? 'border-[#3b82f6]' : 'border-[#2a2d35]'}`}
              >
                {bundle.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3b82f6] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {lang === 'ar' ? '⭐ الأفضل قيمة' : '⭐ Best value'}
                  </div>
                )}
                <div className="text-3xl font-bold text-white mb-1">{bundle.orders.toLocaleString()}</div>
                <div className="text-[#8b8fa8] text-sm mb-4">{lang === 'ar' ? 'طلب' : 'orders'}</div>
                <div className="text-2xl font-bold text-white mb-1">{bundle.price} <span className="text-sm text-[#8b8fa8]">EGP</span></div>
                <div className="text-xs text-[#4a4e60] mb-5">{bundle.per} EGP / {lang === 'ar' ? 'طلب' : 'order'}</div>
                <button className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${bundle.popular ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]' : 'border border-[#2a2d35] text-[#8b8fa8] hover:text-white hover:border-[#3b82f6]'}`}>
                  {lang === 'ar' ? 'شراء الآن' : 'Buy now'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2a2d35]">
            <h2 className="text-white font-medium">{lang === 'ar' ? 'سجل المعاملات' : 'Transaction history'}</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-[#4a4e60] text-sm">{lang === 'ar' ? 'لا توجد معاملات بعد' : 'No transactions yet'}</div>
          ) : (
            <div>
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d35] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#14321f] flex items-center justify-center text-sm">🎯</div>
                    <div>
                      <div className="text-sm text-white font-medium">
                        {tx.bundle_type === 'free' ? (lang === 'ar' ? 'رصيد مجاني' : 'Free credits') : `${tx.credits_total.toLocaleString()} ${lang === 'ar' ? 'طلب' : 'orders'}`}
                      </div>
                      <div className="text-xs text-[#4a4e60]">{new Date(tx.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#4ade80] font-medium">+{tx.credits_total}</div>
                    <div className="text-xs text-[#4a4e60]">{tx.price_paid > 0 ? `${tx.price_paid} EGP` : lang === 'ar' ? 'مجاني' : 'Free'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Payment modal */}
      {showModal && selectedBundle && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">{lang === 'ar' ? 'إتمام الدفع' : 'Complete payment'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#8b8fa8] hover:text-white text-2xl leading-none">×</button>
            </div>

            {/* Order summary */}
            <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4 mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#8b8fa8] text-sm">{lang === 'ar' ? 'الباقة' : 'Bundle'}</span>
                <span className="text-white font-medium">{selectedBundle.orders.toLocaleString()} {lang === 'ar' ? 'طلب' : 'orders'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8b8fa8] text-sm">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <span className="text-white font-bold text-lg">{selectedBundle.price} EGP</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="mb-5">
              <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{lang === 'ar' ? 'طريقة الدفع' : 'Payment method'}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${paymentMethod === 'card' ? 'border-[#3b82f6] bg-[#1a3a5c] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}
                >
                  💳 {lang === 'ar' ? 'بطاقة بنكية' : 'Bank card'}
                </button>
                <button
                  onClick={() => setPaymentMethod('wallet')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${paymentMethod === 'wallet' ? 'border-[#3b82f6] bg-[#1a3a5c] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}
                >
                  📱 {lang === 'ar' ? 'فودافون كاش' : 'Vodafone Cash'}
                </button>
              </div>
            </div>

            {/* Vodafone Cash phone */}
            {paymentMethod === 'wallet' && (
              <div className="mb-5">
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">{lang === 'ar' ? 'رقم فودافون كاش' : 'Vodafone Cash number'}</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
              </div>
            )}

            {/* Card payment notice */}
            {paymentMethod === 'card' && (
              <div className="mb-5 bg-[#1a3a5c] border border-[#3b82f6]/20 rounded-lg px-4 py-3">
                <p className="text-[#60a5fa] text-xs">{lang === 'ar' ? '🔒 ستتم إعادة توجيهك لبوابة الدفع الآمنة لإتمام الدفع بالبطاقة' : '🔒 You will be redirected to our secure payment gateway to complete card payment'}</p>
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={processing || (paymentMethod === 'wallet' && !phone.trim())}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {processing ? (lang === 'ar' ? 'جاري المعالجة...' : 'Processing...') : `${lang === 'ar' ? 'ادفع' : 'Pay'} ${selectedBundle.price} EGP`}
            </button>

            <p className="text-center text-xs text-[#4a4e60] mt-3">{lang === 'ar' ? 'الرصيد لا ينتهي · سيُفعَّل فور تأكيد الدفع' : 'Credits never expire · Activated immediately after payment'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
