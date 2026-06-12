'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import {
  canDuplicate as rowCanDuplicate,
  canEditBid,
  canEditBudget,
  canEditName,
  canEditSchedule,
  canEditStatus,
  EntityLevel,
  EntityRow,
  formatBidDisplay,
  formatBudgetDisplay,
  formatRateMetric,
  LEVEL_OPTIONS,
  SMART_PLUS_TOOLTIP,
  tiktokAdsManagerUrl,
  toDatetimeLocal,
} from '@/lib/tiktok/types'

type Toast = { type: 'success' | 'error'; message: string }
type StatusFilter = 'all' | 'active' | 'paused'

function yDomain(data: { value: number }[]) {
  const values = data.map(d => d.value)
  if (!values.length) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = max === min ? Math.max(max * 0.15, 1) : (max - min) * 0.12
  return [Math.max(0, min - pad), max + pad]
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

function RowSparkline({ data, format }: { data: EntityRow['daily']; format: (n: number) => string }) {
  const chartData = data.map(d => ({ label: d.label, date: d.date, value: d.value }))
  const domain = yDomain(chartData)
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <YAxis hide domain={domain} />
        <Tooltip content={<SparkTooltip format={format} />} />
        <Area type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={1.5} fill="#4ade80" fillOpacity={0.12} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function SmartPlusBadge({
  lang,
  advertiserId,
  level,
  entityId,
  managedOnly,
}: {
  lang: string
  advertiserId: string
  level: EntityLevel
  entityId: string
  managedOnly?: boolean
}) {
  const tooltip = lang === 'ar'
    ? 'تدار بواسطة TikTok Smart+ — عدّل في TikTok Ads Manager'
    : SMART_PLUS_TOOLTIP
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 mt-1">
      <span
        className="text-[10px] font-medium text-[#a78bfa] bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded px-1.5 py-0.5 cursor-help"
        title={tooltip}
      >
        Smart+
      </span>
      {managedOnly && (
        <a
          href={tiktokAdsManagerUrl(level, advertiserId, entityId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#60a5fa] hover:underline"
          title={tooltip}
        >
          {lang === 'ar' ? 'عرض في TikTok' : 'View on TikTok'}
        </a>
      )}
    </span>
  )
}

function StatusToggle({
  enabled, loading, disabled, onToggle,
}: { enabled: boolean; loading?: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={loading || disabled}
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
        enabled ? 'bg-[#4ade80]' : 'bg-[#3a3d48]'
      }`}
    >
      <span
        className={`absolute top-0.5 start-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5 rtl:-translate-x-5' : ''
        }`}
      />
    </button>
  )
}

function formatLabel(s: string | null) {
  if (!s) return null
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function isTopSpendTier(row: EntityRow, all: EntityRow[]) {
  if (row.spend <= 0) return false
  const sorted = [...all].sort((a, b) => b.spend - a.spend)
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.33))
  return sorted.slice(0, topCount).some(c => c.id === row.id)
}

function TableSkeleton() {
  return (
    <div className="animate-pulse px-5 py-4 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 bg-[#2a2d35] rounded-lg" />
      ))}
    </div>
  )
}

type MenuAnchor = { id: string; top: number; left: number }

type Props = {
  advertiserId: string
  currency: string
  lang: string
  dateStart: string
  dateEnd: string
  fmtMoney: (n: number, digits?: number) => string
  fmtNum: (n: number, digits?: number) => string
  fmtPct: (n: number) => string
}

export default function TikTokCampaignTable({
  advertiserId, lang, dateStart, dateEnd, fmtMoney, fmtNum, fmtPct,
}: Props) {
  const [level, setLevel] = useState<EntityLevel>('campaigns')
  const [levelOpen, setLevelOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [items, setItems] = useState<EntityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirmPause, setConfirmPause] = useState<EntityRow | null>(null)
  const [confirmBulkPause, setConfirmBulkPause] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [refetchingId, setRefetchingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [budgetDraft, setBudgetDraft] = useState('')
  const [editingBidId, setEditingBidId] = useState<string | null>(null)
  const [bidDraft, setBidDraft] = useState('')
  const [scheduleRow, setScheduleRow] = useState<EntityRow | null>(null)
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')
  const [bulkBudgetOpen, setBulkBudgetOpen] = useState(false)
  const [bulkBudgetDraft, setBulkBudgetDraft] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null)
  const escRef = useRef(false)
  const levelRef = useRef<HTMLDivElement>(null)

  const isReadOnly = level === 'videos'
  const showBudgetColumn = level === 'campaigns' || level === 'adgroups'
  const showBidColumn = level === 'campaigns' || level === 'adgroups'
  const nameEditable = level === 'campaigns' || level === 'adgroups' || level === 'ads'
  const canDuplicate = level === 'campaigns' || level === 'adgroups'
  const levelLabel = LEVEL_OPTIONS.find(l => l.id === level)

  const normalizeItem = (raw: Partial<EntityRow> & { id?: string; campaign_id?: string; name?: string; campaign_name?: string }): EntityRow => ({
    id: raw.id || raw.campaign_id || '',
    name: raw.name || raw.campaign_name || raw.id || '',
    objective: raw.objective ?? null,
    operation_status: raw.operation_status ?? null,
    budget: raw.budget ?? null,
    budget_mode: raw.budget_mode ?? null,
    budget_label: raw.budget_label ?? null,
    budget_editable: raw.budget_editable ?? false,
    bid_price: raw.bid_price ?? null,
    bid_type: raw.bid_type ?? null,
    bid_field: raw.bid_field ?? null,
    bid_editable: raw.bid_editable ?? false,
    schedule_start_time: raw.schedule_start_time ?? null,
    schedule_end_time: raw.schedule_end_time ?? null,
    spend: raw.spend ?? 0,
    conversions: raw.conversions ?? 0,
    ctr: raw.ctr ?? 0,
    cpa: raw.cpa ?? 0,
    cvr: raw.cvr ?? null,
    cpc: raw.cpc ?? null,
    cpm: raw.cpm ?? null,
    daily: raw.daily ?? [],
    video_views: raw.video_views,
    video_2s_views: raw.video_2s_views,
    avg_watch_time: raw.avg_watch_time,
    is_smart_plus: raw.is_smart_plus ?? false,
    readOnly: raw.readOnly,
  })

  const fetchItems = useCallback(async (lvl: EntityLevel) => {
    setLoading(true)
    setSelected(new Set())
    try {
      const q = `?level=${lvl}&start_date=${dateStart}&end_date=${dateEnd}`
      const res = await fetch(`/api/tiktok/campaigns${q}`)
      const data = await res.json()
      if (data.items) setItems(data.items.map((r: EntityRow) => normalizeItem(r)))
      else if (data.campaigns) setItems(data.campaigns.map((c: EntityRow) => normalizeItem(c)))
      else setItems([])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [dateStart, dateEnd])

  const refetchItem = useCallback(async (entityId: string) => {
    const q = `?level=${level}&start_date=${dateStart}&end_date=${dateEnd}&entity_id=${entityId}`
    const res = await fetch(`/api/tiktok/campaigns${q}`)
    const data = await res.json()
    const item = data.item ? normalizeItem(data.item) : null
    if (!item) return null
    setItems(prev => {
      const next = prev.map(r => (r.id === entityId ? item : r))
      if (!prev.some(r => r.id === entityId)) next.push(item)
      return next.sort((a, b) => b.spend - a.spend)
    })
    return item
  }, [level, dateStart, dateEnd])

  useEffect(() => { fetchItems(level) }, [level, fetchItems])
  useEffect(() => { setStatusFilter('all'); setSelected(new Set()) }, [level])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (levelRef.current && !levelRef.current.contains(e.target as Node)) setLevelOpen(false)
      setMenuAnchor(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const showError = useCallback((message: string) => setToast({ type: 'error', message }), [])
  const showSuccess = useCallback((message: string) => setToast({ type: 'success', message }), [])

  const applyToggle = useCallback(async (row: EntityRow, newStatus: 'ENABLE' | 'DISABLE') => {
    const prevStatus = row.operation_status
    setItems(prev => prev.map(r => r.id === row.id ? { ...r, operation_status: newStatus } : r))
    setTogglingId(row.id)
    try {
      const res = await fetch('/api/tiktok/campaign/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, entity_id: row.id, status: newStatus, is_smart_plus: row.is_smart_plus }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setItems(prev => prev.map(r => r.id === row.id ? { ...r, operation_status: prevStatus } : r))
        showError(data.message || (lang === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status'))
        return
      }
      await refetchItem(row.id)
      showSuccess(newStatus === 'ENABLE' ? (lang === 'ar' ? 'تم التفعيل' : 'Enabled') : (lang === 'ar' ? 'تم الإيقاف' : 'Paused'))
    } catch {
      setItems(prev => prev.map(r => r.id === row.id ? { ...r, operation_status: prevStatus } : r))
      showError(lang === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }, [lang, level, refetchItem, showError, showSuccess])

  const handleToggle = useCallback((row: EntityRow) => {
    if (!canEditStatus(row, level)) return
    if (row.operation_status === 'ENABLE') {
      if (isTopSpendTier(row, items)) { setConfirmPause(row); return }
      applyToggle(row, 'DISABLE')
    } else {
      applyToggle(row, 'ENABLE')
    }
  }, [applyToggle, items, level])

  const saveName = useCallback(async (row: EntityRow) => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === row.name) { setEditingNameId(null); return }
    const prev = row.name
    setItems(prevItems => prevItems.map(r => r.id === row.id ? { ...r, name: trimmed } : r))
    setEditingNameId(null)
    try {
      const res = await fetch('/api/tiktok/entity/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, entity_id: row.id, name: trimmed, is_smart_plus: row.is_smart_plus }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setItems(prevItems => prevItems.map(r => r.id === row.id ? { ...r, name: prev } : r))
        showError(data.message || (lang === 'ar' ? 'فشل إعادة التسمية' : 'Failed to rename'))
        return
      }
      await refetchItem(row.id)
      showSuccess(lang === 'ar' ? 'تم تحديث الاسم' : 'Name updated')
    } catch {
      setItems(prevItems => prevItems.map(r => r.id === row.id ? { ...r, name: prev } : r))
      showError(lang === 'ar' ? 'فشل إعادة التسمية' : 'Failed to rename')
    }
  }, [lang, level, nameDraft, refetchItem, showError, showSuccess])

  const saveBudget = useCallback(async (row: EntityRow) => {
    if (!canEditBudget(row, level)) { setEditingBudgetId(null); return }
    const val = parseFloat(budgetDraft)
    if (!Number.isFinite(val) || val <= 0) { setEditingBudgetId(null); return }
    const prevBudget = row.budget
    setItems(prev => prev.map(r => r.id === row.id ? { ...r, budget: val } : r))
    setEditingBudgetId(null)
    try {
      const res = await fetch('/api/tiktok/campaign/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, entity_id: row.id, budget: val, is_smart_plus: row.is_smart_plus }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setItems(prev => prev.map(r => r.id === row.id ? { ...r, budget: prevBudget } : r))
        showError(data.message || (lang === 'ar' ? 'فشل تحديث الميزانية' : 'Failed to update budget'))
        return
      }
      await refetchItem(row.id)
      showSuccess(lang === 'ar' ? 'تم تحديث الميزانية' : 'Budget updated')
    } catch {
      setItems(prev => prev.map(r => r.id === row.id ? { ...r, budget: prevBudget } : r))
      showError(lang === 'ar' ? 'فشل تحديث الميزانية' : 'Failed to update budget')
    }
  }, [budgetDraft, lang, level, refetchItem, showError, showSuccess])

  const saveBid = useCallback(async (row: EntityRow) => {
    if (!canEditBid(row, level)) { setEditingBidId(null); return }
    const val = parseFloat(bidDraft)
    if (!Number.isFinite(val) || val <= 0) { setEditingBidId(null); return }
    const prevBid = row.bid_price
    const prevEditable = row.bid_editable
    setItems(prev => prev.map(r => r.id === row.id ? { ...r, bid_price: val } : r))
    setEditingBidId(null)
    try {
      const res = await fetch('/api/tiktok/entity/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          entity_id: row.id,
          bid_price: val,
          is_smart_plus: row.is_smart_plus,
          bid_field: row.bid_field || 'bid_price',
          bid_type: row.bid_type,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        const smartPlusBlocked = row.is_smart_plus && (
          level === 'campaigns'
          || String(data.message || '').toLowerCase().includes('smart plus')
        )
        setItems(prev => prev.map(r => r.id === row.id
          ? { ...r, bid_price: prevBid, bid_editable: smartPlusBlocked ? false : prevEditable }
          : r))
        const tiktokMsg = typeof data.message === 'string' ? data.message : null
        if (smartPlusBlocked && level === 'campaigns') {
          showError(lang === 'ar'
            ? 'تدار المزايدة بواسطة TikTok Smart+ — عدّل في TikTok Ads Manager'
            : SMART_PLUS_TOOLTIP)
        } else {
          showError(tiktokMsg || (lang === 'ar' ? 'فشل تحديث المزايدة' : 'Failed to update bid'))
        }
        return
      }
      await refetchItem(row.id)
      showSuccess(lang === 'ar' ? 'تم تحديث المزايدة' : 'Bid updated')
    } catch {
      setItems(prev => prev.map(r => r.id === row.id ? { ...r, bid_price: prevBid } : r))
      showError(lang === 'ar' ? 'فشل تحديث المزايدة' : 'Failed to update bid')
    }
  }, [bidDraft, lang, level, refetchItem, showError, showSuccess])

  const saveSchedule = useCallback(async () => {
    if (!scheduleRow || !scheduleStart || !scheduleEnd) return
    const prevStart = scheduleRow.schedule_start_time
    const prevEnd = scheduleRow.schedule_end_time
    setItems(prev => prev.map(r => r.id === scheduleRow.id
      ? { ...r, schedule_start_time: scheduleStart, schedule_end_time: scheduleEnd }
      : r))
    try {
      const res = await fetch('/api/tiktok/entity/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: scheduleRow.id,
          schedule_start_time: scheduleStart,
          schedule_end_time: scheduleEnd,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setItems(prev => prev.map(r => r.id === scheduleRow.id
          ? { ...r, schedule_start_time: prevStart, schedule_end_time: prevEnd }
          : r))
        showError(data.message || (lang === 'ar' ? 'فشل تحديث الجدولة' : 'Failed to update schedule'))
        return
      }
      await refetchItem(scheduleRow.id)
      showSuccess(lang === 'ar' ? 'تم تحديث الجدولة' : 'Schedule updated')
      setScheduleRow(null)
    } catch {
      setItems(prev => prev.map(r => r.id === scheduleRow.id
        ? { ...r, schedule_start_time: prevStart, schedule_end_time: prevEnd }
        : r))
      showError(lang === 'ar' ? 'فشل تحديث الجدولة' : 'Failed to update schedule')
    }
  }, [lang, refetchItem, scheduleEnd, scheduleRow, scheduleStart, showError, showSuccess])

  const duplicateRow = useCallback(async (row: EntityRow) => {
    try {
      const res = await fetch('/api/tiktok/entity/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, entity_id: row.id, is_smart_plus: row.is_smart_plus }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showError(data.message || (lang === 'ar' ? 'فشل النسخ' : 'Failed to duplicate'))
        return
      }
      showSuccess(
        lang === 'ar'
          ? `تم إنشاء نسخة: ${data.name || data.entity_id}`
          : `Created copy: ${data.name || data.entity_id}`
      )
      await fetchItems(level)
    } catch {
      showError(lang === 'ar' ? 'فشل النسخ' : 'Failed to duplicate')
    }
  }, [fetchItems, lang, level, showError, showSuccess])

  const canBulkApply = useCallback((row: EntityRow, action: 'pause' | 'resume' | 'set_budget') => {
    if (action === 'set_budget') return canEditBudget(row, level)
    return canEditStatus(row, level)
  }, [level])

  const countSkippedSmartPlus = useCallback((
    rows: EntityRow[],
    appliedIds: string[]
  ) => rows.filter(r => !appliedIds.includes(r.id) && r.is_smart_plus).length, [])

  const bulkResultMessage = useCallback((
    applied: number,
    skippedSmartPlus: number,
    fallback: string
  ) => {
    if (skippedSmartPlus > 0) {
      return lang === 'ar'
        ? `${applied} تم تطبيقها، ${skippedSmartPlus} تم تخطيها (Smart+)`
        : `${applied} applied, ${skippedSmartPlus} skipped (Smart+)`
    }
    return fallback
  }, [lang])

  const toggleRowSelection = useCallback((rowId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      console.log('[bulk] selected count:', next.size, 'ids:', [...next])
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
    console.log('[bulk] selected count: 0 (cleared)')
  }, [])

  const runBulk = useCallback(async (action: 'pause' | 'resume' | 'set_budget', budget?: number) => {
    const selectedRows = items.filter(r => selected.has(r.id))
    const ids = selectedRows.filter(r => canBulkApply(r, action)).map(r => r.id)
    const skippedSmartPlus = countSkippedSmartPlus(selectedRows, ids)
    if (!ids.length) {
      showError(
        skippedSmartPlus > 0
          ? bulkResultMessage(0, skippedSmartPlus, '')
          : (lang === 'ar' ? 'لا توجد صفوف قابلة للتعديل' : 'No editable rows in selection')
      )
      return
    }
    const smartPlusIds = selectedRows.filter(r => r.is_smart_plus && ids.includes(r.id)).map(r => r.id)
    setBulkLoading(true)
    const prevItems = items
    if (action === 'pause') {
      setItems(prev => prev.map(r => ids.includes(r.id) ? { ...r, operation_status: 'DISABLE' } : r))
    } else if (action === 'resume') {
      setItems(prev => prev.map(r => ids.includes(r.id) ? { ...r, operation_status: 'ENABLE' } : r))
    } else if (action === 'set_budget' && budget) {
      setItems(prev => prev.map(r => ids.includes(r.id) ? { ...r, budget } : r))
    }
    try {
      const res = await fetch('/api/tiktok/entity/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, action, entity_ids: ids, budget, smart_plus_ids: smartPlusIds }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setItems(prevItems)
        showError(data.message || data.messages?.join(', ') || (lang === 'ar' ? 'فشل الإجراء الجماعي' : 'Bulk action failed'))
        return
      }
      await fetchItems(level)
      setSelected(new Set())
      setBulkBudgetOpen(false)
      showSuccess(bulkResultMessage(
        ids.length,
        skippedSmartPlus,
        lang === 'ar' ? 'تم تطبيق الإجراء الجماعي' : 'Bulk action applied'
      ))
    } catch {
      setItems(prevItems)
      showError(lang === 'ar' ? 'فشل الإجراء الجماعي' : 'Bulk action failed')
    } finally {
      setBulkLoading(false)
      setConfirmBulkPause(false)
    }
  }, [bulkResultMessage, canBulkApply, countSkippedSmartPlus, fetchItems, items, lang, level, selected, showError, showSuccess])

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, rowId: string) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const menuW = 200
    const flip = rect.right < menuW + 16
    setMenuAnchor({ id: rowId, top: rect.bottom + 4, left: flip ? rect.left : rect.right - menuW })
  }

  const sorted = useMemo(() => [...items].sort((a, b) => b.spend - a.spend), [items])
  const counts = useMemo(() => ({
    all: sorted.length,
    active: sorted.filter(r => r.operation_status === 'ENABLE').length,
    paused: sorted.filter(r => r.operation_status && r.operation_status !== 'ENABLE').length,
  }), [sorted])
  const filtered = useMemo(() => {
    if (isReadOnly || statusFilter === 'all') return sorted
    if (statusFilter === 'active') return sorted.filter(r => r.operation_status === 'ENABLE')
    return sorted.filter(r => r.operation_status && r.operation_status !== 'ENABLE')
  }, [sorted, statusFilter, isReadOnly])

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))
  const someSelected = selected.size > 0
  const showBulkBar = someSelected && !isReadOnly
  const sparkFormat = (n: number) => fmtNum(n)

  const titleForLevel = {
    campaigns: { en: 'Campaign management', ar: 'إدارة الحملات' },
    adgroups: { en: 'Ad group management', ar: 'إدارة مجموعات الإعلانات' },
    ads: { en: 'Ad management', ar: 'إدارة الإعلانات' },
    videos: { en: 'Video performance', ar: 'أداء الفيديوهات' },
  }[level]

  const emptyLabel = {
    campaigns: { en: 'No campaigns for this period.', ar: 'لا توجد حملات لهذه الفترة.' },
    adgroups: { en: 'No ad groups for this period.', ar: 'لا توجد مجموعات إعلانات.' },
    ads: { en: 'No ads for this period.', ar: 'لا توجد إعلانات.' },
    videos: { en: 'No video data for this period.', ar: 'لا توجد بيانات فيديو.' },
  }[level]

  const menuItem = 'block w-full text-start px-3 py-2 text-xs text-[#c8cad4] hover:text-white hover:bg-[#1a1d24] transition-colors disabled:opacity-40 disabled:pointer-events-none'

  const inlineInput = 'bg-[#0f1117] border border-[#3b82f6] rounded px-2 py-1 text-xs text-white focus:outline-none'

  return (
    <>
      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-visible">
        <div className="px-5 py-4 border-b border-[#2a2d35] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={levelRef}>
              <button
                type="button"
                onClick={() => setLevelOpen(v => !v)}
                className="inline-flex items-center gap-2 bg-[#0f1117] border border-[#2a2d35] hover:border-[#3b82f6]/40 rounded-lg px-3 py-1.5 text-sm text-white transition-colors"
              >
                <span>{lang === 'ar' ? levelLabel?.ar : levelLabel?.en}</span>
                <span className="text-[#4a4e60] text-xs">▾</span>
              </button>
              {levelOpen && (
                <div className="absolute top-full start-0 mt-1 z-40 min-w-[160px] bg-[#0f1117] border border-[#2a2d35] rounded-xl py-1 shadow-2xl">
                  {LEVEL_OPTIONS.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { setLevel(l.id); setLevelOpen(false) }}
                      className={`w-full text-start px-3 py-2 text-xs transition-colors ${
                        level === l.id ? 'text-[#60a5fa] bg-[#3b82f6]/10' : 'text-[#8b8fa8] hover:text-white hover:bg-[#1a1d24]'
                      }`}
                    >
                      {lang === 'ar' ? l.ar : l.en}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <h2 className="text-white font-semibold text-sm">{lang === 'ar' ? titleForLevel.ar : titleForLevel.en}</h2>
          </div>
          <span className="text-[10px] text-[#4a4e60] bg-[#0f1117] border border-[#2a2d35] px-2 py-0.5 rounded-full" dir="ltr">
            {dateStart} – {dateEnd}
          </span>
        </div>

        {!isReadOnly && (
          <div className="px-5 py-3 border-b border-[#2a2d35] flex flex-wrap gap-1">
            {([
              { id: 'all' as const, en: 'All', ar: 'الكل' },
              { id: 'active' as const, en: 'Active', ar: 'نشطة' },
              { id: 'paused' as const, en: 'Paused', ar: 'متوقفة' },
            ]).map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.id ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white hover:bg-[#2a2d35]'
                }`}
              >
                {lang === 'ar' ? f.ar : f.en} <span className="opacity-70">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[#4a4e60]">
            {lang === 'ar' ? emptyLabel.ar : emptyLabel.en}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[1280px]">
              <thead>
                <tr className="border-b border-[#2a2d35] text-[10px] text-[#4a4e60] uppercase tracking-wider">
                  {!isReadOnly && (
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => {
                          const next = allSelected ? new Set<string>() : new Set(filtered.map(r => r.id))
                          console.log('[bulk] selected count:', next.size, 'ids:', [...next])
                          setSelected(next)
                        }}
                        className="rounded border-[#2a2d35] bg-[#0f1117] accent-[#3b82f6]"
                        aria-label={lang === 'ar' ? 'تحديد الكل' : 'Select all'}
                      />
                    </th>
                  )}
                  {!isReadOnly && <th className="text-start px-2 py-3 font-medium w-12">{lang === 'ar' ? 'الحالة' : 'Status'}</th>}
                  <th className="text-start px-4 py-3 font-medium min-w-[160px]">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? 'الإنفاق' : 'Spend'}</th>
                  {level === 'videos' ? (
                    <>
                      <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? 'مشاهدات' : 'Views'}</th>
                      <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? '2ث' : '2s Views'}</th>
                      <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? 'متوسط المشاهدة' : 'Avg watch'}</th>
                    </>
                  ) : (
                    <>
                      <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? 'تحويلات' : 'Conv.'}</th>
                      <th className="text-start px-3 py-3 font-medium">CPA</th>
                      <th className="text-start px-3 py-3 font-medium">CTR</th>
                    </>
                  )}
                  <th className="text-start px-3 py-3 font-medium">CVR</th>
                  <th className="text-start px-3 py-3 font-medium">CPM</th>
                  <th className="text-start px-3 py-3 font-medium">CPC</th>
                  {showBudgetColumn && <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? 'الميزانية' : 'Budget'}</th>}
                  {showBidColumn && <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? 'المزايدة' : 'Bid'}</th>}
                  <th className="text-start px-3 py-3 font-medium min-w-[100px]">{lang === 'ar' ? 'الاتجاه' : 'Trend'}</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const isEnabled = row.operation_status === 'ENABLE'
                  const isPaused = row.operation_status && row.operation_status !== 'ENABLE'
                  const statusEditable = canEditStatus(row, level)
                  const budgetEditable = canEditBudget(row, level)
                  const nameEditableRow = canEditName(row, level, nameEditable)
                  const bidEditable = canEditBid(row, level)
                  const bidDisplay = formatBidDisplay(row, fmtMoney, fmtNum)
                  const scheduleEditable = canEditSchedule(row, level)
                  const duplicateEditable = rowCanDuplicate(row, level, canDuplicate)
                  const smartManaged = row.is_smart_plus && !statusEditable
                  const budgetDisplay = formatBudgetDisplay(
                    { ...row, budget_editable: budgetEditable },
                    fmtMoney
                  )
                  const badge = formatLabel(row.objective)
                  const isSelected = selected.has(row.id)

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors ${
                        isPaused ? 'opacity-50' : ''
                      } ${isSelected ? 'bg-[#3b82f6]/5' : ''}`}
                    >
                      {!isReadOnly && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row.id)}
                            className="rounded border-[#2a2d35] bg-[#0f1117] accent-[#3b82f6]"
                          />
                        </td>
                      )}
                      {!isReadOnly && (
                        <td className="px-2 py-3">
                          {statusEditable ? (
                            <StatusToggle
                              enabled={isEnabled}
                              loading={togglingId === row.id}
                              onToggle={() => handleToggle(row)}
                            />
                          ) : smartManaged ? (
                            <SmartPlusBadge
                              lang={lang}
                              advertiserId={advertiserId}
                              level={level}
                              entityId={row.id}
                              managedOnly
                            />
                          ) : (
                            <span className="text-[#4a4e60] text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {editingNameId === row.id && nameEditableRow ? (
                          <input
                            type="text"
                            autoFocus
                            value={nameDraft}
                            onChange={e => setNameDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); saveName(row) }
                              if (e.key === 'Escape') { escRef.current = true; setEditingNameId(null) }
                            }}
                            onBlur={() => {
                              if (escRef.current) { escRef.current = false; return }
                              saveName(row)
                            }}
                            className={`${inlineInput} w-full max-w-[200px]`}
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={!nameEditableRow}
                            onClick={() => { if (nameEditableRow) { setEditingNameId(row.id); setNameDraft(row.name) } }}
                            className={`text-sm font-medium truncate max-w-[200px] text-start ${
                              nameEditableRow ? 'text-white hover:text-[#60a5fa] cursor-pointer' : 'text-white cursor-default'
                            }`}
                            title={row.name}
                          >
                            {row.name}
                          </button>
                        )}
                        {row.is_smart_plus && !smartManaged && (
                          <SmartPlusBadge lang={lang} advertiserId={advertiserId} level={level} entityId={row.id} />
                        )}
                        {badge && (
                          <span className="inline-block mt-1 text-[10px] text-[#8b8fa8] bg-[#0f1117] border border-[#2a2d35] rounded px-1.5 py-0.5">
                            {badge}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-white whitespace-nowrap">{fmtMoney(row.spend, 0)}</td>
                      {level === 'videos' ? (
                        <>
                          <td className="px-3 py-3 text-sm text-white">{fmtNum(row.video_views || 0)}</td>
                          <td className="px-3 py-3 text-sm text-white">{fmtNum(row.video_2s_views || 0)}</td>
                          <td className="px-3 py-3 text-sm text-[#8b8fa8]">{fmtNum(row.avg_watch_time || 0, 1)}s</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-sm text-white">{fmtNum(row.conversions)}</td>
                          <td className="px-3 py-3 text-sm text-[#8b8fa8] whitespace-nowrap">{fmtMoney(row.cpa)}</td>
                          <td className="px-3 py-3 text-sm text-[#8b8fa8]">{fmtPct(row.ctr)}</td>
                        </>
                      )}
                      <td className="px-3 py-3 text-sm text-[#8b8fa8] whitespace-nowrap">{formatRateMetric(row.cvr, fmtPct)}</td>
                      <td className="px-3 py-3 text-sm text-[#8b8fa8] whitespace-nowrap">{formatRateMetric(row.cpm, n => fmtMoney(n, 2))}</td>
                      <td className="px-3 py-3 text-sm text-[#8b8fa8] whitespace-nowrap">{formatRateMetric(row.cpc, n => fmtMoney(n, 2))}</td>
                      {showBudgetColumn && (
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {editingBudgetId === row.id && budgetEditable ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              autoFocus
                              value={budgetDraft}
                              onChange={e => setBudgetDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); saveBudget(row) }
                                if (e.key === 'Escape') { escRef.current = true; setEditingBudgetId(null) }
                              }}
                              onBlur={() => {
                                if (escRef.current) { escRef.current = false; return }
                                saveBudget(row)
                              }}
                              className={`${inlineInput} w-24`}
                            />
                          ) : budgetDisplay.editable ? (
                            <button type="button" onClick={() => { setEditingBudgetId(row.id); setBudgetDraft(String(row.budget ?? '')) }} className="text-white hover:text-[#60a5fa]">
                              {budgetDisplay.text}
                            </button>
                          ) : (
                            <span className={`text-xs font-medium ${row.budget_label ? 'text-[#8b8fa8] bg-[#0f1117] border border-[#2a2d35] rounded px-1.5 py-0.5' : 'text-[#4a4e60]'}`}>
                              {budgetDisplay.text}
                            </span>
                          )}
                        </td>
                      )}
                      {showBidColumn && (
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {editingBidId === row.id && bidEditable ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              autoFocus
                              value={bidDraft}
                              onChange={e => setBidDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); saveBid(row) }
                                if (e.key === 'Escape') { escRef.current = true; setEditingBidId(null) }
                              }}
                              onBlur={() => {
                                if (escRef.current) { escRef.current = false; return }
                                saveBid(row)
                              }}
                              className={`${inlineInput} w-20`}
                            />
                          ) : bidDisplay.hasBid && bidEditable ? (
                            <button type="button" onClick={() => { setEditingBidId(row.id); setBidDraft(String(row.bid_price)) }} className="text-white hover:text-[#60a5fa]">
                              {bidDisplay.text}
                            </button>
                          ) : bidDisplay.hasBid ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="text-white">{bidDisplay.text}</span>
                              {row.is_smart_plus && (level === 'campaigns' || level === 'adgroups') && (
                                <SmartPlusBadge
                                  lang={lang}
                                  advertiserId={advertiserId}
                                  level={level}
                                  entityId={row.id}
                                  managedOnly
                                />
                              )}
                            </span>
                          ) : (
                            <span className="text-[#4a4e60]">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3 w-[100px]">
                        <RowSparkline data={row.daily} format={sparkFormat} />
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={e => openMenu(e, row.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#4a4e60] hover:text-white hover:bg-[#2a2d35] transition-colors"
                        >
                          ⋯
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showBulkBar && typeof document !== 'undefined' && createPortal(
        <div
          role="toolbar"
          aria-label={lang === 'ar' ? 'إجراءات جماعية' : 'Bulk actions'}
          className="fixed bottom-6 inset-x-4 md:inset-x-auto md:start-1/2 md:-translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 bg-[#0f1117] border border-[#3b82f6]/40 rounded-xl px-4 py-3 shadow-2xl shadow-black/50 max-w-3xl"
        >
          <span className="text-xs text-[#8b8fa8] me-1">
            {selected.size} {lang === 'ar' ? 'محدد' : 'selected'}
          </span>
          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => setConfirmBulkPause(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2a2d35] text-white hover:bg-[#3a3d48] disabled:opacity-50"
          >
            {lang === 'ar' ? 'إيقاف' : 'Pause'}
          </button>
          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => runBulk('resume')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2a2d35] text-white hover:bg-[#3a3d48] disabled:opacity-50"
          >
            {lang === 'ar' ? 'تفعيل' : 'Resume'}
          </button>
          {showBudgetColumn && (
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => setBulkBudgetOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] disabled:opacity-50"
            >
              {lang === 'ar' ? 'تعيين الميزانية' : 'Set budget'}
            </button>
          )}
          <button
            type="button"
            disabled={bulkLoading}
            onClick={clearSelection}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#8b8fa8] hover:text-white hover:bg-[#2a2d35] disabled:opacity-50"
          >
            {lang === 'ar' ? 'مسح التحديد' : 'Clear selection'}
          </button>
        </div>,
        document.body
      )}

      {menuAnchor && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[100] min-w-[200px] bg-[#0f1117] border border-[#2a2d35] rounded-xl py-1 shadow-2xl shadow-black/50"
          style={{ top: menuAnchor.top, left: menuAnchor.left }}
          onMouseDown={e => e.stopPropagation()}
        >
          {(() => {
            const row = items.find(r => r.id === menuAnchor.id)
            if (!row) return null
            const isEnabled = row.operation_status === 'ENABLE'
            const menuBudget = canEditBudget(row, level)
            const menuSchedule = canEditSchedule(row, level)
            const menuStatus = canEditStatus(row, level)
            const menuDuplicate = rowCanDuplicate(row, level, canDuplicate)
            return (
              <>
                {menuBudget && (
                  <button type="button" className={menuItem} onClick={() => { setMenuAnchor(null); setEditingBudgetId(row.id); setBudgetDraft(String(row.budget ?? '')) }}>
                    {lang === 'ar' ? 'تعديل الميزانية' : 'Edit budget'}
                  </button>
                )}
                {menuSchedule && (
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setMenuAnchor(null)
                      setScheduleRow(row)
                      setScheduleStart(toDatetimeLocal(row.schedule_start_time))
                      setScheduleEnd(toDatetimeLocal(row.schedule_end_time))
                    }}
                  >
                    {lang === 'ar' ? 'تعديل الجدولة' : 'Edit schedule'}
                  </button>
                )}
                {menuStatus && (
                  <button type="button" className={menuItem} onClick={() => { setMenuAnchor(null); isEnabled ? handleToggle(row) : applyToggle(row, 'ENABLE') }}>
                    {isEnabled ? (lang === 'ar' ? 'إيقاف' : 'Pause') : (lang === 'ar' ? 'تفعيل' : 'Resume')}
                  </button>
                )}
                <a href={tiktokAdsManagerUrl(level, advertiserId, row.id)} target="_blank" rel="noopener noreferrer" className={menuItem} onClick={() => setMenuAnchor(null)}>
                  {lang === 'ar' ? 'عرض في TikTok' : 'View on TikTok'}
                </a>
                {menuDuplicate && (
                  <button type="button" className={menuItem} onClick={() => { setMenuAnchor(null); duplicateRow(row) }}>
                    {lang === 'ar' ? 'نسخ' : 'Duplicate'}
                  </button>
                )}
                {row.is_smart_plus && !menuStatus && (
                  <div className="px-3 py-2 text-[10px] text-[#8b8fa8] border-t border-[#2a2d35] mt-1" title={SMART_PLUS_TOOLTIP}>
                    Smart+ — {lang === 'ar' ? 'عدّل في TikTok Ads Manager' : 'edit in TikTok Ads Manager'}
                  </div>
                )}
              </>
            )
          })()}
        </div>,
        document.body
      )}

      {scheduleRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 max-w-sm w-full shadow-2xl" dir="ltr">
            <h3 className="text-white font-semibold text-sm mb-3">{lang === 'ar' ? 'تعديل الجدولة' : 'Edit schedule'}</h3>
            <p className="text-[#8b8fa8] text-xs mb-3 truncate">{scheduleRow.name}</p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] text-[#4a4e60] uppercase">{lang === 'ar' ? 'البداية' : 'Start'}</span>
                <input type="datetime-local" value={scheduleStart} onChange={e => setScheduleStart(e.target.value)} className={`${inlineInput} w-full mt-1 [color-scheme:dark]`} />
              </label>
              <label className="block">
                <span className="text-[10px] text-[#4a4e60] uppercase">{lang === 'ar' ? 'النهاية' : 'End'}</span>
                <input type="datetime-local" value={scheduleEnd} onChange={e => setScheduleEnd(e.target.value)} className={`${inlineInput} w-full mt-1 [color-scheme:dark]`} />
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setScheduleRow(null)} className="px-3 py-1.5 rounded-lg text-xs text-[#8b8fa8] border border-[#2a2d35]">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" onClick={saveSchedule} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#3b82f6] text-white">
                {lang === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkBudgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-3">{lang === 'ar' ? 'تعيين الميزانية للمحدد' : 'Set budget for selected'}</h3>
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              value={bulkBudgetDraft}
              onChange={e => setBulkBudgetDraft(e.target.value)}
              className={`${inlineInput} w-full`}
              placeholder={lang === 'ar' ? 'المبلغ' : 'Amount'}
            />
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setBulkBudgetOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-[#8b8fa8] border border-[#2a2d35]">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => {
                  const v = parseFloat(bulkBudgetDraft)
                  if (Number.isFinite(v) && v > 0) runBulk('set_budget', v)
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#3b82f6] text-white disabled:opacity-50"
              >
                {lang === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-2">{lang === 'ar' ? 'إيقاف عنصر عالي الإنفاق؟' : 'Pause high-spend item?'}</h3>
            <p className="text-[#8b8fa8] text-sm mb-4">
              &quot;{confirmPause.name}&quot; ({fmtMoney(confirmPause.spend, 0)})
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmPause(null)} className="px-3 py-1.5 rounded-lg text-xs text-[#8b8fa8] border border-[#2a2d35]">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" onClick={() => { const r = confirmPause; setConfirmPause(null); applyToggle(r, 'DISABLE') }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f87171] text-white">
                {lang === 'ar' ? 'إيقاف' : 'Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkPause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-2">{lang === 'ar' ? 'إيقاف العناصر المحددة؟' : 'Pause selected items?'}</h3>
            <p className="text-[#8b8fa8] text-sm mb-4">
              {selected.size} {lang === 'ar' ? 'عنصر سيتم إيقافه' : 'items will be paused'}
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmBulkPause(false)} className="px-3 py-1.5 rounded-lg text-xs text-[#8b8fa8] border border-[#2a2d35]">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" disabled={bulkLoading} onClick={() => runBulk('pause')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f87171] text-white disabled:opacity-50">
                {lang === 'ar' ? 'إيقاف الكل' : 'Pause all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm shadow-xl border ${
          toast.type === 'success' ? 'bg-[#14321f] border-[#4ade80]/30 text-[#4ade80]' : 'bg-[#3a1414] border-[#f87171]/30 text-[#f87171]'
        }`}>
          {toast.message}
        </div>
      )}
    </>
  )
}
