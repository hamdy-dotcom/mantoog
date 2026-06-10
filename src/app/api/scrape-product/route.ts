import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

function detectPlatform(url: string): string {
  if (url.includes('aliexpress.com')) return 'aliexpress'
  if (url.includes('amazon.')) return 'amazon'
  if (url.includes('noon.com')) return 'noon'
  if (url.includes('jumia.com')) return 'jumia'
  if (url.includes('shein.com')) return 'shein'
  if (url.includes('temu.com')) return 'temu'
  if (url.includes('ebay.com')) return 'ebay'
  if (url.includes('taobao.com')) return 'taobao'
  if (url.includes('1688.com')) return '1688'
  if (url.includes('namshi.com')) return 'namshi'
  return 'generic'
}

function extractData(html: string, platform: string) {
  const $ = cheerio.load(html)

  let title = ''
  let images: string[] = []
  let description = ''
  let price = ''

  switch (platform) {
    case 'amazon':
      title = $('#productTitle').text().trim() ||
              $('h1[class*="title"]').text().trim()

      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      $('#altImages img, #imageBlock img').each((_, el) => {
        let src = $(el).attr('data-old-hires') || $(el).attr('src') || ''
        if (src && src.includes('amazon') && !src.includes('sprite')) {
          src = src.replace(/\._[^.]+_\./, '.')
          if (!images.includes(src)) images.push(src)
        }
      })
      description = $('#productDescription p').text().trim() ||
                    $('#feature-bullets').text().trim()
      price = $('#priceblock_ourprice').text().trim() ||
              $('.a-price .a-offscreen').first().text().trim()
      break

    case 'noon':
      title = $('h1[class*="name"]').text().trim() ||
              $('h1').first().text().trim()
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      $('img[class*="image"]').each((_, el) => {
        const src = $(el).attr('src')
        if (src && !images.includes(src)) images.push(src)
      })
      description = $('[class*="description"]').text().trim()
      break

    case 'jumia':
      title = $('h1[class*="title"]').text().trim() ||
              $('h1').first().text().trim()
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      description = $('[class*="description"]').text().trim()
      break

    case 'shein':
      title = $('h1[class*="product-intro__head-name"]').text().trim() ||
              $('meta[property="og:title"]').attr('content') || ''
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      description = $('[class*="product-intro__description"]').text().trim()
      break

    case 'temu':
      title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim()
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      description = $('meta[property="og:description"]').attr('content') || ''
      break

    case 'ebay':
      title = $('h1[class*="product-title"]').text().trim() ||
              $('meta[property="og:title"]').attr('content') || ''
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      $('img[class*="img"]').each((_, el) => {
        const src = $(el).attr('src')
        if (src && src.includes('ebayimg') && !images.includes(src)) images.push(src)
      })
      description = $('[class*="description"]').text().trim()
      break

    default:
      title = $('meta[property="og:title"]').attr('content') ||
              $('h1').first().text().trim() || ''
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || ''
        const width = parseInt($(el).attr('width') || '0')
        if (src && (width > 200 || src.includes('product') || src.includes('item')) && !images.includes(src)) {
          images.push(src.startsWith('//') ? 'https:' + src : src)
        }
      })
      description = $('meta[property="og:description"]').attr('content') ||
                    $('[class*="description"]').first().text().trim() || ''
      price = $('meta[property="product:price:amount"]').attr('content') || ''
      break
  }

  images = [...new Set(images)]
    .filter(src => src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar'))
    .slice(0, 8)

  return {
    title: title.slice(0, 200),
    images,
    description: description.slice(0, 1000),
    price,
    platform,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 })

    const platform = detectPlatform(url)

    if (platform === 'aliexpress') {
      return NextResponse.json({
        success: true,
        platform: 'aliexpress',
        blocked: true,
        title: '',
        images: [],
        description: '',
        price: '',
      })
    }

    const SCRAPER_APIS = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ]

    let html = ''

    // Try direct fetch first
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          'Cache-Control': 'max-age=0',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (response.ok) {
        html = await response.text()
      }
    } catch {}

    // Fallback to proxy APIs
    if (!html) {
      for (const proxyUrl of SCRAPER_APIS) {
        try {
          const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
          if (proxyRes.ok) {
            const proxyData = await proxyRes.json()
            html = proxyData.contents || proxyData || ''
            if (html) break
          }
        } catch {}
      }
    }

    if (!html) {
      return NextResponse.json({
        success: false,
        error: 'Could not fetch page',
        platform,
      }, { status: 400 })
    }

    const data = extractData(html, platform)
    return NextResponse.json({ success: true, ...data })

  } catch (error: any) {
    console.error('Scraper error:', error?.message)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to scrape',
    }, { status: 500 })
  }
}
