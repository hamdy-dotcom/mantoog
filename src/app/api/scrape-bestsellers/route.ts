import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
}

const AMAZON_DOMAINS: Record<string, string> = {
  EG: 'www.amazon.eg',
  SA: 'www.amazon.sa',
  AE: 'www.amazon.ae',
  MA: 'www.amazon.fr',
  DZ: 'www.amazon.fr',
}

const AMAZON_CATEGORY_URLS: Record<string, string> = {
  all: '/gp/bestsellers/kitchen',
  electronics: '/gp/bestsellers/electronics',
  home: '/gp/bestsellers/kitchen',
  sports: '/gp/bestsellers/sporting-goods',
  fashion: '/gp/bestsellers/fashion',
}

const NOON_DOMAINS: Record<string, string> = {
  EG: 'www.noon.com/egypt-en',
  SA: 'www.noon.com/saudi-en',
  AE: 'www.noon.com/uae-en',
}

const NOON_CATEGORY_URLS: Record<string, string> = {
  all: '/home-and-kitchen/',
  electronics: '/electronics/',
  home: '/home-and-kitchen/',
  sports: '/sports-and-outdoors/',
  fashion: '/women-clothing/',
}

async function scrapeAmazon(country: string, category: string): Promise<any[]> {
  const domain = AMAZON_DOMAINS[country] || 'www.amazon.eg'
  const path = AMAZON_CATEGORY_URLS[category] || '/gp/bestsellers/kitchen'
  const url = `https://${domain}${path}`

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const products: any[] = []

    // Amazon bestsellers use [data-asin] attribute
    $('[data-asin]').each((i, el) => {
      if (i >= 100) return
      const asin = $(el).attr('data-asin')
      if (!asin || asin.length < 5) return

      const titleEl = $(el).find('.p13n-sc-truncate, .p13n-sc-truncated, ._cDEzb_p13n-sc-css-line-clamp-3_g3dy1, [class*="truncate"]')
      const title = titleEl.text().trim() || $(el).find('img').attr('alt') || ''
      if (!title || title.length < 3) return

      const image = $(el).find('img').first().attr('src') || ''
      const price = $(el).find('.p13n-sc-price, .a-price .a-offscreen, [class*="price"]').first().text().trim()
      const rank = $(el).find('.zg-bdg-text, [class*="rank"]').text().trim() || `#${i + 1}`

      // Filter out branded FMCG — only keep dropshippable products
      const titleLower = title.toLowerCase()
      const excluded = ['vaseline','johnson','dove','loreal','garnier','nivea','pantene','gillette','oral-b','colgate','pampers','huggies','always','coca','pepsi','nestle','kraft','bounty','tide','ariel','fairy']
      if (excluded.some(b => titleLower.includes(b))) return

      products.push({
        title: title.split(',')[0].split('(')[0].trim().slice(0, 60),
        fullTitle: title,
        price,
        image: image.startsWith('http') ? image : '',
        rank: rank || `#${i + 1}`,
        url: `https://${domain}/dp/${asin}`,
        source: 'amazon',
        asin,
      })
    })

    return products
  } catch (e) {
    console.error('Amazon scrape error:', e)
    return []
  }
}

async function scrapeNoon(country: string, category: string): Promise<any[]> {
  const domain = NOON_DOMAINS[country]
  if (!domain) return []
  const path = NOON_CATEGORY_URLS[category] || '/home-and-kitchen/'
  const url = `https://${domain}${path}?sort%5B0%5D=bestselling`

  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, 'Referer': 'https://www.noon.com' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const products: any[] = []

    // Try __NEXT_DATA__
    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextData) {
      try {
        const data = JSON.parse(nextData[1])
        const hits = data?.props?.pageProps?.initialState?.catalog?.hits || []
        hits.slice(0, 100).forEach((item: any, i: number) => {
          if (!item.name) return
          const imageKey = item.image_keys?.[0]
          products.push({
            title: item.name.split(',')[0].trim().slice(0, 60),
            price: item.price ? `${item.price} ${item.currency || ''}` : '',
            image: imageKey ? `https://f.nooncdn.com/p/${imageKey}_A.jpg` : '',
            rank: `#${i + 1}`,
            url: `https://${domain}/${item.sku || ''}/p/`,
            source: 'noon',
          })
        })
        if (products.length > 0) return products
      } catch {}
    }

    // HTML fallback
    $('a[href*="/p/"]').each((i, el) => {
      if (i >= 100) return
      const title = $(el).find('img').attr('alt') || $(el).text().trim()
      const image = $(el).find('img').first().attr('src') || ''
      const href = $(el).attr('href') || ''
      if (title && title.length > 3) {
        products.push({
          title: title.split(',')[0].trim().slice(0, 60),
          price: '',
          image,
          rank: `#${i + 1}`,
          url: href.startsWith('http') ? href : `https://${domain}${href}`,
          source: 'noon',
        })
      }
    })

    return products
  } catch (e) {
    console.error('Noon scrape error:', e)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { country, category, source } = await request.json()

    let products: any[] = []

    if (source === 'amazon') {
      products = await scrapeAmazon(country, category)
    } else if (source === 'noon') {
      products = await scrapeNoon(country, category)
    } else if (source === 'aliexpress') {
      // AliExpress blocks server-side scraping — return empty with message
      return NextResponse.json({
        success: false,
        products: [],
        message: 'aliexpress_blocked'
      })
    }

    // Deduplicate
    const seen = new Set<string>()
    products = products.filter(p => {
      if (!p.title || p.title.length < 3 || seen.has(p.title)) return false
      seen.add(p.title)
      return true
    })

    return NextResponse.json({ success: true, products, total: products.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, products: [], error: error.message }, { status: 500 })
  }
}
