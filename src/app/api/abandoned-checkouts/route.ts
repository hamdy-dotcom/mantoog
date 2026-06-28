import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClientIp } from '@/lib/analytics/server'
import { abandonedLimiter, checkLimit } from '@/lib/ratelimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? 'unknown'
  if (!(await checkLimit(abandonedLimiter, ip))) {
    return NextResponse.json({ success: false }, { status: 429 })
  }

  try {
    const body = await request.json()
    const {
      store_id, product_id, merchant_id,
      customer_phone, customer_name, customer_address,
      qty, total_price,
    } = body ?? {}

    // Phone must have more than 6 digits
    const digits = String(customer_phone ?? '').replace(/\D/g, '')
    if (digits.length <= 6) {
      return NextResponse.json({ success: false, error: 'Phone too short' }, { status: 400 })
    }

    if (!merchant_id || !product_id || !store_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the product → store → merchant chain to prevent spam inserts
    const { data: product } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', product_id)
      .eq('store_id', store_id)
      .single()

    if (!product) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    await supabase.from('abandoned_checkouts').insert({
      store_id,
      product_id,
      merchant_id,
      customer_phone: String(customer_phone).trim(),
      customer_name:    customer_name    ? String(customer_name).trim()    || null : null,
      customer_address: customer_address ? String(customer_address).trim() || null : null,
      qty:         Math.max(1, Math.round(Number(qty) || 1)),
      total_price: Number(total_price) > 0 ? Number(total_price) : null,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
