import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export async function GET(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const merchantId = req.nextUrl.searchParams.get('merchant_id')

  const PAGE = 1000
  let rows: any[] = []
  let from = 0
  while (true) {
    let query = supabaseAdmin
      .from('abandoned_checkouts')
      .select('*, products(title, images), stores(name, slug)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)

    if (merchantId) query = query.eq('merchant_id', merchantId)

    const { data, error } = await query
    if (error || !data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }

  return NextResponse.json({ data: rows })
}
