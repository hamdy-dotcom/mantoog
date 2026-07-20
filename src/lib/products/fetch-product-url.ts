import * as cheerio from 'cheerio'

// ScraperAPI render=true (headless browser) typically takes 10-25s.
// Keep this under Vercel's function maxDuration (set to 30s in vercel.json).
const FETCH_TIMEOUT_MS = 25_000

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

  // IPv6 private ranges: ULA (fc00::/7) and link-local (fe80::/10)
  if (host.includes(':')) {
    if (host.startsWith('fc') || host.startsWith('fd')) return true          // ULA fc00::/7
    if (host.startsWith('fe8') || host.startsWith('fe9') ||                  // link-local
        host.startsWith('fea') || host.startsWith('feb')) return true        // fe80::/10
    return false
  }

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

// A 200 response can still be a bot wall (Amazon "Robot Check"/captcha). Treat those
// as unusable so we fall back to ScraperAPI.
function looksLikeBotWall(html: string): boolean {
  return /Robot Check|Enter the characters you see below|api-services-support\.amazon|automated access to Amazon data|\/errors\/validateCaptcha|captcha/i.test(
    html.slice(0, 20000)
  )
}
function looksUsable(html: string): boolean {
  return html.trim().length > 2000 && !looksLikeBotWall(html)
}

type Attempt = { ok: true; html: string; status: number } | { ok: false; code: FetchProductUrlErrorCode; status?: number }

async function attemptFetch(fetchUrl: string, headers: Record<string, string> | undefined, timeoutMs: number): Promise<Attempt> {
  try {
    const response = await fetch(fetchUrl, { headers, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return { ok: false, code: 'http_error', status: response.status }
    const html = await response.text()
    if (!html.trim()) return { ok: false, code: 'empty_response' }
    return { ok: true, html, status: response.status }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TimeoutError') return { ok: false, code: 'timeout' }
    console.error('[products/fetch-url] fetch failed:', error)
    return { ok: false, code: 'fetch_failed' }
  }
}

export async function fetchProductPageHtml(url: string): Promise<FetchProductUrlResult> {
  const parsed = parsePublicProductUrl(url)
  if (!parsed) {
    return { ok: false, code: 'invalid_url', message: fetchErrorMessage('invalid_url') }
  }

  const targetUrl = parsed.toString()
  // .trim() + non-empty guard: Vercel can store blank env vars as '' (falsy but not undefined)
  const apiKey = process.env.SCRAPERAPI_KEY?.trim() || undefined

  // 1) Direct fetch FIRST. Product pages (Amazon, Noon, …) return the full product HTML
  //    server-side in ~1s — ScraperAPI's headless render (10–25s) is unnecessary and was
  //    timing out. Only fall back if the direct response is blocked, empty, or a bot wall.
  const direct = await attemptFetch(targetUrl, BROWSER_HEADERS, 9_000)
  if (direct.ok && looksUsable(direct.html)) {
    console.log('[fetch-url] direct fetch succeeded', { bytes: direct.html.length })
    return { ok: true, html: direct.html, status: direct.status, finalUrl: targetUrl }
  }
  console.log('[fetch-url] direct fetch not usable', {
    ok: direct.ok, code: direct.ok ? 'bot_wall_or_thin' : direct.code, hasKey: !!apiKey,
  })

  // 2) Fall back to ScraperAPI for hosts that block our server IP. NO render=true —
  //    product pages (Amazon/Noon/…) ship the product data in the server HTML, so the
  //    headless render just added 10–25s and caused the timeout. ScraperAPI's proxy
  //    still bypasses the IP block.
  if (apiKey) {
    const scraped = await attemptFetch(
      `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`,
      undefined,
      FETCH_TIMEOUT_MS
    )
    if (scraped.ok && scraped.html.trim()) {
      return { ok: true, html: scraped.html, status: scraped.status, finalUrl: targetUrl }
    }
    const code = scraped.ok ? 'empty_response' : scraped.code
    return { ok: false, code, status: scraped.ok ? undefined : scraped.status, message: fetchErrorMessage(code, scraped.ok ? undefined : scraped.status) }
  }

  // No ScraperAPI key and direct wasn't usable → surface the direct error.
  const code = direct.ok ? 'empty_response' : direct.code
  return { ok: false, code, status: direct.ok ? undefined : direct.status, message: fetchErrorMessage(code, direct.ok ? undefined : direct.status) }
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
