'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'platform' | 'method' | 'url' | 'api' | 'json' | 'preview' | 'importing' | 'done'
type Platform = 'easyorders' | 'shopify' | 'lightfunnel' | 'woocommerce' | 'other'
type Method = 'url' | 'api' | 'json'

const platforms = [
  { key: 'easyorders', label: 'EasyOrders', icon: '🛒' },
  { key: 'shopify', label: 'Shopify', icon: '🛍️' },
  { key: 'lightfunnel', label: 'LightFunnel', icon: '⚡' },
  { key: 'woocommerce', label: 'WooCommerce', icon: '🌐' },
  { key: 'other', label: 'منصة أخرى', icon: '📦' },
]

const methods = [
  {
    key: 'url',
    icon: '🔗',
    title: 'رابط المتجر',
    desc: 'الصق رابط متجرك على EasyOrders وسنستورد جميع المنتجات تلقائياً',
    badge: 'أسرع طريقة',
    badgeColor: 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20',
    gets: ['جميع المنتجات', 'الصور والأسعار', 'الأوصاف والمتغيرات'],
  },
  {
    key: 'api',
    icon: '⚡',
    title: 'مفتاح API',
    desc: 'أدخل API Key من لوحة تحكم EasyOrders للحصول على جميع المنتجات حتى المخفية منها',
    badge: 'منتجات أكثر',
    badgeColor: 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20',
    gets: ['جميع المنتجات بما فيها المخفية', 'الصور والأسعار', 'الأوصاف والمتغيرات'],
  },
  {
    key: 'json',
    icon: '📁',
    title: 'ملف JSON',
    desc: 'صدّر بيانات متجرك من EasyOrders كملف JSON وارفعه هنا',
    badge: 'بدون إنترنت',
    badgeColor: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20',
    gets: ['المنتجات', 'الطلبات المصدّرة', 'بيانات المتجر'],
  },
]

