import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 })

  let advertiserId: string | null = null
  try {
    const body = await req.json()
    advertiserId = body?.advertiser_id ? String(body.advertiser_id) : null
  } catch {
    advertiserId = null
  }

  let query = supabaseAdmin
    .from('tiktok_connections')
    .delete()
    .eq('store_id', store.id)

  if (advertiserId) {
    query = query.eq('advertiser_id', advertiserId)
  }

  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
