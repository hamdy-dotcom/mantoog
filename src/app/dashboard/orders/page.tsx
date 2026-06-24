'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import * as XLSX from 'xlsx'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#3a2800] text-[#fbbf24]',
  confirmed: 'bg-[#14321f] text-[#4ade80]',
  processing: 'bg-[#1a3a5c] text-[#60a5fa]',
  shipped: 'bg-[#1a3a5c] text-[#60a5fa]',
  delivered: 'bg-[#14321f] text-[#4ade80]',
  cancelled: 'bg-[#3a1414] text-[#f87171]',
  returned: 'bg-[#3a1414] text-[#f87171]',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

const SOURCE_META: Record<string, { icon: string; color: string }> = {
  tiktok:    { icon: '🎵', color: 'text-[#ff2d55]' },
  facebook:  { icon: '📘', color: 'text-[#60a5fa]' },
  instagram: { icon: '📸', color: 'text-[#e1306c]' },
  google:    { icon: '🔍', color: 'text-[#4285f4]' },
  snapchat:  { icon: '👻', color: 'text-[#fbbf24]' },
  twitter:   { icon: '𝕏', color: 'text-[#8b8fa8]' },
  x:         { icon: '𝕏', color: 'text-[#8b8fa8]' },
  direct:    { icon: '🔗', color: 'text-[#8b8fa8]' },
}

function getSourceMeta(src: string | null | undefined) {
  if (!src || src === 'direct') return { icon: '🔗', label: 'Direct', color: 'text-[#8b8fa8]' }
  const lower = src.toLowerCase()
  for (const [key, meta] of Object.entries(SOURCE_META)) {
    if (lower.includes(key)) return { ...meta, label: src.charAt(0).toUpperCase() + src.slice(1) }
  }
  return { icon: '🌐', label: src, color: 'text-[#8b8fa8]' }
}

const CREDIT_BLOCK_THRESHOLD = -50

