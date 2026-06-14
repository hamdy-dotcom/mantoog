import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { createClient } from '@/lib/supabase/client'

export const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000
export const LAST_ACTIVITY_KEY = 'mantoog_last_activity'

type RouterLike = Pick<AppRouterInstance, 'replace' | 'push'>

export function recordActivity() {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
}

export function isIdleExpired(): boolean {
  if (typeof window === 'undefined') return false
  const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || '0')
  if (!last) return false
  return Date.now() - last > IDLE_TIMEOUT_MS
}

export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { message?: string; status?: number; code?: string }
  const msg = (e.message ?? '').toLowerCase()
  return (
    e.status === 401 ||
    e.status === 403 ||
    e.code === 'PGRST301' ||
    msg.includes('jwt') ||
    msg.includes('invalid claim') ||
    msg.includes('not authenticated') ||
    (msg.includes('session') && (msg.includes('missing') || msg.includes('expired')))
  )
}

export async function signOutAndGoToLogin(router?: RouterLike) {
  const supabase = createClient()
  await supabase.auth.signOut()
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LAST_ACTIVITY_KEY)
  }
  if (router) {
    router.replace('/login')
  } else if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

export async function getAuthenticatedUser(
  supabase: SupabaseClient
): Promise<User | null> {
  if (typeof window !== 'undefined' && isIdleExpired()) {
    return null
  }

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error && isAuthError(error)) return null
  if (!user) return null

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  if (session.expires_at && session.expires_at * 1000 <= Date.now()) return null

  return user
}

export type DashboardRoute = '/login' | '/dashboard/setup' | '/dashboard' | null

/** Resolve where an authenticated visitor should go (no redirect performed). */
export async function resolvePostLoginRoute(
  supabase: SupabaseClient
): Promise<'/dashboard' | '/dashboard/setup' | null> {
  const user = await getAuthenticatedUser(supabase)
  if (!user) return null

  const { data: store, error } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .maybeSingle()

  if (error && isAuthError(error)) return null
  return store ? '/dashboard' : '/dashboard/setup'
}

/**
 * Guard for dashboard routes. Returns a redirect path or null if access is allowed.
 * Expired/invalid sessions always → /login (never setup).
 */
export async function resolveDashboardRoute(
  pathname: string,
  supabase: SupabaseClient
): Promise<DashboardRoute> {
  if (typeof window !== 'undefined' && isIdleExpired()) {
    return '/login'
  }

  const user = await getAuthenticatedUser(supabase)
  if (!user) return '/login'

  const { data: store, error } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .maybeSingle()

  if (error && isAuthError(error)) return '/login'

  const isSetup = pathname === '/dashboard/setup'

  if (isSetup) {
    return store ? '/dashboard' : null
  }

  return store ? null : '/dashboard/setup'
}

/** Load user + store for dashboard pages; redirects on auth/setup failures. */
export async function loadMerchantStore(
  supabase: SupabaseClient,
  router: RouterLike,
  select = '*'
): Promise<{ user: User; store: Record<string, unknown> } | null> {
  const user = await getAuthenticatedUser(supabase)
  if (!user) {
    await signOutAndGoToLogin(router)
    return null
  }

  const { data: store, error } = await supabase
    .from('stores')
    .select(select)
    .eq('merchant_id', user.id)
    .maybeSingle()

  if (error && isAuthError(error)) {
    await signOutAndGoToLogin(router)
    return null
  }

  if (!store) {
    router.replace('/dashboard/setup')
    return null
  }

  recordActivity()
  return { user, store: store as unknown as Record<string, unknown> }
}
