import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export async function GET(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const storeId = req.nextUrl.searchParams.get('store_id')

  if (storeId) {
    // Merchant drill-down panel in admin UI
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, landing_pages(visits)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  // All products — paginate server-side to match the existing fetchAll(PAGE=1000) pattern
  const PAGE = 1000
  let rows: any[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, stores(name, slug, merchant_id)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return NextResponse.json({ data: rows })
}
