import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { country } = await request.json()

    // Map country to currency for filtering
    const currencyMap: Record<string, string> = {
      EG: 'EGP', SA: 'SAR', AE: 'AED', MA: 'MAD', DZ: 'DZD'
    }
    const currency = currencyMap[country] || 'EGP'

    // Get top products by order count in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: topOrders } = await supabase
      .from('orders')
      .select('product_id, total_price, currency, status, created_at')
      .eq('currency', currency)
      .gte('created_at', thirtyDaysAgo)
      .in('status', ['delivered', 'shipped', 'confirmed', 'pending'])

    if (!topOrders || topOrders.length === 0) {
      return NextResponse.json({ success: true, products: [] })
    }

    // Count orders per product
    const productCounts: Record<string, { orders: number; revenue: number; delivered: number }> = {}
    topOrders.forEach(order => {
      if (!order.product_id) return
      if (!productCounts[order.product_id]) {
        productCounts[order.product_id] = { orders: 0, revenue: 0, delivered: 0 }
      }
      productCounts[order.product_id].orders += 1
      productCounts[order.product_id].revenue += Number(order.total_price) || 0
      if (order.status === 'delivered') productCounts[order.product_id].delivered += 1
    })

    // Get top 20 product IDs
    const topProductIds = Object.entries(productCounts)
      .sort((a, b) => b[1].orders - a[1].orders)
      .slice(0, 20)
      .map(([id]) => id)

    if (topProductIds.length === 0) {
      return NextResponse.json({ success: true, products: [] })
    }

    // Fetch product details
    const { data: products } = await supabase
      .from('products')
      .select('id, title, images, price, compare_at_price, currency')
      .in('id', topProductIds)
      .eq('status', 'active')

    if (!products) return NextResponse.json({ success: true, products: [] })

    const enriched = products.map(p => ({
      ...p,
      orderCount: productCounts[p.id]?.orders || 0,
      revenue: productCounts[p.id]?.revenue || 0,
      deliveryRate: productCounts[p.id]?.orders > 0
        ? Math.round((productCounts[p.id].delivered / productCounts[p.id].orders) * 100)
        : 0,
    })).sort((a, b) => b.orderCount - a.orderCount)

    return NextResponse.json({ success: true, products: enriched })
  } catch (error: any) {
    return NextResponse.json({ success: false, products: [], error: error.message })
  }
}
