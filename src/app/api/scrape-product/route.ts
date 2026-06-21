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

function extractFromHtml(html: string, platform: string) {
  const $ = cheerio.load(html)
  let title = ''
  let images: string[] = []
  let description = ''
  let price = ''

  // Universal OG/meta fallbacks
  const ogTitle = $('meta[property="og:title"]').attr('content') || ''
  const ogDesc = $('meta[property="og:description"]').attr('content') || ''
  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr('content')
    if (src && !images.includes(src)) images.push(src)
  })

  switch (platform) {
    case 'amazon':
      title = $('#productTitle').text().trim() || ogTitle
      $('#altImages img, #imageBlock img').each((_, el) => {
        let src = $(el).attr('data-old-hires') || $(el).attr('src') || ''
        if (src && src.includes('amazon') && !src.includes('sprite')) {
          src = src.replace(/\._[^.]+_\./, '.')
          if (!images.includes(src)) images.push(src)
        }
      })
      // Extract Amazon images from JSON-LD or data attributes
      const amazonImgMatches = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+\.jpg/g) || []
      amazonImgMatches.forEach(src => { if (!images.includes(src)) images.push(src) })
      description = $('#productDescription p').text().trim() || $('#feature-bullets').text().trim() || ogDesc
      price = $('#priceblock_ourprice').text().trim() || $('.a-price .a-offscreen').first().text().trim()
      break

    case 'noon':
      title = $('h1[class*="name"]').text().trim() || $('h1').first().text().trim() || ogTitle
      $('img[class*="image"]').each((_, el) => {
        const src = $(el).attr('src')
        if (src && !images.includes(src)) images.push(src)
      })
      description = $('[class*="description"]').text().trim() || ogDesc
      break

    case 'jumia':
      title = $('h1[class*="title"]').text().trim() || $('h1').first().text().trim() || ogTitle
      description = $('[class*="description"]').text().trim() || ogDesc
      break

    case 'shein':
      title = $('h1[class*="product-intro__head-name"]').text().trim() || ogTitle
      description = $('[class*="product-intro__description"]').text().trim() || ogDesc
      break

    case 'temu':
      title = ogTitle || $('h1').first().text().trim()
      description = ogDesc
      break

    case 'ebay':
      title = $('h1[class*="product-title"]').text().trim() || ogTitle
      $('img[class*="img"]').each((_, el) => {
        const src = $(el).attr('src')
        if (src && src.includes('ebayimg') && !images.includes(src)) images.push(src)
      })
      description = $('[class*="description"]').text().trim() || ogDesc
      break

    default:
      title = ogTitle || $('h1').first().text().trim()
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || ''
        const width = parseInt($(el).attr('width') || '0')
        if (src && (width > 200 || src.includes('product') || src.includes('item')) && !images.includes(src)) {
          images.push(src.startsWith('//') ? 'https:' + src : src)
        }
      })
      description = ogDesc || $('[class*="description"]').first().text().trim()
      price = $('meta[property="product:price:amount"]').attr('content') || ''
      break
  }

  images = [...new Set(images)]
    .filter(src => src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && !src.includes('sprite'))
    .slice(0, 8)

  return { title: title.slice(0, 200), images, description: description.slice(0, 1000), price, platform }
}

async function scrapeViaJina(url: string) {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      'Accept': 'application/json',
      'X-Return-Format': 'json',
      'X-No-Cache': 'true',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) return null
  const json = await res.json()
  const data = json?.data
  if (!data) return null

  const title: string = data.title || ''
  const description: string = data.description || ''

  // Images come as { "label": "url" } or array
  let images: string[] = []
  if (data.images && typeof data.images === 'object') {
    images = Object.values(data.images as Record<string, string>)
      .filter((src): src is string => typeof src === 'string' && src.startsWith('http'))
      .filter(src => !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && !src.includes('sprite'))
      .slice(0, 8)
  }

  return { title, description, images }
}

async function scrapeViaDirect(url: string, platform: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) return null
  const html = await res.text()
  return extractFromHtml(html, platform)
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 })

    const platform = detectPlatform(url)

    if (platform === 'aliexpress') {
      return NextResponse.json({ success: true, platform: 'aliexpress', blocked: true, title: '', images: [], description: '', price: '' })
    }

    // 1. Try Jina AI Reader — best coverage, handles JS rendering, free
    try {
      const jina = await scrapeViaJina(url)
      if (jina && (jina.title.length > 3 || jina.images.length > 0)) {
        return NextResponse.json({
          success: true,
          platform,
          title: jina.title.slice(0, 200),
          images: jina.images,
          description: jina.description.slice(0, 1000),
          price: '',
        })
      }
    } catch {}

    // 2. Try direct fetch
    try {
      const direct = await scrapeViaDirect(url, platform)
      if (direct && (direct.title.length > 3 || direct.images.length > 0)) {
        return NextResponse.json({ success: true, ...direct })
      }
    } catch {}

    // 3. Nothing worked
    return NextResponse.json({
      success: true,
      title: '',
      images: [],
      description: '',
      price: '',
      platform,
      blocked: true,
    })

  } catch (error: any) {
    console.error('Scraper error:', error?.message)
    return NextResponse.json({ success: false, error: error?.message || 'Failed to scrape' }, { status: 500 })
  }
}
