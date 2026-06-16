import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 })

  const { data: clientRows } = await supabase
    .from('tiktok_connections')
    .select('advertiser_id, advertiser_name, is_active')
    .eq('store_id', store.id)

  const { data: rows, error } = await supabaseAdmin
    .from('tiktok_connections')
    .select('advertiser_id, advertiser_name, is_active')
    .eq('store_id', store.id)

  console.log('[tiktok/connections] store_id:', store.id)
  console.log('[tiktok/connections] client-side row count:', clientRows?.length ?? 0)
  console.log('[tiktok/connections] service-role row count:', rows?.length ?? 0)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { connections: rows || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
