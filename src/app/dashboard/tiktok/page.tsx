'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import TikTokCampaignTable from '@/components/dashboard/TikTokCampaignTable'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import {
  Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'

type DailyRow = {
  date: string
  label: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  conversion: number
  cost_per_conversion: number
  conversion_rate: number
  video_play_actions: number
  video_watched_2s: number
  complete_payment_roas: number
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

function parseReportRows(list: any[]): DailyRow[] {
  return (list || [])
    .map(row => ({
      date: String(row.dimensions?.stat_time_day || '').slice(0, 10),
      label: String(row.dimensions?.stat_time_day || '').slice(5, 10),
      spend: num(row.metrics?.spend),
      impressions: num(row.metrics?.impressions),
      clicks: num(row.metrics?.clicks),
      ctr: num(row.metrics?.ctr),
      conversion: num(row.metrics?.conversion),
      cost_per_conversion: num(row.metrics?.cost_per_conversion),
      conversion_rate: num(row.metrics?.conversion_rate),
      video_play_actions: num(row.metrics?.video_play_actions),
      video_watched_2s: num(row.metrics?.video_watched_2s),
      complete_payment_roas: num(row.metrics?.complete_payment_roas),
    }))
    .filter(r => r.date)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function avg(rows: DailyRow[], key: keyof DailyRow) {
  if (!rows.length) return 0
  return rows.reduce((s, r) => s + num(r[key]), 0) / rows.length
}

function yDomain(data: { value: number }[]) {
  const values = data.map(d => d.value)
  if (!values.length) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = max === min ? Math.max(max * 0.15, 1) : (max - min) * 0.12
  return [Math.max(0, min - pad), max + pad]
}

function formatLocalDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function defaultLast7Days() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)
  return { start: formatLocalDate(start), end: formatLocalDate(end) }
}

function shortcutRange(kind: '7' | '30' | 'today') {
  const end = new Date()
  const start = new Date()
  if (kind === 'today') return { start: formatLocalDate(end), end: formatLocalDate(end) }
  start.setDate(end.getDate() - (kind === '30' ? 29 : 6))
  return { start: formatLocalDate(start), end: formatLocalDate(end) }
}

function normalizeDateRange(start: string, end: string) {
  if (!start || !end || end >= start) return { start, end, adjusted: false }
  return { start: end, end: start, adjusted: true }
}

function dashboardErrorText(error: string | null, lang: string) {
  if (!error) return ''
  if (error === 'no_active_account') {
    return lang === 'ar' ? 'اختر حساب معلن من القائمة أعلاه.' : 'Pick an advertiser account above.'
  }
  if (error === 'fetch_failed') {
    return lang === 'ar' ? 'تعذر تحميل تقرير TikTok.' : 'Could not load TikTok report.'
  }
  if (error === 'invalid_date_range') {
    return lang === 'ar' ? 'تاريخ النهاية يجب أن يكون في نفس يوم البداية أو بعده.' : 'End date must be on or after the start date.'
  }
  return error
}

function SparkTooltip({ active, payload, format }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
      <div className="text-[#8b8fa8] mb-0.5">{row.date || row.label}</div>
      <div className="text-white font-semibold">{format(Number(payload[0].value))}</div>
    </div>
  )
}

