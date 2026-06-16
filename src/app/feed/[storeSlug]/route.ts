import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

const BASE_URL = 'https://www.mantoog.com'

type RouteCtx = { params: Promise<{ storeSlug: string }> }

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(_request: Request, ctx: RouteCtx) {
  const { storeSlug } = await ctx.params

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('*')
    .eq('slug', storeSlug)
    .single()

  if (!store) {
    return new NextResponse('Store not found', { status: 404 })
  }

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .eq('status', 'active')

  if (!products?.length) {
    return new NextResponse('No products found', { status: 404 })
  }

  const currency = store.currency || 'SAR'
  const storeName = store.name || store.slug

  const items = products.map(p => {
    const productUrl = `${BASE_URL}/${store.slug}/${p.id}`
    const images = Array.isArray(p.images) ? p.images : []
    const imageUrl = images[0] || p.image_url || ''
    const price = p.price || 0
    const title = p.title || p.name || ''
    const rawDescription = p.description || title
    const description = String(rawDescription).replace(/<[^>]*>/g, '').slice(0, 500)

    return `
    <item>
      <g:id>${escapeXml(String(p.id))}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(String(imageUrl))}</g:image_link>
      <g:price>${price} ${currency}</g:price>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(storeName)}</g:brand>
      <g:google_product_category>Shopping</g:google_product_category>
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(storeName)}</title>
    <link>${escapeXml(`${BASE_URL}/${store.slug}`)}</link>
    <description>Products from ${escapeXml(storeName)}</description>
    ${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
