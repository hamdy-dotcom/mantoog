import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export async function GET(_req: NextRequest) {
  // Resolve the merchant from the session server-side — the client never sends merchant_id
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Service role bypasses column-level restrictions — scoped to this merchant only
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, landing_pages(id, published)')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
