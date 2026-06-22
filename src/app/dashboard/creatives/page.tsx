'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { loadMerchantStore } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { detectWinningPatterns, extractKeyword } from '@/lib/creatives/keyword'

type Platform = 'tiktok' | 'youtube'
type PlatformFilter = 'all' | Platform
type SortBy = 'engagement' | 'views' | 'likes'

type CreativeVideo = {
  id: string
  platform: Platform
  title: string
  channel: string
  nickname: string
  thumb: string
  views: number
  likes: number
  comments: number
  shares: number
  score: number
  url: string
  ytId: string | null
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function scoreColor(score: number): string {
  if (score >= 70) return '#4ade80'
  if (score >= 40) return '#fbbf24'
  return '#f87171'
}

function videoKey(v: CreativeVideo) {
  return `${v.platform}-${v.id}`
}

/* ── SVG Icons ── */
function IconFilm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
      <line x1="7" y1="2" x2="7" y2="22"/>
      <line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="2" y1="7" x2="7" y2="7"/>
      <line x1="2" y1="17" x2="7" y2="17"/>
      <line x1="17" y1="17" x2="22" y2="17"/>
      <line x1="17" y1="7" x2="22" y2="7"/>
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.79 1.53V6.76a4.85 4.85 0 0 1-1.03-.07z"/>
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
    </svg>
  )
}

