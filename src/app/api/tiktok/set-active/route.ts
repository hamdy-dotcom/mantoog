import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { advertiser_id } = await req.json()
  if (!advertiser_id) return NextResponse.json({ error: 'Missing advertiser_id' }, { status: 400 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 })

  await supabaseAdmin
    .from('tiktok_connections')
    .update({ is_active: false })
    .eq('store_id', store.id)

  const { error } = await supabaseAdmin
    .from('tiktok_connections')
    .update({ is_active: true })
    .eq('store_id', store.id)
    .eq('advertiser_id', advertiser_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
