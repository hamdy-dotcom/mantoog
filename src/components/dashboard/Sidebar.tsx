'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import TikTokIcon from '@/components/icons/TikTokIcon'

type NavItem = {
  key: string
  path: string
  icon?: string
  isImage?: boolean
  Icon?: ComponentType
}

const NAV_ICON_BOX = 'inline-flex w-5 h-5 shrink-0 items-center justify-center'

function NavIcon({ item, emojiClassName }: { item: NavItem; emojiClassName?: string }) {
  if (item.Icon) {
    const Icon = item.Icon
    return (
      <span className={NAV_ICON_BOX} aria-hidden>
        <Icon />
      </span>
    )
  }
  if (item.isImage) {
    return (
      <span className={NAV_ICON_BOX}>
        <img src={item.icon} alt="" className="w-full h-full rounded object-cover" />
      </span>
    )
  }
  return <span className={emojiClassName}>{item.icon}</span>
}

const navItems: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', icon: '🏠' },
  { key: 'products', path: '/dashboard/products', icon: '📦' },
  { key: 'import', path: '/dashboard/import', icon: '🚀' },
  { key: 'research', path: '/dashboard/products/research', icon: '🏆' },
  { key: 'creatives', path: '/dashboard/creatives', icon: '🎬' },
  { key: 'orders', path: '/dashboard/orders', icon: '🛒' },
  { key: 'tiktokAds', path: '/dashboard/tiktok', Icon: TikTokIcon },
  { key: 'billing', path: '/dashboard/billing', icon: '💳' },
  { key: 'settings', path: '/dashboard/settings', icon: '⚙️' },
]

/** Primary destinations for mobile bottom bar (includes TikTok Ads). */
const MOBILE_BOTTOM_NAV_KEYS = [
  'dashboard',
  'products',
  'creatives',
  'orders',
  'tiktokAds',
  'research',
] as const

const mobileBottomNavItems = MOBILE_BOTTOM_NAV_KEYS.map(
  key => navItems.find(item => item.key === key)!
)

export default function Sidebar({ store, credits }: { store: any; credits?: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { lang, setLang, dir } = useLang()
  const tr = t[lang]
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const ADMIN_EMAILS = ['admin@mantoog.com']
      if (user && ADMIN_EMAILS.includes(user.email || '')) setIsAdmin(true)
    }
    checkAdmin()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isNavActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <>
      {/* Mobile Top Header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#1a1d24] border-b border-[#2a2d35] px-3 pb-2 flex items-center justify-between gap-2 h-[calc(var(--dashboard-mobile-header-height)+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)]"
        dir={dir}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img src="/logo.svg" alt="Mantoog" className="h-8 w-8 object-contain shrink-0" />
          <span className="text-white text-sm font-semibold truncate">{store?.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="text-xs border border-[#2a2d35] text-[#8b8fa8] px-2.5 py-1.5 rounded-lg">
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <a href={`/${store?.slug}`} target="_blank" rel="noopener noreferrer"
            className="text-xs bg-[#1a3a5c] text-[#60a5fa] px-2.5 py-1.5 rounded-lg">
            🏪
          </a>
          <button onClick={handleLogout}
            className="text-xs bg-[#3a1414] text-[#f87171] px-2.5 py-1.5 rounded-lg">
            {lang === 'ar' ? 'خروج' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-[#1a1d24] ${dir === 'rtl' ? 'border-l' : 'border-r'} border-[#2a2d35] w-56 min-h-screen sticky top-0 h-screen overflow-y-auto`}>
        {/* Store info */}
        <div className="p-4 pt-6 border-b border-[#2a2d35]">
          <div className="flex flex-col items-center mb-3">
            <img src="/logo.svg" alt="Mantoog" className="w-32 h-32 object-contain mb-2" />
            <div className="font-semibold text-white text-sm truncate">{store?.name}</div>
            <div className="text-xs text-[#4a4e60]">{store?.currency}</div>
          </div>
          <a href={`/${store?.slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#3b82f6] hover:text-white bg-[#1a3a5c] hover:bg-[#3b82f6] px-2.5 py-1.5 rounded-lg transition-colors w-full justify-center font-medium">
            🏪 <span>{lang === 'ar' ? 'عرض المتجر ↗' : 'View store ↗'}</span>
          </a>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = isNavActive(item.path)
            return (
              <button key={item.path} onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:bg-[#1f2229] hover:text-white'}`}>
                <NavIcon item={item} emojiClassName="text-base shrink-0" />
                <span className="flex-1 text-start">{tr[item.key as keyof typeof tr] as string}</span>
              </button>
            )
          })}
          {isAdmin && (
            <button onClick={() => router.push('/admin')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#8b8fa8] hover:bg-[#1f2229] hover:text-white transition-all">
              <span className="text-base">⚙️</span>
              <span className="flex-1 text-start">Admin</span>
            </button>
          )}
        </nav>

        {/* Credits bar */}
        <div className="p-3 border-t border-[#2a2d35]">
          <div className="bg-[#0f1117] rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#4a4e60]">{lang === 'ar' ? 'الرصيد' : 'Credits'}</span>
              <span className={`text-xs font-bold ${(credits?.credits_remaining ?? 100) <= 20 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                {credits?.credits_remaining ?? 100}
              </span>
            </div>
            <div className="h-1 bg-[#2a2d35] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${(credits?.credits_remaining ?? 100) <= 20 ? 'bg-[#f87171]' : 'bg-[#4ade80]'}`}
                style={{ width: `${Math.min(((credits?.credits_remaining ?? 100) / (credits?.credits_total ?? 100)) * 100, 100)}%` }} />
            </div>
          </div>
          {/* Language toggle */}
          <div className="flex gap-1 mb-2">
            <button onClick={() => setLang('en')} className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${lang === 'en' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}>English</button>
            <button onClick={() => setLang('ar')} className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${lang === 'ar' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}>العربية</button>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#8b8fa8] hover:text-[#f87171] hover:bg-[#1f2229] transition-all"
            style={{ justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start' }}>
            <span>🚪</span>
            <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a1d24] border-t border-[#2a2d35] pb-[env(safe-area-inset-bottom,0px)]"
        dir={dir}
        aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
      >
        <div className="flex items-stretch overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1 py-2 gap-0.5">
          {mobileBottomNavItems.map(item => {
            const active = isNavActive(item.path)
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[3.5rem] max-w-[4.5rem] flex-shrink-0 flex-1 ${active ? 'text-[#3b82f6]' : 'text-[#4a4e60]'}`}
              >
                <NavIcon item={item} emojiClassName="text-xl shrink-0" />
                <span className="text-[9px] leading-tight text-center line-clamp-2 w-full">
                  {tr[item.key as keyof typeof tr] as string}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings')}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[3.5rem] max-w-[4.5rem] flex-shrink-0 flex-1 ${
              pathname.includes('settings') || pathname.includes('billing') ? 'text-[#3b82f6]' : 'text-[#4a4e60]'
            }`}
          >
            <span className="text-xl shrink-0">⚙️</span>
            <span className="text-[9px] leading-tight text-center line-clamp-2 w-full">
              {lang === 'ar' ? 'المزيد' : 'More'}
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
