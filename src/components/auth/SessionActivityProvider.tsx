'use client'

import { useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  IDLE_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  recordActivity,
  signOutAndGoToLogin,
} from '@/lib/auth/client'

const PUBLIC_PREFIXES = ['/', '/login', '/signup', '/privacy', '/admin/login']

function isPublicPath(pathname: string) {
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.some(p => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)))
}

export default function SessionActivityProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const touch = useCallback(() => {
    recordActivity()
  }, [])

  useEffect(() => {
    touch()
  }, [pathname, touch])

  useEffect(() => {
    const events = ['click', 'keydown', 'touchstart'] as const
    const onActivity = () => touch()
    events.forEach(e => document.addEventListener(e, onActivity, { passive: true }))
    return () => events.forEach(e => document.removeEventListener(e, onActivity))
  }, [touch])

  useEffect(() => {
    const enforceIdle = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || '0')
      if (!last) {
        recordActivity()
        return
      }

      if (Date.now() - last > IDLE_TIMEOUT_MS) {
        await signOutAndGoToLogin(router)
      }
    }

    enforceIdle()
    const id = window.setInterval(enforceIdle, 60_000)
    return () => window.clearInterval(id)
  }, [router, pathname])

  useEffect(() => {
    if (!isPublicPath(pathname)) {
      recordActivity()
    }
  }, [pathname])

  return children
}
