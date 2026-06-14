'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WinnerRow } from '@/lib/tiktok/entities'
import { AGE_OPTIONS } from '@/lib/tiktok/create-ad/types'
import type { ScaleSignal, ScaleStrategy } from '@/lib/tiktok/scale-signal'
import type { DuplicateScaleContext, DuplicateScaleMode } from '@/lib/tiktok/scale-duplicate'
import {
  getSmartPlusApiSupport,
  SCALE_ACTION_LABEL,
  SMART_PLUS_TOOLTIP,
  tiktokAdsManagerUrl,
  type EntityLevel,
} from '@/lib/tiktok/types'

type Props = {
  lang: string
  dir: string
  row: WinnerRow
  dateStart: string
  dateEnd: string
  advertiserId: string
  fmtMoney: (n: number, digits?: number) => string
  fmtNum: (n: number, digits?: number) => string
  onClose: () => void
  onSuccess: () => void
  onReauthRequired?: () => void
}

function cleanName(raw: string) {
  let name = raw.trim()
  name = name.replace(/^snaptik[_\-\d]+/i, '')
  name = name.replace(/_Ad\s*name\d*[_\-\d]*/gi, '')
  name = name.replace(/[_-]{2,}/g, ' ').replace(/[_]/g, ' ').replace(/\s{2,}/g, ' ').trim()
  return name || raw.trim()
}

function resolveScaleLevel(row: WinnerRow): 'campaigns' | 'adgroups' {
  if (row.scale_level === 'campaigns' || row.scale_level === 'adgroups') return row.scale_level
  if (row.level === 'campaigns') return 'campaigns'
  return 'adgroups'
}

function resolveScaleEntityId(row: WinnerRow): string {
  if (row.scale_entity_id) return row.scale_entity_id
  if (row.level === 'campaigns' || row.level === 'adgroups') return row.id
  return ''
}

function truncate(name: string, max = 48) {
  return name.length <= max ? name : `${name.slice(0, max - 1)}…`
}

const REC_BANNER: Record<
  ScaleSignal['recommendation'],
  { icon: string; en: string; ar: string; tone: string }
> = {
  boost_today: {
    icon: '🔥',
    en: 'Strong day — boost today to catch the wave.',
    ar: 'يوم قوي — زوّد النهارده واستغل الموجة.',
    tone: 'bg-[#14321f] border-[#4ade80]/30 text-[#4ade80]',
  },
  duplicate: {
    icon: '📈',
    en: 'Proven winner — duplicate it to scale bigger safely.',
    ar: 'فائز مثبت — انسخه وكبّر بأمان.',
    tone: 'bg-[#1a2540] border-[#60a5fa]/30 text-[#60a5fa]',
  },
  proven_winner: {
    icon: '🏆',
    en: 'Proven winner — step up budget or boost today. Smart+ can\'t be duplicated via API.',
    ar: 'فائز مثبت — زوّد الميزانية تدريجياً أو كبّر النهارده. Smart+ ماينفعش ينسخ عبر الـ API.',
    tone: 'bg-[#1a2540] border-[#60a5fa]/30 text-[#60a5fa]',
  },
  early: {
    icon: '🆕',
    en: 'Promising but early — a small boost is fine, big scaling can wait.',
    ar: 'واعد بس لسه بدري — زيادة صغيرة كويسة، التكبير الكبير يستنى.',
    tone: 'bg-[#2a2800] border-[#fbbf24]/30 text-[#fbbf24]',
  },
  declining: {
    icon: '⚠️',
    en: 'Performance dropping — scaling now usually wastes budget.',
    ar: 'الأداء بيتراجع — التوسيع دلوقتي غالباً هيهدر الميزانية.',
    tone: 'bg-[#3a1414] border-[#f87171]/30 text-[#f87171]',
  },
}

type StrategyCard = {
  id: ScaleStrategy
  icon: string
  titleEn: string
  titleAr: string
  helperEn: string
  helperAr: string
  pctLabel?: string
  hero?: boolean
  /** Shown dimmed and not selectable (e.g. Smart+ duplicate lock). */
  disabled?: boolean
  disabledLabelEn?: string
  disabledLabelAr?: string
}

