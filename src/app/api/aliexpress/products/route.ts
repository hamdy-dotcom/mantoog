import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || 'الكل'

  try {
    let query = supabase
      .from('aliexpress_products')
      .select('*')
      .eq('status', 'active')
      .order('fetched_at', { ascending: false })
      .limit(120)

    if (category !== 'الكل') {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) throw error

    // If no products in DB yet, return empty
    if (!data || data.length === 0) {
      return NextResponse.json({ products: [], empty: true })
    }

    const products = data.map(p => ({
      id: p.product_id,
      title: p.title,
      image: p.image,
      price: p.price,
      originalPrice: p.original_price,
      currency: p.currency,
      category: p.category,
    }))

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
