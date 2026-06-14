import { getPartsInTimezone } from '@/lib/tiktok/timezone'
import type { TzParts } from '@/lib/tiktok/timezone'

export type { TzParts }

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function toDatetimeLocalValue(parts: TzParts): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`
}

/** Next :00 boundary in ad-account timezone (ceil to hour). */
export function defaultScheduleStartLocal(timezone: string): string {
  const now = Date.now()
  for (let offsetMin = 0; offsetMin < 24 * 60; offsetMin++) {
    const p = getPartsInTimezone(new Date(now + offsetMin * 60_000), timezone)
    if (p.minute === 0 && p.second === 0) {
      return toDatetimeLocalValue(p)
    }
  }
  const p = getPartsInTimezone(new Date(), timezone)
  return toDatetimeLocalValue({ ...p, minute: 0, second: 0 })
}

/** `YYYY-MM-DDTHH:mm` (account-local wall clock) → TikTok `YYYY-MM-DD HH:mm:ss`. */
export function localDatetimeToTikTok(local: string): string {
  const [date, time] = local.split('T')
  if (!date || !time) return ''
  const [h, m] = time.split(':')
  return `${date} ${pad2(Number(h) || 0)}:${pad2(Number(m) || 0)}:00`
}

export function formatScheduleDisplay(local: string, timezone: string): string {
  const tiktok = localDatetimeToTikTok(local)
  if (!tiktok) return '—'
  return `${tiktok} (${timezone})`
}

export function isValidLocalDatetime(local: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)
}
