import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export async function resolveActiveConnection() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 }

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return { error: 'No store found' as const, status: 404 }

  const { data: activeRows, error } = await supabaseAdmin
    .from('tiktok_connections')
    .select('advertiser_id, access_token, currency')
    .eq('store_id', store.id)
    .eq('is_active', true)

  const activeCount = activeRows?.length ?? 0

  if (error) {
    console.error('[tiktok] resolveActiveConnection query error:', error.message)
    return { error: 'db_error' as const, status: 500 }
  }

  if (activeCount === 0) {
    return { error: 'no_active_account' as const, status: 200, store, activeCount: 0 }
  }

  const connection = activeRows![0]
  if (activeCount > 1) {
    console.warn(
      '[tiktok] multiple is_active connections for store',
      store.id,
      '— using',
      connection.advertiser_id
    )
  }

  return { connection, store, activeCount }
}
