import * as cheerio from 'cheerio'

const FETCH_TIMEOUT_MS = 15_000

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Cache-Control': 'max-age=0',
}

export type FetchProductUrlErrorCode =
  | 'invalid_url'
  | 'blocked_host'
  | 'timeout'
  | 'fetch_failed'
  | 'http_error'
  | 'empty_response'

export type FetchProductUrlFailure = {
  ok: false
  code: FetchProductUrlErrorCode
  message: string
  status?: number
}

export type FetchProductUrlSuccess = {
  ok: true
  html: string
  status: number
  finalUrl: string
}

export type FetchProductUrlResult = FetchProductUrlSuccess | FetchProductUrlFailure

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host || host === 'localhost') return true
  if (host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true
  if (host.endsWith('.local') || host.endsWith('.internal')) return true

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4) return false

  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

export function parsePublicProductUrl(input: string): URL | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (isPrivateOrLocalHost(parsed.hostname)) return null
  return parsed
}

export function fetchErrorMessage(code: FetchProductUrlErrorCode, status?: number): string {
  switch (code) {
    case 'invalid_url':
      return 'Enter a valid public product URL (http or https).'
    case 'blocked_host':
      return 'That URL points to a private or local address and cannot be fetched.'
    case 'timeout':
      return 'The product page took too long to respond. Try again or enter details manually.'
    case 'http_error':
      if (status === 403) {
        return 'The store blocked our server from loading this page (403). Enter the product name and upload images manually.'
      }
      if (status === 404) {
        return 'Product page not found (404). Check the URL and try again.'
      }
      return status
        ? `Could not load the product page (HTTP ${status}). Try again or enter details manually.`
        : 'Could not load the product page. Try again or enter details manually.'
    case 'empty_response':
      return 'The product page returned no usable content. Enter the name and upload images manually.'
    case 'fetch_failed':
    default:
      return 'Could not fetch this product URL. Check the link and try again.'
  }
}

export async function fetchProductPageHtml(url: string): Promise<FetchProductUrlResult> {
  const parsed = parsePublicProductUrl(url)
  if (!parsed) {
    return {
      ok: false,
      code: 'invalid_url',
      message: fetchErrorMessage('invalid_url'),
    }
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      return {
        ok: false,
        code: 'http_error',
        status: response.status,
        message: fetchErrorMessage('http_error', response.status),
      }
    }

    const html = await response.text()
    if (!html.trim()) {
      return {
        ok: false,
        code: 'empty_response',
        message: fetchErrorMessage('empty_response'),
      }
    }

    return {
      ok: true,
      html,
      status: response.status,
      finalUrl: response.url || parsed.toString(),
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        ok: false,
        code: 'timeout',
        message: fetchErrorMessage('timeout'),
      }
    }
    console.error('[products/fetch-url] fetch failed:', error)
    return {
      ok: false,
      code: 'fetch_failed',
      message: fetchErrorMessage('fetch_failed'),
    }
  }
}

export function detectPlatform(url: string): string {
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

export function extractProductDataFromHtml(html: string, platform: string) {
  const $ = cheerio.load(html)

  let title = ''
  let images: string[] = []
  let description = ''
  let price = ''

  switch (platform) {
    case 'amazon':
      title =
        $('#productTitle').text().trim() || $('h1[class*="title"]').text().trim()

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
      description =
        $('#productDescription p').text().trim() || $('#feature-bullets').text().trim()
      price =
        $('#priceblock_ourprice').text().trim() ||
        $('.a-price .a-offscreen').first().text().trim()
      break

    case 'noon':
      title = $('h1[class*="name"]').text().trim() || $('h1').first().text().trim()
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
      title = $('h1[class*="title"]').text().trim() || $('h1').first().text().trim()
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      description = $('[class*="description"]').text().trim()
      break

    case 'shein':
      title =
        $('h1[class*="product-intro__head-name"]').text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        ''
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
      title =
        $('h1[class*="product-title"]').text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        ''
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
      title =
        $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || ''
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content')
        if (src && !images.includes(src)) images.push(src)
      })
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || ''
        const width = parseInt($(el).attr('width') || '0', 10)
        if (
          src &&
          (width > 200 || src.includes('product') || src.includes('item')) &&
          !images.includes(src)
        ) {
          images.push(src.startsWith('//') ? `https:${src}` : src)
        }
      })
      description =
        $('meta[property="og:description"]').attr('content') ||
        $('[class*="description"]').first().text().trim() ||
        ''
      price = $('meta[property="product:price:amount"]').attr('content') || ''
      break
  }

  images = [...new Set(images)]
    .filter(
      src =>
        src &&
        src.startsWith('http') &&
        !src.includes('logo') &&
        !src.includes('icon') &&
        !src.includes('avatar')
    )
    .slice(0, 8)

  return {
    title: title.slice(0, 200),
    images,
    description: description.slice(0, 1000),
    price,
    platform,
  }
}
