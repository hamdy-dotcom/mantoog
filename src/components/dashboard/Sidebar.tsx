'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { useTheme } from '@/lib/ThemeContext'

/* ─── icons ──────────────────────────────────────────────────────────── */
type IP = { className?: string }
const I = {
  Home:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Box:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Cart:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  Trophy: (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  Play:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>,
  TikTok: (p: IP) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className}><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07Z"/></svg>,
  Card:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect width="22" height="16" x="1" y="4" rx="2"/><line x1="1" x2="23" y1="10" y2="10"/></svg>,
  Gear:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Logout: (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  Store:  (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a3 3 0 0 0-6 0v4"/><path d="M2 7h20"/></svg>,
  Plus:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 5v14M5 12h14"/></svg>,
  Bolt:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>,
  Admin:  (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
}

/* ─── nav groups ─────────────────────────────────────────────────────── */
type NavEntry = {
  path: string
  iconKey: keyof typeof I
  ar: string
  en: string
  accent?: string
  exactMatch?: boolean
}

const NAV_GROUPS: { ar: string; en: string; items: NavEntry[] }[] = [
  {
    ar: 'القائمة', en: 'Menu',
    items: [
      { path: '/dashboard',                   iconKey: 'Home',   ar: 'الرئيسية',                 en: 'Dashboard',            exactMatch: true },
      { path: '/dashboard/products',          iconKey: 'Box',    ar: 'المنتجات',                 en: 'Products' },
      { path: '/dashboard/orders',            iconKey: 'Cart',   ar: 'الطلبات',                 en: 'Orders' },
      { path: '/dashboard/products/research', iconKey: 'Trophy', ar: 'أبحث عن منتج',            en: 'Find a Product' },
      { path: '/dashboard/creatives',         iconKey: 'Play',   ar: 'ابحث عن فيديو لمنتج',    en: 'Search for a Creative' },
    ],
  },
  {
    ar: 'الإعلانات', en: 'Ads',
    items: [
      { path: '/dashboard/tiktok', iconKey: 'TikTok', ar: 'إدارة إعلانات TikTok', en: 'TikTok Ads', accent: '#ee1d52' },
    ],
  },
  {
    ar: 'الإدارة', en: 'Account',
    items: [
      { path: '/dashboard/billing',  iconKey: 'Card', ar: 'الفواتير',   en: 'Billing' },
      { path: '/dashboard/settings', iconKey: 'Gear', ar: 'الإعدادات', en: 'Settings' },
    ],
  },
]

const MOBILE_NAV: NavEntry[] = [
  { path: '/dashboard',          iconKey: 'Home',   ar: 'الرئيسية', en: 'Dashboard', exactMatch: true },
  { path: '/dashboard/products', iconKey: 'Box',    ar: 'المنتجات', en: 'Products' },
  { path: '/dashboard/orders',   iconKey: 'Cart',   ar: 'الطلبات', en: 'Orders' },
  { path: '/dashboard/tiktok',   iconKey: 'TikTok', ar: 'TikTok',   en: 'TikTok', accent: '#ee1d52' },
  { path: '/dashboard/settings', iconKey: 'Gear',   ar: 'المزيد',  en: 'More' },
]

/* ─── component ──────────────────────────────────────────────────────── */
export default function Sidebar({ store }: { store: any; credits?: any }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { lang, setLang, dir } = useLang()
  const { theme, toggleTheme } = useTheme()
  const [isAdmin, setIsAdmin]   = useState(false)
  const [userName, setUserName] = useState('')
  const [credits, setCredits]   = useState<{ credits_remaining: number; credits_total: number } | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ADMIN_EMAILS = ['admin@mantoog.com']
      if (ADMIN_EMAILS.includes(user.email || '')) setIsAdmin(true)
      setUserName(
        user.user_metadata?.full_name?.split(' ')[0]
        || user.email?.split('@')[0]
        || ''
      )
      const { data: rows } = await supabase
        .from('order_credits')
        .select('credits_remaining, credits_total')
        .eq('merchant_id', user.id)
      if (rows && rows.length > 0) {
        setCredits({
          credits_remaining: rows.reduce((s, r) => s + (r.credits_remaining ?? 0), 0),
          credits_total:     rows.reduce((s, r) => s + (r.credits_total     ?? 0), 0),
        })
      }
    }
    init()
  }, [])

  const isActive = (entry: NavEntry) =>
    entry.exactMatch
      ? pathname === entry.path
      : pathname === entry.path || pathname.startsWith(entry.path + '/')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const creditsRemaining = credits?.credits_remaining ?? 0
  const creditsTotal     = credits?.credits_total ?? 2000
  const creditsPct       = Math.min(100, creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0)
  const storeInitial     = store?.name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <>
      {/* ── Mobile Top Header ──────────────────────────────────────────── */}
      <div
        dir={dir}
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0f14] border-b border-[#1c1f28] px-3 pb-2 flex items-center justify-between gap-2 h-[calc(var(--dashboard-mobile-header-height)+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)]"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center shrink-0">
            <img src="/logo.svg" alt="Mantoog" className="w-4 h-4 object-contain" />
          </div>
          <span className="text-white text-sm font-bold truncate">{store?.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="text-[11px] border border-[#1c1f28] text-[#525669] hover:text-white hover:border-[#2a2d3a] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <a
            href={`/${store?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] bg-[#1a2744] hover:bg-[#1e3a5f] text-[#60a5fa] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            🏪
          </a>
          <button
            onClick={handleLogout}
            className="text-[11px] bg-[#2a1414] hover:bg-[#3a1a1a] text-[#f87171] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {lang === 'ar' ? 'خروج' : 'Out'}
          </button>
        </div>
      </div>

      {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
      <aside
        dir={dir}
        className={`relative hidden md:flex flex-col bg-[#0d0f14] h-screen w-[220px] min-h-screen sticky top-0 overflow-hidden shrink-0 ${
          dir === 'rtl' ? 'border-l' : 'border-r'
        } border-[#1c1f28]`}
      >
        {/* Top ambient glow */}
        <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-[#1a2744]/40 to-transparent pointer-events-none z-0" />

        {/* Brand */}
        <div className="relative z-10 px-4 pt-5 pb-3 flex items-center gap-3">
          <div className="relative w-8 h-8 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] blur-[6px] opacity-50" />
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center shadow-lg">
              <img src="/logo.svg" alt="Mantoog" className="w-5 h-5 object-contain" />
            </div>
          </div>
          <span className="font-bold text-white text-[15px] tracking-tight">منتوج</span>
        </div>

        {/* Store card */}
        <div className="relative z-10 mx-3 mb-3">
          <div className="bg-[#13161d] border border-[#1c1f28] hover:border-[#2a2d3a] rounded-2xl p-3 transition-colors group">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center shadow-md">
                  <span className="text-sm font-bold text-white">{storeInitial}</span>
                </div>
                <div className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] border-2 border-[#0d0f14]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">{store?.name ?? '—'}</div>
                <div className="text-[10px] text-[#3a3d4a] flex items-center gap-1">
                  <span className="text-[#4ade80] text-[8px]">●</span>
                  {store?.currency ?? ''} · {lang === 'ar' ? 'نشط' : 'Active'}
                </div>
              </div>
            </div>
            <a
              href={`/${store?.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#0d0f14] border border-[#1c1f28] group-hover:border-[#2a2d3a] text-[#4a4e60] hover:text-[#60a5fa] hover:border-[#3b82f6]/30 text-[11px] font-medium transition-all"
            >
              <I.Store className="w-3 h-3" />
              {lang === 'ar' ? 'عرض المتجر' : 'View store'} ↗
            </a>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-2.5 space-y-3 pb-2">
          {NAV_GROUPS.map(group => (
            <div key={group.ar}>
              <div className="flex items-center gap-2 px-2 mb-1">
                <span className="text-[9px] font-bold text-[#2a2d3a] uppercase tracking-[0.12em] whitespace-nowrap">
                  {lang === 'ar' ? group.ar : group.en}
                </span>
                <div className="flex-1 h-px bg-[#1c1f28]" />
              </div>
              <div className="space-y-0.5">
                {group.items.map(entry => {
                  const active = isActive(entry)
                  const accent = entry.accent ?? '#3b82f6'
                  const Icon   = I[entry.iconKey]
                  return (
                    <button
                      key={entry.path}
                      onClick={() => router.push(entry.path)}
                      className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all overflow-hidden group/nav ${
                        active
                          ? 'text-white'
                          : 'text-[#525669] hover:text-[#c0c4d8] hover:bg-[#13161d] active:scale-[0.98]'
                      }`}
                    >
                      {/* Active bg */}
                      {active && (
                        <div
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: `linear-gradient(135deg, ${accent}22 0%, ${accent}0e 100%)`,
                            [dir === 'rtl' ? 'borderRight' : 'borderLeft']: `2px solid ${accent}90`,
                          }}
                        />
                      )}
                      {/* Hover bg (inactive) */}
                      {!active && (
                        <div className="absolute inset-0 rounded-xl bg-[#13161d] opacity-0 group-hover/nav:opacity-100 transition-opacity" />
                      )}
                      {/* Icon */}
                      <span
                        className="relative shrink-0 w-[18px] h-[18px] transition-colors"
                        style={{ color: active ? accent : undefined }}
                      >
                        <Icon className="w-full h-full" />
                      </span>
                      {/* Label */}
                      <span className="relative flex-1 text-start leading-tight">
                        {lang === 'ar' ? entry.ar : entry.en}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Admin item */}
          {isAdmin && (
            <div>
              <div className="flex items-center gap-2 px-2 mb-1">
                <span className="text-[9px] font-bold text-[#2a2d3a] uppercase tracking-[0.12em]">Admin</span>
                <div className="flex-1 h-px bg-[#1c1f28]" />
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#525669] hover:text-[#c0c4d8] hover:bg-[#13161d] transition-all active:scale-[0.98] overflow-hidden group/nav"
              >
                <div className="absolute inset-0 rounded-xl bg-[#13161d] opacity-0 group-hover/nav:opacity-100 transition-opacity" />
                <span className="relative shrink-0 w-[18px] h-[18px]"><I.Admin className="w-full h-full" /></span>
                <span className="relative flex-1 text-start leading-tight">Admin</span>
              </button>
            </div>
          )}
        </nav>

        {/* Credits widget */}
        <div className="relative z-10 mx-2.5 mb-2.5">
          <div className="bg-[#13161d] border border-[#1c1f28] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <I.Bolt className="w-3 h-3 text-[#fbbf24] shrink-0" />
                <span className="text-[10px] text-[#525669] font-medium">
                  {lang === 'ar' ? 'رصيد الطلبات' : 'Order credits'}
                </span>
              </div>
              <span className={`text-[11px] font-bold ${creditsRemaining <= 20 ? 'text-[#f87171]' : 'text-white'}`}>
                {creditsRemaining.toLocaleString()}
              </span>
            </div>
            <div className="text-[9px] text-[#3a3d4a] mb-1.5 text-end">
              {lang === 'ar'
                ? `من ${creditsTotal.toLocaleString()} إجمالي`
                : `of ${creditsTotal.toLocaleString()} total`}
            </div>
            {/* Segmented bar — filled segments reflect actual remaining/total */}
            <div className="flex gap-0.5 mb-2.5">
              {Array.from({ length: 20 }, (_, i) => {
                const threshold = (i + 1) / 20
                const filled = creditsTotal > 0 && (creditsRemaining / creditsTotal) >= threshold - 0.04 / 20
                return (
                  <div
                    key={i}
                    className="flex-1 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      background: filled
                        ? creditsRemaining <= 20
                          ? '#f87171'
                          : i < 13 ? '#3b82f6' : i < 17 ? '#7c5cff' : '#a855f7'
                        : '#1c1f28',
                    }}
                  />
                )
              })}
            </div>
            <button
              onClick={() => router.push('/dashboard/billing')}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#1a2744] hover:from-[#2a4a70] hover:to-[#243358] active:from-[#1a3050] border border-[#3b82f6]/20 hover:border-[#3b82f6]/40 text-[#60a5fa] text-[11px] font-semibold transition-all active:scale-[0.98]"
            >
              <I.Plus className="w-3 h-3" />
              {lang === 'ar' ? 'شراء رصيد' : 'Buy credits'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 border-t border-[#1c1f28] px-2.5 pt-2.5 pb-3 space-y-2">
          {/* Language toggle */}
          <div className="flex gap-1 p-0.5 bg-[#13161d] rounded-xl border border-[#1c1f28]">
            {(['ar', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-all ${
                  lang === l
                    ? 'bg-[#1c2a40] text-[#60a5fa] border border-[#2a3d5a] shadow-sm'
                    : 'text-[#3a3d4a] hover:text-[#525669]'
                }`}
              >
                {l === 'ar' ? 'العربية' : 'English'}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-[#13161d] border border-[#1c1f28] hover:border-[#2a2d3a] transition-colors"
          >
            <span className="text-[11px] text-[#525669] font-medium">
              {lang === 'ar'
                ? (theme === 'light' ? '☀️ النهار' : '🌙 الليل')
                : (theme === 'light' ? '☀️ Light' : '🌙 Dark')}
            </span>
            <div
              className="w-8 h-[18px] rounded-full relative transition-colors duration-200"
              style={{ backgroundColor: theme === 'light' ? '#fbbf24' : '#2a2d35' }}
            >
              <div
                className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-200"
                style={{ left: theme === 'dark' ? '2px' : 'calc(100% - 16px)' }}
              />
            </div>
          </button>

          {/* User row */}
          <div className="flex items-center gap-2 px-1 group/user">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1c2a40] to-[#1a1f2e] border border-[#2a2d3a] flex items-center justify-center shrink-0 transition-colors group-hover/user:border-[#3b82f6]/30">
              <span className="text-[11px] font-bold text-[#60a5fa]">
                {userName?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-[#6b7280] truncate group-hover/user:text-[#8b8fa8] transition-colors">
                {userName || store?.name || '—'}
              </div>
              <div className="text-[9px] text-[#2a2d3a]">
                {lang === 'ar' ? 'تاجر' : 'Merchant'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#2a2d3a] hover:text-[#f87171] transition-colors p-1.5 rounded-lg hover:bg-[#1f2229] active:scale-90 shrink-0"
              title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            >
              <I.Logout className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation ───────────────────────────────────── */}
      <nav
        dir={dir}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d0f14] border-t border-[#1c1f28] pb-[env(safe-area-inset-bottom,0px)]"
        aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
      >
        <div className="flex items-stretch px-1 py-2 gap-0.5">
          {MOBILE_NAV.map(entry => {
            const active = isActive(entry)
            const accent = entry.accent ?? '#3b82f6'
            const Icon   = I[entry.iconKey]
            return (
              <button
                key={entry.path}
                type="button"
                onClick={() => router.push(entry.path)}
                className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[3.5rem] flex-1 active:scale-90"
                style={{ color: active ? accent : '#3a3d4a' }}
              >
                <span className="w-5 h-5 shrink-0">
                  <Icon className="w-full h-full" />
                </span>
                <span className="text-[9px] leading-tight text-center line-clamp-2 w-full font-medium">
                  {lang === 'ar' ? entry.ar : entry.en}
                </span>
                {active && (
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ background: accent }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
