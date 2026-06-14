'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WinnerLevel, WinnerRow } from '@/lib/tiktok/entities'
import TikTokScaleModal from '@/components/dashboard/TikTokScaleModal'
import {
  formatBudgetDisplay,
  formatRateMetric,
  getSmartPlusApiSupport,
  LEVEL_OPTIONS,
  SCALE_ACTION_LABEL,
} from '@/lib/tiktok/types'

type SortMetric = 'conversions' | 'roas' | 'cpa' | 'ctr' | 'cvr' | 'cpc' | 'cpm'

const MIN_CONVERSIONS = 10
const TABLE_COLS = 13

const WINNER_LEVEL_OPTIONS = LEVEL_OPTIONS.filter(o => o.id !== 'videos')

type Props = {
  lang: string
  dir: string
  advertiserId: string
  dateStart: string
  dateEnd: string
  fmtMoney: (n: number, digits?: number) => string
  fmtNum: (n: number, digits?: number) => string
  fmtPct: (n: number) => string
  onReauthRequired?: () => void
}

type Averages = {
  conversions: number
  roas: number
  cpa: number
  ctr: number
  cvr: number
  cpc: number
  cpm: number
}

function hasEnoughData(row: WinnerRow) {
  return row.conversions >= MIN_CONVERSIONS
}

function cleanName(raw: string) {
  let name = raw.trim()
  name = name.replace(/^snaptik[_\-\d]+/i, '')
  name = name.replace(/^_+|_+$/g, '')
  name = name.replace(/_Ad\s*name\d*[_\-\d]*/gi, '')
  name = name.replace(/[_-]{2,}/g, ' ')
  name = name.replace(/[_]/g, ' ')
  name = name.replace(/\s{2,}/g, ' ').trim()
  return name || raw.trim()
}