export default function MigrateModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('platform')
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [method, setMethod] = useState<Method | null>(null)
  const [storeUrl, setStoreUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [fetchedProducts, setFetchedProducts] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ products: 0, orders: 0, total: 0, step: '' })
  const [result, setResult] = useState<{ products: number; orders: number } | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handlePlatform = (p: Platform) => {
    setPlatform(p)
    if (p === 'easyorders') setStep('method')
    // else stay and show coming soon
  }

  const handleMethod = (m: Method) => {
    setMethod(m)
    setStep(m as Step)
  }

  const handleFetch = async () => {
    setLoading(true)
    setError('')
    try {
      let fetchUrl = ''
      if (method === 'api') {
        if (!apiKey) throw new Error('أدخل مفتاح API')
        fetchUrl = `/api/import/easyorders?apiKey=${encodeURIComponent(apiKey)}`
      } else {
        if (!storeUrl) throw new Error('أدخل رابط المتجر')
        fetchUrl = `/api/import/easyorders?url=${encodeURIComponent(storeUrl)}`
      }

      const res = await fetch(fetchUrl)
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      const products = data.preview_all || []
      setFetchedProducts(products)
      setSelectedIds(new Set(products.map((_: any, i: number) => i)))
      setStep('preview')
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleImport = async () => {
    setLoading(true)
    setError('')
    setStep('importing')

    try {
      if (method === 'url') {
        setProgress({ products: 0, orders: 0, total: 0, step: 'جاري قراءة المتجر...' })
        const selectedProducts = fetchedProducts.filter((_: any, i: number) => selectedIds.has(i))
        const res = await fetch('/api/import/easyorders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl, selectedProducts }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        setProgress({ products: data.imported, orders: 0, total: data.total, step: 'تم!' })
        setResult({ products: data.imported, orders: 0 })
      } else if (method === 'api') {
        setProgress({ products: 0, orders: 0, total: 0, step: 'جاري استيراد المنتجات...' })
        const res = await fetch('/api/import/easyorders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            selectedProducts: fetchedProducts.filter((_: any, i: number) => selectedIds.has(i)),
          }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        setProgress({ products: data.imported, orders: 0, total: data.total, step: 'تم!' })
        setResult({ products: data.imported, orders: 0 })
      } else if (method === 'json') {
        if (!jsonFile) throw new Error('اختر ملف JSON')
        setProgress({ products: 0, orders: 0, total: 0, step: 'جاري قراءة الملف...' })
        const text = await jsonFile.text()
        const data = JSON.parse(text)
        const res = await fetch('/api/import/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        })
        const result = await res.json()
        if (!result.success) throw new Error(result.error)
        setProgress({
          products: result.products,
          orders: result.orders || 0,
          total: result.products,
          step: 'تم!',
        })
        setResult({ products: result.products, orders: result.orders || 0 })
      }

      setStep('done')
    } catch (e: any) {
      setError(e.message)
      setStep((method as Step) || 'platform')
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2d35]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h2 className="text-white font-black text-lg">انقل متجرك إلى منتوج</h2>
              <p className="text-[#8b8fa8] text-xs">استورد منتجاتك وطلباتك في دقائق</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#4a4e60] hover:text-white transition-colors text-xl">
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* STEP: Platform */}
          {step === 'platform' && (
            <div>
              <p className="text-sm text-[#8b8fa8] mb-4">ما هي المنصة التي تستخدمها حالياً؟</p>
              <div className="grid grid-cols-1 gap-2">
                {platforms.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePlatform(p.key as Platform)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-right transition-all ${
                      platform === p.key
                        ? 'border-[#7c3aed] bg-[#7c3aed]/10'
                        : 'border-[#2a2d35] hover:border-[#7c3aed]/50'
                    }`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <span className="font-bold text-white">{p.label}</span>
                    {p.key !== 'easyorders' && platform === p.key && (
                      <span className="mr-auto text-xs bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 px-2 py-0.5 rounded-full">
                        قريباً
                      </span>
                    )}
                    {p.key === 'easyorders' && <span className="mr-auto text-[#4ade80] text-xs font-bold">متاح الآن ✓</span>}
                  </button>
                ))}
              </div>
              {platform && platform !== 'easyorders' && (
                <div className="mt-4 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl p-4 text-center">
                  <p className="text-[#f59e0b] text-sm font-bold">⏳ قريباً!</p>
                  <p className="text-[#8b8fa8] text-xs mt-1">نعمل على دعم هذه المنصة — سيتوفر قريباً</p>
                </div>
              )}
            </div>
          )}

          {/* STEP: Method */}
          {step === 'method' && (
            <div>
              <button
                onClick={() => setStep('platform')}
                className="text-[#8b8fa8] text-xs mb-4 hover:text-white transition-colors flex items-center gap-1"
              >
                ← رجوع
              </button>
              <p className="text-sm text-[#8b8fa8] mb-4">اختر طريقة الاستيراد</p>
              <div className="grid grid-cols-1 gap-3">
                {methods.map(m => (
                  <button
                    key={m.key}
                    onClick={() => handleMethod(m.key as Method)}
                    className="flex items-start gap-4 p-4 rounded-xl border border-[#2a2d35] hover:border-[#7c3aed]/50 text-right transition-all hover:bg-[#7c3aed]/5 group"
                  >
                    <span className="text-2xl mt-0.5">{m.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{m.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>
                      </div>
                      <p className="text-[#8b8fa8] text-xs leading-relaxed">{m.desc}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.gets.map(g => (
                          <span
                            key={g}
                            className="text-xs bg-[#0f1117] text-[#8b8fa8] border border-[#2a2d35] px-2 py-0.5 rounded-full"
                          >
                            ✓ {g}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[#4a4e60] group-hover:text-white transition-colors mt-1">←</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP: URL */}
          {step === 'url' && (
            <div>
              <button
                onClick={() => setStep('method')}
                className="text-[#8b8fa8] text-xs mb-4 hover:text-white transition-colors flex items-center gap-1"
              >
                ← رجوع
              </button>
              <label className="text-xs font-bold text-[#8b8fa8] uppercase tracking-wider block mb-3">رابط متجرك على EasyOrders</label>
              <input
                value={storeUrl}
                onChange={e => setStoreUrl(e.target.value)}
                placeholder="https://your-store.myeasyorders.com"
                dir="ltr"
                className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#7c3aed] mb-2"
              />
              <p className="text-xs text-[#4a4e60] mb-5">سنستورد جميع المنتجات مع صورها وأسعارها وأوصافها</p>
              {error && (
                <div className="text-[#f87171] text-xs bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg px-3 py-2 mb-3">
                  {error}
                </div>
              )}
              <button
                onClick={handleFetch}
                disabled={!storeUrl || loading}
                className="w-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white rounded-xl py-3.5 font-black text-sm disabled:opacity-50"
              >
                {loading ? '⏳ جاري جلب المنتجات...' : '🔍 جلب المنتجات'}
              </button>
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <div>
              <button
                onClick={() => setStep('url')}
                className="text-[#8b8fa8] text-xs mb-3 hover:text-white flex items-center gap-1"
              >
                ← رجوع
              </button>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white font-bold">{fetchedProducts.length} منتج</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedIds(new Set(fetchedProducts.map((_, i) => i)))}
                    className="text-xs text-[#3b82f6] hover:underline"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-[#4a4e60]">·</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-[#f87171] hover:underline">
                    إلغاء الكل
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 mb-4 pr-1">
                {fetchedProducts.map((p: any, i: number) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedIds.has(i) ? 'border-[#7c3aed]/50 bg-[#7c3aed]/5' : 'border-[#2a2d35]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(i)}
                      onChange={e => {
                        const next = new Set(selectedIds)
                        e.target.checked ? next.add(i) : next.delete(i)
                        setSelectedIds(next)
                      }}
                      className="w-4 h-4 accent-[#7c3aed] flex-shrink-0"
                    />
                    {p.image && <img src={p.image} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                    {!p.image && (
                      <div className="w-10 h-10 rounded-lg bg-[#0f1117] flex items-center justify-center text-lg flex-shrink-0">
                        📦
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{p.title}</div>
                      <div className="text-xs text-[#3b82f6] font-bold">{p.price}</div>
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <div className="text-[#f87171] text-xs bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg px-3 py-2 mb-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={selectedIds.size === 0 || loading}
                className="w-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white rounded-xl py-3.5 font-black text-sm disabled:opacity-50"
              >
                🚀 استورد {selectedIds.size} منتج الآن
              </button>
            </div>
          )}

          {/* STEP: API */}
          {step === 'api' && (
            <div>
              <button
                onClick={() => setStep('method')}
                className="text-[#8b8fa8] text-xs mb-4 hover:text-white transition-colors flex items-center gap-1"
              >
                ← رجوع
              </button>
              <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-white mb-2">كيف تحصل على API Key؟</p>
                {['اذهب إلى لوحة تحكم EasyOrders', 'الإعدادات ← التطبيقات والـ API', 'أنشئ مفتاح API جديد', 'انسخ المفتاح والصقه هنا'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div className="w-5 h-5 rounded-full bg-[#7c3aed] text-white text-xs flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-xs text-[#8b8fa8]">{s}</span>
                  </div>
                ))}
              </div>
              <label className="text-xs font-bold text-[#8b8fa8] uppercase tracking-wider block mb-3">EasyOrders API Key</label>
              <input
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                type="password"
                placeholder="الصق مفتاح الـ API هنا..."
                dir="ltr"
                className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#7c3aed] mb-2 font-mono"
              />
              <p className="text-xs text-[#4a4e60] mb-5">ستحصل على جميع المنتجات بما فيها المخفية من لوحة التحكم</p>
              {error && (
                <div className="text-[#f87171] text-xs bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg px-3 py-2 mb-3">
                  {error}
                </div>
              )}
              <button
                onClick={handleFetch}
                disabled={!apiKey || loading}
                className="w-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white rounded-xl py-3.5 font-black text-sm disabled:opacity-50"
              >
                {loading ? '⏳ جاري جلب المنتجات...' : '🔍 جلب المنتجات'}
              </button>
            </div>
          )}

          {/* STEP: JSON */}
          {step === 'json' && (
            <div>
              <button
                onClick={() => setStep('method')}
                className="text-[#8b8fa8] text-xs mb-4 hover:text-white transition-colors flex items-center gap-1"
              >
                ← رجوع
              </button>
              <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-white mb-2">كيف تصدّر ملف JSON من EasyOrders؟</p>
                {['اذهب إلى لوحة تحكم EasyOrders', 'الإعدادات ← تصدير البيانات', 'اختر تصدير JSON', 'ارفع الملف هنا'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div className="w-5 h-5 rounded-full bg-[#7c3aed] text-white text-xs flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-xs text-[#8b8fa8]">{s}</span>
                  </div>
                ))}
              </div>
              <label className="text-xs font-bold text-[#8b8fa8] uppercase tracking-wider block mb-3">ملف JSON</label>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[#2a2d35] rounded-xl cursor-pointer hover:border-[#7c3aed]/50 transition-colors mb-4">
                <span className="text-2xl mb-2">{jsonFile ? '✅' : '📁'}</span>
                <span className="text-sm text-[#8b8fa8]">{jsonFile ? jsonFile.name : 'اضغط لاختيار ملف JSON'}</span>
                <input type="file" accept=".json" className="hidden" onChange={e => setJsonFile(e.target.files?.[0] || null)} />
              </label>
              {error && (
                <div className="text-[#f87171] text-xs bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg px-3 py-2 mb-3">
                  {error}
                </div>
              )}
              <button
                onClick={handleImport}
                disabled={!jsonFile || loading}
                className="w-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white rounded-xl py-3.5 font-black text-sm disabled:opacity-50"
              >
                📁 استورد من الملف
              </button>
            </div>
          )}

          {/* STEP: Importing */}
          {step === 'importing' && (
            <div className="py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
                🚀
              </div>
              <p className="text-white font-bold mb-2">{progress.step}</p>
              <p className="text-[#8b8fa8] text-sm">يرجى الانتظار...</p>
              {progress.products > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-3">
                    <div className="text-2xl font-black text-[#4ade80]">{progress.products}</div>
                    <div className="text-xs text-[#8b8fa8]">منتج</div>
                  </div>
                  {progress.orders > 0 && (
                    <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-3">
                      <div className="text-2xl font-black text-[#3b82f6]">{progress.orders}</div>
                      <div className="text-xs text-[#8b8fa8]">طلب</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && result && (
            <div className="py-4 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-black text-white mb-2">تم النقل بنجاح!</h3>
              <p className="text-[#8b8fa8] text-sm mb-5">متجرك الآن على منتوج وجاهز للبيع</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-xl p-3">
                  <div className="text-2xl font-black text-[#4ade80]">{result.products}</div>
                  <div className="text-xs text-[#8b8fa8]">منتج تم استيراده</div>
                </div>
                {result.orders > 0 && (
                  <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-xl p-3">
                    <div className="text-2xl font-black text-[#3b82f6]">{result.orders}</div>
                    <div className="text-xs text-[#8b8fa8]">طلب تم استيراده</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    router.push('/dashboard/products')
                    onClose()
                  }}
                  className="flex-1 bg-[#4ade80] text-[#0f1117] rounded-xl py-3 font-black text-sm"
                >
                  عرض المنتجات
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-[#1a1d24] border border-[#2a2d35] text-white rounded-xl py-3 font-bold text-sm"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