function HeroSparkline({
  data, dataKey, color, formatValue,
}: {
  data: DailyRow[]
  dataKey: keyof DailyRow
  color: string
  formatValue: (n: number) => string
}) {
  const chartData = data.map(d => ({ label: d.label, date: d.date, value: num(d[dataKey]) }))
  const domain = yDomain(chartData)

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={`hero-${String(dataKey)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={domain} />
        <Tooltip content={<SparkTooltip format={formatValue} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#hero-${String(dataKey)})`}
          dot={{ r: 2, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ChartTooltip({ active, payload, label, currency, lang }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-[#8b8fa8] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.name === (lang === 'ar' ? 'الإنفاق' : 'Spend')
            ? `${Number(p.value).toLocaleString()} ${currency}`
            : Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function AccountIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-[#1a1d24] border border-[#2a2d35] rounded-2xl" />
        ))}
      </div>
      <div className="h-8 bg-[#1a1d24] border border-[#2a2d35] rounded-full w-full max-w-md" />
      <div className="h-72 bg-[#1a1d24] border border-[#2a2d35] rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-20 bg-[#1a1d24] border border-[#2a2d35] rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-[#1a1d24] border border-[#2a2d35] rounded-2xl" />
    </div>
  )
}

export default function TikTokAdsPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const [store, setStore] = useState<any>(null)
  const [connections, setConnections] = useState<any[]>([])
  const [activeAdvertiserId, setActiveAdvertiserId] = useState('')
  const [activeAccountSaved, setActiveAccountSaved] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const initialRange = defaultLast7Days()
  const [draftStart, setDraftStart] = useState(initialRange.start)
  const [draftEnd, setDraftEnd] = useState(initialRange.end)
  const [appliedStart, setAppliedStart] = useState(initialRange.start)
  const [appliedEnd, setAppliedEnd] = useState(initialRange.end)
  const [dateError, setDateError] = useState<string | null>(null)
  const [adCurrency, setAdCurrency] = useState('USD')
  const [reportRows, setReportRows] = useState<DailyRow[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [customRangeOpen, setCustomRangeOpen] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const customRangeRef = useRef<HTMLDivElement>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const todayStr = formatLocalDate(new Date())
  const hasActiveAccount = connections.some(c => c.is_active)

  const loadConnections = async () => {
    const res = await fetch('/api/tiktok/connections')
    if (!res.ok) return []
    const { connections: list } = await res.json()
    setConnections(list || [])
    const active = (list || []).find((c: any) => c.is_active)
    setActiveAdvertiserId(active?.advertiser_id || list?.[0]?.advertiser_id || '')
    return list || []
  }

  const fetchDashboard = useCallback(async (start: string, end: string) => {
    const { start: safeStart, end: safeEnd, adjusted } = normalizeDateRange(start, end)
    if (adjusted) {
      setDraftStart(safeStart)
      setDraftEnd(safeEnd)
      setAppliedStart(safeStart)
      setAppliedEnd(safeEnd)
      setDateError(
        lang === 'ar'
          ? 'تم تصحيح نطاق التاريخ — البداية يجب أن تكون قبل النهاية.'
          : 'Date range corrected — start must be on or before end.'
      )
      start = safeStart
      end = safeEnd
    }

    setDashboardLoading(true)
    setDashboardError(null)
    try {
      const q = `?start_date=${start}&end_date=${end}`
      const reportRes = await fetch(`/api/tiktok/report${q}`)
      const reportData = await reportRes.json()

      if (reportData.error === 'no_active_account') {
        setDashboardError('no_active_account')
        setReportRows([])
        return
      }
      if (reportData.error === 'invalid_date_range') {
        setDashboardError('invalid_date_range')
        setReportRows([])
        return
      }
      if (reportData.error) {
        setDashboardError(reportData.message || reportData.error)
        setReportRows([])
        return
      }

      setReportRows(parseReportRows(reportData.data || []))
      if (reportData.currency) setAdCurrency(reportData.currency)
    } catch {
      setDashboardError('fetch_failed')
      setReportRows([])
    } finally {
      setDashboardLoading(false)
    }
  }, [lang])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)
      await loadConnections()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (loading || !connections.length) return
    if (connections.some(c => c.is_active)) fetchDashboard(appliedStart, appliedEnd)
  }, [loading, connections, appliedStart, appliedEnd, fetchDashboard])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (customRangeRef.current && !customRangeRef.current.contains(e.target as Node)) {
        setCustomRangeOpen(false)
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    const tiktok = new URLSearchParams(window.location.search).get('tiktok')
    if (!tiktok) return

    if (tiktok === 'connected') {
      setNotice({
        type: 'success',
        text: lang === 'ar' ? 'تم ربط حساب TikTok Ads بنجاح.' : 'TikTok Ads account connected successfully.',
      })
      loadConnections()
    } else {
      const errors: Record<string, { ar: string; en: string }> = {
        error_state: { ar: 'فشل التحقق من OAuth. حاول الربط مرة أخرى.', en: 'OAuth verification failed. Please try connecting again.' },
        error_token: { ar: 'فشل الحصول على رمز الوصول من TikTok.', en: 'Failed to get an access token from TikTok.' },
        error_db: { ar: 'فشل حفظ الاتصال. تأكد من إعداد قاعدة البيانات.', en: 'Failed to save the connection. Check your database setup.' },
      }
      const msg = errors[tiktok] || errors.error_state
      setNotice({ type: 'error', text: lang === 'ar' ? msg.ar : msg.en })
    }

    router.replace('/dashboard/tiktok')
  }, [lang, router])

  const handleSetActiveAdvertiser = async (advertiserId: string) => {
    setActiveAdvertiserId(advertiserId)
    const res = await fetch('/api/tiktok/set-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advertiser_id: advertiserId }),
    })
    if (!res.ok) return
    setConnections(prev => prev.map(c => ({ ...c, is_active: c.advertiser_id === advertiserId })))
    setActiveAccountSaved(true)
    setTimeout(() => setActiveAccountSaved(false), 3000)
    fetchDashboard(appliedStart, appliedEnd)
  }

  const applyShortcut = (kind: '7' | '30' | 'today') => {
    const range = shortcutRange(kind)
    setDraftStart(range.start)
    setDraftEnd(range.end)
    setAppliedStart(range.start)
    setAppliedEnd(range.end)
    setDateError(null)
    setCustomRangeOpen(false)
  }

  const onDraftStartChange = (value: string) => {
    setDraftStart(value)
    if (value && draftEnd && value > draftEnd) {
      setDraftEnd(value)
      setDateError(
        lang === 'ar'
          ? 'تم ضبط تاريخ النهاية (إلى) ليطابق تاريخ البداية (من).'
          : 'End date (To) was adjusted to match the start date (From).'
      )
    } else {
      setDateError(null)
    }
  }

  const onDraftEndChange = (value: string) => {
    setDraftEnd(value)
    if (value && draftStart && value < draftStart) {
      setDraftStart(value)
      setDateError(
        lang === 'ar'
          ? 'تم ضبط تاريخ البداية (من) ليطابق تاريخ النهاية (إلى).'
          : 'Start date (From) was adjusted to match the end date (To).'
      )
    } else {
      setDateError(null)
    }
  }

  const applyCustomRange = () => {
    const { start, end, adjusted } = normalizeDateRange(draftStart, draftEnd)
    setDraftStart(start)
    setDraftEnd(end)
    if (adjusted) {
      setDateError(
        lang === 'ar'
          ? 'تم تبديل التواريخ — البداية (من) يجب أن تكون قبل النهاية (إلى).'
          : 'Dates were swapped — From must be on or before To.'
      )
    } else {
      setDateError(null)
    }
    setAppliedStart(start)
    setAppliedEnd(end)
    setCustomRangeOpen(false)
  }

  const totals = useMemo(() => ({
    spend: reportRows.reduce((s, r) => s + r.spend, 0),
    conversions: reportRows.reduce((s, r) => s + r.conversion, 0),
    impressions: reportRows.reduce((s, r) => s + r.impressions, 0),
    clicks: reportRows.reduce((s, r) => s + r.clicks, 0),
    videoViews: reportRows.reduce((s, r) => s + r.video_play_actions, 0),
    video2s: reportRows.reduce((s, r) => s + r.video_watched_2s, 0),
  }), [reportRows])

  const rates = useMemo(() => ({
    ctr: avg(reportRows, 'ctr'),
    cvr: avg(reportRows, 'conversion_rate'),
    cpa: avg(reportRows, 'cost_per_conversion'),
    roas: avg(reportRows, 'complete_payment_roas'),
  }), [reportRows])

  const fmtNum = (n: number, digits = 0) =>
    n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })
  const fmtMoney = (n: number, digits = 2) => `${fmtNum(n, digits)} ${adCurrency}`
  const fmtPct = (n: number) => `${fmtNum(n, 2)}%`

  const shortcuts: { id: '7' | '30' | 'today'; label: string }[] = [
    { id: '7', label: lang === 'ar' ? '7 أيام' : '7 days' },
    { id: '30', label: lang === 'ar' ? '30 يوم' : '30 days' },
    { id: 'today', label: lang === 'ar' ? 'اليوم' : 'Today' },
  ]

  const isShortcutActive = (kind: '7' | '30' | 'today') => {
    const r = shortcutRange(kind)
    return appliedStart === r.start && appliedEnd === r.end
  }

  const isCustomRangeActive = !shortcuts.some(s => isShortcutActive(s.id))

  const activeAccountName = connections.find(c => c.advertiser_id === activeAdvertiserId)?.advertiser_name
    || activeAdvertiserId
    || (lang === 'ar' ? 'اختر حساباً' : 'Select account')

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  const metricCards = [
    { label: lang === 'ar' ? 'مرات الظهور' : 'Impressions', value: fmtNum(totals.impressions) },
    { label: lang === 'ar' ? 'النقرات' : 'Clicks', value: fmtNum(totals.clicks) },
    { label: 'CTR', value: fmtPct(rates.ctr) },
    { label: lang === 'ar' ? 'التحويلات' : 'Conversions', value: fmtNum(totals.conversions) },
    { label: 'CPA', value: fmtMoney(rates.cpa) },
    { label: 'CVR', value: fmtPct(rates.cvr) },
    { label: lang === 'ar' ? 'مشاهدات الفيديو' : 'Video Views', value: fmtNum(totals.videoViews) },
    { label: lang === 'ar' ? 'مشاهدات 2 ث' : '2s Video Views', value: fmtNum(totals.video2s) },
    { label: lang === 'ar' ? 'الإنفاق' : 'Spend', value: fmtMoney(totals.spend) },
    { label: 'ROAS', value: fmtNum(rates.roas, 2) },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className="flex-1 p-6 md:p-8 overflow-auto pb-24 md:pb-8 mt-14 md:mt-0">
        {notice && (
          <div className={`rounded-xl px-4 py-3 text-sm border mb-4 ${
            notice.type === 'success'
              ? 'bg-[#14321f] border-[#4ade80]/20 text-[#4ade80]'
              : 'bg-[#3a1414] border-[#f87171]/20 text-[#f87171]'
          }`}>
            {notice.type === 'success' ? '✓ ' : '✕ '}
            {notice.text}
          </div>
        )}

        <div className="relative bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-4 md:px-5 md:py-4 mb-6 shadow-sm shadow-black/20">
          {connections.length > 0 && (
            <div className="absolute top-3 end-3 z-10" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => { setHeaderMenuOpen(v => !v); setCustomRangeOpen(false) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8b8fa8] hover:text-white hover:bg-[#2a2d35] transition-colors"
                aria-label={lang === 'ar' ? 'المزيد' : 'More options'}
              >
                <span className="text-lg leading-none">⋯</span>
              </button>
              {headerMenuOpen && (
                <div className="absolute end-0 mt-1 min-w-[140px] bg-[#0f1117] border border-[#2a2d35] rounded-lg py-1 shadow-xl">
                  <a
                    href="/api/tiktok/connect"
                    className="block px-3 py-2 text-xs text-[#8b8fa8] hover:text-white hover:bg-[#1a1d24] transition-colors"
                  >
                    {lang === 'ar' ? 'إعادة الربط' : 'Reconnect'}
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5 pe-10">
            <div className="flex items-start gap-3 shrink-0">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold text-white leading-tight">{tr.tiktokAds}</h1>
                  {connections.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#4ade80] bg-[#14321f]/80 border border-[#4ade80]/25 rounded-full px-2 py-0.5">
                      ✓ {lang === 'ar' ? 'متصل' : 'Connected'}
                    </span>
                  )}
                </div>
                <p className="text-[#4a4e60] text-xs mt-0.5 hidden sm:block">{tr.tiktokAdsSub}</p>
              </div>
            </div>

            {connections.length === 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:ms-auto">
                <p className="text-[#8b8fa8] text-sm">
                  {lang === 'ar' ? 'اربط حساب TikTok Ads لإدارة حملاتك.' : 'Connect TikTok Ads to manage campaigns.'}
                </p>
                <a
                  href="/api/tiktok/connect"
                  className="inline-flex items-center justify-center rounded-lg bg-black border border-[#2a2d35] px-4 py-2 text-sm text-white font-medium hover:border-[#3b82f6]/50 transition-colors shrink-0"
                >
                  {lang === 'ar' ? 'ربط TikTok Ads' : 'Connect TikTok Ads'}
                </a>
              </div>
            ) : (
              <div className="flex flex-col xl:flex-row flex-1 items-stretch xl:items-center justify-end gap-3 xl:gap-4 min-w-0">
                <div className="flex flex-col gap-1 shrink-0">
                  <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider font-medium">
                    {lang === 'ar' ? 'الحساب النشط' : 'Active account'}
                  </span>
                  <div className="relative group">
                    <AccountIcon className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[#4a4e60] pointer-events-none group-hover:text-[#8b8fa8] transition-colors" />
                    <select
                      value={activeAdvertiserId}
                      onChange={e => handleSetActiveAdvertiser(e.target.value)}
                      className="appearance-none bg-[#0f1117] border border-[#2a2d35] hover:border-[#3b82f6]/40 rounded-lg ps-8 pe-8 py-2 text-sm text-white min-w-[200px] max-w-[240px] truncate focus:outline-none focus:border-[#3b82f6] transition-colors cursor-pointer"
                      title={activeAccountName}
                    >
                      {connections.map(c => (
                        <option key={c.advertiser_id} value={c.advertiser_id}>
                          {c.advertiser_name || c.advertiser_id}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#4a4e60] pointer-events-none group-hover:text-[#8b8fa8] transition-colors" />
                  </div>
                  {activeAccountSaved && (
                    <span className="text-[10px] text-[#4ade80]">
                      {lang === 'ar' ? '✓ تم الحفظ' : '✓ Saved'}
                    </span>
                  )}
                </div>

                {hasActiveAccount && (
                  <div className="flex flex-wrap items-center gap-2 xl:ms-auto">
                    <div className="flex items-center rounded-lg border border-[#2a2d35] bg-[#0f1117] p-0.5">
                      {shortcuts.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => applyShortcut(s.id)}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                            isShortcutActive(s.id)
                              ? 'bg-[#3b82f6] text-white shadow-sm'
                              : 'text-[#8b8fa8] hover:text-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative" ref={customRangeRef}>
                      <button
                        type="button"
                        onClick={() => { setCustomRangeOpen(v => !v); setHeaderMenuOpen(false) }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                          isCustomRangeActive || customRangeOpen
                            ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-white'
                            : 'border-[#2a2d35] bg-[#0f1117] text-[#8b8fa8] hover:text-white hover:border-[#3b82f6]/40'
                        }`}
                      >
                        <CalendarIcon className="shrink-0 opacity-70" />
                        <span dir="ltr">{appliedStart} – {appliedEnd}</span>
                        <ChevronDownIcon className={`shrink-0 opacity-60 transition-transform ${customRangeOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {customRangeOpen && (
                        <div
                          dir="ltr"
                          className="absolute top-full end-0 mt-2 z-30 min-w-[280px] bg-[#0f1117] border border-[#2a2d35] rounded-xl p-3 shadow-2xl shadow-black/40"
                        >
                          <div className="flex items-end gap-2">
                            <label className="flex flex-col gap-1 flex-1">
                              <span className="text-[10px] text-[#4a4e60] uppercase tracking-wide">
                                {lang === 'ar' ? 'من / From' : 'From / من'}
                              </span>
                              <input
                                type="date"
                                value={draftStart}
                                max={draftEnd || todayStr}
                                onChange={e => onDraftStartChange(e.target.value)}
                                className="w-full bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#3b82f6] [color-scheme:dark]"
                              />
                            </label>
                            <span className="text-[#4a4e60] text-xs pb-2">→</span>
                            <label className="flex flex-col gap-1 flex-1">
                              <span className="text-[10px] text-[#4a4e60] uppercase tracking-wide">
                                {lang === 'ar' ? 'إلى / To' : 'To / إلى'}
                              </span>
                              <input
                                type="date"
                                value={draftEnd}
                                min={draftStart}
                                max={todayStr}
                                onChange={e => onDraftEndChange(e.target.value)}
                                className="w-full bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#3b82f6] [color-scheme:dark]"
                              />
                            </label>
                          </div>
                          {dateError && (
                            <p className="text-[10px] text-[#fbbf24] mt-2">{dateError}</p>
                          )}
                          <button
                            type="button"
                            onClick={applyCustomRange}
                            className="w-full mt-2.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors"
                          >
                            {lang === 'ar' ? 'تطبيق' : 'Apply'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {connections.length > 0 && !hasActiveAccount && (
          <div className="bg-[#3a2800] border border-[#fbbf24]/20 rounded-xl px-4 py-3 text-sm text-[#fbbf24] mb-6">
            {lang === 'ar' ? 'اختر حساب معلن من القائمة أعلاه لعرض بيانات الأداء.' : 'Pick an advertiser account above to view performance data.'}
          </div>
        )}

        {connections.length > 0 && hasActiveAccount && (
          <>
            {dashboardLoading && <DashboardSkeleton />}

            {!dashboardLoading && dashboardError && (
              <div className={`rounded-xl px-4 py-3 text-sm border ${
                dashboardError === 'no_active_account'
                  ? 'bg-[#3a2800] border-[#fbbf24]/20 text-[#fbbf24]'
                  : 'bg-[#3a1414] border-[#f87171]/20 text-[#f87171]'
              }`}>
                {dashboardErrorText(dashboardError, lang)}
              </div>
            )}

            {!dashboardLoading && !dashboardError && (
              <div className="space-y-6">
                {reportRows.length > 0 && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-[#3b82f6]/20 bg-gradient-to-br from-[#1a3a5c] to-[#1a1d24] p-5">
                    <div className="text-xs text-[#60a5fa] uppercase tracking-wider mb-1">
                      {lang === 'ar' ? 'الإنفاق اليومي' : 'Daily Spend'}
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{fmtMoney(totals.spend, 0)}</div>
                    <HeroSparkline data={reportRows} dataKey="spend" color="#60a5fa" formatValue={(n) => fmtMoney(n, 0)} />
                  </div>

                  <div className="rounded-2xl border border-[#4ade80]/20 bg-gradient-to-br from-[#14321f] to-[#1a1d24] p-5">
                    <div className="text-xs text-[#4ade80] uppercase tracking-wider mb-1">
                      {lang === 'ar' ? 'التحويلات اليومية' : 'Daily Conversions'}
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{fmtNum(totals.conversions)}</div>
                    <HeroSparkline data={reportRows} dataKey="conversion" color="#4ade80" formatValue={(n) => fmtNum(n)} />
                  </div>

                  <div className="rounded-2xl border border-[#a78bfa]/20 bg-gradient-to-br from-[#2e1f4d] to-[#1a1d24] p-5">
                    <div className="text-xs text-[#a78bfa] uppercase tracking-wider mb-1">
                      {lang === 'ar' ? 'CTR اليومي' : 'Daily CTR'}
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{fmtPct(rates.ctr)}</div>
                    <HeroSparkline data={reportRows} dataKey="ctr" color="#a78bfa" formatValue={(n) => fmtPct(n)} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { k: 'CTR', v: fmtPct(rates.ctr) },
                    { k: 'CVR', v: fmtPct(rates.cvr) },
                    { k: 'CPA', v: fmtMoney(rates.cpa) },
                    { k: 'ROAS', v: fmtNum(rates.roas, 2) },
                  ].map(r => (
                    <div key={r.k} className="bg-[#1a1d24] border border-[#2a2d35] rounded-full px-3 py-1.5 text-xs flex items-center gap-2">
                      <span className="text-[#4a4e60]">{r.k}</span>
                      <span className="text-white font-semibold">{r.v}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-semibold text-sm">
                      {lang === 'ar' ? 'اتجاه الإنفاق والتحويلات' : 'Spend & conversions trend'}
                    </h2>
                    <span className="text-xs text-[#4a4e60] bg-[#0f1117] border border-[#2a2d35] px-2.5 py-1 rounded-full">
                      {appliedStart} — {appliedEnd}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={reportRows} margin={{ top: 8, right: dir === 'rtl' ? 0 : 8, left: dir === 'rtl' ? 8 : 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#4a4e60', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="spend" orientation={dir === 'rtl' ? 'right' : 'left'} tick={{ fill: '#60a5fa', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                      <YAxis yAxisId="conv" orientation={dir === 'rtl' ? 'left' : 'right'} tick={{ fill: '#4ade80', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<ChartTooltip currency={adCurrency} lang={lang} />} />
                      <Bar yAxisId="spend" dataKey="spend" name={lang === 'ar' ? 'الإنفاق' : 'Spend'} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Line yAxisId="conv" type="monotone" dataKey="conversion" name={lang === 'ar' ? 'التحويلات' : 'Conversions'} stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {metricCards.map(card => (
                    <div key={card.label} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 hover:border-[#3b82f6]/30 transition-colors">
                      <div className="text-xs text-[#4a4e60] mb-1">{card.label}</div>
                      <div className="text-lg font-bold text-white">{card.value}</div>
                    </div>
                  ))}
                </div>
                </>
                )}

                <TikTokCampaignTable
                  advertiserId={activeAdvertiserId}
                  currency={adCurrency}
                  lang={lang}
                  dateStart={appliedStart}
                  dateEnd={appliedEnd}
                  fmtMoney={fmtMoney}
                  fmtNum={fmtNum}
                  fmtPct={fmtPct}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
