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

  const { title, description, price, images = [], sourceUrl } = await req.json().catch(() => ({}))
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

  // Parse a numeric price out of the scraped string (e.g. "SAR22.94" -> 22.94)
  const numericPrice = typeof price === 'number'
    ? price
    : parseFloat(String(price || '').replace(/[^0-9.]/g, '')) || 0

  const imgs = (images as string[]).slice(0, 8)

  // Insert product
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      store_id: store.id,
      merchant_id: user.id,
      title,
      description: description || '',
      price: numericPrice,
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

  // Insert a published landing page (basic; the AI landing generator can enrich later)
  await supabase.from('landing_pages').insert({
    product_id: product.id,
    store_id: store.id,
    merchant_id: user.id,
    headline: title,
    subheadline: (description || '').slice(0, 160),
    cta_text: store.language === 'en' ? 'Order Now' : 'اطلب الآن',
    sections: JSON.stringify({
      benefits: [],
      urgency_text: '',
      trust_text: '',
      description_long: description || '',
    }),
    ai_generated: true,
    published: true,
  })

  // Smart Saudi-Arabic ad caption, <=100 chars (TikTok ad_text limit)
  let caption = ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey })
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 120,
        system: `You write short TikTok ad captions in natural Saudi dialect Arabic for e-commerce products. Rules: MUST be 100 characters or fewer (hard limit), punchy, no hashtags, no emojis, end with a light call to action. Output only the caption text, nothing else.`,
        messages: [{ role: 'user', content: `Product: ${title}\n${description ? `Details: ${String(description).slice(0, 300)}` : ''}\n\nWrite the Saudi Arabic ad caption (<=100 chars).` }],
      })
      caption = resp.content[0].type === 'text' ? resp.content[0].text.trim() : ''
      if (caption.length > 100) caption = caption.slice(0, 100)
    } catch {
      caption = ''
    }
  }
  if (!caption) caption = String(title).slice(0, 100)

  const landingUrl = getProductLandingUrl(store.slug, product.id)

  return NextResponse.json({
    productId: product.id,
    landingUrl,
    caption,
    price: numericPrice,
    currency: store.currency,
  })
}
