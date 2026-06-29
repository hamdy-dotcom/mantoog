'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import * as XLSX from 'xlsx'

export default function MissedOrdersPage() {
  const { lang, dir } = useLang()
  const [store, setStore] = useState<any>(null)
  const [allRows, setAllRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [contactedFilter, setContactedFilter] = useState<'all' | 'uncontacted' | 'contacted'>('uncontacted')
  const [recoveryFilter, setRecoveryFilter] = useState<'uncovered' | 'all' | 'covered'>('uncovered')
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
    const matchesRecovery =
      recoveryFilter === 'all' ||
      (recoveryFilter === 'covered' ? !!o.recovered : !o.recovered)
    return matchesSearch && matchesContacted && matchesRecovery
  })

  const stats = {
    total: filteredByDate.length,
    uncovered: filteredByDate.filter(o => !o.recovered).length,
    covered: filteredByDate.filter(o => o.recovered).length,
    estRevenue: filteredByDate.filter(o => !o.recovered).reduce((sum, o) => sum + (Number(o.total_price) || 0), 0),
  }

  const exportCSV = () => {
    const headers = ['Phone', 'Name', 'Product', 'Qty', 'Value', 'Currency', 'Address', 'Time', 'Contacted']
    const rows = filtered.map(o => [
      o.customer_phone,
      o.customer_name || '',
      o.products?.title || '',
      o.qty,
      o.total_price || '',
      store?.currency || '',
      o.customer_address || '',
      new Date(o.created_at).toLocaleDateString(),
      o.contacted ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `missed-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const exportExcel = () => {
    const rows = filtered.map(o => ({
      'الهاتف': o.customer_phone || '',
      'الاسم': o.customer_name || '',
      'المنتج': o.products?.title || '',
      'الكمية': o.qty || '',
      'القيمة': o.total_price || '',
      'العملة': store?.currency || '',
      'العنوان': o.customer_address || '',
      'التاريخ': new Date(o.created_at).toLocaleString('ar-EG'),
      'تم التواصل': o.contacted ? 'نعم' : 'لا',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Missed Orders')
    XLSX.writeFile(wb, `missed-orders-${new Date().toISOString().slice(0, 10)}.xlsx`)
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
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              📥 CSV
            </button>
            <button
              onClick={exportExcel}
              className="text-xs bg-[#14321f] hover:bg-[#1a4a2a] border border-[#4ade80]/20 text-[#4ade80] hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              📊 Excel
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {[
            { label: lang === 'ar' ? 'الإجمالي' : 'Total', value: stats.total, color: 'text-white' },
            { label: lang === 'ar' ? 'غير مُغطى' : 'Uncovered', value: stats.uncovered, color: 'text-[#f87171]' },
            { label: lang === 'ar' ? 'مُغطى' : 'Covered', value: stats.covered, color: 'text-[#4ade80]' },
            { label: `${lang === 'ar' ? 'قيمة متوقعة' : 'Est. Lost'} (${store?.currency || ''})`, value: stats.estRevenue.toLocaleString(), color: 'text-[#fbbf24]' },
          ].map((s, i) => (
            <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4">
              <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Status legend */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-4 py-3 mb-6 flex flex-wrap gap-x-6 gap-y-2 items-center">
          <span className="text-xs font-semibold text-white">{lang === 'ar' ? 'شرح الحالات:' : 'Status guide:'}</span>
          <span className="flex items-center gap-2 text-xs text-[#8b8fa8]">
            <span className="inline-flex items-center gap-1 bg-[#3a1414] text-[#f87171] font-semibold px-2 py-0.5 rounded-full text-[11px]">
              ● {lang === 'ar' ? 'غير مُغطى' : 'Uncovered'}
            </span>
            {lang === 'ar'
              ? 'العميل لم يكمل الطلب بعد — تواصل معه!'
              : "Customer didn't place an order yet — follow up!"}
          </span>
          <span className="flex items-center gap-2 text-xs text-[#8b8fa8]">
            <span className="inline-flex items-center gap-1 bg-[#14321f] text-[#4ade80] font-semibold px-2 py-0.5 rounded-full text-[11px]">
              ✓ {lang === 'ar' ? 'مُغطى' : 'Covered'}
            </span>
            {lang === 'ar'
              ? 'العميل عاد وأكمل الطلب لاحقاً'
              : 'Customer came back and completed their order'}
          </span>
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
          {/* Recovery status filter */}
          <div className="flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl">
            {([
              { key: 'uncovered', ar: 'غير مُغطى', en: 'Uncovered' },
              { key: 'all',       ar: 'الكل',      en: 'All' },
              { key: 'covered',   ar: 'مُغطى',     en: 'Covered' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setRecoveryFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  recoveryFilter === f.key ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'
                }`}
              >
                {lang === 'ar' ? f.ar : f.en}
              </button>
            ))}
          </div>
          {/* Contacted filter */}
          <div className="flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl">
            {([
              { key: 'all',          ar: 'الكل',         en: 'All' },
              { key: 'uncontacted',  ar: 'لم يُتواصَل',  en: 'Uncontacted' },
              { key: 'contacted',    ar: 'تم التواصل',   en: 'Contacted' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setContactedFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
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
              <div className="grid grid-cols-13 gap-3 px-5 py-3 border-b border-[#2a2d35]" style={{ gridTemplateColumns: '2fr 2fr 3fr 1fr 1fr 1fr 2fr 2fr' }}>
                <span className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
                <span className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الاسم' : 'Name'}</span>
                <span className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'المنتج' : 'Product'}</span>
                <span className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الكمية' : 'Qty'}</span>
                <span className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'القيمة' : 'Value'}</span>
                <span className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الوقت' : 'Time'}</span>
                <span className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                <span className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'الإجراء' : 'Action'}</span>
              </div>

              {filtered.map((o, i) => (
                <div
                  key={o.id}
                  className={`grid gap-3 px-5 py-4 border-b border-[#2a2d35] last:border-0 items-center transition-colors ${
                    o.recovered ? 'opacity-50 hover:opacity-70' : o.contacted ? 'opacity-60 hover:opacity-80' : 'hover:bg-[#1f2229]'
                  } ${i % 2 !== 0 ? 'bg-[#0f1117]/30' : ''}`}
                  style={{ gridTemplateColumns: '2fr 2fr 3fr 1fr 1fr 1fr 2fr 2fr' }}
                >
                  {/* Phone */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      {!o.contacted && !o.recovered && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] flex-shrink-0" />
                      )}
                      <span className="text-sm text-white font-mono">{o.customer_phone}</span>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="text-sm text-[#8b8fa8] truncate">
                    {o.customer_name || '—'}
                  </div>

                  {/* Product */}
                  <div className="flex items-center gap-2 min-w-0">
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
                  <div className="text-sm text-[#8b8fa8]">×{o.qty}</div>

                  {/* Value */}
                  <div>
                    <span className="text-sm text-[#fbbf24] font-medium">
                      {o.total_price ? Number(o.total_price).toLocaleString() : '—'}
                    </span>
                    {o.total_price && (
                      <span className="text-xs text-[#4a4e60] ms-1">{store?.currency || ''}</span>
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-xs text-[#4a4e60] whitespace-nowrap">
                    {timeAgo(o.created_at)}
                  </div>

                  {/* Status */}
                  <div>
                    {o.recovered ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#14321f] text-[#4ade80] whitespace-nowrap">
                        ✓ {lang === 'ar' ? 'مُغطى' : 'Covered'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#3a1414] text-[#f87171] whitespace-nowrap">
                        ● {lang === 'ar' ? 'غير مُغطى' : 'Uncovered'}
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <div>
                    {o.recovered ? (
                      <span className="text-xs text-[#4a4e60]">—</span>
                    ) : o.contacted ? (
                      <span className="text-xs text-[#4ade80] flex items-center gap-1">
                        ✓ {lang === 'ar' ? 'تم التواصل' : 'Contacted'}
                      </span>
                    ) : (
                      <button
                        onClick={() => markContacted(o.id)}
                        disabled={contactingId === o.id}
                        className="text-xs bg-[#2a2d35] hover:bg-[#3a3d45] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
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