export default function TikTokScaleModal({
  lang,
  dir,
  row,
  dateStart,
  dateEnd,
  advertiserId,
  fmtMoney,
  fmtNum,
  onClose,
  onSuccess,
  onReauthRequired,
}: Props) {
  const [signal, setSignal] = useState<ScaleSignal | null>(null)
  const [loadingSignal, setLoadingSignal] = useState(true)
  const [signalError, setSignalError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ScaleStrategy>('boost_today')
  const [customBudget, setCustomBudget] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [duplicateMode, setDuplicateMode] = useState<DuplicateScaleMode>('clone_boost')
  const [duplicateBudget, setDuplicateBudget] = useState('')
  const [dupContext, setDupContext] = useState<DuplicateScaleContext | null>(null)
  const [loadingDup, setLoadingDup] = useState(false)
  const [expandLocationId, setExpandLocationId] = useState('')
  const [expandAgeGroups, setExpandAgeGroups] = useState<string[]>([])

  const scaleLevel = resolveScaleLevel(row)
  const scaleEntityId = resolveScaleEntityId(row)
  const canBudget = row.budget_editable && getSmartPlusApiSupport(scaleLevel, row.is_smart_plus).budget
  /** Duplicate is independent of budget_editable — only gated on Smart+ and having an entity to clone. */
  const canDuplicateScale = !row.is_smart_plus && Boolean(scaleEntityId)
  const smartLocked = row.is_smart_plus && !canBudget
  const baseBudget = row.entity_budget && row.entity_budget > 0 ? row.entity_budget : null

  useEffect(() => {
    const dupReason = row.is_smart_plus
      ? 'is_smart_plus=true (Smart+ campaigns cannot be duplicated via API)'
      : !scaleEntityId
        ? 'scaleEntityId is empty'
        : 'eligible'
    console.log('[TikTokScaleModal] duplicate gate', {
      campaign_name: row.name,
      row_id: row.id,
      row_level: row.level,
      is_smart_plus: row.is_smart_plus,
      campaign_automation_type: row.campaign_automation_type ?? null,
      campaign_type: row.campaign_type ?? null,
      is_smart_performance_campaign: row.is_smart_performance_campaign ?? null,
      scale_level_raw: row.scale_level,
      scale_level_resolved: scaleLevel,
      scale_entity_id_raw: row.scale_entity_id,
      scaleEntityId_resolved: scaleEntityId,
      canDuplicateScale,
      duplicate_hidden_reason: canDuplicateScale ? null : dupReason,
      duplicate_card_disabled: row.is_smart_plus,
      canBudget,
      smartLocked,
    })
  }, [row, scaleLevel, scaleEntityId, canDuplicateScale, canBudget, smartLocked])

  const fetchSignal = useCallback(async () => {
    setLoadingSignal(true)
    setSignalError(null)
    try {
      const budgetQ = baseBudget ? `&daily_budget=${baseBudget}` : ''
      const smartQ = row.is_smart_plus ? '&is_smart_plus=true' : ''
      const q = `?level=${row.level}&entity_id=${row.id}&start_date=${dateStart}&end_date=${dateEnd}${budgetQ}${smartQ}`
      const res = await fetch(`/api/tiktok/scale-signal${q}`)
      const data = await res.json()
      if (data.error === 'reauth_required') {
        onReauthRequired?.()
        setLoadingSignal(false)
        return
      }
      if (data.error) {
        setSignalError(data.error)
        setLoadingSignal(false)
        return
      }
      setSignal(data)
      let next: ScaleStrategy = data.recommended_strategy || 'boost_today'
      if (next === 'duplicate' && (row.is_smart_plus || !scaleEntityId)) {
        next = 'boost_today'
      }
      setSelected(next)
    } catch {
      setSignalError('fetch_failed')
    } finally {
      setLoadingSignal(false)
    }
  }, [row.id, row.level, row.is_smart_plus, row.name, scaleEntityId, dateStart, dateEnd, baseBudget, onReauthRequired])

  useEffect(() => {
    fetchSignal()
  }, [fetchSignal])

  const fetchDupContext = useCallback(async () => {
    if (!canDuplicateScale) return
    setLoadingDup(true)
    try {
      const budgetQ = baseBudget ? `&daily_budget=${baseBudget}` : ''
      const q = `?level=${scaleLevel}&entity_id=${scaleEntityId}${budgetQ}`
      const res = await fetch(`/api/tiktok/scale/duplicate-context${q}`)
      const data = await res.json()
      if (data.error) {
        setDupContext(null)
        return
      }
      setDupContext(data)
      if (data.default_budget) setDuplicateBudget(String(data.default_budget))
      if (data.suggested_location_id) setExpandLocationId(data.suggested_location_id)
      if (data.suggested_age_groups?.length) setExpandAgeGroups(data.suggested_age_groups)
    } catch {
      setDupContext(null)
    } finally {
      setLoadingDup(false)
    }
  }, [canDuplicateScale, scaleLevel, scaleEntityId, baseBudget])

  useEffect(() => {
    if (selected === 'duplicate' && canDuplicateScale) fetchDupContext()
  }, [selected, canDuplicateScale, fetchDupContext])

  useEffect(() => {
    if (selected === 'duplicate' && row.is_smart_plus) {
      setSelected('boost_today')
    }
  }, [selected, row.is_smart_plus])

  const strategies = useMemo((): StrategyCard[] => {
    const duplicateDisabled = row.is_smart_plus
    const cards: StrategyCard[] = [
      {
        id: 'boost_today',
        icon: '🔥',
        titleEn: 'Boost today only (+25%)',
        titleAr: 'زيادة النهارده فقط (+25%)',
        helperEn: 'Spend more while it\'s hot today, back to normal tomorrow. Safest way to push a good day.',
        helperAr: 'صرف أكتر واليوم حلو، وبكرة يرجع طبيعي. أنسب طريقة تستغل يوم كويس.',
        pctLabel: '+25%',
        hero: true,
      },
      {
        id: 'duplicate',
        icon: '🔁',
        titleEn: 'Duplicate to scale',
        titleAr: 'انسخ وكبّر',
        helperEn: 'Create a bigger copy — your original keeps running untouched.',
        helperAr: 'اعمل نسخة أكبر — الأصلي يفضل شغال من غير ما تلمسه.',
        pctLabel: '×1.5 start',
        disabled: duplicateDisabled,
        disabledLabelEn: 'Manual campaigns only — Smart+ can\'t be duplicated.',
        disabledLabelAr: 'للحملات اليدوية فقط — لا يمكن نسخ Smart+',
      },
      {
        id: 'step_up',
        icon: '📊',
        titleEn: 'Step up (+20%)',
        titleAr: 'زيادة ثابتة (+20%)',
        helperEn: 'Steady growth. Re-check tomorrow.',
        helperAr: 'نمو هادي. راجع بكرة.',
        pctLabel: '+20%',
      },
      {
        id: 'custom',
        icon: '✏️',
        titleEn: 'Custom amount',
        titleAr: 'مبلغ مخصص',
        helperEn: 'Set your own daily budget.',
        helperAr: 'حدد الميزانية اليومية بنفسك.',
      },
    ]
    return cards
  }, [row.is_smart_plus])

  const previewBudget = (strategy: ScaleStrategy): number | null => {
    if (strategy === 'duplicate') {
      const dup = parseFloat(duplicateBudget)
      return Number.isFinite(dup) && dup > 0 ? dup : dupContext?.default_budget ?? null
    }
    if (!baseBudget) return strategy === 'custom' ? parseFloat(customBudget) || null : null
    if (strategy === 'boost_today') return Math.round(baseBudget * 1.25)
    if (strategy === 'step_up') return Math.round(baseBudget * 1.2)
    const custom = parseFloat(customBudget)
    return Number.isFinite(custom) && custom > 0 ? custom : null
  }

  const apply = async () => {
    if (selected === 'duplicate' ? !canDuplicateScale : !canBudget) return
    if (selected === 'custom') {
      const v = parseFloat(customBudget)
      if (!Number.isFinite(v) || v <= 0) {
        setApplyError(lang === 'ar' ? 'أدخل ميزانية صالحة' : 'Enter a valid budget')
        return
      }
    } else if (selected === 'duplicate') {
      const v = parseFloat(duplicateBudget)
      if (!Number.isFinite(v) || v <= 0) {
        setApplyError(lang === 'ar' ? 'أدخل ميزانية للنسخة' : 'Enter a budget for the clone')
        return
      }
      if (duplicateMode === 'clone_expand' && !expandLocationId) {
        setApplyError(lang === 'ar' ? 'اختر موقعاً للجمهور الجديد' : 'Pick a location for the new audience')
        return
      }
      if (duplicateMode === 'clone_expand' && !expandAgeGroups.length) {
        setApplyError(lang === 'ar' ? 'اختر فئة عمرية واحدة على الأقل' : 'Select at least one age group')
        return
      }
    } else if (!baseBudget) {
      setApplyError(lang === 'ar' ? 'لا توجد ميزانية يومية قابلة للتعديل' : 'No editable daily budget found')
      return
    }

    setApplying(true)
    setApplyError(null)
    try {
      const res = await fetch('/api/tiktok/scale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: selected,
          level: scaleLevel,
          entity_id: scaleEntityId,
          is_smart_plus: row.is_smart_plus,
          current_budget: baseBudget,
          custom_budget: selected === 'custom' ? parseFloat(customBudget) : undefined,
          duplicate_mode: selected === 'duplicate' ? duplicateMode : undefined,
          duplicate_budget: selected === 'duplicate' ? parseFloat(duplicateBudget) : undefined,
          location_ids: selected === 'duplicate' && duplicateMode === 'clone_expand'
            ? [expandLocationId]
            : undefined,
          age_groups: selected === 'duplicate' && duplicateMode === 'clone_expand'
            ? expandAgeGroups
            : undefined,
          timezone: signal?.timezone,
        }),
      })
      const data = await res.json()
      if (data.error === 'reauth_required') {
        onReauthRequired?.()
        setApplying(false)
        return
      }
      if (data.error) {
        setApplyError(data.message || data.error)
        setApplying(false)
        return
      }
      onSuccess()
      onClose()
    } catch {
      setApplyError(lang === 'ar' ? 'فشل التطبيق' : 'Failed to apply')
    } finally {
      setApplying(false)
    }
  }

  const rec = signal ? REC_BANNER[signal.recommendation] : null
  const displayName = truncate(cleanName(row.name))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" dir={dir}>
      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#2a2d35] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-base">
              {SCALE_ACTION_LABEL}
            </h3>
            <p className="text-xs text-[#8b8fa8] mt-0.5 truncate" title={row.name}>{displayName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#4a4e60] hover:text-white text-lg leading-none shrink-0"
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            ×
          </button>
        </div>

        {smartLocked ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-[#8b8fa8] mb-4">{SMART_PLUS_TOOLTIP}</p>
            <a
              href={tiktokAdsManagerUrl(scaleLevel as EntityLevel, advertiserId, scaleEntityId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-4 py-2 rounded-lg text-sm font-medium text-[#60a5fa] border border-[#3b82f6]/40 hover:bg-[#3b82f6]/10"
            >
              {lang === 'ar' ? 'عرض في TikTok' : 'View on TikTok'} ↗
            </a>
          </div>
        ) : loadingSignal ? (
          <div className="px-5 py-10 text-center text-sm text-[#8b8fa8] animate-pulse">
            {lang === 'ar' ? 'جاري قراءة أداء اليوم...' : 'Reading today\'s performance...'}
          </div>
        ) : signalError ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-[#f87171] mb-3">
              {lang === 'ar' ? 'تعذر تحميل بيانات اليوم' : 'Could not load today\'s data'}
            </p>
            <button type="button" onClick={fetchSignal} className="text-xs text-[#60a5fa] hover:underline">
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : signal && (
          <div className="px-5 py-4 space-y-4">
            {/* Live context */}
            <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4 space-y-3">
              {signal.today.daily_budget != null && signal.today.daily_budget > 0 ? (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#8b8fa8]">
                      {lang === 'ar' ? 'صرف النهارده' : 'Spent today'}
                    </span>
                    <span className="text-white font-medium tabular-nums" dir="ltr">
                      {fmtMoney(signal.today.spend, 0)}
                      {' '}
                      {lang === 'ar' ? 'من' : 'of'}
                      {' '}
                      {fmtMoney(signal.today.daily_budget, 0)}
                      {signal.today.pacing_pct != null && (
                        <span className="text-[#4a4e60] ms-1">({signal.today.pacing_pct}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-[#2a2d35] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#3b82f6] to-[#4ade80] rounded-full transition-all"
                      style={{ width: `${Math.min(100, signal.today.pacing_pct ?? 0)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#8b8fa8]">
                  {lang === 'ar' ? 'صرف النهارده:' : 'Spent today:'}{' '}
                  <span className="text-white font-medium">{fmtMoney(signal.today.spend, 0)}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#8b8fa8]">
                  {lang === 'ar' ? 'النهارده vs المتوسط:' : 'Today vs average:'}
                </span>
                <span className="text-white tabular-nums" dir="ltr">
                  CPA {signal.today.cpa != null ? fmtMoney(signal.today.cpa, 2) : '—'}
                  {' '}
                  {lang === 'ar' ? 'vs' : 'vs'}
                  {' '}
                  {signal.average.cpa != null ? fmtMoney(signal.average.cpa, 2) : '—'}
                </span>
                {signal.cpa_indicator === 'better' && (
                  <span title={lang === 'ar' ? 'أفضل من المتوسط' : 'Better than average'}>🔥</span>
                )}
                {signal.cpa_indicator === 'worse' && (
                  <span title={lang === 'ar' ? 'أسوأ من المتوسط' : 'Worse than average'}>⚠️</span>
                )}
              </div>

              <p className="text-xs text-[#8b8fa8]">
                {lang === 'ar' ? 'تحويلات النهارده:' : 'Today\'s conversions:'}{' '}
                <span className="text-white font-bold">{fmtNum(signal.today.conversions)}</span>
              </p>
            </div>

            {/* Recommendation banner */}
            {rec && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${rec.tone}`}>
                <span className="me-1.5">{rec.icon}</span>
                {lang === 'ar' ? rec.ar : rec.en}
              </div>
            )}

            {/* Warnings */}
            {signal.warnings.length > 0 && (
              <div className="space-y-1.5">
                {signal.warnings.includes('learning') && (
                  <p className="text-[11px] text-[#fbbf24] bg-[#2a2800]/50 border border-[#fbbf24]/20 rounded-lg px-3 py-2">
                    {lang === 'ar'
                      ? '⚠️ أقل من 50 تحويل — لسه في مرحلة التعلم، التكبير الكبير مخاطرة.'
                      : '⚠️ Under 50 conversions — still learning; big scaling is risky.'}
                  </p>
                )}
                {signal.warnings.includes('declining') && (
                  <p className="text-[11px] text-[#f87171] bg-[#3a1414]/40 border border-[#f87171]/20 rounded-lg px-3 py-2">
                    {lang === 'ar'
                      ? '⚠️ الأداء بيتراجع — التوسيع دلوقتي غالباً هيهدر فلوس.'
                      : '⚠️ Performance is dropping — scaling now often wastes budget.'}
                  </p>
                )}
              </div>
            )}

            {/* Strategy cards */}
            <div className="space-y-2">
              <p className="text-[10px] text-[#4a4e60] uppercase tracking-wider">
                {lang === 'ar' ? 'اختر الاستراتيجية' : 'Pick a strategy'}
              </p>
              {strategies.map(card => {
                const isRec = !card.disabled && signal.recommended_strategy === card.id
                const isSel = !card.disabled && selected === card.id
                const preview = card.disabled ? null : previewBudget(card.id)
                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={card.disabled}
                    onClick={() => {
                      if (!card.disabled) setSelected(card.id)
                    }}
                    className={`w-full text-start rounded-xl border p-3.5 transition-all ${
                      card.disabled
                        ? 'border-[#2a2d35] bg-[#0f1117]/40 opacity-55 cursor-not-allowed'
                        : card.hero && isSel
                          ? 'border-[#4ade80]/50 bg-[#14321f]/40 ring-1 ring-[#4ade80]/30'
                          : isSel
                            ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10'
                            : 'border-[#2a2d35] bg-[#0f1117] hover:border-[#3b82f6]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={card.disabled ? 'opacity-60' : undefined}>{card.icon}</span>
                          <span className={`text-sm font-semibold ${
                            card.disabled
                              ? 'text-[#4a4e60]'
                              : card.hero
                                ? 'text-[#4ade80]'
                                : 'text-white'
                          }`}>
                            {lang === 'ar' ? card.titleAr : card.titleEn}
                          </span>
                          {card.disabled && card.disabledLabelEn && (
                            <span className="text-[9px] text-[#8b8fa8] bg-[#1a1d24] border border-[#2a2d35] rounded px-1.5 py-0.5">
                              {lang === 'ar' ? 'Smart+' : 'Smart+'}
                            </span>
                          )}
                          {card.hero && !card.disabled && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/30 rounded px-1.5 py-0.5">
                              {lang === 'ar' ? 'الأفضل' : 'Hero'}
                            </span>
                          )}
                          {isRec && !card.hero && (
                            <span className="text-[9px] text-[#60a5fa] bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded px-1.5 py-0.5">
                              {lang === 'ar' ? 'مُوصى' : 'Recommended'}
                            </span>
                          )}
                        </div>
                        {card.disabled && card.disabledLabelEn ? (
                          <p className="text-[11px] text-[#8b8fa8] mt-1 leading-relaxed">
                            {lang === 'ar' ? card.disabledLabelAr : card.disabledLabelEn}
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#8b8fa8] mt-1 leading-relaxed">
                            {lang === 'ar' ? card.helperAr : card.helperEn}
                          </p>
                        )}
                      </div>
                      {preview != null && card.id !== 'custom' && (
                        <span className="text-xs font-bold text-white tabular-nums shrink-0" dir="ltr">
                          {fmtMoney(preview, 0)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {selected === 'custom' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider">
                  {lang === 'ar' ? 'الميزانية اليومية الجديدة' : 'New daily budget'}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customBudget}
                  onChange={e => setCustomBudget(e.target.value)}
                  placeholder={baseBudget ? String(Math.round(baseBudget * 1.2)) : '100'}
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
                />
              </label>
            )}

            {selected === 'duplicate' && canDuplicateScale && (
              <div className="space-y-3 rounded-xl border border-[#2a2d35] bg-[#0f1117] p-4">
                <p className="text-[10px] text-[#4a4e60] uppercase tracking-wider">
                  {lang === 'ar' ? 'اختر طريقة النسخ' : 'Pick a clone mode'}
                </p>

                <button
                  type="button"
                  onClick={() => setDuplicateMode('clone_boost')}
                  className={`w-full text-start rounded-lg border p-3 transition-all ${
                    duplicateMode === 'clone_boost'
                      ? 'border-[#60a5fa]/50 bg-[#3b82f6]/10'
                      : 'border-[#2a2d35] hover:border-[#3b82f6]/30'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">
                    🔁 {lang === 'ar' ? 'انسخ وكبّر (نفس الجمهور)' : 'Clone & boost (same audience)'}
                  </p>
                  <p className="text-[11px] text-[#8b8fa8] mt-1 leading-relaxed">
                    {lang === 'ar'
                      ? 'تجاوز التسلق البطيء — النسخة تبدأ بميزانية أكبر والأصلي يفضل شغال. أنسب طريقة تعمل قفزة كبيرة.'
                      : 'Bypasses the slow climb — the copy starts bigger while your original keeps running untouched. Safest way to make a big jump.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDuplicateMode('clone_expand')}
                  className={`w-full text-start rounded-lg border p-3 transition-all ${
                    duplicateMode === 'clone_expand'
                      ? 'border-[#60a5fa]/50 bg-[#3b82f6]/10'
                      : 'border-[#2a2d35] hover:border-[#3b82f6]/30'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">
                    🌍 {lang === 'ar' ? 'انسخ ووسّع (جمهور جديد)' : 'Clone & expand (new audience)'}
                  </p>
                  <p className="text-[11px] text-[#8b8fa8] mt-1 leading-relaxed">
                    {lang === 'ar'
                      ? 'وصل لناس جدد من غير ما تمس الفائز. الجمهور الأوسع غالباً أرخص بحوالي 15%.'
                      : 'Reach new people without disturbing your winner. Broader audiences often convert ~15% cheaper.'}
                  </p>
                </button>

                {loadingDup ? (
                  <p className="text-xs text-[#8b8fa8] animate-pulse">
                    {lang === 'ar' ? 'جاري تحميل الإعدادات...' : 'Loading clone settings...'}
                  </p>
                ) : (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider">
                        {lang === 'ar' ? 'ميزانية النسخة اليومية' : 'Clone daily budget'}
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={duplicateBudget}
                        onChange={e => setDuplicateBudget(e.target.value)}
                        placeholder={dupContext?.default_budget ? String(dupContext.default_budget) : undefined}
                        className="w-full bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
                      />
                    </label>

                    {duplicateMode === 'clone_expand' && dupContext && (
                      <div className="space-y-3">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider">
                            {lang === 'ar' ? 'الموقع (جمهور أوسع)' : 'Location (broader reach)'}
                          </span>
                          <select
                            value={expandLocationId}
                            onChange={e => setExpandLocationId(e.target.value)}
                            className="w-full bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
                          >
                            <option value="">
                              {lang === 'ar' ? 'اختر موقعاً' : 'Select location'}
                            </option>
                            {dupContext.locations.map(loc => (
                              <option key={loc.location_id} value={loc.location_id}>
                                {lang === 'ar' ? loc.label_ar : loc.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div>
                          <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider">
                            {lang === 'ar' ? 'الفئات العمرية' : 'Age groups'}
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {AGE_OPTIONS.map(age => {
                              const on = expandAgeGroups.includes(age.id)
                              return (
                                <button
                                  key={age.id}
                                  type="button"
                                  onClick={() => setExpandAgeGroups(prev =>
                                    on ? prev.filter(x => x !== age.id) : [...prev, age.id]
                                  )}
                                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                                    on
                                      ? 'border-[#3b82f6]/50 bg-[#3b82f6]/15 text-white'
                                      : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6]/30'
                                  }`}
                                >
                                  {lang === 'ar' ? age.labelAr : age.labelEn}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-[#fbbf24] leading-relaxed">
                      {lang === 'ar'
                        ? 'النسخة تبدأ مرحلة تعلم جديدة (~50 تحويل / أيام قليلة) — توقع تقلبات، ما تحكمش عليها من أول يوم.'
                        : 'This copy starts its own learning phase (~50 conversions / a few days) — expect early volatility, don\'t judge it on day 1.'}
                    </p>

                    <p className="text-[10px] text-[#4a4e60] leading-relaxed">
                      {lang === 'ar'
                        ? 'الإعلان (الكرييتيف) هيتنسخ تلقائياً لما يتفعّل Creative Management — دلوقتي بيتعمل الحملة ومجموعة الإعلانات.'
                        : 'Ad creative auto-copies once Creative Management scope is live — for now, campaign + ad group are created.'}
                    </p>

                    {duplicateMode === 'clone_boost' && (
                      <p className="text-[10px] text-[#f87171] leading-relaxed">
                        {lang === 'ar'
                          ? '⚠ نسخ نفس الجمهور كتير يخلي إعلاناتك تتنافس (CPM أعلى). جرّب "انسخ ووسّع" بدلاً من ذلك.'
                          : '⚠ Cloning the same audience too often makes your ads compete with each other (higher CPM). Try Clone & expand instead.'}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {baseBudget && selected !== 'custom' && selected !== 'duplicate' && (
              <p className="text-[11px] text-[#4a4e60]">
                {lang === 'ar' ? 'الحالية:' : 'Current:'}{' '}
                <span className="text-[#8b8fa8]">{fmtMoney(baseBudget, 0)}</span>
                {' → '}
                <span className="text-white font-medium">
                  {previewBudget(selected) != null ? fmtMoney(previewBudget(selected)!, 0) : '—'}
                </span>
              </p>
            )}

            {selected === 'duplicate' && previewBudget('duplicate') != null && (
              <p className="text-[11px] text-[#4a4e60]">
                {lang === 'ar' ? 'ميزانية النسخة:' : 'Clone budget:'}{' '}
                <span className="text-white font-medium">
                  {fmtMoney(previewBudget('duplicate')!, 0)}
                </span>
              </p>
            )}

            {selected === 'boost_today' && baseBudget && (
              <p className="text-[10px] text-[#4a4e60] leading-relaxed">
                {lang === 'ar'
                  ? `هترجع تلقائياً لـ ${fmtMoney(baseBudget, 0)} الساعة 11:59 مساءً بتوقيت حساب الإعلانات.`
                  : `Auto-reverts to ${fmtMoney(baseBudget, 0)} at 11:59 PM ad-account time.`}
              </p>
            )}

            {applyError && (
              <p className="text-xs text-[#f87171]">{applyError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs text-[#8b8fa8] hover:text-white"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={applying || (selected === 'duplicate' ? !canDuplicateScale : !canBudget)}
                className={`px-5 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors ${
                  selected === 'boost_today'
                    ? 'bg-[#4ade80] text-[#0f1117] hover:bg-[#22c55e]'
                    : selected === 'duplicate'
                      ? 'bg-[#60a5fa] text-white hover:bg-[#3b82f6]'
                      : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                }`}
              >
                {applying
                  ? (lang === 'ar' ? 'جاري التطبيق...' : 'Applying...')
                  : SCALE_ACTION_LABEL}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