export default function OrdersPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const [store, setStore] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [exportFilter, setExportFilter] = useState<'all' | 'new' | 'exported'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
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

      const [ordersData, { data: creditsData }] = await Promise.all([
        fetchAll(
          supabase.from('orders').select('*, products(title, images)').eq('merchant_id', ctx.user.id).order('created_at', { ascending: false })
        ),
        supabase.from('order_credits').select('credits_remaining').eq('merchant_id', ctx.user.id).order('created_at', { ascending: false }).limit(1).single(),
      ])

      setCreditsRemaining(creditsData?.credits_remaining ?? null)
      setOrders(ordersData)
      setLoading(false)
    }
    init()
  }, [])

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    setUpdatingId(null)
  }

  const markExported = async (ids: string[]) => {
    if (ids.length === 0) return
    const now = new Date().toISOString()
    await supabase.from('orders').update({ exported_at: now }).in('id', ids)
    setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, exported_at: now } : o))
  }

  // Unique traffic sources present in this merchant's orders
  const uniqueSources = Array.from(new Set(orders.map(o => o.traffic_source || 'direct')))

  const filteredByDate = orders.filter(order => {
    if (dateFilter === 'all' && !dateFrom) return true
    const orderDate = new Date(order.created_at)
    const now = new Date()
    if (dateFilter === 'today') return orderDate.toDateString() === now.toDateString()
    if (dateFilter === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); return orderDate >= d }
    if (dateFilter === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); return orderDate >= d }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(0)
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date()
      return orderDate >= from && orderDate <= to
    }
    return true
  })

  const filteredOrders = filteredByDate.filter(o => {
    const matchesStatus = filter === 'all' || o.status === filter
    const matchesSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.includes(search) ||
      o.products?.title?.toLowerCase().includes(search.toLowerCase())
    const matchesSource = sourceFilter === 'all' || (o.traffic_source || 'direct') === sourceFilter
    const matchesExport = exportFilter === 'all' ||
      (exportFilter === 'new' ? !o.exported_at : !!o.exported_at)
    return matchesStatus && matchesSearch && matchesSource && matchesExport
  })

  const newOrdersCount = orders.filter(o => !o.exported_at).length

  const exportCSV = async () => {
    const headers = ['Order', 'Customer', 'Phone', 'Product', 'Qty', 'Total', 'Governorate', 'Address', 'Source', 'Status', 'Date']
    const rows = filteredOrders.map(o => [
      o.order_number || o.id.slice(0, 8),
      o.customer_name,
      o.customer_phone,
      o.upsell_item ? `${o.products?.title || ''} + ${o.upsell_item.product_title}` : (o.products?.title || ''),
      o.quantity,
      `${o.total_price} ${o.currency}`,
      o.address_governorate || '',
      o.address_line1 || '',
      o.traffic_source || 'direct',
      o.status,
      new Date(o.created_at).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    await markExported(filteredOrders.map(o => o.id))
  }

  const exportOrdersExcel = async () => {
    const rows = filteredOrders.map((order: any) => ({
      'الاسم': order.customer_name || '',
      'الهاتف': order.customer_phone || '',
      'المنتج': order.upsell_item ? `${order.products?.title || ''} + ${order.upsell_item.product_title}` : (order.products?.title || ''),
      'الكمية': order.quantity || '',
      'المبلغ': order.total_price || '',
      'العملة': order.currency || '',
      'العنوان': [order.address_line1, order.address_governorate].filter(Boolean).join(', ') || '',
      'المصدر': order.traffic_source || 'direct',
      'الحالة': order.status || '',
      'التاريخ': new Date(order.created_at).toLocaleString('ar-EG'),
      'رابط الموقع': order.map_link || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`)
    await markExported(filteredOrders.map(o => o.id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  const isBlocked = creditsRemaining !== null && creditsRemaining <= CREDIT_BLOCK_THRESHOLD

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
        <Sidebar store={store} />
        <main className={DASHBOARD_MAIN_CLASS}>
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <div className="w-20 h-20 rounded-full bg-[#3a1414] border border-[#f87171]/30 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-[#f87171]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              {lang === 'ar' ? 'تم تجاوز حد الطلبات' : 'Orders Limit Exceeded'}
            </h1>
            <p className="text-[#8b8fa8] text-sm max-w-md mb-2">
              {lang === 'ar'
                ? `رصيدك الحالي ${creditsRemaining} طلب. تجاوزت الحد المسموح به وتم تعليق الوصول إلى الطلبات والتصدير.`
                : `Your current balance is ${creditsRemaining} orders. You've exceeded the allowed limit and access to orders and exports has been suspended.`}
            </p>
            <p className="text-[#4a4e60] text-xs max-w-sm mb-8">
              {lang === 'ar'
                ? 'يرجى شحن رصيدك لاستعادة الوصول الكامل.'
                : 'Please top up your credits to restore full access.'}
            </p>

            <a
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {lang === 'ar' ? 'شحن الرصيد الآن' : 'Top Up Credits Now'}
            </a>

            <div className="mt-10 bg-[#1a1d24] border border-[#2a2d35] rounded-2xl px-8 py-6 max-w-sm w-full">
              <div className="text-xs text-[#4a4e60] uppercase tracking-wider mb-3 font-medium">
                {lang === 'ar' ? 'رصيدك الحالي' : 'Current Balance'}
              </div>
              <div className="text-4xl font-bold text-[#f87171] mb-1">{creditsRemaining}</div>
              <div className="text-xs text-[#8b8fa8]">
                {lang === 'ar' ? `يُفتح الوصول عند الوصول إلى ${CREDIT_BLOCK_THRESHOLD + 1}+` : `Access unlocks at ${CREDIT_BLOCK_THRESHOLD + 1} or above`}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const stats = {
    total: filteredByDate.length,
    pending: filteredByDate.filter(o => o.status === 'pending').length,
    delivered: filteredByDate.filter(o => o.status === 'delivered').length,
    cancelled: filteredByDate.filter(o => o.status === 'cancelled').length,
    revenue: filteredByDate.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_price), 0),
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className={DASHBOARD_MAIN_CLASS}>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">{tr.ordersTitle}</h1>
            <p className="text-[#8b8fa8] text-sm mt-1">
              {filteredByDate.length} {lang === 'ar' ? 'طلب' : 'total orders'}
              {newOrdersCount > 0 && (
                <span className="ms-2 text-[#fbbf24] font-medium">
                  · {newOrdersCount} {lang === 'ar' ? 'جديد (لم يُصدَّر)' : 'new (unexported)'}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV}
              className="text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              📥 CSV
            </button>
            <button onClick={exportOrdersExcel}
              className="relative text-xs bg-[#14321f] hover:bg-[#1a4a2a] border border-[#4ade80]/20 text-[#4ade80] hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              📊 Excel
              {newOrdersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#fbbf24] text-black text-[9px] font-bold flex items-center justify-center leading-none">
                  {newOrdersCount > 99 ? '99+' : newOrdersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {[
            { label: lang === 'ar' ? 'الإجمالي' : 'Total', value: stats.total },
            { label: lang === 'ar' ? 'معلق' : 'Pending', value: stats.pending, color: 'text-[#fbbf24]' },
            { label: lang === 'ar' ? 'مُسلَّم' : 'Delivered', value: stats.delivered, color: 'text-[#4ade80]' },
            { label: lang === 'ar' ? 'ملغي' : 'Cancelled', value: stats.cancelled, color: 'text-[#f87171]' },
            { label: `${lang === 'ar' ? 'الإيراد' : 'Revenue'} (${store?.currency})`, value: stats.revenue.toLocaleString(), color: 'text-[#4ade80]' },
          ].map((s, i) => (
            <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4">
              <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.color || 'text-white'}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Status filter + search */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl">
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filter === f ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
              >
                {f === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : STATUS_LABELS[f]}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tr.searchOrders}
            className="flex-1 bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors min-w-[200px]"
          />
        </div>

        {/* Source + Export filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">

          {/* Source filter — only shown when more than one source exists */}
          {uniqueSources.length > 1 && (
            <div className="flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${sourceFilter === 'all' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
              >
                {lang === 'ar' ? 'كل المصادر' : 'All Sources'}
              </button>
              {uniqueSources.map(s => {
                const meta = getSourceMeta(s)
                return (
                  <button
                    key={s}
                    onClick={() => setSourceFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${sourceFilter === s ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Export status filter */}
          <div className="flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl">
            <button
              onClick={() => setExportFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${exportFilter === 'all' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
            >
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setExportFilter('new')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${exportFilter === 'new' ? 'bg-[#fbbf24] text-black' : 'text-[#8b8fa8] hover:text-white'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {lang === 'ar' ? 'جديد' : 'New'}
              {newOrdersCount > 0 && (
                <span className={`px-1 rounded text-[10px] font-bold ${exportFilter === 'new' ? 'bg-black/20 text-black' : 'bg-[#fbbf24]/20 text-[#fbbf24]'}`}>
                  {newOrdersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setExportFilter('exported')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${exportFilter === 'exported' ? 'bg-[#14321f] text-[#4ade80] border border-[#4ade80]/30' : 'text-[#8b8fa8] hover:text-white'}`}
            >
              ✓ {lang === 'ar' ? 'مُصدَّر' : 'Exported'}
            </button>
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

          {(dateFilter !== 'all' || dateFrom || dateTo) && (
            <div className="mt-3 pt-3 border-t border-[#2a2d35] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
              <span className="text-xs text-[#8b8fa8]">
                {lang === 'ar' ? 'يعرض' : 'Showing'}{' '}
                <span className="text-white font-semibold">{filteredByDate.length}</span>{' '}
                {lang === 'ar' ? 'طلب' : 'orders'}
                {(dateFrom || dateTo) && (
                  <span className="text-[#4a4e60]">
                    {dateFrom && ` · ${lang === 'ar' ? 'من' : 'from'} ${dateFrom}`}
                    {dateTo && ` · ${lang === 'ar' ? 'إلى' : 'to'} ${dateTo}`}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Orders table */}
        {filteredOrders.length === 0 ? (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-white font-medium text-lg mb-2">{tr.noOrders}</h2>
            <p className="text-[#8b8fa8] text-sm">{tr.noOrdersDesc}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden min-w-[960px]">

            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-[#2a2d35]">
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.customer}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">📍</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.product}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.address}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.total}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.qty}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'المصدر' : 'Source'}</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.status}</span>
              <span className="col-span-1 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">{tr.date}</span>
            </div>

            {filteredOrders.map(order => {
              const srcMeta = getSourceMeta(order.traffic_source)
              const isExported = !!order.exported_at
              return (
                <div
                  key={order.id}
                  className={`grid grid-cols-12 gap-3 px-5 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors items-center ${isExported ? 'opacity-60' : ''}`}
                >
                  {/* Customer — yellow dot = not yet exported */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      {!isExported && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] flex-shrink-0" />
                      )}
                      <div className="text-sm text-white font-medium truncate">{order.customer_name}</div>
                    </div>
                    <div className="text-xs text-[#4a4e60] mt-0.5 ms-3">{order.customer_phone}</div>
                  </div>

                  {/* Location */}
                  <div className="col-span-1">
                    {order.map_link ? (
                      <a href={order.map_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-white bg-[#1a3a5c] hover:bg-[#3b82f6] px-2 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap">
                        🗺️ {lang === 'ar' ? 'خريطة' : 'Map'}
                      </a>
                    ) : (
                      <span className="text-xs text-[#4a4e60]">—</span>
                    )}
                  </div>

                  {/* Product */}
                  <div className="col-span-2 flex items-center gap-2">
                    {order.products?.images?.[0] && (
                      <img src={order.products.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-xs text-[#8b8fa8] truncate block">
                        {order.products?.title || '—'}
                        {order.upsell_item && ` + ${order.upsell_item.product_title}`}
                      </span>
                      {order.upsell_item && (
                        <span className="text-[10px] text-[#a78bfa] font-medium bg-[#a78bfa]/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {order.upsell_item.type === 'bump' ? 'Bump' : 'Upsell'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="col-span-1">
                    <div className="text-xs text-[#8b8fa8] truncate">{order.address_governorate}</div>
                    <div className="text-xs text-[#4a4e60] truncate">{order.address_line1}</div>
                  </div>

                  {/* Total */}
                  <div className="col-span-1">
                    <span className="text-sm text-white font-medium">{order.total_price}</span>
                    <span className="text-xs text-[#4a4e60] ms-1">{order.currency}</span>
                  </div>

                  {/* Qty */}
                  <div className="col-span-1">
                    <span className="text-sm text-[#8b8fa8]">×{order.quantity}</span>
                    {order.applied_offer && (
                      <div className="text-[10px] text-[#fbbf24] font-medium mt-0.5 bg-[#fbbf24]/10 px-1.5 py-0.5 rounded w-fit">
                        {lang === 'ar' ? `عرض ×${order.applied_offer.quantity}` : `Bundle ×${order.applied_offer.quantity}`}
                      </div>
                    )}
                  </div>

                  {/* Source */}
                  <div className="col-span-1">
                    <span className={`text-xs font-medium flex items-center gap-1 ${srcMeta.color}`}>
                      <span>{srcMeta.icon}</span>
                      <span className="truncate">{srcMeta.label}</span>
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <select
                      value={order.status}
                      onChange={e => updateStatus(order.id, e.target.value)}
                      disabled={updatingId === order.id}
                      className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[order.status] || 'bg-[#1f2229] text-[#8b8fa8]'}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date + export badge */}
                  <div className="col-span-1">
                    <div className="text-xs text-[#4a4e60]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    {isExported ? (
                      <div
                        className="text-xs text-[#4ade80] mt-0.5 cursor-default"
                        title={`Exported: ${new Date(order.exported_at).toLocaleDateString()}`}
                      >
                        ✓ {lang === 'ar' ? 'مُصدَّر' : 'exported'}
                      </div>
                    ) : (
                      <div className="text-xs text-[#fbbf24] mt-0.5">
                        ● {lang === 'ar' ? 'جديد' : 'new'}
                      </div>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
          </div>
        )}

      </main>
    </div>
  )
}
