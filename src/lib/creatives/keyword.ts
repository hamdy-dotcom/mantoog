export async function extractKeyword(input: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(input)) return input.trim() || null

  try {
    const u = new URL(input)

    // 1. keywords param
    const kw = u.searchParams.get('keywords')
    if (kw && kw.length > 2) {
      const decoded = decodeURIComponent(kw.replace(/\+/g, ' ')).trim()
      if (decoded.length > 2) return decoded
    }

    // 2. Fetch actual page title via server route
    const res = await fetch(`/api/creatives/extract-title?url=${encodeURIComponent(input)}`)
    const data = await res.json()
    if (data.title && data.title.length > 3) {
      const words = data.title.replace(/[،,\-_]/g, ' ').trim().split(/\s+/)
      return words.slice(0, 4).join(' ')
    }

    return null
  } catch {
    return null
  }
}

export function parseManualVideoUrl(raw: string): {
  platform: 'tiktok' | 'youtube'
  id: string
  url: string
  ytId: string | null
  nickname: string
} | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const ytShort = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i)
  if (ytShort) {
    const id = ytShort[1]
    return { platform: 'youtube', id, url: `https://www.youtube.com/shorts/${id}`, ytId: id, nickname: 'manual' }
  }

  const ytWatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/i)
  if (ytWatch) {
    const id = ytWatch[1]
    return { platform: 'youtube', id, url: `https://www.youtube.com/shorts/${id}`, ytId: id, nickname: 'manual' }
  }

  const ttMatch = trimmed.match(/tiktok\.com\/@([^/]+)\/video\/(\d+)/i)
  if (ttMatch) {
    const [, nickname, id] = ttMatch
    return { platform: 'tiktok', id, url: trimmed, ytId: null, nickname }
  }

  const ttId = trimmed.match(/tiktok\.com\/.*\/video\/(\d+)/i)
  if (ttId) {
    const id = ttId[1]
    return { platform: 'tiktok', id, url: trimmed, ytId: null, nickname: 'unknown' }
  }

  return null
}

const HOOK_PATTERNS = [
  { id: 'question', labelEn: 'Question hook', labelAr: 'سؤال', test: (t: string) => /[?؟]/.test(t) },
  { id: 'number', labelEn: 'Number / list', labelAr: 'أرقام وقوائم', test: (t: string) => /^[\d٠-٩]|\b\d+\s*(ways|طرق|أسباب|reasons)/i.test(t) },
  { id: 'warning', labelEn: 'Warning / stop', labelAr: 'تحذير', test: (t: string) => /لا تشتري|don't buy|stop buying|توقف|احذر/i.test(t) },
  { id: 'pov', labelEn: 'POV', labelAr: 'POV', test: (t: string) => /\bpov\b|وجهة نظر/i.test(t) },
  { id: 'before_after', labelEn: 'Before / After', labelAr: 'قبل وبعد', test: (t: string) => /before|after|قبل|بعد/i.test(t) },
  { id: 'secret', labelEn: 'Secret / hack', labelAr: 'سر / حيلة', test: (t: string) => /secret|سر|hack|حيلة|ترف/i.test(t) },
  { id: 'free', labelEn: 'Free / shipping', labelAr: 'مجاني / شحن', test: (t: string) => /free|مجان|شحن مجاني|توصيل مجاني/i.test(t) },
  { id: 'review', labelEn: 'Review / honest', labelAr: 'مراجعة صادقة', test: (t: string) => /review|مراجعة|صادق|honest|جربت/i.test(t) },
]

export function detectWinningPatterns(titles: string[], lang: 'ar' | 'en') {
  return HOOK_PATTERNS.map(pattern => {
    const matches = titles.filter(t => pattern.test(t))
    return {
      ...pattern,
      label: lang === 'ar' ? pattern.labelAr : pattern.labelEn,
      count: matches.length,
      examples: matches.slice(0, 2),
    }
  }).filter(p => p.count > 0).sort((a, b) => b.count - a.count)
}
