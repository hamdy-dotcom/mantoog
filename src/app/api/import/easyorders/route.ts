import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import DOMPurify from 'isomorphic-dompurify'

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

async function fetchAllProducts(storeId: string, base: string): Promise<Record<string, unknown>[]> {
  const allProducts: Record<string, unknown>[] = []
  let page = 1
  const limit = 50

  while (true) {
    const res = await fetch(
      `https://api.easy-orders.net/api/v1/products?store=${storeId}&limit=${limit}&page=${page}&sort=position,asc`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Origin': base,
          'Referer': `${base}/collections/Al-products`,
        },
        signal: AbortSignal.timeout(15000),
      }
    )
    if (!res.ok) {
      if (page === 1) throw new Error(`EasyOrders API error: ${res.status}`)
      break
    }
    const json = await res.json()
    const batch = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
        ? json.data
        : []
    if (batch.length === 0) break
    allProducts.push(...batch)
    const hasNextPage = typeof json === 'object' && json !== null && !Array.isArray(json) && json.next_page != null
    if (hasNextPage ? !json.next_page : batch.length < limit) break
    page++
  }

  return allProducts
}

async function fetchProductsWithApiKey(apiKey: string): Promise<{ products: Record<string, unknown>[]; storeId: string }> {
  const allProducts: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `https://api.easy-orders.net/api/v1/external-apps/products?page=${page}&limit=50`,
      {
        headers: { 'Api-Key': apiKey, 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000),
      }
    )
    if (!res.ok) throw new Error(`Invalid API key — ${res.status}`)
    const data = await res.json()
    const batch = Array.isArray(data) ? data : data.data || []
    if (batch.length === 0) break
    allProducts.push(...batch)
    if (!data.totalPages || page >= data.totalPages) break
    page++
  }

  if (allProducts.length === 0) throw new Error('لم يتم إيجاد منتجات — تأكد من صلاحيات API Key')

  const storeId = String(allProducts[0].store_id || '')
  const fullProducts: Record<string, unknown>[] = []
  const BATCH = 10
  for (let i = 0; i < allProducts.length; i += BATCH) {
    const batch = allProducts.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map((p: Record<string, unknown>) =>
        fetch(`https://api.easy-orders.net/api/v1/external-apps/products/${p.id}`, {
          headers: { 'Api-Key': apiKey, 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000),
        }).then(r => r.json()).catch(() => p)
      )
    )
    fullProducts.push(...results)
    if (i + BATCH < allProducts.length) await new Promise(r => setTimeout(r, 200))
  }

  return { products: fullProducts, storeId }
}

