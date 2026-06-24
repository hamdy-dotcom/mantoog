'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import MigrateButton from '@/components/dashboard/MigrateButton'

type StatusFilter = 'all' | 'active' | 'draft' | 'no-page'
type SourceFilter = 'all' | 'url' | 'manual' | 'ai'

const SOURCE_LABELS: Record<SourceFilter, string> = {
  all: 'كل المصادر', url: '🔗 URL', manual: '✏️ يدوي', ai: '✦ AI'
}
const SOURCE_LABELS_EN: Record<SourceFilter, string> = {
  all: 'All sources', url: '🔗 URL', manual: '✏️ Manual', ai: '✦ AI'
}

function relativeDate(iso: string, lang: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (lang === 'ar') {
    if (days === 0) return 'اليوم'
    if (days === 1) return 'أمس'
    if (days < 7)  return `منذ ${days} أيام`
    if (days < 30) return `منذ ${Math.floor(days/7)} أسابيع`
    return `منذ ${Math.floor(days/30)} شهور`
  }
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days/7)}w ago`
  return `${Math.floor(days/30)}mo ago`
}

export default function ProductsPage() {
  const { lang, dir } = useLang()
  const ar = lang === 'ar'
  const tr = t[lang]
  const router = useRouter()
  const supabase = createClient()

  const [store, setStore]         = useState<any>(null)
  const [products, setProducts]   = useState<any[]>([])
  const [orderMap, setOrderMap]   = useState<Record<string,{count:number,revenue:number}>>({})
  const [loading, setLoading]     = useState(true)
  const [statuses, setStatuses]   = useState<Record<string,string>>({})
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [statusF, setStatusF]     = useState<StatusFilter>('all')
  const [sourceF, setSourceF]     = useState<SourceFilter>('all')
  const [search, setSearch]       = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      setStore(ctx.store)

      const [prodsJson, { data: orders }] = await Promise.all([
        fetch('/api/products/my-products').then(r => r.json()).catch(() => ({ data: [] })),
        supabase
          .from('orders')
          .select('product_id, total_price')
          .eq('merchant_id', ctx.user.id),
      ])
      const prods = prodsJson.data ?? []

      const map: Record<string,{count:number,revenue:number}> = {}
      for (const o of (orders || [])) {
        if (!o.product_id) continue
        if (!map[o.product_id]) map[o.product_id] = { count: 0, revenue: 0 }
        map[o.product_id].count++
        map[o.product_id].revenue += parseFloat(o.total_price || 0)
      }

      setProducts(prods || [])
      setOrderMap(map)
      setStatuses(Object.fromEntries((prods||[]).map((p:any) => [p.id, p.status])))
      setLoading(false)
    }
    init()
  }, [])

  const toggleSelect = (id: string) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = products.length > 0 && selected.size === products.length
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(products.map((p:any) => p.id)))

  const toggleStatus = async (id: string) => {
    const next = statuses[id] === 'active' ? 'draft' : 'active'
    setStatuses(s => ({...s, [id]: next}))
    await supabase.from('products').update({ status: next }).eq('id', id)
  }

  const disc = (p: any) => p.compare_at_price ? Math.round((1 - p.price / p.compare_at_price) * 100) : null

  const pageStatus = (p: any) => {
    if (!p.landing_pages?.length) return null
    return p.landing_pages[0].published ? 'live' : 'draft'
  }

  const rows = products.filter(p => {
    const st  = statuses[p.id]
    const pg  = pageStatus(p)
    const matchStatus =
      statusF==='all'     ? true :
      statusF==='active'  ? st==='active' :
      statusF==='draft'   ? st==='draft'  :
      statusF==='no-page' ? !pg : true
    const matchSource =
      sourceF==='all'    ? true :
      sourceF==='ai'     ? !!p.ai_generated :
      sourceF==='url'    ? p.source_platform==='url' && !p.ai_generated :
      sourceF==='manual' ? p.source_platform==='manual' : true
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSource && matchSearch
  })

  const active  = products.filter(p => statuses[p.id]==='active').length
  const noPage  = products.filter(p => !pageStatus(p)).length
  const livePgs = products.filter(p => pageStatus(p)==='live').length
  const maxRev  = Math.max(...Object.values(orderMap).map(m => m.revenue), 1)

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-[#8b8fa8] text-sm animate-pulse">Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0f14] flex" dir={dir} onClick={() => setSourceOpen(false)}>
      <Sidebar store={store} />

      <main className={DASHBOARD_MAIN_CLASS}>

        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{tr.productsTitle}</h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#525669] bg-[#13161d] border border-[#1c1f28] px-2.5 py-0.5 rounded-full">{products.length} {ar?'منتج':'products'}</span>
              <span className="text-xs text-[#4ade80] bg-[#14321f]/50 border border-[#22c55e]/15 px-2.5 py-0.5 rounded-full">{active} {ar?'نشط':'active'}</span>
              {noPage>0 && <span className="text-xs text-[#f59e0b] bg-[#3a2800]/50 border border-[#f59e0b]/15 px-2.5 py-0.5 rounded-full">{noPage} {ar?'بدون صفحة':'no page'}</span>}
              {livePgs>0 && <span className="text-xs text-[#60a5fa] bg-[#1a2744]/50 border border-[#3b82f6]/15 px-2.5 py-0.5 rounded-full">{livePgs} {ar?'مباشرة':'live'}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Migrate — prominent */}
            <MigrateButton />
            {/* New product */}
            <button
              onClick={() => router.push('/dashboard/products/new')}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#3b82f6] hover:bg-[#2563eb] px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-900/25">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              {tr.addNew}
            </button>
          </div>
        </div>

        {/* ── Empty state ── */}
        {products.length === 0 ? (
          <div className="bg-[#13161d] border border-[#1c1f28] rounded-xl p-14 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-white font-semibold text-lg mb-2">{tr.noProducts}</h2>
            <p className="text-[#8b8fa8] text-sm mb-6">{tr.noProductsDesc}</p>
            <button
              onClick={() => router.push('/dashboard/products/new')}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors">
              {tr.addNew}
            </button>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#525669]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={ar ? 'ابحث عن منتج...' : 'Search products...'}
                  className="w-full bg-[#13161d] border border-[#1c1f28] focus:border-[#3b82f6]/40 text-white text-sm rounded-lg pr-8 pl-3 py-2 outline-none placeholder-[#525669] transition-colors" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525669] hover:text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-0.5 bg-[#13161d] border border-[#1c1f28] rounded-lg p-0.5">
                {([
                  ['all',     ar?'الكل':'All'],
                  ['active',  ar?'نشط':'Active'],
                  ['draft',   ar?'مسودة':'Draft'],
                  ['no-page', ar?'بدون صفحة':'No page'],
                ] as [StatusFilter,string][]).map(([f,label]) => (
                  <button key={f} onClick={() => setStatusF(f)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${statusF===f ? 'bg-[#1e2130] text-white shadow-sm' : 'text-[#8b8fa8] hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Source dropdown */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setSourceOpen(o => !o)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${sourceF!=='all' ? 'bg-[#1a2744] border-[#3b82f6]/40 text-[#60a5fa]' : 'bg-[#13161d] border-[#1c1f28] text-[#8b8fa8] hover:text-white'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0"><path d="M22 3H2l8 9.46V19l4 2v-8.54Z"/></svg>
                  {ar ? SOURCE_LABELS[sourceF] : SOURCE_LABELS_EN[sourceF]}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3 h-3 transition-transform ${sourceOpen?'rotate-180':''}`}><path d="m6 9 6 6 6-6"/></svg>
                </button>
                {sourceOpen && (
                  <div className="absolute top-full mt-1 right-0 z-30 bg-[#1a1d24] border border-[#2a2d3a] rounded-xl shadow-2xl shadow-black/60 overflow-hidden min-w-[160px]">
                    {(['all','url','manual','ai'] as SourceFilter[]).map(f => (
                      <button key={f} onClick={() => { setSourceF(f); setSourceOpen(false) }}
                        className={`w-full text-right flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${sourceF===f ? 'bg-[#1e2744] text-[#60a5fa]' : 'text-[#8b8fa8] hover:bg-[#1f2229] hover:text-white'}`}>
                        {sourceF===f && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-[#3b82f6] shrink-0"><path d="M20 6 9 17l-5-5"/></svg>}
                        <span className={sourceF===f ? '' : 'mr-5'}>{ar ? SOURCE_LABELS[f] : SOURCE_LABELS_EN[f]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clear filters */}
              {(statusF!=='all' || sourceF!=='all') && (
                <button onClick={() => { setStatusF('all'); setSourceF('all') }}
                  className="flex items-center gap-1 text-xs text-[#f87171] hover:text-white border border-[#f87171]/20 hover:border-[#f87171]/50 bg-[#3a1414]/30 px-2.5 py-1.5 rounded-lg transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  {ar ? 'مسح الفلاتر' : 'Clear filters'}
                </button>
              )}
            </div>

            {/* ── Table ── */}
            <div className="bg-[#13161d] border border-[#1c1f28] rounded-xl overflow-hidden">

              {/* Header */}
              <div className="grid items-center gap-3 px-4 py-2.5 border-b border-[#1c1f28] text-[10px] font-semibold text-[#525669] uppercase tracking-widest select-none"
                style={{ gridTemplateColumns:'1.5rem 2.5rem 1fr 8rem 5rem 5.5rem 6rem 8rem' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded border-[#2a2d3a] bg-[#0d0f14] accent-[#3b82f6] cursor-pointer"/>
                <span/>
                <span>{ar?'المنتج':'Product'}</span>
                <span>{ar?'الأداء':'Performance'}</span>
                <span>{ar?'السعر':'Price'}</span>
                <span>{ar?'المصدر':'Source'}</span>
                <span>{ar?'الحالة':'Status'}</span>
                <span/>
              </div>

              {rows.map((p, idx) => {
                const st  = statuses[p.id]
                const pg  = pageStatus(p)
                const sel = selected.has(p.id)
                const d   = disc(p)
                const perf = orderMap[p.id] || { count: 0, revenue: 0 }
                const landingId = p.landing_pages?.[0]?.id

                return (
                  <div key={p.id}
                    className={`group grid items-center gap-3 px-4 py-3 transition-colors ${idx<rows.length-1?'border-b border-[#1c1f28]':''} ${sel?'bg-[#1a2744]/30':'hover:bg-[#16192a]'}`}
                    style={{ gridTemplateColumns:'1.5rem 2.5rem 1fr 8rem 5rem 5.5rem 6rem 8rem' }}>

                    {/* Checkbox */}
                    <input type="checkbox" checked={sel} onChange={() => toggleSelect(p.id)}
                      className="w-3.5 h-3.5 rounded border-[#2a2d3a] bg-[#0d0f14] accent-[#3b82f6] cursor-pointer"/>

                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#1c1f28] bg-[#0d0f14] shrink-0 flex items-center justify-center text-sm text-[#525669]">
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt="" className="w-full h-full object-cover"/>
                        : '📦'}
                    </div>

                    {/* Title + date */}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{p.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {d && <span className="text-[10px] font-bold text-[#f87171]">-{d}%</span>}
                        {d && <span className="text-[10px] text-[#3a3d4a]">·</span>}
                        <span className="text-[10px] text-[#525669]">{relativeDate(p.created_at, lang)}</span>
                      </div>
                    </div>

                    {/* Performance */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <div className="text-sm font-bold text-white leading-none">{perf.count}</div>
                          <div className="text-[9px] text-[#525669] mt-0.5">{ar?'طلبات':'orders'}</div>
                        </div>
                        <div className="w-px h-5 bg-[#1c1f28]"/>
                        <div>
                          <div className="text-sm font-bold text-white leading-none">{perf.revenue > 0 ? Math.round(perf.revenue).toLocaleString() : '—'}</div>
                          <div className="text-[9px] text-[#525669] mt-0.5">{p.currency || 'SAR'}</div>
                        </div>
                      </div>
                      <div className="h-0.5 rounded-full bg-[#1c1f28] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-[#3b82f6] to-[#8b5cf6]"
                          style={{ width: perf.revenue > 0 ? `${Math.min((perf.revenue/maxRev)*100,100)}%` : '0%' }}/>
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <div className="text-sm font-semibold text-white">{p.price} {p.currency}</div>
                      {p.compare_at_price && (
                        <div className="text-[11px] text-[#525669] line-through">{p.compare_at_price}</div>
                      )}
                    </div>

                    {/* Source badge */}
                    <div>
                      {p.ai_generated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#1e1440]/80 text-[#a78bfa] border border-[#7c3aed]/20 px-2 py-0.5 rounded-full">✦ AI</span>
                      ) : p.source_platform==='url' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#1a2744]/60 text-[#60a5fa] border border-[#3b82f6]/15 px-2 py-0.5 rounded-full">🔗 URL</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#1f2229]/60 text-[#8b8fa8] border border-[#2a2d3a] px-2 py-0.5 rounded-full">{ar?'✏️ يدوي':'✏️ Manual'}</span>
                      )}
                    </div>

                    {/* Status — click to toggle */}
                    <button onClick={() => toggleStatus(p.id)} title={ar?'اضغط للتبديل':'Click to toggle'}
                      className={`w-fit inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                        st==='active'
                          ? 'bg-[#14321f]/70 text-[#4ade80] border-[#22c55e]/20 hover:bg-[#14321f]'
                          : 'bg-[#1f2229]/70 text-[#8b8fa8] border-[#2a2d3a] hover:text-white hover:border-[#3b82f6]/40'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st==='active'?'bg-[#4ade80]':'bg-[#525669]'}`}/>
                      {st==='active' ? (ar?'نشط':'Active') : (ar?'مسودة':'Draft')}
                    </button>

                    {/* Hover actions */}
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit → product edit page */}
                      <button
                        onClick={() => router.push(`/dashboard/products/${p.id}`)}
                        title={ar?'تعديل':'Edit'}
                        className="p-1.5 rounded-lg text-[#525669] hover:text-white hover:bg-[#1e2130] transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                      </button>
                      {/* View product page → always opens store page in new tab */}
                      <button
                        onClick={() => window.open(`/${store?.slug}/${p.id}`, '_blank')}
                        title={ar?'شاهد صفحة المنتج':'View product page'}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#60a5fa] hover:text-white bg-[#1a2744]/60 hover:bg-[#3b82f6] border border-[#3b82f6]/20 hover:border-transparent transition-all whitespace-nowrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                        {ar?'شاهد صفحة المنتج':'View product page'}
                      </button>
                      {/* Ad creative */}
                      <button
                        onClick={() => router.push(`/dashboard/products/${p.id}/creative`)}
                        title={ar?'إنشاء إعلان':'Create ad'}
                        className="p-1.5 rounded-lg text-[#525669] hover:text-[#a78bfa] hover:bg-[#1a1440]/60 transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                      </button>
                    </div>

                  </div>
                )
              })}

              {rows.length === 0 && (
                <div className="py-16 text-center">
                  <div className="text-3xl mb-3">🔍</div>
                  <div className="text-sm text-white font-medium mb-1">{ar?'لا توجد نتائج':'No results'}</div>
                  <div className="text-xs text-[#525669]">{ar?'جرب تغيير الفلاتر أو كلمة البحث':'Try changing filters or search term'}</div>
                </div>
              )}
            </div>

            {/* ── Bulk action bar ── */}
            {selected.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-[#1e2130] border border-[#2a2d3a] rounded-2xl px-5 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
                <span className="text-sm font-bold text-white">{selected.size} {ar?'محدد':'selected'}</span>
                <div className="w-px h-4 bg-[#2a2d3a]"/>
                <button className="text-xs font-semibold text-[#4ade80] px-2 py-1 rounded-lg hover:bg-[#14321f] transition-colors">{ar?'تفعيل':'Activate'}</button>
                <button className="text-xs font-semibold text-[#8b8fa8] px-2 py-1 rounded-lg hover:bg-[#1f2229] transition-colors">{ar?'إيقاف':'Pause'}</button>
                <button className="text-xs font-semibold text-[#60a5fa] px-2 py-1 rounded-lg hover:bg-[#1a2744] transition-colors">{ar?'أنشئ صفحات':'Create pages'}</button>
                <div className="w-px h-4 bg-[#2a2d3a]"/>
                <button className="text-xs font-semibold text-[#f87171] px-2 py-1 rounded-lg hover:bg-[#3a1414] transition-colors">{ar?'حذف':'Delete'}</button>
                <button onClick={() => setSelected(new Set())} className="text-[#525669] hover:text-white transition-colors mr-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
