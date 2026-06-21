import { NextRequest, NextResponse } from 'next/server'
import {
  detectPlatform,
  extractProductDataFromHtml,
  fetchProductPageHtml,
  parsePublicProductUrl,
} from '@/lib/products/fetch-product-url'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 })

    const parsed = parsePublicProductUrl(String(url))
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL', code: 'invalid_url' },
        { status: 400 }
      )
    }

    const platform = detectPlatform(parsed.toString())

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

    const fetched = await fetchProductPageHtml(parsed.toString())
    if (!fetched.ok) {
      return NextResponse.json({
        success: true,
        title: '',
        images: [],
        description: '',
        price: '',
        platform,
        blocked: true,
        error: fetched.message,
      })
    }

    const data = extractProductDataFromHtml(fetched.html, platform)
    return NextResponse.json({ success: true, ...data })
  } catch (error: unknown) {
    console.error('Scraper error:', error)
    const message = error instanceof Error ? error.message : 'Failed to scrape'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