function truncateDisplay(name: string, max = 42) {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

function sortItems(items: WinnerRow[], metric: SortMetric): WinnerRow[] {
  const copy = [...items]
  if (metric === 'conversions') {
    return copy.sort((a, b) => b.conversions - a.conversions || b.spend - a.spend)
  }
  if (metric === 'cpa' || metric === 'cpc' || metric === 'cpm') {
    return copy.sort((a, b) => {
      const av = a[metric]
      const bv = b[metric]
      if (av == null && bv == null) return b.conversions - a.conversions
      if (av == null) return 1
      if (bv == null) return -1
      if (av <= 0 && bv <= 0) return b.conversions - a.conversions
      if (av <= 0) return 1
      if (bv <= 0) return -1
      return av - bv || b.conversions - a.conversions
    })
  }
  if (metric === 'ctr' || metric === 'cvr') {
    return copy.sort((a, b) => {
      const av = metric === 'ctr' ? a.ctr : a.cvr
      const bv = metric === 'ctr' ? b.ctr : b.cvr
      if (av == null && bv == null) return b.conversions - a.conversions
      if (av == null) return 1
      if (bv == null) return -1
      if (av <= 0 && bv <= 0) return b.conversions - a.conversions
      if (av <= 0) return 1
      if (bv <= 0) return -1
      return bv - av || b.conversions - a.conversions || b.spend - a.spend
    })
  }
  return copy.sort((a, b) => b.roas - a.roas || b.conversions - a.conversions || b.spend - a.spend)
}

function computeAverages(rows: WinnerRow[]): Averages {
  const withConv = rows.filter(r => r.conversions > 0)
  const withRoas = rows.filter(r => r.roas > 0)
  const withCpa = rows.filter(r => r.cpa > 0)
  const withCtr = rows.filter(r => r.ctr > 0)
  const withCvr = rows.filter(r => r.cvr != null)
  const withCpc = rows.filter(r => r.cpc != null)
  const withCpm = rows.filter(r => r.cpm != null)
  return {
    conversions: withConv.length
      ? withConv.reduce((s, r) => s + r.conversions, 0) / withConv.length
      : 0,
    roas: withRoas.length ? withRoas.reduce((s, r) => s + r.roas, 0) / withRoas.length : 0,
    cpa: withCpa.length ? withCpa.reduce((s, r) => s + r.cpa, 0) / withCpa.length : 0,
    ctr: withCtr.length ? withCtr.reduce((s, r) => s + r.ctr, 0) / withCtr.length : 0,
    cvr: withCvr.length ? withCvr.reduce((s, r) => s + (r.cvr as number), 0) / withCvr.length : 0,
    cpc: withCpc.length ? withCpc.reduce((s, r) => s + (r.cpc as number), 0) / withCpc.length : 0,
    cpm: withCpm.length ? withCpm.reduce((s, r) => s + (r.cpm as number), 0) / withCpm.length : 0,
  }
}

function beatsAverage(row: WinnerRow, metric: SortMetric, averages: Averages) {
  if (metric === 'conversions') {
    return averages.conversions > 0 && row.conversions > averages.conversions
  }
  if (metric === 'roas') return averages.roas > 0 && row.roas > averages.roas
  if (metric === 'ctr') return averages.ctr > 0 && row.ctr > averages.ctr
  if (metric === 'cpa') return averages.cpa > 0 && row.cpa > 0 && row.cpa < averages.cpa
  if (metric === 'cvr') {
    return averages.cvr > 0 && row.cvr != null && row.cvr > averages.cvr
  }
  if (metric === 'cpc') {
    return averages.cpc > 0 && row.cpc != null && row.cpc > 0 && row.cpc < averages.cpc
  }
  if (metric === 'cpm') {
    return averages.cpm > 0 && row.cpm != null && row.cpm > 0 && row.cpm < averages.cpm
  }
  return false
}

function belowAverage(row: WinnerRow, metric: SortMetric, averages: Averages) {
  if (metric === 'conversions') {
    return averages.conversions > 0 && row.conversions < averages.conversions
  }
  if (metric === 'roas') return averages.roas > 0 && row.roas > 0 && row.roas < averages.roas
  if (metric === 'ctr') return averages.ctr > 0 && row.ctr > 0 && row.ctr < averages.ctr
  if (metric === 'cpa') return averages.cpa > 0 && row.cpa > averages.cpa
  if (metric === 'cvr') {
    return averages.cvr > 0 && row.cvr != null && row.cvr < averages.cvr
  }
  if (metric === 'cpc') {
    return averages.cpc > 0 && row.cpc != null && row.cpc > averages.cpc
  }
  if (metric === 'cpm') {
    return averages.cpm > 0 && row.cpm != null && row.cpm > averages.cpm
  }
  return false
}

function rankBadge(rank: number) {
  if (rank === 1) {
    return {
      className: 'bg-gradient-to-br from-[#3a2800] to-[#1a1400] text-[#fbbf24] border-[#fbbf24]/50',
      label: '🥇',
    }
  }
  if (rank === 2) {
    return {
      className: 'bg-gradient-to-br from-[#2a2d35] to-[#1a1d24] text-[#e5e7eb] border-[#9ca3af]/40',
      label: '🥈',
    }
  }
  return {
    className: 'bg-[#0f1117] text-[#8b8fa8] border-[#2a2d35]',
    label: String(rank),
  }
}

function levelTitle(level: WinnerLevel, lang: string) {
  if (level === 'campaigns') return lang === 'ar' ? 'أفضل الحملات' : 'Top campaigns'
  if (level === 'adgroups') return lang === 'ar' ? 'أفضل مجموعات الإعلانات' : 'Top ad groups'
  return lang === 'ar' ? 'أفضل الإعلانات' : 'Top ads'
}


export default function TikTokWinnersTab({
  lang,
  dir,
  advertiserId,
  dateStart,
  dateEnd,
  fmtMoney,
  fmtNum,
  fmtPct,
  onReauthRequired,
}: Props) {
  const [level, setLevel] = useState<WinnerLevel>('campaigns')
  const [levelOpen, setLevelOpen] = useState(false)
  const levelRef = useRef<HTMLDivElement>(null)
  const [sortMetric, setSortMetric] = useState<SortMetric>('conversions')
  const [items, setItems] = useState<WinnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scaleTarget, setScaleTarget] = useState<WinnerRow | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (levelRef.current && !levelRef.current.contains(e.target as Node)) {
        setLevelOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const fetchWinners = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = `?start_date=${dateStart}&end_date=${dateEnd}&level=${level}`
      const res = await fetch(`/api/tiktok/winners${q}`)
      const data = await res.json()
      if (data.error === 'reauth_required') {
        onReauthRequired?.()
        setItems([])
        setLoading(false)
        return
      }
      if (data.error) {
        setError(data.error)
        setItems([])
        setLoading(false)
        return
      }
      setItems(data.items || [])
    } catch {
      setError('fetch_failed')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [dateStart, dateEnd, level, onReauthRequired])

  useEffect(() => {
    if (!advertiserId) return
    fetchWinners()
  }, [advertiserId, fetchWinners])

  const { ranked, insufficient } = useMemo(() => {
    const qualified: WinnerRow[] = []
    const lowData: WinnerRow[] = []
    for (const row of items) {
      if (hasEnoughData(row)) qualified.push(row)
      else lowData.push(row)
    }
    return {
      ranked: sortItems(qualified, sortMetric),
      insufficient: sortItems(lowData, sortMetric),
    }
  }, [items, sortMetric])

  const averages = useMemo(() => computeAverages(ranked), [ranked])

  const levelLabel = WINNER_LEVEL_OPTIONS.find(o => o.id === level)

  const openScale = (row: WinnerRow) => setScaleTarget(row)

  const sortOptions: { id: SortMetric; en: string; ar: string }[] = [
    { id: 'conversions', en: 'By Conversions', ar: 'حسب التحويلات' },
    { id: 'roas', en: 'By ROAS', ar: 'حسب ROAS' },
    { id: 'cpa', en: 'By CPA', ar: 'حسب CPA' },
    { id: 'cvr', en: 'By CVR', ar: 'حسب CVR' },
    { id: 'cpm', en: 'By CPM', ar: 'حسب CPM' },
    { id: 'cpc', en: 'By CPC', ar: 'حسب CPC' },
    { id: 'ctr', en: 'By CTR', ar: 'حسب CTR' },
  ]

  const renderRow = (row: WinnerRow, rank: number | null, qualified: boolean) => {
    const winner = qualified && beatsAverage(row, sortMetric, averages)
    const under = qualified && belowAverage(row, sortMetric, averages)
    const displayName = truncateDisplay(cleanName(row.name))
    const badge = rank ? rankBadge(rank) : null

    const canScaleBudget = qualified
      && row.budget_editable
      && row.scale_entity_id
      && getSmartPlusApiSupport(row.scale_level, row.is_smart_plus).budget
    const smartLocked = qualified && row.is_smart_plus && !canScaleBudget
    const budgetDisplay = formatBudgetDisplay(
      { budget: row.entity_budget, budget_label: row.budget_label, budget_editable: false },
      fmtMoney,
    )

    return (
      <tr
        key={row.id}
        className={`border-b border-[#2a2d35] last:border-0 transition-colors ${
          qualified ? 'hover:bg-[#1f2229]' : 'opacity-65 hover:opacity-85'
        }`}
      >
        <td className="px-3 py-3 w-12 text-center">
          {badge ? (
            <span
              className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-xs font-bold border ${badge.className}`}
            >
              {badge.label}
            </span>
          ) : (
            <span className="text-[#4a4e60] text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3 min-w-[180px] max-w-[280px]">
          <span
            className="text-sm font-medium text-white truncate block"
            title={row.name}
          >
            {displayName}
          </span>
        </td>
        <td className="px-3 py-3 text-sm font-bold text-white tabular-nums">
          {fmtNum(row.conversions)}
        </td>
        <td className="px-3 py-3 text-sm text-[#c4c7d4] tabular-nums">
          {fmtMoney(row.spend, 0)}
        </td>
        <td className="px-3 py-3 text-sm whitespace-nowrap">
          <span className={`text-xs font-medium ${row.budget_label ? 'text-[#8b8fa8] bg-[#0f1117] border border-[#2a2d35] rounded px-1.5 py-0.5' : 'text-[#4a4e60]'}`}>
            {budgetDisplay.text}
          </span>
        </td>
        <td className="px-3 py-3 text-sm text-[#c4c7d4] tabular-nums whitespace-nowrap">
          {row.cpa > 0 ? fmtMoney(row.cpa) : '—'}
        </td>
        <td className="px-3 py-3 text-sm text-[#c4c7d4] tabular-nums whitespace-nowrap">
          {formatRateMetric(row.cvr, fmtPct)}
        </td>
        <td className="px-3 py-3 text-sm text-[#c4c7d4] tabular-nums whitespace-nowrap">
          {formatRateMetric(row.cpm, n => fmtMoney(n, 2))}
        </td>
        <td className="px-3 py-3 text-sm text-[#c4c7d4] tabular-nums whitespace-nowrap">
          {formatRateMetric(row.cpc, n => fmtMoney(n, 2))}
        </td>
        <td className="px-3 py-3 text-sm text-[#c4c7d4] tabular-nums whitespace-nowrap">
          {row.roas > 0 ? fmtNum(row.roas, 2) : '—'}
        </td>
        <td className="px-3 py-3 text-sm text-[#c4c7d4] tabular-nums whitespace-nowrap">
          {row.ctr > 0 ? fmtPct(row.ctr) : '—'}
        </td>
        <td className="px-3 py-3 w-[120px]">
          {winner && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#4ade80] bg-[#14321f] border border-[#4ade80]/30 rounded-full px-2 py-1 whitespace-nowrap">
              Winner
            </span>
          )}
          {under && !winner && (
            <span className="text-[10px] font-medium text-[#f87171] bg-[#3a1414]/60 border border-[#f87171]/25 rounded-full px-2 py-1 whitespace-nowrap">
              {lang === 'ar' ? 'ضعيف' : 'Underperforming'}
            </span>
          )}
        </td>
        <td className="px-3 py-3 min-w-[108px]">
          {(canScaleBudget || smartLocked) ? (
            <button
              type="button"
              onClick={() => openScale(row)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14321f] text-[#4ade80] border border-[#4ade80]/30 hover:bg-[#4ade80]/10 transition-colors whitespace-nowrap"
            >
              {SCALE_ACTION_LABEL}
            </button>
          ) : null}
        </td>
      </tr>
    )
  }

  const tableHead = (
    <thead>
      <tr className="border-b border-[#2a2d35] text-[10px] text-[#4a4e60] uppercase tracking-wider">
        <th className="px-3 py-3 font-medium w-12 text-center">{lang === 'ar' ? 'الترتيب' : 'Rank'}</th>
        <th className="text-start px-4 py-3 font-medium min-w-[180px]">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
        <th className="text-start px-3 py-3 font-medium text-white">{lang === 'ar' ? 'تحويلات' : 'Conversions'}</th>
        <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? 'الإنفاق' : 'Spend'}</th>
        <th className="text-start px-3 py-3 font-medium">{lang === 'ar' ? 'الميزانية' : 'Budget'}</th>
        <th className="text-start px-3 py-3 font-medium">CPA</th>
        <th className="text-start px-3 py-3 font-medium">CVR</th>
        <th className="text-start px-3 py-3 font-medium">CPM</th>
        <th className="text-start px-3 py-3 font-medium">CPC</th>
        <th className="text-start px-3 py-3 font-medium">ROAS</th>
        <th className="text-start px-3 py-3 font-medium">CTR</th>
        <th className="text-start px-3 py-3 font-medium w-[120px]">{lang === 'ar' ? 'الصحة' : 'Health'}</th>
        <th className="text-start px-3 py-3 font-medium min-w-[108px]">{SCALE_ACTION_LABEL}</th>
      </tr>
    </thead>
  )

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
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
                  {WINNER_LEVEL_OPTIONS.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { setLevel(l.id as WinnerLevel); setLevelOpen(false) }}
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
            <h2 className="text-white font-semibold text-sm">{levelTitle(level, lang)}</h2>
          </div>
          <span className="text-[10px] text-[#4a4e60] bg-[#0f1117] border border-[#2a2d35] px-2 py-0.5 rounded-full" dir="ltr">
            {dateStart} – {dateEnd}
          </span>
        </div>

        <div className="px-5 py-3 border-b border-[#2a2d35] flex flex-wrap items-center gap-2">
          {sortOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSortMetric(opt.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortMetric === opt.id
                  ? 'bg-[#3b82f6] text-white'
                  : 'text-[#8b8fa8] hover:text-white hover:bg-[#2a2d35]'
              }`}
            >
              {lang === 'ar' ? opt.ar : opt.en}
            </button>
          ))}
          <span className="text-[10px] text-[#4a4e60] ms-auto">
            {lang === 'ar'
              ? `≥${MIN_CONVERSIONS} تحويلات للترتيب`
              : `≥${MIN_CONVERSIONS} conversions to rank`}
          </span>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-[#8b8fa8]">
            {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-[#f87171] mb-3">
              {lang === 'ar' ? 'تعذر تحميل بيانات الأداء.' : 'Could not load performance data.'}
            </p>
            <button
              type="button"
              onClick={fetchWinners}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2a2d35] text-white hover:bg-[#3a3d48] transition-colors"
            >
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : !items.length ? (
          <div className="px-5 py-12 text-center text-sm text-[#8b8fa8]">
            {lang === 'ar' ? 'لا توجد بيانات لهذه الفترة' : 'No data for this period'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px]">
              {tableHead}
              <tbody>
                {ranked.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLS} className="px-5 py-10 text-center text-sm text-[#8b8fa8]">
                      {lang === 'ar'
                        ? 'لا توجد عناصر ببيانات كافية للترتيب.'
                        : 'No items with enough data to rank.'}
                    </td>
                  </tr>
                ) : (
                  ranked.map((row, index) => renderRow(row, index + 1, true))
                )}
                {insufficient.length > 0 && (
                  <tr className="bg-[#0f1117]/80">
                    <td colSpan={TABLE_COLS} className="px-5 py-2.5 border-y border-[#2a2d35]">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#4a4e60]">
                        {lang === 'ar' ? 'بيانات غير كافية' : 'Not enough data'}
                      </span>
                      <span className="text-[10px] text-[#4a4e60] ms-2">({insufficient.length})</span>
                    </td>
                  </tr>
                )}
                {insufficient.map(row => renderRow(row, null, false))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {scaleTarget && (
        <TikTokScaleModal
          lang={lang}
          dir={dir}
          row={scaleTarget}
          dateStart={dateStart}
          dateEnd={dateEnd}
          advertiserId={advertiserId}
          fmtMoney={fmtMoney}
          fmtNum={fmtNum}
          onClose={() => setScaleTarget(null)}
          onSuccess={fetchWinners}
          onReauthRequired={onReauthRequired}
        />
      )}
    </div>
  )
}