function combineImages(p: Record<string, unknown>): string[] {
  const extra = Array.isArray(p.images) ? (p.images as string[]) : []
  return [p.thumb, ...extra].filter((img): img is string => typeof img === 'string' && img.trim() !== '')
}

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams
  const storeUrl = searchParams.get('url') || ''
  const apiKey = searchParams.get('apiKey') || ''

  try {
    let products: Record<string, unknown>[] = []
    let storeName = ''
    let logo = ''

    if (apiKey) {
      const result = await fetchProductsWithApiKey(apiKey)
      products = result.products
      const firstStore = products[0]?.store as Record<string, unknown> | undefined
      storeName = String(firstStore?.name || `متجر (${result.storeId.slice(0, 8)}...)`)
    } else if (storeUrl) {
      const base = storeUrl.replace(/\/$/, '')
      const html = await fetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }).then(r => r.text())
      const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
      if (!ndMatch) return NextResponse.json({ error: 'هذا ليس متجر EasyOrders' }, { status: 400 })
      const nd = JSON.parse(ndMatch[1])
      const storeId = nd?.props?.pageProps?.appSettings?.id
      storeName = nd?.props?.pageProps?.appSettings?.title || ''
      logo = nd?.props?.pageProps?.appSettings?.logo || ''
      if (!storeId) return NextResponse.json({ error: 'لم يتم إيجاد معرف المتجر' }, { status: 400 })
      products = await fetchAllProducts(storeId, base)
    } else {
      return NextResponse.json({ error: 'url or apiKey required' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      storeName,
      logo,
      total: products.length,
      preview_all: products.map((p: Record<string, unknown>) => ({
        title: p.name || p.title || '',
        price: p.sale_price || p.price || 0,
        image: p.thumb || '',
        images: combineImages(p),
        description: String(p.description || ''),
        slug: p.slug || '',
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
  const apiKey = body?.apiKey as string | undefined
  const selectedProducts = body?.selectedProducts as Array<Record<string, unknown>> | undefined
  if (!storeUrl && !apiKey) return NextResponse.json({ error: 'storeUrl or apiKey required' }, { status: 400 })

  try {
    let products: Record<string, unknown>[]
    let storeName = ''

    if (selectedProducts?.length) {
      products = selectedProducts
    } else if (apiKey) {
      const result = await fetchProductsWithApiKey(apiKey)
      products = result.products
      const firstStore = products[0]?.store as Record<string, unknown> | undefined
      storeName = String(firstStore?.name || `متجر (${result.storeId.slice(0, 8)}...)`)
    } else if (storeUrl) {
      const info = await getStoreInfo(storeUrl)
      products = await fetchAllProducts(info.storeId, info.base)
      storeName = info.storeName
    } else {
      return NextResponse.json({ error: 'storeUrl or apiKey required' }, { status: 400 })
    }

    if (!storeName && storeUrl) {
      const info = await getStoreInfo(storeUrl)
      storeName = info.storeName
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: store } = await supabase
      .from('stores')
      .select('id, currency')
      .eq('merchant_id', user.id)
      .single()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const fromEasyOrdersApi = !selectedProducts

    const mapped = products
      .filter((p: Record<string, unknown>) => (fromEasyOrdersApi ? (p.name || p.title) : p.title))
      .map((p: Record<string, unknown>) => {
        if (!fromEasyOrdersApi) {
          const title = String(p.title || '')
          const price = Number(p.price || 0)
          const images = Array.isArray(p.images)
            ? (p.images as string[]).filter(img => typeof img === 'string' && img.trim() !== '')
            : p.image ? [String(p.image)] : []

          return {
            store_id: store.id,
            merchant_id: user.id,
            title,
            price,
            compare_at_price: null,
            description: DOMPurify.sanitize(p.description ? String(p.description) : ''),
            images,
            status: 'active',
            currency: store.currency,
            source_platform: 'easyorders',
          }
        }

        const title = String(p.name || p.title || '')
        const salePrice = Number(p.sale_price || p.price || 0)
        const listPrice = Number(p.price || 0)
        const variations = Array.isArray(p.variations) ? (p.variations as Record<string, unknown>[]) : []
        const sizeVariation = variations.find(v =>
          String(v.name || '').includes('مقاس') || String(v.name || '').toLowerCase().includes('size')
        )
        const colorVariation = variations.find(v =>
          String(v.name || '').includes('لون') || String(v.name || '').toLowerCase().includes('color')
        )
        const sizeProps = Array.isArray(sizeVariation?.props) ? (sizeVariation.props as Record<string, unknown>[]) : []
        const colorProps = Array.isArray(colorVariation?.props) ? (colorVariation.props as Record<string, unknown>[]) : []
        const sizes = sizeProps.map(prop => String(prop.value || '')).filter(Boolean)
        const colors = colorProps
          .map(prop => ({ name: String(prop.value || ''), hex: '#000000' }))
          .filter(c => c.name)

        return {
          store_id: store.id,
          merchant_id: user.id,
          title,
          price: salePrice,
          compare_at_price: listPrice > salePrice ? listPrice : null,
          description: DOMPurify.sanitize(p.description ? String(p.description) : ''),
          images: combineImages(p),
          status: 'active',
          currency: store.currency,
          source_platform: 'easyorders',
          ...(sizes.length > 0 ? { sizes } : {}),
          ...(colors.length > 0 ? { colors } : {}),
        }
      })

    const { data: inserted, error } = await supabase
      .from('products')
      .insert(mapped)
      .select('id')
    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      storeName,
      imported: inserted?.length || 0,
      total: products.length,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
