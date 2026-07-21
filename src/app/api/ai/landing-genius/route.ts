import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { assembleHtml, type GeniusProduct } from '@/lib/landing-genius/generate'

export const runtime = 'nodejs'
export const maxDuration = 300

const CREDIT_COST = 200

// Stage 2 (finish): body-only re-skin (~130s) + programmatic palette swap → full HTML,
// then charge 200 credits and save onto the product's landing_pages row.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase.from('stores').select('id, currency').eq('merchant_id', user.id).single()
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const { productId, title, price, compareAtPrice, description, features, images, art, generated, cutoutUrl } = await req.json().catch(() => ({}))
  if (!productId || !title || !art || !cutoutUrl) {
    return NextResponse.json({ error: 'productId, title and prepared assets required' }, { status: 400 })
  }

  const anthropic = process.env.ANTHROPIC_API_KEY
  if (!anthropic) return NextResponse.json({ error: 'AI key not configured' }, { status: 500 })

  const { data: creditRows } = await supabaseAdmin
    .from('order_credits').select('id, credits_total, credits_used')
    .eq('merchant_id', user.id).order('created_at', { ascending: false })
  const balance = (creditRows || []).reduce((s, r) => s + (Number(r.credits_total) - Number(r.credits_used)), 0)
  if (balance < CREDIT_COST) return NextResponse.json({ error: `Not enough credits: ${balance}/${CREDIT_COST}`, needsCredits: true }, { status: 402 })

  const product: GeniusProduct = {
    title, price: price != null ? Number(price) : null, compareAtPrice: compareAtPrice != null ? Number(compareAtPrice) : null,
    currency: store.currency || 'SAR', description: description || '', features: Array.isArray(features) ? features : [],
    images: Array.isArray(images) ? images.filter(Boolean).slice(0, 6) : [],
  }

  let html: string
  try {
    html = await assembleHtml(product, art, Array.isArray(generated) ? generated : [], cutoutUrl, { anthropic })
    if (!html || !html.includes('</html>')) throw new Error('assembly returned incomplete HTML')
  } catch (e: any) {
    return NextResponse.json({ error: `Assembly failed: ${e.message}` }, { status: 502 })
  }

  const landingConfig = {
    productName: title, price: product.price, currency: product.currency, cutout: cutoutUrl,
    showQuantity: true, showNote: false, shipping: 0, offers: [], bump: null,
  }

  const { data: existing } = await supabase.from('landing_pages').select('id').eq('product_id', productId).maybeSingle()
  const row = { landing_type: 'custom_html', custom_html: html, landing_config: landingConfig, ai_generated: true, published: true }
  if (existing?.id) {
    await supabaseAdmin.from('landing_pages').update(row).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('landing_pages').insert({ product_id: productId, store_id: store.id, merchant_id: user.id, ...row })
  }

  if (creditRows && creditRows[0]) {
    await supabaseAdmin.from('order_credits')
      .update({ credits_used: Number(creditRows[0].credits_used) + CREDIT_COST })
      .eq('id', creditRows[0].id)
  }

  // Return the assembled HTML + config so callers (e.g. the ugc-creatives wizard)
  // can preview the exact published page inline via <iframe srcDoc> — no dependency
  // on loading the live URL cross-frame (which some hosts/redirects block).
  return NextResponse.json({ ok: true, creditsCharged: CREDIT_COST, creditsRemaining: balance - CREDIT_COST, html, landingConfig })
}
