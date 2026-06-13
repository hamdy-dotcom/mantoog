export function formatLocalDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function defaultLast14Days() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 13)
  return { start: formatLocalDate(start), end: formatLocalDate(end) }
}

export function defaultLast7Days() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)
  return { start: formatLocalDate(start), end: formatLocalDate(end) }
}

export function shortcutRange(kind: '7' | '30' | 'today') {
  const end = new Date()
  const start = new Date()
  if (kind === 'today') return { start: formatLocalDate(end), end: formatLocalDate(end) }
  start.setDate(end.getDate() - (kind === '30' ? 29 : 6))
  return { start: formatLocalDate(start), end: formatLocalDate(end) }
}

export function normalizeDateRange(start: string, end: string) {
  if (!start || !end || end >= start) return { start, end, adjusted: false }
  return { start: end, end: start, adjusted: true }
}

export function daysBetween(start: string, end: string) {
  const days: string[] = []
  const cur = new Date(`${start}T12:00:00`)
  const last = new Date(`${end}T12:00:00`)
  while (cur <= last) {
    days.push(formatLocalDate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function rangesEqual(a: { start: string; end: string }, b: { start: string; end: string }) {
  return a.start === b.start && a.end === b.end
}
