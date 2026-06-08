'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'

const COUNTRIES = [
  { code: 'EG', label: 'Egypt', flag: '🇪🇬' },
  { code: 'SA', label: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', label: 'UAE', flag: '🇦🇪' },
  { code: 'MA', label: 'Morocco', flag: '🇲🇦' },
  { code: 'DZ', label: 'Algeria', flag: '🇩🇿' },
]

const CATEGORIES = [
  { id: 'all', label: { en: 'All', ar: 'الكل' } },
  { id: 'electronics', label: { en: 'Electronics', ar: 'إلكترونيات' } },
  { id: 'home', label: { en: 'Home', ar: 'المنزل' } },
  { id: 'sports', label: { en: 'Sports', ar: 'رياضة' } },
  { id: 'fashion', label: { en: 'Fashion', ar: 'موضة' } },
]

const SOURCES = [
  { id: 'amazon', label: 'Amazon', flag: '📦' },
  { id: 'noon', label: 'Noon', flag: '🌙' },
  { id: 'aliexpress', label: 'AliExpress', flag: '🛒', comingSoon: true },
]

export default function ResearchPage() {
  const [store, setStore] = useState<any>(null)
  const [credits, setCredits] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('bestsellers')
  const [selectedCountry, setSelectedCountry] = useState('EG')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const [scrapedProducts, setScrapedProducts] = useState<any[]>([])
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [scrapeLoaded, setScrapeLoaded] = useState(false)
  const [selectedSource, setSelectedSource] = useState('amazon')

  // Hot on Mantoog
  const [hotProducts, setHotProducts] = useState<any[]>([])
  const [hotLoading, setHotLoading] = useState(false)

  // Analyzer
  const [analyzerUrl, setAnalyzerUrl] = useState('')
  const [analyzerResult, setAnalyzerResult] = useState<any>(null)
  const [analyzerLoading, setAnalyzerLoading] = useState(false)

  // Profit calculator
  const [profitCost, setProfitCost] = useState('')
  const [profitSell, setProfitSell] = useState('')
  const [profitAds, setProfitAds] = useState('')
  const [profitOrders, setProfitOrders] = useState('30')

  const router = useRouter()
  const supabase = createClient()
  const { lang, dir } = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)
      const { data: creditsData } = await supabase.from('order_credits').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      setCredits(creditsData)

      // Auto-detect country from store currency
      const countryMap: Record<string, string> = { EGP: 'EG', SAR: 'SA', AED: 'AE', MAD: 'MA', DZD: 'DZ' }
      const country = countryMap[storeData.currency] || 'EG'
      setSelectedCountry(country)
      setLoading(false)

      fetchBestsellers(country, 'all', 'amazon')
      fetchHotProducts(country)
    }
    init()
  }, [])

  const fetchBestsellers = async (country: string, category: string, source: string) => {
    if (source === 'aliexpress') {
      setScrapeLoaded(true)
      setScrapedProducts([])
      return
    }
    setScrapeLoading(true)
    setScrapedProducts([])
    try {
      const res = await fetch('/api/scrape-bestsellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, category, source }),
      })
      const data = await res.json()
      setScrapedProducts(data.products || [])
      setScrapeLoaded(true)
    } catch {}
    setScrapeLoading(false)
  }

  const fetchHotProducts = async (country: string) => {
    setHotLoading(true)
    try {
      const res = await fetch('/api/hot-on-mantoog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      })
      const data = await res.json()
      setHotProducts(data.products || [])
    } catch {}
    setHotLoading(false)
  }

  const handleAnalyze = async () => {
    if (!analyzerUrl.trim()) return
    setAnalyzerLoading(true)
    setAnalyzerResult(null)
    try {
      const res = await fetch('/api/ai/analyze-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: analyzerUrl, country: selectedCountry, currency: store?.currency, language: lang }),
      })
      const data = await res.json()
      setAnalyzerResult(data)
    } catch {}
    setAnalyzerLoading(false)
  }

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code)
    if (activeTab === 'bestsellers') fetchBestsellers(code, selectedCategory, selectedSource)
    if (activeTab === 'hot') fetchHotProducts(code)
  }

  // Profit calculator
  const cost = parseFloat(profitCost) || 0
  const sell = parseFloat(profitSell) || 0
  const ads = parseFloat(profitAds) || 0
  const ordersPerDay = parseFloat(profitOrders) || 0
  const profitPerOrder = sell - cost - ads
  const marginPct = sell > 0 ? Math.round((profitPerOrder / sell) * 100) : 0
  const monthlyProfit = profitPerOrder * ordersPerDay * 30
  const returnImpact = monthlyProfit * 0.75
  const breakEvenRoas = sell > 0 && ads > 0 ? (sell / ads).toFixed(2) : '—'

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-[#8b8fa8] text-sm">Loading...</div>
    </div>
  )

  const tabs = [
    { id: 'bestsellers', icon: '🏆', label: lang === 'ar' ? 'الأكثر مبيعاً' : 'Bestsellers' },
    { id: 'hot', icon: '🔥', label: lang === 'ar' ? 'الأكثر طلباً على Mantoog' : 'Hot on Mantoog' },
    { id: 'analyzer', icon: '🤖', label: lang === 'ar' ? 'محلل المنتجات' : 'Analyzer' },
    { id: 'profit', icon: '💰', label: lang === 'ar' ? 'حاسبة الربح' : 'Profit Calc' },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} credits={credits} />
      <main className="flex-1 pt-16 md:pt-0 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
        <div className="p-8 pb-4">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-white">{lang === 'ar' ? '🔍 أبحاث المنتجات' : '🔍 Product Research'}</h1>
            <p className="text-[#8b8fa8] text-sm mt-1">{lang === 'ar' ? 'بيانات حقيقية من Meta وبيانات Mantoog الفعلية' : 'Real data from Meta ads and actual Mantoog orders'}</p>
          </div>

          {/* Country filter */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'السوق:' : 'Market:'}</span>
            {COUNTRIES.map(c => (
              <button key={c.code} onClick={() => handleCountryChange(c.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedCountry === c.code ? 'bg-[#3b82f6] text-white' : 'bg-[#1a1d24] border border-[#2a2d35] text-[#8b8fa8] hover:text-white hover:border-[#3b82f6]'}`}>
                {c.flag} {c.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl w-fit mb-6 flex-wrap">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 pb-8">

          {activeTab === 'bestsellers' && (
            <div>
              {/* Source + category toolbar */}
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#4a4e60]">{lang === 'ar' ? 'المصدر:' : 'Source:'}</span>
                  {SOURCES.map(s => (
                    <button key={s.id}
                      onClick={() => { if (!s.comingSoon) { setSelectedSource(s.id); fetchBestsellers(selectedCountry, selectedCategory, s.id) } }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${s.comingSoon ? 'border-[#2a2d35] text-[#4a4e60] cursor-not-allowed' : selectedSource === s.id ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                      {s.flag} {s.label} {s.comingSoon ? '🔜' : ''}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); fetchBestsellers(selectedCountry, cat.id, selectedSource) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedCategory === cat.id ? 'bg-[#1f2229] text-white border-[#3b82f6]' : 'text-[#8b8fa8] hover:text-white border-[#2a2d35]'}`}>
                      {cat.label[lang as 'en' | 'ar']}
                    </button>
                  ))}
                </div>
              </div>

              {scrapeLoading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="text-5xl animate-pulse">🔍</div>
                  <div className="text-white font-semibold text-lg">
                    {lang === 'ar' ? `جاري جلب أفضل المنتجات من ${SOURCES.find(s => s.id === selectedSource)?.label}...` : `Fetching top products from ${SOURCES.find(s => s.id === selectedSource)?.label}...`}
                  </div>
                  <div className="text-[#8b8fa8] text-sm">{lang === 'ar' ? 'نسحب البيانات مباشرة من الموقع' : 'Pulling real data directly from the website'}</div>
                </div>
              )}

              {!scrapeLoading && scrapeLoaded && scrapedProducts.length === 0 && (
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center max-w-lg">
                  <div className="text-4xl mb-3">😔</div>
                  <div className="text-white font-medium mb-2">{lang === 'ar' ? 'لم نتمكن من جلب البيانات' : 'Could not fetch data'}</div>
                  <div className="text-[#8b8fa8] text-sm mb-4">{lang === 'ar' ? 'الموقع قد يكون محمياً. جرب مصدراً آخر.' : 'The site may be protected. Try another source.'}</div>
                  <button onClick={() => fetchBestsellers(selectedCountry, selectedCategory, selectedSource)}
                    className="bg-[#3b82f6] text-white px-5 py-2 rounded-lg text-sm font-semibold">
                    {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              )}

              {!scrapeLoading && scrapedProducts.length > 0 && (
                <div>
                  <div className="text-xs text-[#4a4e60] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4ade80] inline-block" />
                    {lang === 'ar'
                      ? `${scrapedProducts.length} منتج من ${SOURCES.find(s => s.id === selectedSource)?.label} في ${COUNTRIES.find(c => c.code === selectedCountry)?.label}`
                      : `${scrapedProducts.length} products from ${SOURCES.find(s => s.id === selectedSource)?.label} in ${COUNTRIES.find(c => c.code === selectedCountry)?.label}`
                    }
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {scrapedProducts.map((product, idx) => (
                      <div key={idx} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden hover:border-[#3b82f6] transition-all group flex flex-col">
                        {/* Image */}
                        <div className="relative bg-white overflow-hidden" style={{aspectRatio:'1'}}>
                          {product.image ? (
                            <img src={product.image} alt={product.title}
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                              onError={e => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0f1117;font-size:2rem">📦</div>' }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#0f1117] text-3xl">📦</div>
                          )}
                          <div className="absolute top-1.5 left-1.5 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {product.rank}
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-2.5 flex-1 flex flex-col gap-1.5">
                          <h3 className="text-xs font-semibold text-white leading-snug flex-1" style={{fontSize:'11px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}} title={product.title}>
                            {product.title.split(',')[0].split('-')[0].trim().slice(0, 50)}
                          </h3>
                          <div className="flex items-center justify-between pt-1.5 border-t border-[#2a2d35]">
                            {product.price
                              ? <span className="text-xs font-bold text-[#4ade80]">{product.price}</span>
                              : <span className="text-xs text-[#4a4e60]">—</span>
                            }
                          </div>
                          <a href={product.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center w-full text-xs py-1.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-colors font-medium">
                            {lang === 'ar' ? 'عرض ↗' : 'View ↗'}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HOT ON MANTOOG */}
          {activeTab === 'hot' && (
            <div>
              <div className="text-xs text-[#4a4e60] mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse inline-block" />
                {lang === 'ar'
                  ? `المنتجات الأكثر طلباً على Mantoog في ${COUNTRIES.find(c => c.code === selectedCountry)?.label} خلال آخر 30 يوم`
                  : `Top ordered products on Mantoog in ${COUNTRIES.find(c => c.code === selectedCountry)?.label} in the last 30 days`
                }
              </div>

              {hotLoading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="text-5xl animate-pulse">🔥</div>
                  <div className="text-white font-medium">{lang === 'ar' ? 'جاري تحليل بيانات Mantoog...' : 'Analyzing Mantoog data...'}</div>
                </div>
              )}

              {!hotLoading && hotProducts.length === 0 && (
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center max-w-lg">
                  <div className="text-5xl mb-4">📊</div>
                  <div className="text-white font-medium mb-2">{lang === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}</div>
                  <div className="text-[#8b8fa8] text-sm">
                    {lang === 'ar'
                      ? 'هذا القسم سيعرض المنتجات الأكثر مبيعاً عبر متاجر Mantoog كلما نمت المنصة'
                      : 'This section will show the top-selling products across all Mantoog stores as the platform grows'
                    }
                  </div>
                </div>
              )}

              {!hotLoading && hotProducts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {hotProducts.map((product, idx) => (
                    <div key={product.id} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden hover:border-[#f97316] transition-all">
                      <div className="relative">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.title} className="w-full aspect-square object-contain bg-[#0f1117]" />
                        ) : (
                          <div className="w-full aspect-square bg-[#0f1117] flex items-center justify-center text-4xl">📦</div>
                        )}
                        <div className="absolute top-2 left-2 bg-[#f97316] text-white text-xs font-bold px-2 py-1 rounded-full">
                          #{idx + 1}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2">{product.title}</h3>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-[#0f1117] rounded-lg p-2 text-center">
                            <div className="text-xs text-[#4a4e60]">{lang === 'ar' ? 'الطلبات' : 'Orders'}</div>
                            <div className="text-sm font-bold text-[#f97316]">{product.orderCount}</div>
                          </div>
                          <div className="bg-[#0f1117] rounded-lg p-2 text-center">
                            <div className="text-xs text-[#4a4e60]">{lang === 'ar' ? 'التسليم' : 'Delivery'}</div>
                            <div className={`text-sm font-bold ${product.deliveryRate >= 50 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{product.deliveryRate}%</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold">{product.price} {product.currency}</span>
                          {product.compare_at_price && (
                            <span className="text-xs text-[#4a4e60] line-through">{product.compare_at_price}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PRODUCT ANALYZER */}
          {activeTab === 'analyzer' && (
            <div className="max-w-2xl">
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6 mb-5">
                <h2 className="text-white font-medium mb-1">{lang === 'ar' ? '🤖 محلل المنتجات' : '🤖 AI Product Analyzer'}</h2>
                <p className="text-[#8b8fa8] text-sm mb-4">{lang === 'ar' ? 'الصق رابط أي منتج وسيحلله Claude كخبير في السوق العربي' : 'Paste any product URL — Claude analyzes it as a MENA market expert'}</p>
                <div className="flex gap-3">
                  <input value={analyzerUrl} onChange={e => setAnalyzerUrl(e.target.value)}
                    placeholder="https://amazon.com/..."
                    className="flex-1 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]" />
                  <button onClick={handleAnalyze} disabled={analyzerLoading || !analyzerUrl.trim()}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap">
                    {analyzerLoading ? '...' : (lang === 'ar' ? '✦ حلل' : '✦ Analyze')}
                  </button>
                </div>
              </div>
              {analyzerResult && (
                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6 space-y-4">
                  <div className={`flex items-center gap-3 p-4 rounded-xl ${analyzerResult.verdict === 'strong' ? 'bg-[#14321f] border border-[#4ade80]/20' : analyzerResult.verdict === 'risky' ? 'bg-[#3a1414] border border-[#f87171]/20' : 'bg-[#3a2800] border border-[#fbbf24]/20'}`}>
                    <span className="text-3xl">{analyzerResult.verdict === 'strong' ? '🚀' : analyzerResult.verdict === 'risky' ? '⚠️' : '🤔'}</span>
                    <div>
                      <div className={`font-bold text-lg ${analyzerResult.verdict === 'strong' ? 'text-[#4ade80]' : analyzerResult.verdict === 'risky' ? 'text-[#f87171]' : 'text-[#fbbf24]'}`}>{analyzerResult.verdictLabel}</div>
                      <div className="text-sm text-[#8b8fa8]">{analyzerResult.summary}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: lang === 'ar' ? 'ملاءمة السوق' : 'Market fit', score: analyzerResult.marketFit, color: '#60a5fa' },
                      { label: lang === 'ar' ? 'إمكانية COD' : 'COD potential', score: analyzerResult.codPotential, color: '#4ade80' },
                      { label: lang === 'ar' ? 'المنافسة' : 'Competition', score: analyzerResult.competition, color: '#fbbf24' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0f1117] rounded-xl p-3 text-center">
                        <div className="text-xs text-[#4a4e60] mb-2">{s.label}</div>
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.score}/10</div>
                        <div className="mt-2 h-1.5 bg-[#2a2d35] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.score * 10}%`, background: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {analyzerResult.points?.map((point: string, i: number) => (
                      <div key={i} className="flex gap-2 text-sm text-[#8b8fa8]"><span className="text-[#3b82f6]">→</span><span>{point}</span></div>
                    ))}
                  </div>
                  {analyzerResult.suggestedPrice && (
                    <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4 flex gap-6">
                      <div><div className="text-xs text-[#8b8fa8]">{lang === 'ar' ? 'سعر البيع المقترح' : 'Suggested price'}</div><div className="text-white font-bold">{analyzerResult.suggestedPrice.sell} {store?.currency}</div></div>
                      <div><div className="text-xs text-[#8b8fa8]">{lang === 'ar' ? 'هامش الربح' : 'Margin'}</div><div className="text-[#4ade80] font-bold">{analyzerResult.suggestedPrice.margin}%</div></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PROFIT CALCULATOR */}
          {activeTab === 'profit' && (
            <div className="max-w-2xl">
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6 mb-5">
                <h2 className="text-white font-medium mb-4">{lang === 'ar' ? '💰 حاسبة الربح' : '💰 Profit Calculator'}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: lang === 'ar' ? 'تكلفة المنتج' : 'Product cost', value: profitCost, onChange: setProfitCost },
                    { label: lang === 'ar' ? 'سعر البيع' : 'Selling price', value: profitSell, onChange: setProfitSell },
                    { label: lang === 'ar' ? 'تكلفة إعلان/طلب' : 'Ad cost per order', value: profitAds, onChange: setProfitAds },
                    { label: lang === 'ar' ? 'طلبات يومياً' : 'Orders per day', value: profitOrders, onChange: setProfitOrders },
                  ].map((f, i) => (
                    <div key={i}>
                      <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">{f.label} ({store?.currency})</label>
                      <input type="number" value={f.value} onChange={e => f.onChange(e.target.value)} placeholder="0"
                        className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                    </div>
                  ))}
                </div>
              </div>
              {sell > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`bg-[#1a1d24] border rounded-xl p-5 ${profitPerOrder > 0 ? 'border-[#4ade80]/30' : 'border-[#f87171]/30'}`}>
                      <div className="text-xs text-[#4a4e60] uppercase tracking-wider mb-2">{lang === 'ar' ? 'ربح لكل طلب' : 'Profit per order'}</div>
                      <div className={`text-3xl font-bold ${profitPerOrder > 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{profitPerOrder.toFixed(0)} {store?.currency}</div>
                    </div>
                    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
                      <div className="text-xs text-[#4a4e60] uppercase tracking-wider mb-2">{lang === 'ar' ? 'ربح شهري' : 'Monthly profit'}</div>
                      <div className="text-3xl font-bold text-white">{monthlyProfit.toFixed(0)} {store?.currency}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 text-center">
                      <div className="text-xs text-[#4a4e60] mb-2">Break-even ROAS</div>
                      <div className="text-xl font-bold text-[#60a5fa]">{breakEvenRoas}x</div>
                    </div>
                    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 text-center">
                      <div className="text-xs text-[#4a4e60] mb-2">{lang === 'ar' ? 'بعد إرجاع 25%' : 'After 25% returns'}</div>
                      <div className="text-xl font-bold text-[#fbbf24]">{returnImpact.toFixed(0)} {store?.currency}</div>
                    </div>
                    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 text-center">
                      <div className="text-xs text-[#4a4e60] mb-2">{lang === 'ar' ? 'الهامش' : 'Margin'}</div>
                      <div className={`text-xl font-bold ${marginPct >= 40 ? 'text-[#4ade80]' : marginPct >= 20 ? 'text-[#fbbf24]' : 'text-[#f87171]'}`}>{marginPct}%</div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl border text-sm font-medium ${marginPct >= 40 ? 'bg-[#14321f] border-[#4ade80]/20 text-[#4ade80]' : marginPct >= 20 ? 'bg-[#3a2800] border-[#fbbf24]/20 text-[#fbbf24]' : 'bg-[#3a1414] border-[#f87171]/20 text-[#f87171]'}`}>
                    {marginPct >= 40 ? (lang === 'ar' ? '🚀 هامش ممتاز! يستحق الاختبار.' : '🚀 Excellent margin! Worth testing.') : marginPct >= 20 ? (lang === 'ar' ? '⚠️ هامش معقول. راقب تكاليف الإعلانات.' : '⚠️ Decent margin. Watch ad costs.') : (lang === 'ar' ? '❌ هامش منخفض جداً.' : '❌ Margin too low.')}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
