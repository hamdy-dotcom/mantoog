'use client'

import { useState } from 'react'

/* ─── icons ─────────────────────────────── */
type IP = { className?: string }
const I = {
  Home:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Box:     (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Cart:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  Trophy:  (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  Search:  (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Play:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>,
  TikTok:  (p: IP) => <svg viewBox="0 0 24 24" fill="currentColor" className={p.className}><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07Z"/></svg>,
  Card:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect width="22" height="16" x="1" y="4" rx="2"/><line x1="1" x2="23" y1="10" y2="10"/></svg>,
  Gear:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Logout:  (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  Store:   (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a3 3 0 0 0-6 0v4"/><path d="M2 7h20"/></svg>,
  Plus:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 5v14M5 12h14"/></svg>,
  Bolt:    (p: IP) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>,
}

/* ─── nav structure ──────────────────────── */
type NavKey = 'dashboard' | 'products' | 'orders' | 'research' | 'creatives' | 'tiktok' | 'billing' | 'settings'

type NavItem = {
  key: NavKey
  icon: keyof typeof I
  ar: string
  en: string
  badge?: number
  accent?: string
}

const NAV_GROUPS: { label: { ar: string; en: string }; items: NavItem[] }[] = [
  {
    label: { ar: 'القائمة', en: 'Menu' },
    items: [
      { key: 'dashboard',  icon: 'Home',   ar: 'الرئيسية',                  en: 'Dashboard' },
      { key: 'products',   icon: 'Box',    ar: 'المنتجات',                  en: 'Products' },
      { key: 'orders',     icon: 'Cart',   ar: 'الطلبات',                  en: 'Orders',              badge: 3 },
      { key: 'research',   icon: 'Trophy', ar: 'أبحث عن منتج',             en: 'Find a Product' },
      { key: 'creatives',  icon: 'Play',   ar: 'ابحث عن فيديو لمنتج',     en: 'Search for a Creative' },
    ],
  },
  {
    label: { ar: 'الإعلانات', en: 'Ads' },
    items: [
      { key: 'tiktok', icon: 'TikTok', ar: 'إدارة إعلانات TikTok', en: 'TikTok Ads', accent: '#ee1d52' },
    ],
  },
  {
    label: { ar: 'الإدارة', en: 'Account' },
    items: [
      { key: 'billing',  icon: 'Card', ar: 'الفواتير',   en: 'Billing' },
      { key: 'settings', icon: 'Gear', ar: 'الإعدادات', en: 'Settings' },
    ],
  },
]

const CREDITS = 91
const CREDITS_TOTAL = 2000

/* ─── sidebar ────────────────────────────── */
function DemoSidebar({
  lang,
  active,
  onNav,
  onLangToggle,
}: {
  lang: 'ar' | 'en'
  active: NavKey
  onNav: (k: NavKey) => void
  onLangToggle: () => void
}) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const creditsPct = Math.min(100, (CREDITS / CREDITS_TOTAL) * 100)

  return (
    <aside
      dir={dir}
      className={`relative flex flex-col bg-[#0d0f14] h-screen w-[220px] shrink-0 overflow-hidden ${
        dir === 'rtl' ? 'border-l' : 'border-r'
      } border-[#1c1f28]`}
    >
      {/* Subtle top glow */}
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-[#1a2744]/40 to-transparent pointer-events-none" />

      {/* Brand header */}
      <div className="relative px-4 pt-5 pb-3 flex items-center gap-3">
        <div className="relative w-8 h-8 shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] blur-[6px] opacity-60" />
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center shadow-lg">
            <img src="/logo.svg" alt="" className="w-5 h-5 object-contain" />
          </div>
        </div>
        <span className="font-bold text-white text-[15px] tracking-tight">منتوج</span>
      </div>

      {/* Store card */}
      <div className="relative mx-3 mb-3">
        <div className="bg-[#13161d] border border-[#1c1f28] rounded-2xl p-3 hover:border-[#2a2d3a] transition-colors group">
          <div className="flex items-center gap-2.5 mb-2.5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center">
                <span className="text-sm font-bold text-white">H</span>
              </div>
              <div className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] border-2 border-[#0d0f14]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">Hamdiano</div>
              <div className="text-[10px] text-[#3a3d4a] flex items-center gap-1">
                <span className="text-[#4ade80] text-[8px]">●</span> SAR · نشط
              </div>
            </div>
          </div>
          <a
            href="#"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#0d0f14] border border-[#1c1f28] group-hover:border-[#2a2d3a] text-[#4a4e60] hover:text-[#60a5fa] text-[11px] font-medium transition-all"
          >
            <I.Store className="w-3 h-3" />
            {lang === 'ar' ? 'عرض المتجر' : 'View store'} ↗
          </a>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto px-2.5 space-y-3 pb-2">
        {NAV_GROUPS.map(group => (
          <div key={group.label.ar}>
            {/* Section label */}
            <div className={`flex items-center gap-2 px-2 mb-1`}>
              <span className="text-[9px] font-bold text-[#2a2d3a] uppercase tracking-[0.12em]">
                {lang === 'ar' ? group.label.ar : group.label.en}
              </span>
              <div className="flex-1 h-px bg-[#1c1f28]" />
            </div>

            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = I[item.icon]
                const isActive = active === item.key
                const accentColor = item.accent ?? '#3b82f6'

                return (
                  <button
                    key={item.key}
                    onClick={() => onNav(item.key)}
                    className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all group/item overflow-hidden ${
                      isActive ? 'text-white' : 'text-[#525669] hover:text-[#c0c4d8] hover:bg-[#13161d]'
                    }`}
                  >
                    {/* Active background */}
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-xl opacity-100"
                        style={{
                          background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}10 100%)`,
                          borderLeft: `2px solid ${accentColor}80`,
                        }}
                      />
                    )}

                    {/* Icon */}
                    <span
                      className="relative shrink-0 w-[18px] h-[18px] transition-all"
                      style={{ color: isActive ? accentColor : undefined }}
                    >
                      <Icon className="w-full h-full" />
                    </span>

                    {/* Label */}
                    <span className="relative flex-1 text-start leading-tight">
                      {lang === 'ar' ? item.ar : item.en}
                    </span>

                    {/* Badge */}
                    {item.badge && (
                      <span className="relative shrink-0 text-[9px] font-bold bg-[#3b82f6] text-white rounded-full px-1.5 py-0.5 leading-none">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Credits widget */}
      <div className="relative mx-2.5 mb-2.5">
        <div className="bg-[#13161d] border border-[#1c1f28] rounded-2xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <I.Bolt className="w-3 h-3 text-[#fbbf24]" />
              <span className="text-[10px] text-[#525669] font-medium">
                {lang === 'ar' ? 'رصيد الطلبات' : 'Order credits'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-white">{CREDITS}</span>
          </div>

          {/* Segmented progress */}
          <div className="flex gap-0.5 mb-2.5">
            {Array.from({ length: 20 }, (_, i) => {
              const threshold = (i + 1) / 20
              const filled = creditsPct / 100 >= threshold - 0.04
              return (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full transition-all duration-500"
                  style={{
                    background: filled
                      ? i < 14 ? '#3b82f6' : i < 17 ? '#7c5cff' : '#a855f7'
                      : '#1c1f28',
                    opacity: filled ? 1 : 0.4,
                  }}
                />
              )
            })}
          </div>

          <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#1a2744] hover:from-[#2a4a70] hover:to-[#243358] border border-[#3b82f6]/20 text-[#60a5fa] text-[11px] font-semibold transition-all">
            <I.Plus className="w-3 h-3" />
            {lang === 'ar' ? 'شراء رصيد' : 'Buy credits'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="relative border-t border-[#1c1f28] px-2.5 pt-2.5 pb-3 space-y-2">
        {/* Lang pills */}
        <div className="flex gap-1 p-0.5 bg-[#13161d] rounded-xl border border-[#1c1f28]">
          {(['ar', 'en'] as const).map(l => (
            <button
              key={l}
              onClick={onLangToggle}
              className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-all ${
                lang === l
                  ? 'bg-[#1c2a40] text-[#60a5fa] shadow-sm border border-[#2a3d5a]'
                  : 'text-[#3a3d4a] hover:text-[#525669]'
              }`}
            >
              {l === 'ar' ? 'العربية' : 'English'}
            </button>
          ))}
        </div>

        {/* User row */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1c2a40] to-[#1a1f2e] border border-[#2a2d3a] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-[#60a5fa]">H</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[#6b7280] truncate">Hamdy</div>
            <div className="text-[9px] text-[#2a2d3a]">{lang === 'ar' ? 'المشرف' : 'Admin'}</div>
          </div>
          <button
            className="text-[#2a2d3a] hover:text-[#f87171] transition-colors p-1.5 rounded-lg hover:bg-[#1f2229]"
            title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
          >
            <I.Logout className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

/* ─── page ───────────────────────────────── */
export default function SidebarDemoPage() {
  const [active, setActive] = useState<NavKey>('dashboard')
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  const labels: Record<NavKey, { ar: string; en: string }> = {
    dashboard: { ar: 'الرئيسية',                  en: 'Dashboard' },
    products:  { ar: 'المنتجات',                  en: 'Products' },
    orders:    { ar: 'الطلبات',                  en: 'Orders' },
    research:  { ar: 'أبحث عن منتج',             en: 'Find a Product' },
    creatives: { ar: 'ابحث عن فيديو لمنتج',     en: 'Search for a Creative' },
    tiktok:    { ar: 'إدارة إعلانات TikTok',     en: 'TikTok Ads' },
    billing:   { ar: 'الفواتير',                 en: 'Billing' },
    settings:  { ar: 'الإعدادات',               en: 'Settings' },
  }

  return (
    <div dir={dir} className="min-h-screen bg-[#0f1117] text-white flex">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet" />

      <DemoSidebar
        lang={lang}
        active={active}
        onNav={setActive}
        onLangToggle={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
      />

      {/* Content stub */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-[#1e2128] px-6 py-3">
          <div>
            <div className="text-[10px] text-[#4a4e60] uppercase tracking-wide">{lang === 'ar' ? 'معاينة' : 'Preview'}</div>
            <div className="font-semibold text-sm mt-0.5">{lang === 'ar' ? labels[active].ar : labels[active].en}</div>
          </div>
          <button
            onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
            className="text-xs border border-[#2a2d35] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center opacity-20">
            <div className="text-6xl mb-3">
              {active === 'dashboard' ? '🏠' : active === 'products' ? '📦' : active === 'orders' ? '🛒' : active === 'tiktok' ? '📱' : active === 'billing' ? '💳' : active === 'settings' ? '⚙️' : active === 'research' ? '🏆' : '🎬'}
            </div>
            <div className="text-white text-sm">{lang === 'ar' ? labels[active].ar : labels[active].en}</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { font-family: 'Noto Sans Arabic', system-ui, sans-serif; }
        h1, h2, h3, .font-bold, .font-semibold { font-family: 'Noto Kufi Arabic', system-ui, sans-serif; }
      `}</style>
    </div>
  )
}
