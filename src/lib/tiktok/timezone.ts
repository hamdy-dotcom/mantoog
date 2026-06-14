/** Timezone helpers for ad-account-local midnight revert (no extra deps). */

export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export type TzParts = { year: number; month: number; day: number; hour: number; minute: number; second: number }

export function getPartsInTimezone(date: Date, timezone: string): TzParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** ISO timestamp for 23:59:59 on `dateYmd` in the given IANA timezone. */
export function endOfAdAccountDayIso(timezone: string, dateYmd?: string): string {
  const ymd = dateYmd ?? todayInTimezone(timezone)
  const [y, m, d] = ymd.split('-').map(Number)
  const start = Date.UTC(y, m - 1, d, 0, 0, 0)
  const end = Date.UTC(y, m - 1, d + 2, 0, 0, 0)

  for (let t = start; t < end; t += 60000) {
    const p = getPartsInTimezone(new Date(t), timezone)
    const ds = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
    if (ds === ymd && p.hour === 23 && p.minute === 59) {
      return new Date(t + (59 - p.second) * 1000).toISOString()
    }
  }

  return new Date(Date.now() + 6 * 3600000).toISOString()
}

export function currencyDefaultTimezone(currency: string): string {
  const c = currency.toUpperCase()
  if (c === 'EGP') return 'Africa/Cairo'
  if (c === 'SAR') return 'Asia/Riyadh'
  if (c === 'AED') return 'Asia/Dubai'
  if (c === 'USD') return 'America/New_York'
  return 'UTC'
}
