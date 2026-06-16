import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '').slice(0, 50) + '-' + Date.now()
}

async function getStoreInfo(storeUrl: string) {
  const base = storeUrl.replace(/\/$/, '')
  const res = await fetch(base, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Cannot reach store: ${res.status}`)
  const html = await res.text()
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!ndMatch) throw new Error('هذا ليس متجر EasyOrders')
  const nd = JSON.parse(ndMatch[1])
  const appSettings = nd?.props?.pageProps?.appSettings
  if (!appSettings?.id) throw new Error('لم يتم إيجاد معرف المتجر')
  return {
    storeId: appSettings.id,
    storeName: appSettings.title || appSettings.name,
    logo: appSettings.logo,
    currency: appSettings.currency_symbol || 'SAR',
    base,
  }
}

async function fetchProducts(storeId: string, base: string) {
  const res = await fetch(
    `https://api.easy-orders.net/api/v1/products?store=${storeId}&limit=200`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Origin': base,
        'Referer': `${base}/collections/Al-products`,
      },
      signal: AbortSignal.timeout(15000),
    }
  )
  if (!res.ok) throw new Error(`EasyOrders API error: ${res.status}`)
  const products = await res.json()
  if (!Array.isArray(products)) throw new Error('استجابة غير متوقعة من EasyOrders API')
  return products
}

export async function GET(request: NextRequest) {
  const storeUrl = new URL(request.url).searchParams.get('url') || ''
  if (!storeUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

  try {
    const info = await getStoreInfo(storeUrl)
    const products = await fetchProducts(info.storeId, info.base)

    return NextResponse.json({
      success: true,
      storeName: info.storeName,
      logo: info.logo,
      currency: info.currency,
      total: products.length,
      preview: products.slice(0, 6).map((p: Record<string, unknown>) => ({
        title: p.name || p.title,
        price: p.sale_price || p.price,
        image: p.thumb || (Array.isArray(p.images) ? p.images[0] : '') || '',
        slug: p.slug,
      })),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Preview failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const storeUrl = body?.storeUrl as string | undefined
  if (!storeUrl) return NextResponse.json({ error: 'storeUrl required' }, { status: 400 })

  try {
    const info = await getStoreInfo(storeUrl)
    const products = await fetchProducts(info.storeId, info.base)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: store } = await supabase
      .from('stores')
      .select('id, currency')
      .eq('merchant_id', user.id)
      .single()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const mapped = products
      .filter((p: Record<string, unknown>) => p.name || p.title)
      .map((p: Record<string, unknown>) => {
        const title = String(p.name || p.title || '')
        const salePrice = Number(p.sale_price || p.price || 0)
        const listPrice = Number(p.price || 0)
        const variations = Array.isArray(p.variations) ? p.variations as Record<string, unknown>[] : []
        const sizeVariation = variations.find(v =>
          String(v.name || '').includes('مقاس') || String(v.name || '').toLowerCase().includes('size')
        )
        const colorVariation = variations.find(v =>
          String(v.name || '').includes('لون') || String(v.name || '').toLowerCase().includes('color')
        )
        const sizeProps = Array.isArray(sizeVariation?.props) ? sizeVariation.props as Record<string, unknown>[] : []
        const colorProps = Array.isArray(colorVariation?.props) ? colorVariation.props as Record<string, unknown>[] : []
        const extraImages = Array.isArray(p.images) ? p.images as string[] : []

        return {
          store_id: store.id,
          merchant_id: user.id,
          title,
          price: salePrice,
          compare_at_price: listPrice > salePrice ? listPrice : null,
          description: String(p.description || ''),
          images: [p.thumb, ...extraImages].filter(Boolean),
          status: 'active',
          currency: store.currency,
          source_platform: 'easyorders',
          sizes: sizeProps.map(prop => String(prop.value || '')).filter(Boolean),
          colors: colorProps.map(prop => ({ name: String(prop.value || ''), hex: '#000000' })).filter(c => c.name),
        }
      })

    const { data: inserted, error } = await supabase
      .from('products')
      .insert(mapped)
      .select('id')
    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      storeName: info.storeName,
      imported: inserted?.length || 0,
      total: products.length,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
