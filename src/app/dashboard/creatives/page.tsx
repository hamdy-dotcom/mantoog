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
  return '#8b8fa8'
}

function videoKey(v: CreativeVideo) {
  return `${v.platform}-${v.id}`
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
    return {
      total: videos.length,
      tiktok,
      youtube,
      totalViews,
      saved: savedIds.size,
    }
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
      v.views,
      v.likes,
      v.comments,
      v.score,
      v.url,
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
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className={DASHBOARD_MAIN_CLASS}>
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              <span>🎬</span>
              {tr.creatives}
            </h1>
            <p className="text-[#8b8fa8] text-sm mt-1">{tr.creativesSub}</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={videos.length === 0}
            className="w-full sm:w-auto text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            📥 {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          </button>
        </div>

        {/* Search panel */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 mb-5">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={lang === 'ar' ? 'https://amazon.eg/... أو كلمة مفتاحية' : 'https://amazon.eg/... or keyword'}
              className="w-full md:flex-1 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-full md:w-auto bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors shrink-0"
            >
              {searching
                ? (lang === 'ar' ? 'جاري البحث...' : 'Searching...')
                : (lang === 'ar' ? '🔍 بحث' : '🔍 Search')}
            </button>
          </div>
        </div>

        {showManualBox && (
          <div className="bg-[rgba(224,177,94,.08)] border border-[rgba(224,177,94,.3)] rounded-xl p-4 mb-4">
            <div className="text-sm font-bold text-[#e0b15e] mb-1">
              {lang === 'ar' ? '⚠ لم نتمكن من استخراج اسم المنتج تلقائياً' : '⚠ Could not extract product name automatically'}
            </div>
            <div className="text-xs text-[#8b8fa8] mb-3">
              {lang === 'ar'
                ? 'اكتب اسم المنتج أو الكلمة المفتاحية بالعربي للبحث عنه'
                : 'Type the product name or Arabic keyword to search'}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={manualKw}
                onChange={e => setManualKw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmManual()}
                placeholder={lang === 'ar' ? 'مثال: مضخة غسيل السيارات' : 'e.g. car wash pump'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="w-full sm:flex-1 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]"
              />
              <button
                onClick={confirmManual}
                disabled={searching || !manualKw.trim()}
                className="w-full sm:w-auto bg-[#e0b15e] text-[#1a1305] rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-60 shrink-0"
              >
                {lang === 'ar' ? 'بحث ←' : 'Search →'}
              </button>
            </div>
          </div>
        )}

        {steps.length > 0 && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 mb-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 py-1.5 text-xs sm:text-sm break-words border-b border-[#2a2d35] last:border-0 ${step.done ? 'text-white' : 'text-[#8b8fa8]'}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${step.done ? 'bg-[#4ade80]' : 'bg-[#fbbf24] animate-pulse'}`} />
                <span className="min-w-0 break-words">{step.text}</span>
              </div>
            ))}
          </div>
        )}

        {searchError && (
          <div className="bg-[#3a1414] border border-[#f87171]/30 rounded-xl px-4 py-3 mb-4 text-[#f87171] text-sm">
            {searchError}
          </div>
        )}

        {/* Stats row */}
        {hasSearched && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {[
              { label: lang === 'ar' ? 'إجمالي الفيديوهات' : 'Total videos', value: stats.total },
              { label: 'TikTok', value: stats.tiktok, color: 'text-white' },
              { label: 'YouTube Shorts', value: stats.youtube, color: 'text-[#f87171]' },
              { label: lang === 'ar' ? 'إجمالي المشاهدات' : 'Total views', value: fmtN(stats.totalViews), color: 'text-[#60a5fa]' },
              { label: lang === 'ar' ? 'محفوظ' : 'Saved', value: stats.saved, color: 'text-[#4ade80]' },
            ].map((s, i) => (
              <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4">
                <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`text-2xl font-semibold ${s.color || 'text-white'}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters + sort */}
        {hasSearched && videos.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center mb-5">
            <div className="flex w-full md:w-auto gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-x-auto">
              {(['all', 'tiktok', 'youtube'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPlatformFilter(f)}
                  className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize whitespace-nowrap ${
                    platformFilter === f ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'
                  }`}
                >
                  {f === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : f === 'tiktok' ? 'TikTok' : 'YouTube Shorts'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-[#4a4e60]">{lang === 'ar' ? 'ترتيب:' : 'Sort:'}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="w-full sm:w-auto bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="engagement">{lang === 'ar' ? 'التفاعل' : 'Engagement'}</option>
                <option value="views">{lang === 'ar' ? 'المشاهدات' : 'Views'}</option>
                <option value="likes">{lang === 'ar' ? 'الإعجابات' : 'Likes'}</option>
              </select>
            </div>
          </div>
        )}

        {/* Winning patterns */}
        {winningPatterns.length > 0 && (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4 mb-5">
            <h2 className="text-sm font-semibold text-white mb-3">
              {lang === 'ar' ? '🏆 أنماط الهوك الرابحة' : '🏆 Winning hook patterns'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {winningPatterns.map(p => (
                <div
                  key={p.id}
                  className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs min-w-0"
                  title={p.examples.join(' · ')}
                >
                  <span className="text-[#fbbf24] font-semibold">{p.label}</span>
                  <span className="text-[#4a4e60] mx-1">·</span>
                  <span className="text-[#8b8fa8]">{p.count} {lang === 'ar' ? 'فيديو' : 'videos'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results grid */}
        {!hasSearched ? (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🎬</div>
            <h2 className="text-white font-medium text-lg mb-2">
              {lang === 'ar' ? 'ابحث عن كريتيفز منتجاتك' : 'Search for product creatives'}
            </h2>
            <p className="text-[#8b8fa8] text-sm max-w-md mx-auto">
              {lang === 'ar'
                ? 'الصق رابط منتج Amazon أو اكتب كلمة مفتاحية عربية للبحث في TikTok و YouTube Shorts'
                : 'Paste an Amazon product URL or type an Arabic keyword to search TikTok & YouTube Shorts'}
            </p>
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-white font-medium text-lg mb-2">
              {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
            </h2>
            <p className="text-[#8b8fa8] text-sm">
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

              return (
                <div
                  key={key}
                  className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="relative cursor-pointer" onClick={() => handleThumbnailClick(v)}>
                    {isExpanded ? (
                      <div className="relative w-full h-48 overflow-hidden bg-[#0a0c10] rounded-t-xl">
                        <iframe
                          src={`https://www.youtube.com/embed/${v.ytId}?autoplay=1`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={v.title}
                        />
                      </div>
                    ) : (
                      <div className="relative w-full h-48 overflow-hidden bg-[#0a0c10] rounded-t-xl">
                        {v.thumb ? (
                          <img src={v.thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-[#4a4e60]">
                            {v.platform === 'tiktok' ? '♪' : '▶'}
                          </div>
                        )}
                        <span className="absolute top-2 left-2 text-[9px] bg-black/80 text-[#8b8fa8] px-1.5 py-0.5 rounded-full">
                          #{rank}
                        </span>
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/80 text-white">
                          {v.platform === 'tiktok' ? '♪ TT' : '▶ YT'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-1.5">
                    <div className="text-xs font-bold text-[#3b82f6] truncate">@{v.nickname}</div>
                    <div className="text-xs font-semibold text-white leading-snug line-clamp-2">{v.title}</div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-black" style={{ color: scoreColor(v.score) }}>{v.score}</span>
                      <div className="flex-1 h-1 bg-[#2a2d35] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${v.score}%`, background: scoreColor(v.score) }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 text-[10px] text-[#4a4e60]">
                      {v.views > 0 && <span>▶ {fmtN(v.views)}</span>}
                      {v.likes > 0 && <span>♥ {fmtN(v.likes)}</span>}
                    </div>

                    <div className="flex gap-2 mt-1 pt-2 border-t border-[#2a2d35]">
                      <button
                        type="button"
                        onClick={() => toggleSave(v)}
                        className={`text-[10px] px-2 py-1 border rounded-md transition-colors ${
                          saved
                            ? 'border-[#4ade80]/40 text-[#4ade80]'
                            : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'
                        }`}
                      >
                        {saved ? '★' : '☆'}
                      </button>
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#3b82f6] mr-auto self-center hover:text-white transition-colors"
                      >
                        {lang === 'ar' ? 'فتح ↗' : 'Open ↗'}
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
