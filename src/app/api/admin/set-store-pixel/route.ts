import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

// Saves the merchant's TikTok Pixel id to their store (Settings → Ads uses the same field).
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { pixelId } = await req.json().catch(() => ({}))
  const clean = String(pixelId || '').trim()
  if (!clean) return NextResponse.json({ error: 'pixelId required' }, { status: 400 })
  // TikTok pixel ids are ~20-char alphanumeric codes
  if (!/^[A-Za-z0-9]{10,40}$/.test(clean)) {
    return NextResponse.json({ error: 'That does not look like a valid TikTok Pixel ID.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', user.id)
    .single()
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('stores')
    .update({ tiktok_pixel_id: clean })
    .eq('id', store.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 502 })

  return NextResponse.json({ ok: true, pixelId: clean })
}
