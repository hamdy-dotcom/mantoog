import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import sanitizeHtml from 'sanitize-html'

const APP_KEY = process.env.ALIEXPRESS_APP_KEY!
const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET!
const API_URL = 'https://api-sg.aliexpress.com/sync'

function signRequest(params: Record<string, string>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('')
  const str = APP_SECRET + sorted + APP_SECRET
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase()
}

function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get merchant's store
  const { data: store } = await supabase
    .from('stores')
    .select('id, currency')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 })

  const { productId } = await req.json()

  // Fetch full product details from AliExpress
  const params: Record<string, string> = {
    method: 'aliexpress.ds.product.get',
    app_key: APP_KEY,
    timestamp: getTimestamp(),
    format: 'json',
    v: '2.0',
    sign_method: 'md5',
    product_id: productId.toString(),
    target_currency: 'USD',
    target_language: 'EN',
    ship_to_country: 'EG',
  }

  params.sign = signRequest(params)

  const body = new URLSearchParams(params)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: body.toString(),
    })

    const data = await res.json()
    const product = data?.aliexpress_ds_product_get_response?.result

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const images = product.ae_multimedia_info_dto?.image_urls?.split(';') || []
    const price = product.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0]?.sku_price || '0'
    const title = product.ae_item_base_info_dto?.subject || ''
    const description = sanitizeHtml(product.ae_item_base_info_dto?.detail || '')

    // Insert into products table
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        store_id: store.id,
        merchant_id: user.id,
        title,
        description,
        price: parseFloat(price),
        currency: store.currency,
        images,
        source_platform: 'aliexpress',
        source_url: `https://www.aliexpress.com/item/${productId}.html`,
        shipping_type: 'static',
        shipping_cost: 0,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, product: newProduct })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Failed to import product' }, { status: 500 })
  }
}
