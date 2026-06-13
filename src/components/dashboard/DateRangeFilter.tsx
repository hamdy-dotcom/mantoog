'use client'

import { useEffect, useRef, useState } from 'react'
import {
  formatLocalDate,
  normalizeDateRange,
  shortcutRange,
} from '@/lib/dashboard/date-range'

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

type ShortcutId = '7' | '30' | 'today'

type Props = {
  lang: string
  start: string
  end: string
  onChange: (start: string, end: string) => void
}

export default function DateRangeFilter({ lang, start, end, onChange }: Props) {
  const [draftStart, setDraftStart] = useState(start)
  const [draftEnd, setDraftEnd] = useState(end)
  const [customRangeOpen, setCustomRangeOpen] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)
  const customRangeRef = useRef<HTMLDivElement>(null)
  const todayStr = formatLocalDate(new Date())

  useEffect(() => {
    setDraftStart(start)
    setDraftEnd(end)
  }, [start, end])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (customRangeRef.current && !customRangeRef.current.contains(e.target as Node)) {
        setCustomRangeOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const shortcuts: { id: ShortcutId; label: string }[] = [
    { id: 'today', label: lang === 'ar' ? 'اليوم' : 'Today' },
    { id: '7', label: lang === 'ar' ? '7 أيام' : '7 days' },
    { id: '30', label: lang === 'ar' ? '30 يوماً' : '30 days' },
  ]

  const isShortcutActive = (kind: ShortcutId) => {
    const range = shortcutRange(kind)
    return start === range.start && end === range.end
  }

  const isCustomRangeActive = !shortcuts.some(s => isShortcutActive(s.id))

  const applyShortcut = (kind: ShortcutId) => {
    const range = shortcutRange(kind)
    setDraftStart(range.start)
    setDraftEnd(range.end)
    setDateError(null)
    setCustomRangeOpen(false)
    onChange(range.start, range.end)
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
    const { start: s, end: e, adjusted } = normalizeDateRange(draftStart, draftEnd)
    setDraftStart(s)
    setDraftEnd(e)
    if (adjusted) {
      setDateError(
        lang === 'ar'
          ? 'تم تبديل التواريخ — البداية (من) يجب أن تكون قبل النهاية (إلى).'
          : 'Dates were swapped — From must be on or before To.'
      )
    } else {
      setDateError(null)
    }
    setCustomRangeOpen(false)
    onChange(s, e)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
          onClick={() => setCustomRangeOpen(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            isCustomRangeActive || customRangeOpen
              ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-white'
              : 'border-[#2a2d35] bg-[#0f1117] text-[#8b8fa8] hover:text-white hover:border-[#3b82f6]/40'
          }`}
        >
          <CalendarIcon className="shrink-0 opacity-70" />
          <span dir="ltr">{start} – {end}</span>
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
  )
}
