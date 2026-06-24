import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import DOMPurify from 'isomorphic-dompurify'
import {
  detectPlatform,
  extractProductDataFromHtml,
  fetchProductPageHtml,
  parsePublicProductUrl,
} from '@/lib/products/fetch-product-url'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const url = typeof body?.url === 'string' ? body.url.trim() : ''
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 })
    }

    const parsed = parsePublicProductUrl(url)
    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enter a valid public product URL (http or https).',
          code: 'invalid_url',
        },
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
      const status = fetched.code === 'http_error' && fetched.status === 403 ? 403 : 502
      return NextResponse.json(
        {
          success: false,
          error: fetched.message,
          code: fetched.code,
          platform,
          blocked: fetched.code === 'http_error' && fetched.status === 403,
        },
        { status }
      )
    }

    const data = extractProductDataFromHtml(fetched.html, platform)
    const hasContent = data.title.length > 3 || data.images.length > 0

    if (!hasContent) {
      return NextResponse.json({
        success: true,
        ...data,
        blocked: true,
        message:
          'Could not read product details from this page. Enter the name and upload images manually.',
      })
    }

    return NextResponse.json({
      success: true,
      ...data,
      description: DOMPurify.sanitize(data.description ?? ''),
    })
  } catch (error: unknown) {
    console.error('[api/products/fetch-url] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch product URL'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
