'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import TikTokCampaignTable from '@/components/dashboard/TikTokCampaignTable'
import TikTokTabBar, { type TikTokTabId } from '@/components/dashboard/TikTokTabBar'
import { TikTokBulkLaunchTabPanel, TikTokCreateAdTab } from '@/components/dashboard/TikTokTabPanels'
import TikTokWinnersTab from '@/components/dashboard/TikTokWinnersTab'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import {
  Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
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
    return lang === 'ar' ? 'اختر حساباً من القائمة أعلاه لعرض الأداء.' : 'Select an account above to view performance.'
  }
  if (error === 'fetch_failed') {
    return lang === 'ar' ? 'تعذر تحميل بيانات TikTok.' : 'Could not load TikTok data.'
  }
  if (error === 'invalid_date_range') {
    return lang === 'ar' ? 'تاريخ النهاية يجب أن يكون في نفس يوم البداية أو بعده.' : 'End date must be on or after the start date.'
  }
  return lang === 'ar' ? 'تعذر تحميل بيانات TikTok.' : 'Could not load TikTok data.'
}

function canRetryDashboard(error: string | null) {
  return error === 'fetch_failed' || error === 'tiktok_error'
}

/* ── Icons ── */
function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.79 1.53V6.76a4.85 4.85 0 0 1-1.03-.07z"/>
    </svg>
  )
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}

function IconUnlink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      <line x1="4" y1="4" x2="20" y2="20"/>
    </svg>
  )
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  )
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IconTrend({ up }: { up: boolean }) {
  return up ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
      <polyline points="17 18 23 18 23 12"/>
    </svg>
  )
}

/* ── Tooltips ── */
function SparkTooltip({ active, payload, format }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
      <div className="text-[#4a4e60] mb-0.5">{row.date || row.label}</div>
      <div className="text-white font-semibold">{format(Number(payload[0].value))}</div>
    </div>
  )
}

