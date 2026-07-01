import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'
import { createClient } from '@/lib/supabase/server'
import { getProductLandingUrl } from '@/lib/site-url'

export const maxDuration = 30

// Creates the ad's destination: a product + published landing page from the
// scraped URL data, and a smart Saudi-Arabic ad caption (<=100 chars for TikTok).
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { title, description, price, compareAtPrice, images = [], sourceUrl } = await req.json().catch(() => ({}))
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, currency, language')
    .eq('merchant_id', user.id)
    .single()
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const numericPrice = typeof price === 'number' ? price : parseFloat(String(price || '').replace(/[^0-9.]/g, '')) || 0
  const numericCompare = (typeof compareAtPrice === 'number' && compareAtPrice > 0) ? compareAtPrice : null
  const imgs = (images as string[]).slice(0, 8)

  // Localize the product to Arabic + write the ad caption in ONE Claude call.
  let titleAr = String(title)
  let descriptionAr = String(description || '')
  let caption = ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey })
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: `You localize e-commerce products for a Saudi Arabian store. Given an English product title and description, return natural, fluent Saudi-market ARABIC. Also write a short TikTok ad caption in Saudi dialect Arabic.
Return ONLY valid JSON, nothing else:
{"titleAr": "<concise Arabic product title>", "descriptionAr": "<clear Arabic product description, 1-3 sentences, marketing tone>", "caption": "<Saudi dialect ad caption, MUST be <=100 characters, no hashtags, no emojis, ends with a light call to action>"}`,
        messages: [{ role: 'user', content: `Title: ${title}\n${description ? `Description: ${String(description).slice(0, 600)}` : ''}` }],
      })
      const raw = resp.content[0].type === 'text' ? resp.content[0].text.trim() : ''
      const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
      if (parsed.titleAr) titleAr = String(parsed.titleAr).trim()
      if (parsed.descriptionAr) descriptionAr = String(parsed.descriptionAr).trim()
      caption = String(parsed.caption || '').trim()
      if (caption.length > 100) caption = caption.slice(0, 100)
    } catch { /* fall back to English + title caption */ }
  }
  if (!caption) caption = titleAr.slice(0, 100)

  // Insert product (Arabic)
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      store_id: store.id,
      merchant_id: user.id,
      title: titleAr,
      description: descriptionAr,
      price: numericPrice,
      compare_at_price: numericCompare,
      currency: store.currency,
      images: imgs,
      source_url: sourceUrl || null,
      source_platform: 'url',
      status: 'active',
      ai_generated: true,
    })
    .select('id')
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: `product insert: ${productError?.message || 'failed'}` }, { status: 502 })
  }

  // Insert a published Arabic landing page
  await supabase.from('landing_pages').insert({
    product_id: product.id,
    store_id: store.id,
    merchant_id: user.id,
    headline: titleAr,
    subheadline: descriptionAr.slice(0, 160),
    cta_text: 'اطلب الآن',
    sections: JSON.stringify({
      benefits: [],
      urgency_text: '',
      trust_text: '',
      description_long: descriptionAr,
    }),
    ai_generated: true,
    published: true,
  })

  const landingUrl = getProductLandingUrl(store.slug, product.id)

  return NextResponse.json({
    productId: product.id,
    landingUrl,
    caption,
    titleAr,
    price: numericPrice,
    compareAtPrice: numericCompare,
    currency: store.currency,
  })
}
