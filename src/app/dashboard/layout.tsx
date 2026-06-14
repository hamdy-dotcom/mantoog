'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveDashboardRoute, signOutAndGoToLogin } from '@/lib/auth/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const guard = async () => {
      setReady(false)
      const supabase = createClient()
      const redirect = await resolveDashboardRoute(pathname, supabase)

      if (cancelled) return

      if (redirect === '/login') {
        await signOutAndGoToLogin(router)
        return
      }

      if (redirect) {
        router.replace(redirect)
        return
      }

      setReady(true)
    }

    guard()
    return () => { cancelled = true }
  }, [pathname, router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm animate-pulse">Loading...</div>
      </div>
    )
  }

  return children
}
