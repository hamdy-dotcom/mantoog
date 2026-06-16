import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

/** Remove every TikTok connection for this store (full disconnect). */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 })

  const { data: deleted, error } = await supabaseAdmin
    .from('tiktok_connections')
    .delete()
    .eq('store_id', store.id)
    .select('advertiser_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    deleted: deleted?.length ?? 0,
  })
}
