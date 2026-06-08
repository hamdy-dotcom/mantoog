'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

const navItems = [
  { key: 'dashboard', path: '/dashboard', icon: '🏠' },
  { key: 'products', path: '/dashboard/products', icon: '📦' },
  { key: 'research', path: '/dashboard/products/research', icon: '🔍' },
  { key: 'orders', path: '/dashboard/orders', icon: '🛒' },
  { key: 'ads', path: '/dashboard/ads', icon: '📣' },
  { key: 'analytics', path: '/dashboard/analytics', icon: '📊' },
  { key: 'billing', path: '/dashboard/billing', icon: '💳' },
  { key: 'settings', path: '/dashboard/settings', icon: '⚙️' },
]

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

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <aside
      dir={dir}
      className={`w-64 p-4 flex flex-col shrink-0 min-h-screen bg-[#111318] ${
        dir === 'rtl'
          ? 'border-l border-[#2a2d35] order-last'
          : 'border-r border-[#2a2d35] order-first'
      }`}
    >
      {/* Logo */}
      <div className="mb-8 px-2 pt-2">
        {store?.logo_url && (
          <img src={store.logo_url} alt={store.name} className="h-9 object-contain mb-2" />
        )}
        <div className="font-semibold text-white text-sm truncate">{store?.name}</div>
        <div className="text-xs text-[#4a4e60] mb-2">{store?.currency}</div>
        {store?.slug && (
          <a
            href={`/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#3b82f6] hover:text-white bg-[#1a3a5c] hover:bg-[#3b82f6] px-2.5 py-1.5 rounded-lg transition-colors w-full justify-center font-medium"
          >
            <span>🏪</span>
            <span>{lang === 'ar' ? 'عرض المتجر ↗' : 'View store ↗'}</span>
          </a>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-${dir === 'rtl' ? 'right' : 'left'} ${
                active
                  ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                  : 'text-[#8b8fa8] hover:bg-[#1f2229] hover:text-white'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{tr[item.key as keyof typeof tr] as string}</span>
              {active && <span className={`${dir === 'rtl' ? 'mr-auto' : 'ml-auto'} w-1.5 h-1.5 rounded-full bg-white opacity-70`} />}
            </button>
          )
        })}
      </nav>

      {/* Credits bar */}
      {credits && (
        <div className="mx-2 mb-3 bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#4a4e60] font-medium uppercase tracking-wider">{tr.freeCredits}</span>
            <span className={`text-xs font-bold ${credits.credits_remaining <= 20 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
              {credits.credits_remaining ?? 100}
            </span>
          </div>
          <div className="h-1.5 bg-[#2a2d35] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${credits.credits_remaining <= 20 ? 'bg-[#f87171]' : 'bg-[#3b82f6]'}`}
              style={{ width: `${Math.min(((credits.credits_remaining ?? 100) / 100) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Language toggle */}
      <div className="mx-2 mb-3 flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl">
        <button
          onClick={() => setLang('ar')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${lang === 'ar' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
        >
          العربية
        </button>
        <button
          onClick={() => setLang('en')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${lang === 'en' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
        >
          English
        </button>
      </div>

      {isAdmin && (
        <button onClick={() => router.push('/admin')}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[#8b8fa8] hover:bg-[#1f2229] hover:text-white transition-all">
          <span className="text-lg">⚙️</span>
          <span>Admin Panel</span>
        </button>
      )}

      {/* Sign out */}
      <button
        onClick={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}
        className="mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#8b8fa8] hover:text-[#f87171] hover:bg-[#3a1414] transition-colors w-full"
      >
        <span className="text-lg">🚪</span>
        <span>{tr.signout}</span>
      </button>
    </aside>
  )
}