function IconStar({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function IconExternalLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="8 21 12 17 16 21"/>
      <line x1="12" y1="17" x2="12" y2="11"/>
      <path d="M7 4H4a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4"/>
      <path d="M17 4h3a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4"/>
      <rect x="5" y="2" width="14" height="10" rx="2"/>
    </svg>
  )
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.6)"/>
      <polygon points="10 8 16 12 10 16 10 8" fill="white"/>
    </svg>
  )
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export default function CreativesPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const router = useRouter()
  const supabase = createClient()

  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [videos, setVideos] = useState<CreativeVideo[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('engagement')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [showManualBox, setShowManualBox] = useState(false)
  const [manualKw, setManualKw] = useState('')
  const [steps, setSteps] = useState<{ text: string; done: boolean }[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [expandedYtId, setExpandedYtId] = useState<string | null>(null)

  const addStep = (text: string, done = false) => {
    setSteps(prev => {
      const updated = prev.map((s, i) => (i === prev.length - 1 ? { ...s, done: true } : s))
      return [...updated, { text, done }]
    })
  }

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      setStore(ctx.store)
      setLoading(false)
    }
    init()
  }, [])

  const runSearch = async (keyword: string) => {
    const q = keyword.trim()
    if (!q) return

    setSearching(true)
    setSearchError('')
    setShowManualBox(false)
    setExpandedYtId(null)
    setSteps([])

    const results: CreativeVideo[] = []
    const errors: string[] = []

    addStep(lang === 'ar' ? `البحث عن: ${q}` : `Searching for: ${q}`)

    addStep(lang === 'ar' ? 'جاري البحث في TikTok...' : 'Searching TikTok...')
    let ttCount = 0
    try {
      const ttRes = await fetch(`/api/creatives/tiktok?q=${encodeURIComponent(q)}`)
      const ttData = await ttRes.json()
      if (ttRes.ok && Array.isArray(ttData.videos)) {
        results.push(...ttData.videos)
        ttCount = ttData.videos.length
      } else if (ttData.error) {
        errors.push(`TikTok: ${ttData.error}`)
      }
    } catch {
      errors.push(lang === 'ar' ? 'فشل بحث TikTok' : 'TikTok search failed')
    }
    addStep(
      ttCount > 0
        ? (lang === 'ar' ? `TikTok: ${ttCount} فيديو` : `TikTok: ${ttCount} videos`)
        : (lang === 'ar' ? 'TikTok: لا نتائج' : 'TikTok: no results')
    )

    addStep(lang === 'ar' ? 'جاري البحث في YouTube Shorts...' : 'Searching YouTube Shorts...')
    let ytCount = 0
    try {
      const ytRes = await fetch(`/api/creatives/youtube?q=${encodeURIComponent(q)}`)
      const ytData = await ytRes.json()
      if (ytRes.ok && Array.isArray(ytData.videos)) {
        results.push(...ytData.videos)
        ytCount = ytData.videos.length
      } else if (ytData.error) {
        errors.push(`YouTube: ${ytData.error}`)
      }
    } catch {
      errors.push(lang === 'ar' ? 'فشل بحث YouTube' : 'YouTube search failed')
    }
    addStep(
      ytCount > 0
        ? (lang === 'ar' ? `YouTube Shorts: ${ytCount} فيديو` : `YouTube Shorts: ${ytCount} videos`)
        : (lang === 'ar' ? 'YouTube Shorts: لا نتائج' : 'YouTube Shorts: no results')
    )

    addStep(
      lang === 'ar'
        ? `اكتمل — ${results.length} فيديو إجمالاً`
        : `Done — ${results.length} videos total`,
      true
    )

    setVideos(results)
    setHasSearched(true)
    setSearching(false)

    if (results.length === 0 && errors.length > 0) {
      setSearchError(errors.join(' · '))
    } else if (errors.length > 0) {
      setSearchError(errors.join(' · '))
    }
  }

  const handleSearch = async () => {
    const trimmed = searchInput.trim()
    if (!trimmed) {
      setSearchError(lang === 'ar' ? 'أدخل رابط منتج أو كلمة مفتاحية' : 'Enter a product URL or keyword')
      return
    }

    const keyword = await extractKeyword(searchInput)
    if (keyword === null) {
      if (/^https?:\/\//i.test(trimmed)) {
        setShowManualBox(true)
        setManualKw('')
        return
      }
      setSearchError(lang === 'ar' ? 'أدخل رابط منتج أو كلمة مفتاحية' : 'Enter a product URL or keyword')
      return
    }

    await runSearch(keyword)
  }

  const confirmManual = async () => {
    if (!manualKw.trim()) return
    setShowManualBox(false)
    await runSearch(manualKw.trim())
  }

  const toggleSave = (v: CreativeVideo) => {
    const key = videoKey(v)
    setSavedIds(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleThumbnailClick = (v: CreativeVideo) => {
    if (v.platform === 'youtube' && v.ytId) {
      setExpandedYtId(prev => (prev === v.ytId ? null : v.ytId))
      return
    }
    window.open(v.url, '_blank', 'noopener,noreferrer')
  }

  const sortedFiltered = useMemo(() => {
    let list = [...videos]
    if (platformFilter !== 'all') {
      list = list.filter(v => v.platform === platformFilter)
    }
    list.sort((a, b) => {
      if (sortBy === 'views') return b.views - a.views
      if (sortBy === 'likes') return b.likes - a.likes
      return b.score - a.score
    })
    return list
  }, [videos, platformFilter, sortBy])

  const stats = useMemo(() => {
    const tiktok = videos.filter(v => v.platform === 'tiktok').length
    const youtube = videos.filter(v => v.platform === 'youtube').length
    const totalViews = videos.reduce((s, v) => s + v.views, 0)
    return { total: videos.length, tiktok, youtube, totalViews, saved: savedIds.size }
  }, [videos, savedIds])

  const winningPatterns = useMemo(() => {
    if (!hasSearched || videos.length === 0) return []
    return detectWinningPatterns(videos.map(v => v.title), lang)
  }, [videos, hasSearched, lang])

  const exportCSV = () => {
    const savedVideos = videos.filter(v => savedIds.has(videoKey(v)))
    const exportList = savedVideos.length > 0 ? savedVideos : videos
    if (exportList.length === 0) return

    const headers = ['Platform', 'Title', 'Channel', 'Views', 'Likes', 'Comments', 'Score', 'URL']
    const rows = exportList.map(v => [
      v.platform,
      `"${v.title.replace(/"/g, '""')}"`,
      `"${v.channel.replace(/"/g, '""')}"`,
      v.views, v.likes, v.comments, v.score, v.url,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `creatives-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#3b82f6] border-t-transparent animate-spin" />
          <span className="text-[#4a4e60] text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
        </div>
      </div>
    )
  }

  const platformPatterns = [
    {
      id: 'all' as const,
      label: lang === 'ar' ? 'الكل' : 'All',
      count: videos.length,
      activeClass: 'bg-[#3b82f6] text-white',
    },
    {
      id: 'tiktok' as const,
      label: 'TikTok',
      count: stats.tiktok,
      icon: <IconTikTok />,
      activeClass: 'bg-[#e879f9]/20 text-[#e879f9] border border-[#e879f9]/30',
    },
    {
      id: 'youtube' as const,
      label: 'YouTube Shorts',
      count: stats.youtube,
      icon: <IconYouTube />,
      activeClass: 'bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className={DASHBOARD_MAIN_CLASS}>

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/25 flex items-center justify-center text-[#3b82f6] shrink-0">
              <IconFilm />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">{tr.creatives}</h1>
              <p className="text-[#4a4e60] text-xs mt-0.5">{tr.creativesSub}</p>
            </div>
          </div>
          <button
            onClick={exportCSV}
            disabled={videos.length === 0}
            className="shrink-0 flex items-center gap-2 text-xs bg-[#1a1d24] hover:bg-[#22252e] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <IconDownload />
            {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          </button>
        </div>

        {/* ── Search panel ── */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-[#4a4e60]">
                <IconSearch />
              </div>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={lang === 'ar' ? 'https://amazon.eg/... أو كلمة مفتاحية' : 'Paste a product URL or type a keyword…'}
                className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl ps-9 pe-4 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="sm:shrink-0 flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              {searching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {lang === 'ar' ? 'جاري البحث...' : 'Searching…'}
                </>
              ) : (
                <>
                  <IconSearch />
                  {lang === 'ar' ? 'بحث' : 'Search'}
                </>
              )}
            </button>
          </div>

          {/* platform hint tags */}
          <div className="flex gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[#e879f9] bg-[#e879f9]/10 border border-[#e879f9]/20 px-2 py-1 rounded-full">
              <IconTikTok /> TikTok
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20 px-2 py-1 rounded-full">
              <IconYouTube /> YouTube Shorts
            </span>
          </div>
        </div>

        {/* ── Manual keyword fallback ── */}
        {showManualBox && (
          <div className="bg-[#1a1305] border border-[#e0b15e]/30 rounded-2xl p-5 mb-5">
            <div className="text-sm font-semibold text-[#e0b15e] mb-1">
              {lang === 'ar' ? 'لم نتمكن من استخراج اسم المنتج تلقائياً' : 'Could not extract product name automatically'}
            </div>
            <div className="text-xs text-[#8b8fa8] mb-4">
              {lang === 'ar'
                ? 'اكتب اسم المنتج أو الكلمة المفتاحية للبحث عنه'
                : 'Type the product name or keyword to search'}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={manualKw}
                onChange={e => setManualKw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmManual()}
                placeholder={lang === 'ar' ? 'مثال: مضخة غسيل السيارات' : 'e.g. car wash pump'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="flex-1 bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#e0b15e]/60 transition-colors"
              />
              <button
                onClick={confirmManual}
                disabled={searching || !manualKw.trim()}
                className="sm:shrink-0 bg-[#e0b15e] text-[#1a1305] rounded-xl px-6 py-2.5 text-sm font-bold disabled:opacity-60 cursor-pointer transition-opacity"
              >
                {lang === 'ar' ? 'بحث ←' : 'Search →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Progress steps ── */}
        {steps.length > 0 && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-4 mb-5 space-y-0">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 text-xs border-b border-[#1f2229] last:border-0"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  step.done
                    ? 'bg-[#4ade80]/20 text-[#4ade80]'
                    : i === steps.length - 1
                      ? 'bg-[#3b82f6]/20 text-[#3b82f6]'
                      : 'bg-[#2a2d35] text-[#4a4e60]'
                }`}>
                  {step.done
                    ? <IconCheck />
                    : i === steps.length - 1
                      ? <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
                      : <div className="w-2 h-2 rounded-full bg-[#4a4e60]" />
                  }
                </div>
                <span className={step.done ? 'text-white' : i === steps.length - 1 ? 'text-[#3b82f6]' : 'text-[#4a4e60]'}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {searchError && (
          <div className="bg-[#3a1414] border border-[#f87171]/30 rounded-xl px-4 py-3 mb-5 text-[#f87171] text-sm">
            {searchError}
          </div>
        )}

        {/* ── Stats row ── */}
        {hasSearched && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {[
              {
                label: lang === 'ar' ? 'إجمالي الفيديوهات' : 'Total videos',
                value: stats.total,
                color: 'text-white',
                accent: '#3b82f6',
              },
              {
                label: 'TikTok',
                value: stats.tiktok,
                color: 'text-[#e879f9]',
                accent: '#e879f9',
              },
              {
                label: 'YouTube Shorts',
                value: stats.youtube,
                color: 'text-[#f87171]',
                accent: '#f87171',
              },
              {
                label: lang === 'ar' ? 'إجمالي المشاهدات' : 'Total views',
                value: fmtN(stats.totalViews),
                color: 'text-[#60a5fa]',
                accent: '#60a5fa',
              },
              {
                label: lang === 'ar' ? 'محفوظ' : 'Saved',
                value: stats.saved,
                color: 'text-[#4ade80]',
                accent: '#4ade80',
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 start-0 w-full h-0.5 rounded-t-xl"
                  style={{ background: s.accent }}
                />
                <div className="text-[10px] font-medium text-[#4a4e60] uppercase tracking-wider mb-2">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters + sort ── */}
        {hasSearched && videos.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-5">
            <div className="flex gap-1.5 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-x-auto shrink-0">
              {platformPatterns.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatformFilter(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    platformFilter === p.id
                      ? p.activeClass
                      : 'text-[#4a4e60] hover:text-[#8b8fa8]'
                  }`}
                >
                  {p.icon && <span>{p.icon}</span>}
                  {p.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${platformFilter === p.id ? 'bg-white/20' : 'bg-[#2a2d35]'}`}>
                    {p.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ms-auto">
              <span className="text-xs text-[#4a4e60]">{lang === 'ar' ? 'ترتيب:' : 'Sort:'}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3b82f6] cursor-pointer"
              >
                <option value="engagement">{lang === 'ar' ? 'التفاعل' : 'Engagement'}</option>
                <option value="views">{lang === 'ar' ? 'المشاهدات' : 'Views'}</option>
                <option value="likes">{lang === 'ar' ? 'الإعجابات' : 'Likes'}</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Winning patterns ── */}
        {winningPatterns.length > 0 && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[#fbbf24]"><IconTrophy /></span>
              <h2 className="text-sm font-semibold text-white">
                {lang === 'ar' ? 'أنماط الهوك الرابحة' : 'Winning hook patterns'}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {winningPatterns.map((p, i) => {
                const colors = [
                  { bg: 'bg-[#fbbf24]/10 border-[#fbbf24]/25 text-[#fbbf24]' },
                  { bg: 'bg-[#3b82f6]/10 border-[#3b82f6]/25 text-[#60a5fa]' },
                  { bg: 'bg-[#4ade80]/10 border-[#4ade80]/25 text-[#4ade80]' },
                  { bg: 'bg-[#e879f9]/10 border-[#e879f9]/25 text-[#e879f9]' },
                ]
                const c = colors[i % colors.length]
                return (
                  <div
                    key={p.id}
                    title={p.examples.join(' · ')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-default ${c.bg}`}
                  >
                    <span>{p.label}</span>
                    <span className="opacity-60">·</span>
                    <span className="opacity-80">{p.count} {lang === 'ar' ? 'فيديو' : 'videos'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Results grid / empty states ── */}
        {!hasSearched ? (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">
              {lang === 'ar' ? 'ابحث عن كريتيفز منتجاتك' : 'Find winning creatives for your product'}
            </h2>
            <p className="text-[#4a4e60] text-sm max-w-sm leading-relaxed">
              {lang === 'ar'
                ? 'الصق رابط منتج Amazon أو اكتب كلمة مفتاحية عربية للبحث في TikTok و YouTube Shorts'
                : 'Paste an Amazon product URL or type a keyword to search TikTok & YouTube Shorts for top-performing content'}
            </p>
            <div className="flex gap-3 mt-6">
              <div className="flex items-center gap-2 text-xs text-[#e879f9] bg-[#e879f9]/10 border border-[#e879f9]/20 px-3 py-1.5 rounded-full">
                <IconTikTok /> TikTok
              </div>
              <div className="flex items-center gap-2 text-xs text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20 px-3 py-1.5 rounded-full">
                <IconYouTube /> YouTube Shorts
              </div>
            </div>
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-16 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#2a2d35] flex items-center justify-center text-[#4a4e60] mb-4">
              <IconSearch />
            </div>
            <h2 className="text-white font-medium text-base mb-1">
              {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
            </h2>
            <p className="text-[#4a4e60] text-sm">
              {lang === 'ar' ? 'جرب كلمة مفتاحية مختلفة' : 'Try a different keyword'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {sortedFiltered.map((v, idx) => {
              const key = videoKey(v)
              const saved = savedIds.has(key)
              const isExpanded = v.ytId && expandedYtId === v.ytId
              const rank = idx + 1
              const isTikTok = v.platform === 'tiktok'
              const platformColor = isTikTok ? '#e879f9' : '#f87171'

              return (
                <div
                  key={key}
                  className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden flex flex-col group hover:border-[#3a3d48] transition-colors"
                >
                  {/* thumbnail */}
                  <div
                    className="relative cursor-pointer overflow-hidden"
                    style={{ aspectRatio: '9/16' }}
                    onClick={() => handleThumbnailClick(v)}
                  >
                    {isExpanded ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${v.ytId}?autoplay=1`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={v.title}
                      />
                    ) : (
                      <>
                        {v.thumb ? (
                          <img src={v.thumb} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0c10] text-[#4a4e60]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 opacity-30">
                              <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                            </svg>
                          </div>
                        )}
                        {/* overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        {/* play icon */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconPlay />
                        </div>
                        {/* rank badge */}
                        <div className="absolute top-2 start-2 bg-black/70 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          #{rank}
                        </div>
                        {/* platform badge */}
                        <div
                          className="absolute top-2 end-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm"
                          style={{ background: `${platformColor}25`, color: platformColor, border: `1px solid ${platformColor}40` }}
                        >
                          {isTikTok ? <IconTikTok /> : <IconYouTube />}
                          {isTikTok ? 'TT' : 'YT'}
                        </div>
                        {/* score pill at bottom of thumbnail */}
                        <div className="absolute bottom-2 start-2 end-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-xs font-black"
                              style={{ color: scoreColor(v.score) }}
                            >
                              {v.score}
                            </span>
                            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${v.score}%`, background: scoreColor(v.score) }}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* card body */}
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div className="text-[10px] font-semibold truncate" style={{ color: platformColor }}>
                      @{v.nickname}
                    </div>
                    <div className="text-xs font-medium text-[#c4c8d4] leading-snug line-clamp-2 flex-1">
                      {v.title}
                    </div>

                    {/* stats */}
                    <div className="flex gap-3 text-[10px] text-[#4a4e60] mt-auto">
                      {v.views > 0 && (
                        <span className="flex items-center gap-1">
                          <IconEye /> {fmtN(v.views)}
                        </span>
                      )}
                      {v.likes > 0 && (
                        <span className="flex items-center gap-1">
                          <IconHeart /> {fmtN(v.likes)}
                        </span>
                      )}
                    </div>

                    {/* actions */}
                    <div className="flex gap-2 pt-2 border-t border-[#2a2d35]">
                      <button
                        type="button"
                        onClick={() => toggleSave(v)}
                        className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all cursor-pointer ${
                          saved
                            ? 'border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10'
                            : 'border-[#2a2d35] text-[#4a4e60] hover:border-[#3b82f6] hover:text-[#3b82f6]'
                        }`}
                        title={saved ? (lang === 'ar' ? 'إزالة' : 'Unsave') : (lang === 'ar' ? 'حفظ' : 'Save')}
                      >
                        <IconStar filled={saved} />
                      </button>
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] text-[#4a4e60] hover:text-white border border-[#2a2d35] hover:border-[#3a3d48] rounded-lg px-2 py-1.5 transition-colors"
                      >
                        {lang === 'ar' ? 'فتح' : 'Open'} <IconExternalLink />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
