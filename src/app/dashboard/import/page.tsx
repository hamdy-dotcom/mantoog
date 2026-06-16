'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'

export default function ImportPage() {
  const { lang, dir } = useLang()
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [storeUrl, setStoreUrl] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      setStore(ctx.store)
      setLoading(false)
    }
    init()
  }, [])

  const handlePreview = async () => {
    if (!storeUrl) return
    setPreviewing(true)
    setError('')
    setPreview(null)
    setResult(null)
    try {
      const res = await fetch(`/api/import/easyorders?url=${encodeURIComponent(storeUrl)}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPreview(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Preview failed')
    }
    setPreviewing(false)
  }

  const handleImport = async () => {
    setImporting(true)
    setError('')
    try {
      const res = await fetch('/api/import/easyorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed')
    }
    setImporting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className={DASHBOARD_MAIN_CLASS}>
        <div className="max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
              <span className="text-3xl">🚀</span>
              {lang === 'ar' ? 'استيراد من EasyOrders' : 'Import from EasyOrders'}
            </h1>
            <p className="text-[#8b8fa8] text-sm">
              {lang === 'ar'
                ? 'انقل جميع منتجاتك إلى منتوج في ثوانٍ — فقط الصق رابط متجرك'
                : 'Move all your products to Mantoog in seconds — just paste your store URL'}
            </p>
          </div>

          {!result && (
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5 mb-5">
              <label className="text-xs font-bold text-[#8b8fa8] uppercase tracking-wider block mb-3">
                {lang === 'ar' ? 'رابط متجرك على EasyOrders' : 'Your EasyOrders store URL'}
              </label>
              <div className="flex gap-3 flex-wrap">
                <input
                  value={storeUrl}
                  onChange={e => { setStoreUrl(e.target.value); setPreview(null); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handlePreview()}
                  placeholder="https://your-store.myeasyorders.com"
                  dir="ltr"
                  className="flex-1 min-w-0 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]"
                />
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing || !storeUrl}
                  className="px-5 py-3 border border-[#2a2d35] rounded-lg text-sm text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {previewing
                    ? (lang === 'ar' ? '⏳ ...' : '⏳ ...')
                    : (lang === 'ar' ? '🔍 معاينة' : '🔍 Preview')}
                </button>
              </div>
              {error && !preview && (
                <div className="mt-3 text-sm text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg px-3 py-2">
                  ⚠ {error}
                </div>
              )}
            </div>
          )}

          {preview && !result && (
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5 mb-5">
              <div className="flex items-center gap-3 mb-5">
                {preview.logo && <img src={preview.logo} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                <div>
                  <div className="font-bold text-white text-lg">{preview.storeName}</div>
                  <div className="text-sm text-[#8b8fa8]">
                    {preview.total} {lang === 'ar' ? 'منتج جاهز للاستيراد' : 'products ready to import'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {preview.preview.map((p: { title: string; price: number; image?: string }, i: number) => (
                  <div key={i} className="bg-[#0f1117] rounded-xl overflow-hidden">
                    {p.image
                      ? <img src={p.image} alt="" className="w-full h-24 object-cover" />
                      : <div className="w-full h-24 flex items-center justify-center text-2xl bg-[#12151c]">📦</div>}
                    <div className="p-2">
                      <div className="text-xs font-bold text-white line-clamp-1">{p.title}</div>
                      <div className="text-xs text-[#3b82f6] font-bold mt-0.5">{p.price} {preview.currency}</div>
                    </div>
                  </div>
                ))}
              </div>
              {error && (
                <div className="mb-3 text-sm text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg px-3 py-2">
                  ⚠ {error}
                </div>
              )}
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="w-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white rounded-xl py-4 font-black text-base disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/20 transition-all"
              >
                {importing
                  ? (lang === 'ar' ? '⏳ جاري الاستيراد...' : '⏳ Importing...')
                  : (lang === 'ar' ? `🚀 استيراد ${preview.total} منتج الآن` : `🚀 Import ${preview.total} products now`)}
              </button>
            </div>
          )}

          {result && (
            <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-xl p-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <div className="text-xl font-black text-white mb-2">
                {lang === 'ar' ? `تم استيراد ${result.imported} منتج!` : `${result.imported} products imported!`}
              </div>
              <div className="text-sm text-[#8b8fa8] mb-6">
                {lang === 'ar'
                  ? `جميع منتجاتك من ${result.storeName} الآن في متجرك على منتوج`
                  : `All products from ${result.storeName} are now in your Mantoog store`}
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard/products')}
                className="bg-[#4ade80] text-[#0f1117] rounded-xl px-8 py-3 font-black text-sm"
              >
                {lang === 'ar' ? 'عرض المنتجات ←' : 'View products →'}
              </button>
            </div>
          )}

          {!preview && !result && (
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
              <h2 className="text-sm font-bold text-white mb-4">
                {lang === 'ar' ? 'كيف يعمل؟' : 'How it works'}
              </h2>
              {(lang === 'ar'
                ? [
                  { icon: '🔗', text: 'الصق رابط متجرك على EasyOrders' },
                  { icon: '👁', text: 'اضغط معاينة — سنجلب قائمة منتجاتك فوراً' },
                  { icon: '🚀', text: 'اضغط استيراد — كل المنتجات تنتقل في ثوانٍ' },
                  { icon: '✅', text: 'ابدأ البيع على منتوج فوراً' },
                ]
                : [
                  { icon: '🔗', text: 'Paste your EasyOrders store URL' },
                  { icon: '👁', text: 'Click Preview — we fetch your product list instantly' },
                  { icon: '🚀', text: 'Click Import — all products move over in seconds' },
                  { icon: '✅', text: 'Start selling on Mantoog right away' },
                ]
              ).map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#2a2d35] last:border-0">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm text-[#8b8fa8]">{s.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