function ChartTooltip({ active, payload, label, currency, lang }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs shadow-xl min-w-[120px]">
      <div className="text-[#4a4e60] mb-2 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#8b8fa8]">{p.name}:</span>
          <span className="text-white font-semibold ms-auto ps-2">
            {p.name === (lang === 'ar' ? 'الإنفاق' : 'Spend') || p.name === 'CPA'
              ? `${Number(p.value).toLocaleString()} ${currency}`
              : Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function CpaTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  const cpa = Number(payload[0]?.value ?? 0)
  return (
    <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-[#4a4e60] mb-1.5">{label}</div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#fb923c]" />
        <span className="text-[#8b8fa8]">CPA:</span>
        <span className="text-[#fb923c] font-bold ms-1">{cpa.toLocaleString()} {currency}</span>
      </div>
    </div>
  )
}

/* ── Sparkline ── */
function HeroSparkline({ data, dataKey, color, formatValue }: {
  data: DailyRow[]
  dataKey: keyof DailyRow
  color: string
  formatValue: (n: number) => string
}) {
  const chartData = data.map(d => ({ label: d.label, date: d.date, value: num(d[dataKey]) }))
  const domain = yDomain(chartData)
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${String(dataKey)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={domain} />
        <Tooltip content={<SparkTooltip format={formatValue} />} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
          fill={`url(#spark-${String(dataKey)})`}
          dot={{ r: 2, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: color }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Skeletons ── */
function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[140px] bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-4">
            <div className="h-3 w-20 bg-[#2a2d35] rounded mb-3" />
            <div className="h-7 w-28 bg-[#2a2d35] rounded mb-4" />
            <div className="h-[55px] bg-[#2a2d35]/60 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="h-[300px] bg-[#1a1d24] border border-[#2a2d35] rounded-2xl" />
      <div className="h-[240px] bg-[#1a1d24] border border-[#2a2d35] rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-[68px] bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-3">
            <div className="h-2.5 w-14 bg-[#2a2d35] rounded mb-2" />
            <div className="h-4 w-20 bg-[#2a2d35] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ReauthBanner({ lang }: { lang: string }) {
  return (
    <div className="bg-[#1a1d24] border border-[#f87171]/30 rounded-2xl px-5 py-6 mb-6 text-center">
      <div className="text-[#f87171] text-sm font-semibold mb-1">
        {lang === 'ar' ? 'انتهت صلاحية اتصال TikTok' : 'Your TikTok connection expired'}
      </div>
      <p className="text-[#4a4e60] text-sm mb-4">
        {lang === 'ar' ? 'أعد الربط لمتابعة إدارة حملاتك.' : 'Reconnect to continue managing your campaigns.'}
      </p>
      <a
        href="/api/tiktok/connect"
        className="inline-flex items-center gap-2 rounded-xl bg-[#3b82f6] px-5 py-2.5 text-sm text-white font-semibold hover:bg-[#2563eb] transition-colors"
      >
        {lang === 'ar' ? 'إعادة الربط' : 'Reconnect'}
      </a>
    </div>
  )
}

function DashboardEmptyState({ lang }: { lang: string }) {
  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl px-5 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#2a2d35] flex items-center justify-center mx-auto mb-4 text-[#3a3d48]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
          <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
        </svg>
      </div>
      <p className="text-[#4a4e60] text-sm">
        {lang === 'ar'
          ? 'لا توجد بيانات حملات لهذه الفترة — جرّب نطاق تاريخ أوسع.'
          : 'No campaign data for this period — try a wider date range.'}
      </p>
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
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [reauthRequired, setReauthRequired] = useState(false)
  const [activeTab, setActiveTab] = useState<TikTokTabId>('dashboard')
  const [customRangeOpen, setCustomRangeOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const customRangeRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const todayStr = formatLocalDate(new Date())
  const hasActiveAccount = connections.some(c => c.is_active)

  const loadConnections = async () => {
    const res = await fetch('/api/tiktok/connections', { cache: 'no-store' })
    if (!res.ok) return []
    const { connections: list } = await res.json()
    const rows = list || []
    setConnections(rows)
    const active = rows.find((c: { is_active: boolean }) => c.is_active)
    setActiveAdvertiserId(active?.advertiser_id || '')
    return rows
  }

  const fetchDashboard = useCallback(async (start: string, end: string) => {
    const { start: safeStart, end: safeEnd, adjusted } = normalizeDateRange(start, end)
    if (adjusted) {
      setDraftStart(safeStart); setDraftEnd(safeEnd)
      setAppliedStart(safeStart); setAppliedEnd(safeEnd)
      setDateError(lang === 'ar' ? 'تم تصحيح نطاق التاريخ.' : 'Date range corrected.')
      start = safeStart; end = safeEnd
    }
    setDashboardLoading(true)
    setDashboardError(null)
    try {
      const q = `?start_date=${start}&end_date=${end}`
      const reportRes = await fetch(`/api/tiktok/report${q}`)
      const reportData = await reportRes.json()
      if (reportData.error === 'no_active_account') {
        setDashboardError('no_active_account'); setReportRows([]); setDashboardLoading(false); return
      }
      if (reportData.error === 'reauth_required') {
        setReauthRequired(true); setDashboardError(null); setReportRows([]); setDashboardLoading(false); return
      }
      if (reportData.error === 'invalid_date_range') {
        setDashboardError('invalid_date_range'); setReportRows([]); setDashboardLoading(false); return
      }
      if (reportData.error) {
        setDashboardError(reportData.error === 'tiktok_error' ? 'tiktok_error' : 'fetch_failed')
        setReportRows([]); setDashboardLoading(false); return
      }
      setReportRows(parseReportRows(reportData.data || []))
      if (reportData.currency) setAdCurrency(reportData.currency)
      setReauthRequired(false)
    } catch {
      setDashboardError('fetch_failed'); setReportRows([])
    } finally {
      setDashboardLoading(false)
    }
  }, [lang])

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      setStore(ctx.store)
      await loadConnections()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (loading || !connections.length) return
    if (connections.some(c => c.is_active)) fetchDashboard(appliedStart, appliedEnd)
    else setDashboardLoading(false)
  }, [loading, connections, appliedStart, appliedEnd, fetchDashboard])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (customRangeRef.current && !customRangeRef.current.contains(e.target as Node)) {
        setCustomRangeOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    const tiktok = new URLSearchParams(window.location.search).get('tiktok')
    if (!tiktok) return
    if (tiktok === 'connected') {
      setReauthRequired(false)
      setNotice({ type: 'success', text: lang === 'ar' ? 'تم ربط حساب TikTok Ads بنجاح.' : 'TikTok Ads account connected successfully.' })
      loadConnections()
    } else {
      const errors: Record<string, { ar: string; en: string }> = {
        error_state: { ar: 'فشل التحقق من OAuth.', en: 'OAuth verification failed.' },
        error_token: { ar: 'فشل الحصول على رمز الوصول.', en: 'Failed to get an access token.' },
        error_db: { ar: 'فشل حفظ الاتصال.', en: 'Failed to save the connection.' },
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
    setRefreshKey(k => k + 1)
  }

  const handleRefresh = async () => {
    setRefreshing(true); setNotice(null)
    try {
      const list = await loadConnections()
      if (list.some((c: { is_active: boolean }) => c.is_active)) await fetchDashboard(appliedStart, appliedEnd)
      setReauthRequired(false); setRefreshKey(k => k + 1)
    } finally { setRefreshing(false) }
  }

  const handleDisconnect = async () => {
    const accountLabel = activeAccountName || activeAdvertiserId
    const confirmed = window.confirm(
      lang === 'ar'
        ? `فصل حساب TikTok Ads "${accountLabel}"؟`
        : `Disconnect TikTok Ads account "${accountLabel}"?`
    )
    if (!confirmed) return
    setDisconnecting(true); setNotice(null)
    try {
      const res = await fetch('/api/tiktok/disconnect', { method: 'POST', cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || data.error) {
        setNotice({ type: 'error', text: lang === 'ar' ? 'تعذر فصل الحساب.' : 'Could not disconnect account.' }); return
      }
      setConnections([]); setActiveAdvertiserId(''); setReauthRequired(false)
      setReportRows([]); setDashboardError(null); setDashboardLoading(false); setActiveTab('dashboard')
      const list = await loadConnections()
      if (list.length > 0) {
        setNotice({ type: 'error', text: lang === 'ar' ? 'تعذر إكمال فصل الحساب.' : 'Disconnect did not clear all accounts.' }); return
      }
      setNotice({ type: 'success', text: lang === 'ar' ? 'تم فصل حساب TikTok Ads.' : 'TikTok Ads account disconnected.' })
      setRefreshKey(k => k + 1)
    } catch {
      setNotice({ type: 'error', text: lang === 'ar' ? 'تعذر فصل الحساب.' : 'Could not disconnect account.' })
    } finally { setDisconnecting(false) }
  }

  const applyShortcut = (kind: '7' | '30' | 'today') => {
    const range = shortcutRange(kind)
    setDraftStart(range.start); setDraftEnd(range.end)
    setAppliedStart(range.start); setAppliedEnd(range.end)
    setDateError(null); setCustomRangeOpen(false)
  }

  const onDraftStartChange = (value: string) => {
    setDraftStart(value)
    if (value && draftEnd && value > draftEnd) {
      setDraftEnd(value)
      setDateError(lang === 'ar' ? 'تم ضبط تاريخ النهاية.' : 'End date was adjusted to match.')
    } else { setDateError(null) }
  }

  const onDraftEndChange = (value: string) => {
    setDraftEnd(value)
    if (value && draftStart && value < draftStart) {
      setDraftStart(value)
      setDateError(lang === 'ar' ? 'تم ضبط تاريخ البداية.' : 'Start date was adjusted to match.')
    } else { setDateError(null) }
  }

  const applyCustomRange = () => {
    const { start, end, adjusted } = normalizeDateRange(draftStart, draftEnd)
    setDraftStart(start); setDraftEnd(end)
    if (adjusted) {
      setDateError(lang === 'ar' ? 'تم تبديل التواريخ.' : 'Dates were swapped.')
    } else { setDateError(null) }
    setAppliedStart(start); setAppliedEnd(end); setCustomRangeOpen(false)
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
    { id: '7', label: lang === 'ar' ? '٧ أيام' : '7 days' },
    { id: '30', label: lang === 'ar' ? '٣٠ يوماً' : '30 days' },
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

  /* ── CPA trend data ── */
  const cpaData = useMemo(() =>
    reportRows.map(r => ({ label: r.label, date: r.date, cpa: r.cost_per_conversion })),
    [reportRows]
  )
  const avgCpa = rates.cpa

  /* ── trend indicators (first half vs second half) ── */
  const trendIndicator = (key: keyof DailyRow, higherIsBetter = true) => {
    if (reportRows.length < 2) return null
    const half = Math.floor(reportRows.length / 2)
    const first = reportRows.slice(0, half).reduce((s, r) => s + num(r[key]), 0) / half
    const second = reportRows.slice(half).reduce((s, r) => s + num(r[key]), 0) / (reportRows.length - half)
    if (!first) return null
    const pct = ((second - first) / first) * 100
    const up = pct >= 0
    const positive = higherIsBetter ? up : !up
    return { pct: Math.abs(pct), up, positive }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
        <Sidebar store={store} />
        <main className={DASHBOARD_MAIN_CLASS}>
          <div className="h-16 bg-[#1a1d24] border border-[#2a2d35] rounded-2xl mb-5 animate-pulse" />
          <DashboardSkeleton />
        </main>
      </div>
    )
  }

  const spendTrend = trendIndicator('spend', false)
  const convTrend = trendIndicator('conversion', true)
  const ctrTrend = trendIndicator('ctr', true)
  const roasTrend = trendIndicator('complete_payment_roas', true)

  const heroCards = [
    {
      label: lang === 'ar' ? 'الإنفاق الكلي' : 'Total Spend',
      value: fmtMoney(totals.spend, 0),
      dataKey: 'spend' as keyof DailyRow,
      color: '#60a5fa',
      accent: '#3b82f6',
      trend: spendTrend,
      formatValue: (n: number) => fmtMoney(n, 0),
    },
    {
      label: lang === 'ar' ? 'التحويلات' : 'Conversions',
      value: fmtNum(totals.conversions),
      dataKey: 'conversion' as keyof DailyRow,
      color: '#4ade80',
      accent: '#22c55e',
      trend: convTrend,
      formatValue: (n: number) => fmtNum(n),
    },
    {
      label: 'ROAS',
      value: fmtNum(rates.roas, 2),
      dataKey: 'complete_payment_roas' as keyof DailyRow,
      color: '#a78bfa',
      accent: '#8b5cf6',
      trend: roasTrend,
      formatValue: (n: number) => fmtNum(n, 2),
    },
    {
      label: 'CTR',
      value: fmtPct(rates.ctr),
      dataKey: 'ctr' as keyof DailyRow,
      color: '#fbbf24',
      accent: '#f59e0b',
      trend: ctrTrend,
      formatValue: (n: number) => fmtPct(n),
    },
  ]

  const metricRows = [
    {
      group: lang === 'ar' ? 'جودة الأداء' : 'Performance Quality',
      color: '#3b82f6',
      items: [
        { label: 'CPA', value: fmtMoney(rates.cpa), highlight: true },
        { label: 'CVR', value: fmtPct(rates.cvr) },
        { label: 'CTR', value: fmtPct(rates.ctr) },
        { label: 'ROAS', value: fmtNum(rates.roas, 2) },
        { label: lang === 'ar' ? 'الإنفاق' : 'Spend', value: fmtMoney(totals.spend, 0) },
      ],
    },
    {
      group: lang === 'ar' ? 'نطاق الوصول' : 'Reach & Engagement',
      color: '#8b5cf6',
      items: [
        { label: lang === 'ar' ? 'مرات الظهور' : 'Impressions', value: fmtNum(totals.impressions) },
        { label: lang === 'ar' ? 'النقرات' : 'Clicks', value: fmtNum(totals.clicks) },
        { label: lang === 'ar' ? 'التحويلات' : 'Conversions', value: fmtNum(totals.conversions) },
        { label: lang === 'ar' ? 'مشاهدات الفيديو' : 'Video Views', value: fmtNum(totals.videoViews) },
        { label: lang === 'ar' ? 'مشاهدات 2ث' : '2s Views', value: fmtNum(totals.video2s) },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className={DASHBOARD_MAIN_CLASS}>

        {/* ── Notice ── */}
        {notice && (
          <div className={`rounded-xl px-4 py-3 text-sm border mb-4 flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-[#0d2218] border-[#4ade80]/25 text-[#4ade80]'
              : 'bg-[#1e0a0a] border-[#f87171]/25 text-[#f87171]'
          }`}>
            <span className="font-bold">{notice.type === 'success' ? '✓' : '✕'}</span>
            {notice.text}
          </div>
        )}

        {/* ── Header bar ── */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl px-5 py-4 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">

            {/* brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0">
                <IconTikTok className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{tr.tiktokAds}</span>
                  {hasActiveAccount && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/25 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                      {lang === 'ar' ? 'متصل' : 'Live'}
                    </span>
                  )}
                </div>
                <p className="text-[#4a4e60] text-[11px] mt-0.5 hidden sm:block">{tr.tiktokAdsSub}</p>
              </div>
            </div>

            {/* connect empty state */}
            {!hasActiveAccount && connections.length === 0 ? (
              <div className="flex items-center gap-3 lg:ms-auto">
                <span className="text-[#4a4e60] text-sm">
                  {lang === 'ar' ? 'اربط حساب TikTok Ads لإدارة حملاتك.' : 'Connect TikTok Ads to manage campaigns.'}
                </span>
                <a
                  href="/api/tiktok/connect"
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-black border border-[#2a2d35] px-4 py-2 text-sm text-white font-medium hover:border-[#3b82f6]/50 transition-colors"
                >
                  <IconTikTok className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'ربط TikTok Ads' : 'Connect TikTok Ads'}
                </a>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:ms-auto flex-1 justify-end min-w-0">

                {/* account selector */}
                <div className="flex flex-col gap-0.5 min-w-0 shrink-0">
                  <span className="text-[9px] text-[#4a4e60] uppercase tracking-wider font-medium px-1">
                    {lang === 'ar' ? 'الحساب' : 'Account'}
                  </span>
                  <div className="relative">
                    <IconUser className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#4a4e60] pointer-events-none" />
                    <select
                      value={activeAdvertiserId}
                      onChange={e => handleSetActiveAdvertiser(e.target.value)}
                      className="appearance-none bg-[#0f1117] border border-[#2a2d35] hover:border-[#3b82f6]/40 rounded-xl ps-8 pe-7 py-2 text-xs text-white min-w-[180px] max-w-[220px] focus:outline-none focus:border-[#3b82f6] transition-colors cursor-pointer"
                    >
                      {connections.map(c => (
                        <option key={c.advertiser_id} value={c.advertiser_id}>
                          {c.advertiser_name || c.advertiser_id}
                        </option>
                      ))}
                    </select>
                    <IconChevronDown className="w-3 h-3 absolute end-2.5 top-1/2 -translate-y-1/2 text-[#4a4e60] pointer-events-none" />
                  </div>
                  {activeAccountSaved && (
                    <span className="text-[9px] text-[#4ade80] px-1">
                      {lang === 'ar' ? '✓ تم الحفظ' : '✓ Saved'}
                    </span>
                  )}
                </div>

                {/* date shortcuts */}
                {hasActiveAccount && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-0.5 p-0.5 bg-[#0f1117] border border-[#2a2d35] rounded-xl">
                      {shortcuts.map(s => (
                        <button key={s.id} type="button" onClick={() => applyShortcut(s.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            isShortcutActive(s.id) ? 'bg-[#3b82f6] text-white' : 'text-[#4a4e60] hover:text-white'
                          }`}>
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* custom range */}
                    <div className="relative" ref={customRangeRef}>
                      <button type="button" onClick={() => setCustomRangeOpen(v => !v)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          isCustomRangeActive || customRangeOpen
                            ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-white'
                            : 'border-[#2a2d35] bg-[#0f1117] text-[#4a4e60] hover:text-white hover:border-[#3b82f6]/40'
                        }`}>
                        <IconCalendar className="w-3 h-3 shrink-0" />
                        <span dir="ltr">{appliedStart} – {appliedEnd}</span>
                        <IconChevronDown className={`w-3 h-3 shrink-0 transition-transform ${customRangeOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {customRangeOpen && (
                        <div dir="ltr" className="absolute top-full end-0 mt-2 z-30 min-w-[280px] bg-[#0f1117] border border-[#2a2d35] rounded-2xl p-4 shadow-2xl shadow-black/60">
                          <div className="flex items-end gap-2">
                            <label className="flex flex-col gap-1.5 flex-1">
                              <span className="text-[9px] text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'من' : 'From'}</span>
                              <input type="date" value={draftStart} max={draftEnd || todayStr}
                                onChange={e => onDraftStartChange(e.target.value)}
                                className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6] [color-scheme:dark]" />
                            </label>
                            <span className="text-[#4a4e60] text-xs pb-2.5">→</span>
                            <label className="flex flex-col gap-1.5 flex-1">
                              <span className="text-[9px] text-[#4a4e60] uppercase tracking-wider">{lang === 'ar' ? 'إلى' : 'To'}</span>
                              <input type="date" value={draftEnd} min={draftStart} max={todayStr}
                                onChange={e => onDraftEndChange(e.target.value)}
                                className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6] [color-scheme:dark]" />
                            </label>
                          </div>
                          {dateError && <p className="text-[10px] text-[#fbbf24] mt-2">{dateError}</p>}
                          <button type="button" onClick={applyCustomRange}
                            className="w-full mt-3 py-2 rounded-xl text-xs font-semibold bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors">
                            {lang === 'ar' ? 'تطبيق' : 'Apply'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* action buttons */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleRefresh} disabled={refreshing || disconnecting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#2a2d35] bg-[#0f1117] px-3 py-2 text-xs font-medium text-[#4a4e60] hover:text-white hover:border-[#3b82f6]/40 transition-colors disabled:opacity-50 cursor-pointer">
                    <IconRefresh className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? (lang === 'ar' ? 'تحديث...' : '…') : (lang === 'ar' ? 'تحديث' : 'Refresh')}
                  </button>
                  <button type="button" onClick={handleDisconnect} disabled={refreshing || disconnecting || connections.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#f87171]/20 bg-[#f87171]/5 px-3 py-2 text-xs font-medium text-[#f87171] hover:bg-[#f87171]/10 transition-colors disabled:opacity-50 cursor-pointer">
                    <IconUnlink className="w-3.5 h-3.5" />
                    {disconnecting ? '…' : (lang === 'ar' ? 'فصل' : 'Disconnect')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {reauthRequired && <ReauthBanner lang={lang} />}

        {connections.length > 0 && !reauthRequired && (
          <>
            <TikTokTabBar active={activeTab} onChange={setActiveTab} lang={lang} />

            {!hasActiveAccount && (activeTab === 'dashboard' || activeTab === 'campaigns') && (
              <div className="bg-[#1a1d24] border border-[#fbbf24]/20 rounded-xl px-4 py-8 text-center mb-6">
                <p className="text-[#fbbf24] text-sm">
                  {lang === 'ar' ? 'اختر حساباً من القائمة أعلاه لعرض الأداء.' : 'Select an account above to view performance.'}
                </p>
              </div>
            )}

            {activeTab === 'dashboard' && hasActiveAccount && (
              <div className="space-y-5">
                {dashboardLoading ? (
                  <DashboardSkeleton />
                ) : dashboardError ? (
                  <div className={`rounded-xl px-4 py-4 text-sm border ${
                    dashboardError === 'no_active_account'
                      ? 'bg-[#1a1300] border-[#fbbf24]/20 text-[#fbbf24]'
                      : 'bg-[#1e0a0a] border-[#f87171]/20 text-[#f87171]'
                  }`}>
                    <p>{dashboardErrorText(dashboardError, lang)}</p>
                    {canRetryDashboard(dashboardError) && (
                      <button type="button" onClick={() => fetchDashboard(appliedStart, appliedEnd)}
                        className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2a2d35] text-white hover:bg-[#3a3d48] transition-colors">
                        {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                      </button>
                    )}
                  </div>
                ) : reportRows.length === 0 ? (
                  <DashboardEmptyState lang={lang} />
                ) : (
                  <>
                    {/* ── 4 Hero KPI Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {heroCards.map(card => (
                        <div key={card.label} className="relative bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-4 overflow-hidden hover:border-[#3a3d48] transition-colors">
                          {/* colored top accent */}
                          <div className="absolute top-0 start-0 end-0 h-[2px] rounded-t-2xl" style={{ background: card.accent }} />

                          <div className="flex items-start justify-between mb-3">
                            <span className="text-[10px] font-medium text-[#4a4e60] uppercase tracking-wider">
                              {card.label}
                            </span>
                            {card.trend && (
                              <div className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                card.trend.positive
                                  ? 'text-[#4ade80] bg-[#4ade80]/10'
                                  : 'text-[#f87171] bg-[#f87171]/10'
                              }`}>
                                <IconTrend up={card.trend.up} />
                                {card.trend.pct.toFixed(1)}%
                              </div>
                            )}
                          </div>

                          <div className="text-2xl font-bold text-white mb-3 leading-none" dir="ltr">
                            {card.value}
                          </div>

                          <HeroSparkline
                            data={reportRows}
                            dataKey={card.dataKey}
                            color={card.color}
                            formatValue={card.formatValue}
                          />
                        </div>
                      ))}
                    </div>

                    {/* ── Spend & Conversions chart ── */}
                    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h2 className="text-white font-semibold text-sm">
                            {lang === 'ar' ? 'اتجاه الإنفاق والتحويلات' : 'Spend & Conversions Trend'}
                          </h2>
                          <p className="text-[#4a4e60] text-[11px] mt-0.5">
                            {appliedStart} — {appliedEnd}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-2 rounded-sm bg-[#3b82f6] opacity-80" />
                            <span className="text-[#4a4e60]">{lang === 'ar' ? 'الإنفاق' : 'Spend'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 border-t-2 border-[#4ade80]" />
                            <span className="text-[#4a4e60]">{lang === 'ar' ? 'التحويلات' : 'Conversions'}</span>
                          </div>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={reportRows} margin={{ top: 8, right: dir === 'rtl' ? 0 : 8, left: dir === 'rtl' ? 8 : 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2229" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: '#4a4e60', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="spend" orientation={dir === 'rtl' ? 'right' : 'left'} tick={{ fill: '#60a5fa', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
                          <YAxis yAxisId="conv" orientation={dir === 'rtl' ? 'left' : 'right'} tick={{ fill: '#4ade80', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                          <Tooltip content={<ChartTooltip currency={adCurrency} lang={lang} />} />
                          <Bar yAxisId="spend" dataKey="spend" name={lang === 'ar' ? 'الإنفاق' : 'Spend'} fill="#3b82f6" fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={32} />
                          <Line yAxisId="conv" type="monotone" dataKey="conversion" name={lang === 'ar' ? 'التحويلات' : 'Conversions'} stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* ── Daily CPA Monitor ── */}
                    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-white font-semibold text-sm">
                              {lang === 'ar' ? 'مراقبة CPA اليومي' : 'Daily CPA Monitor'}
                            </h2>
                            {/* alert if latest CPA > avg */}
                            {cpaData.length > 0 && cpaData[cpaData.length - 1].cpa > avgCpa * 1.2 && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/25 rounded-full px-2 py-0.5">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                                  <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19.5H3.5L12 5.5zM11 10v5h2v-5h-2zm0 6v2h2v-2h-2z"/>
                                </svg>
                                {lang === 'ar' ? 'CPA مرتفع' : 'CPA High'}
                              </span>
                            )}
                          </div>
                          <p className="text-[#4a4e60] text-[11px] mt-0.5">
                            {lang === 'ar'
                              ? `متوسط CPA: ${fmtMoney(avgCpa)} — الخط المرجعي`
                              : `Avg CPA: ${fmtMoney(avgCpa)} — reference line`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 border-t-2 border-[#fb923c]" />
                            <span className="text-[#4a4e60]">CPA</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 border-t border-dashed border-[#4a4e60]" />
                            <span className="text-[#4a4e60]">{lang === 'ar' ? 'المتوسط' : 'Avg'}</span>
                          </div>
                        </div>
                      </div>

                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={cpaData} margin={{ top: 8, right: dir === 'rtl' ? 0 : 8, left: dir === 'rtl' ? 8 : 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="cpa-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#fb923c" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2229" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: '#4a4e60', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#fb923c', fontSize: 10 }} axisLine={false} tickLine={false} width={52}
                            orientation={dir === 'rtl' ? 'right' : 'left'} />
                          <Tooltip content={<CpaTooltip currency={adCurrency} />} />
                          {/* average reference line */}
                          {avgCpa > 0 && (
                            <ReferenceLine y={avgCpa} stroke="#4a4e60" strokeDasharray="5 3" strokeWidth={1.5}
                              label={{ value: lang === 'ar' ? 'متوسط' : 'Avg', fill: '#4a4e60', fontSize: 10, position: dir === 'rtl' ? 'insideBottomLeft' : 'insideBottomRight' }} />
                          )}
                          <Area type="monotone" dataKey="cpa" name="CPA" stroke="#fb923c" strokeWidth={2.5}
                            fill="url(#cpa-grad)"
                            dot={(props: any) => {
                              const { cx, cy, payload } = props
                              const isHigh = payload.cpa > avgCpa * 1.15
                              return (
                                <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={isHigh ? 5 : 3}
                                  fill={isHigh ? '#f87171' : '#fb923c'} stroke={isHigh ? '#f87171' : '#fb923c'}
                                  strokeWidth={isHigh ? 2 : 0} fillOpacity={1} />
                              )
                            }}
                            activeDot={{ r: 6, fill: '#fb923c' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* ── Metrics grid ── */}
                    {metricRows.map(row => (
                      <div key={row.group}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 rounded-full" style={{ background: row.color }} />
                          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: row.color }}>
                            {row.group}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                          {row.items.map(item => (
                            <div key={item.label}
                              className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 hover:border-[#3a3d48] transition-colors relative overflow-hidden">
                              <div className="text-[10px] text-[#4a4e60] mb-1.5 font-medium">{item.label}</div>
                              <div className={`text-base font-bold ${item.highlight ? 'text-[#fb923c]' : 'text-white'}`} dir="ltr">
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {activeTab === 'create-ad' && (
              <TikTokCreateAdTab lang={lang} dir={dir} fmtMoney={fmtMoney}
                hasActiveAccount={hasActiveAccount} onReauthRequired={() => setReauthRequired(true)} />
            )}
            {activeTab === 'bulk-launch' && (
              <TikTokBulkLaunchTabPanel lang={lang} dir={dir} fmtMoney={fmtMoney}
                hasActiveAccount={hasActiveAccount} onReauthRequired={() => setReauthRequired(true)} />
            )}
            {activeTab === 'winners' && hasActiveAccount && (
              <TikTokWinnersTab key={`winners-${refreshKey}`} lang={lang} dir={dir}
                advertiserId={activeAdvertiserId} dateStart={appliedStart} dateEnd={appliedEnd}
                fmtMoney={fmtMoney} fmtNum={fmtNum} fmtPct={fmtPct}
                onReauthRequired={() => setReauthRequired(true)} />
            )}
            {activeTab === 'campaigns' && hasActiveAccount && (
              <TikTokCampaignTable key={`campaigns-${refreshKey}`} advertiserId={activeAdvertiserId}
                currency={adCurrency} lang={lang} dateStart={appliedStart} dateEnd={appliedEnd}
                fmtMoney={fmtMoney} fmtNum={fmtNum} fmtPct={fmtPct}
                onReauthRequired={() => setReauthRequired(true)} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
