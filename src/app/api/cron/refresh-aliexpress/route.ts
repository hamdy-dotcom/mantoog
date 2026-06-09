import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!

// EXACTLY 12 queries × 2 pages = 24 API requests per day. DO NOT ADD MORE QUERIES.
const SEARCH_QUERIES = [
  { label: 'أدوات مطبخ', keywords: 'kitchen blender chopper food processor slicer' },
  { label: 'أدوات مطبخ', keywords: 'kitchen gadgets cooking tools vegetable cutter' },
  { label: 'منزل ذكي', keywords: 'smart home led strip light organizer storage' },
  { label: 'منزل ذكي', keywords: 'home appliance portable fan heater humidifier' },
  { label: 'عناية شخصية', keywords: 'hair dryer straightener curler beard trimmer' },
  { label: 'عناية شخصية', keywords: 'facial massager skin care device electric face cleaner' },
  { label: 'رياضة', keywords: 'fitness resistance band yoga mat jump rope sport' },
  { label: 'حيوانات أليفة', keywords: 'pet dog cat feeder grooming brush toy leash' },
  { label: 'سيارات', keywords: 'car phone holder seat organizer air freshener dash cam' },
  { label: 'أدوات منزلية', keywords: 'portable vacuum cleaner lint roller mop cleaning brush' },
  { label: 'إضاءة', keywords: 'led night light rgb lamp projector star light' },
  { label: 'إلكترونيات', keywords: 'power bank wireless charger bluetooth speaker mini projector' },
]
// Total: 12 queries above. NEVER EXCEED THIS LIST.

const BLOCKED_KEYWORDS = [
  'necklace', 'bracelet', 'earring', 'ring jewelry', 'pendant necklace',
  'قلادة', 'سوار', 'خاتم', 'أقراط',
  't-shirt', 'tshirt', 'dress', 'jeans', 'pants', 'jacket clothing',
  'تي شيرت', 'فستان', 'بنطلون',
  'sunglasses', 'نظارات شمسية',
  'shoe', 'sneaker', 'boot sandal',
  'حذاء', 'كوتش',
  'emszero', 'cryolipolysis', 'lipolysis machine',
  'underwear', 'lingerie', 'bra panties',
]

const MIN_PRICE_USD = 5
const MAX_PRICE_USD = 150

function isValidProduct(product: any): boolean {
  if (!product.title || !product.image) return false
  if (!product.price || product.price < MIN_PRICE_USD || product.price > MAX_PRICE_USD) return false
  const titleLower = product.title.toLowerCase()
  return !BLOCKED_KEYWORDS.some(kw => titleLower.includes(kw.toLowerCase()))
}

// Each call to this function = 1 API request. Max calls per day = 24 (12 queries × 2 pages).
async function fetchPage(keywords: string, page: number): Promise<any[]> {
  const url = new URL('https://aliexpress-datahub.p.rapidapi.com/item_search_4')
  url.searchParams.set('q', keywords)
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort', 'SALE_PRICE_ASC')
  url.searchParams.set('region', 'US')
  url.searchParams.set('currency', 'USD')
  url.searchParams.set('locale', 'en_US')

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'aliexpress-datahub.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    })
    const data = await res.json()

    // If quota exceeded, throw immediately to stop all further requests
    if (data?.message?.includes('quota') || data?.message?.includes('exceeded')) {
      throw new Error('QUOTA_EXCEEDED: ' + data.message)
    }

    const items = data?.result?.resultList || data?.result?.items || data?.items || []
    return items.map((item: any) => {
      const p = item.item || item
      const image = p.image || p.imageUrl || p.mainImage || ''
      return {
        product_id: String(p.itemId || p.productId || p.id || ''),
        title: p.title || p.subject || '',
        image: image.startsWith('//') ? `https:${image}` : image,
        price: p.sku?.def?.promotionPrice || p.sku?.def?.price || p.salePrice || null,
        original_price: p.sku?.def?.price || p.originalPrice || null,
        currency: 'USD',
      }
    })
  } catch (err: any) {
    if (err.message?.startsWith('QUOTA_EXCEEDED')) throw err
    return []
  }
}

async function translateBatch(products: any[]): Promise<any[]> {
  if (products.length === 0) return []
  const titles = products.map(p => p.title)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `Translate these product titles to Arabic for an e-commerce store. Keep brand names and numbers as-is. Return ONLY a valid JSON array of strings, no markdown, no explanation.\n\n${JSON.stringify(titles)}`
        }]
      })
    })
    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || '[]'
    const translated = JSON.parse(text)
    return products.map((p, i) => ({ ...p, title: translated[i] || p.title }))
  } catch {
    return products
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const allProducts: any[] = []
    let totalApiCalls = 0

    // 12 queries × 2 pages = exactly 24 API calls
    for (const cat of SEARCH_QUERIES) {
      const [p1, p2] = await Promise.all([
        fetchPage(cat.keywords, 1),
        fetchPage(cat.keywords, 2),
      ])
      totalApiCalls += 2

      const filtered = [...p1, ...p2]
        .filter(isValidProduct)
        .map(p => ({ ...p, category: cat.label, country: 'ALL', status: 'active' }))

      allProducts.push(...filtered)
    }

    // Deduplicate
    const seen = new Set()
    const unique = allProducts.filter(p => {
      if (!p.product_id || seen.has(p.product_id)) return false
      seen.add(p.product_id)
      return true
    })

    // Translate in batches of 50
    const translated: any[] = []
    for (let i = 0; i < unique.length; i += 50) {
      const batch = await translateBatch(unique.slice(i, i + 50))
      translated.push(...batch)
    }

    // Archive old active products
    await supabase
      .from('aliexpress_products')
      .update({ status: 'archived' })
      .eq('status', 'active')

    // Insert new
    if (translated.length > 0) {
      const { error } = await supabase
        .from('aliexpress_products')
        .insert(translated)
      if (error) throw error
    }

    return NextResponse.json({
      success: true,
      fetched: translated.length,
      api_calls_used: totalApiCalls,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
