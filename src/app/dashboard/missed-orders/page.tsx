'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'

export default function MissedOrdersPage() {
  const { lang, dir } = useLang()
  const [store, setStore] = useState<any>(null)
  const [allRows, setAllRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [contactedFilter, setContactedFilter] = useState<'all' | 'uncontacted' | 'contacted'>('uncontacted')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('7d')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [contactingId, setContactingId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchAll = async (query: any) => {
    const PAGE = 1000
    let rows: any[] = []
    let from = 0
    while (true) {
      const { data, error } = await query.range(from, from + PAGE - 1)
      if (error || !data || data.length === 0) break
      rows = rows.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }
    return rows
  }

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      setStore(ctx.store)
      const rows = await fetchAll(
        supabase
          .from('abandoned_checkouts')
          .select('*, products(title, images)')
          .eq('merchant_id', ctx.user.id)
          .eq('recovered', false)
          .order('created_at', { ascending: false })
      )
      setAllRows(rows)
      setLoading(false)
    }
    init()
  }, [])

  const markContacted = async (id: string) => {
    setContactingId(id)
    await supabase.from('abandoned_checkouts').update({ contacted: true }).eq('id', id)
    setAllRows(prev => prev.map(o => o.id === id ? { ...o, contacted: true } : o))
    setContactingId(null)
  }

  const filteredByDate = allRows.filter(row => {
    const date = new Date(row.created_at)
    const now = new Date()
    if (dateFilter === 'today') return date.toDateString() === now.toDateString()
    if (dateFilter === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); return date >= d }
    if (dateFilter === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); return date >= d }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(0)
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date()
      return date >= from && date <= to
    }
    return true
  })

  const filtered = filteredByDate.filter(o => {
    const matchesSearch = !search ||
      o.customer_phone?.includes(search) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.products?.title?.toLowerCase().includes(search.toLowerCase())
    const matchesContacted =
      contactedFilter === 'all' ||
      (contactedFilter === 'contacted' ? !!o.contacted : !o.contacted)
    return matchesSearch && matchesContacted
  })

  const stats = {
    total: filteredByDate.length,
    uncontacted: filteredByDate.filter(o => !o.contacted).length,
    contacted: filteredByDate.filter(o => o.contacted).length,
    estRevenue: filteredByDate.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0),
  }

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
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

        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <a
                href="/dashboard/orders"
                className="text-xs text-[#4a4e60] hover:text-[#8b8fa8] transition-colors flex items-center gap-1"
              >
                ← {lang === 'ar' ? 'الطلبات' : 'Orders'}
              </a>
            </div>
            <h1 className="text-xl font-semibold text-white">
              {lang === 'ar' ? 'الطلبات الناقصة' : 'Missed Orders'}
            </h1>
            <p className="text-[#8b8fa8] text-sm mt-1">
              {lang === 'ar'
                ? 'عملاء بدأوا الطلب ولم يكملوه'
                : 'Customers who started checkout but didn\'t submit'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          {[
            { label: lang === 'ar' ? 'الإجمالي' : 'Total', value: stats.total, color: 'text-white' },
            { label: lang === 'ar' ? 'لم يُتواصَل' : 'Uncontacted', value: stats.uncontacted, color: 'text-[#fbbf24]' },
            { label: lang === 'ar' ? 'تم التواصل' : 'Contacted', value: stats.contacted, color: 'text-[#4ade80]' },
            { label: `${lang === 'ar' ? 'قيمة متوقعة' : 'Est. Value'} (${store?.currency || ''})`, value: stats.estRevenue.toLocaleString(), color: 'text-[#60a5fa]' },
          ].map((s, i) => (
            <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4">
              <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث برقم الهاتف أو الاسم أو المنتج...' : 'Search by phone, name, or product...'}
            className="flex-1 bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors min-w-[220px]"
          />
          {/* Contacted filter */}
          <div className="flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl">
            {([
              { key: 'all', ar: 'الكل', en: 'All' },
              { key: 'uncontacted', ar: 'لم يُتواصَل', en: 'Uncontacted' },
              { key: 'contacted', ar: 'تم التواصل', en: 'Contacted' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setContactedFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  contactedFilter === f.key ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'
                }`}
              >
                {lang === 'ar' ? f.ar : f.en}
              </button>
            ))}
          </div>
        </div>

        {/* Date filter bar */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              {([
                { key: 'all', ar: 'الكل', en: 'All' },
                { key: 'today', ar: 'اليوم', en: 'Today' },
                { key: '7d', ar: 'آخر 7 أيام', en: 'Last 7 days' },
                { key: '30d', ar: 'آخر 30 يوم', en: 'Last 30 days' },
              ] as const).map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => { setDateFilter(f.key); setDateFrom(''); setDateTo('') }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    dateFilter === f.key && !dateFrom && !dateTo
                      ? 'bg-[#3b82f6] border-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                      : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white bg-[#0f1117]'
                  }`}
                >
                  {lang === 'ar' ? f.ar : f.en}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-[#2a2d35] mx-1 hidden sm:block" />

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#4a4e60] font-medium">{lang === 'ar' ? 'من' : 'From'}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setDateFilter('all') }}
                className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
              <span className="text-xs text-[#4a4e60] font-medium">{lang === 'ar' ? 'إلى' : 'To'}</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setDateFilter('all') }}
                className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>

            {(dateFilter !== 'all' || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFilter('all'); setDateFrom(''); setDateTo('') }}
                className="ms-auto text-xs text-[#f87171] hover:text-white border border-[#f87171]/30 hover:border-[#f87171] px-3 py-2 rounded-lg transition-all"
              >
                {lang === 'ar' ? '✕ إعادة تعيين' : '✕ Reset'}
              </button>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-[#2a2d35] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
            <span className="text-xs text-[#8b8fa8]">
              {lang === 'ar' ? 'يعرض' : 'Showing'}{' '}
              <span className="text-white font-semibold">{filtered.length}</span>{' '}
              {lang === 'ar' ? 'طلب ناقص' : 'missed order(s)'}
              {(dateFrom || dateTo) && (
                <span className="text-[#4a4e60]">
                  {dateFrom && ` · ${lang === 'ar' ? 'من' : 'from'} ${dateFrom}`}
                  {dateTo && ` · ${lang === 'ar' ? 'إلى' : 'to'} ${dateTo}`}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-white font-medium text-lg mb-2">
              {lang === 'ar' ? 'لا توجد طلبات ناقصة' : 'No missed orders'}
            </h2>
            <p className="text-[#8b8fa8] text-sm">
              {lang === 'ar'
                ? 'سيظهر هنا العملاء الذين بدأوا الطلب ولم يكملوه'
                : 'Customers who start checkout but don\'t submit will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden min-w-[800px]">

              {/* Table header */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-[#2a2d35]">
                <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
                <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الاسم' : 'Name'}</span>
                <span className="col-span-3 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'المنتج' : 'Product'}</span>
                <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الكمية' : 'Qty'}</span>
                <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'القيمة' : 'Value'}</span>
                <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الوقت' : 'Time'}</span>
                <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الإجراء' : 'Action'}</span>
              </div>

              {filtered.map((o, i) => (
                <div
                  key={o.id}
                  className={`grid grid-cols-12 gap-3 px-5 py-4 border-b border-[#2a2d35] last:border-0 items-center transition-colors ${
                    o.contacted ? 'opacity-50 hover:opacity-70' : 'hover:bg-[#1f2229]'
                  } ${i % 2 !== 0 ? 'bg-[#0f1117]/30' : ''}`}
                >
                  {/* Phone */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      {!o.contacted && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] flex-shrink-0" />
                      )}
                      <span className="text-sm text-white font-mono">{o.customer_phone}</span>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="col-span-2 text-sm text-[#8b8fa8] truncate">
                    {o.customer_name || '—'}
                  </div>

                  {/* Product */}
                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                    {o.products?.images?.[0] && (
                      <img src={o.products.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-xs text-[#8b8fa8] truncate block">{o.products?.title || '—'}</span>
                      {o.customer_address && (
                        <span className="text-[10px] text-[#4a4e60] truncate block">{o.customer_address}</span>
                      )}
                    </div>
                  </div>

                  {/* Qty */}
                  <div className="col-span-1 text-sm text-[#8b8fa8]">×{o.qty}</div>

                  {/* Value */}
                  <div className="col-span-1">
                    <span className="text-sm text-[#fbbf24] font-medium">
                      {o.total_price ? Number(o.total_price).toLocaleString() : '—'}
                    </span>
                    {o.total_price && (
                      <span className="text-xs text-[#4a4e60] ms-1">{store?.currency || ''}</span>
                    )}
                  </div>

                  {/* Time */}
                  <div className="col-span-1 text-xs text-[#4a4e60] whitespace-nowrap">
                    {timeAgo(o.created_at)}
                  </div>

                  {/* Action */}
                  <div className="col-span-2">
                    {o.contacted ? (
                      <span className="text-xs text-[#4ade80] flex items-center gap-1">
                        ✓ {lang === 'ar' ? 'تم التواصل' : 'Contacted'}
                      </span>
                    ) : (
                      <button
                        onClick={() => markContacted(o.id)}
                        disabled={contactingId === o.id}
                        className="text-xs bg-[#2a2d35] hover:bg-[#3a3d45] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {contactingId === o.id ? '...' : (lang === 'ar' ? 'تم التواصل' : 'Mark Contacted')}
                      </button>
                    )}
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
