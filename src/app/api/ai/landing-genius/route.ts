import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { generateGeniusLanding, type GeniusProduct } from '@/lib/landing-genius/generate'

export const runtime = 'nodejs'
export const maxDuration = 300

const CREDIT_COST = 200

// Premium "AI Genius" landing page: generates a bespoke, self-contained HTML landing
// (real product composed into scenes via image-to-image + blended cutout hero +
// Mantoog-compatible checkout) and stores it on the product's landing_pages row.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase.from('stores').select('id, slug, currency').eq('merchant_id', user.id).single()
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { productId, title, price, compareAtPrice, description, features, images } = body
  if (!productId || !title || !Array.isArray(images) || !images.length) {
    return NextResponse.json({ error: 'productId, title and images required' }, { status: 400 })
  }

  const anthropic = process.env.ANTHROPIC_API_KEY
  const seedance = process.env.SEEDANCE_API_KEY
  if (!anthropic || !seedance) return NextResponse.json({ error: 'AI keys not configured' }, { status: 500 })

  // 1) Credit balance check (order_credits wallet)
  const { data: creditRows } = await supabaseAdmin
    .from('order_credits').select('id, credits_total, credits_used')
    .eq('merchant_id', user.id).order('created_at', { ascending: false })
  const balance = (creditRows || []).reduce((s, r) => s + (Number(r.credits_total) - Number(r.credits_used)), 0)
  if (balance < CREDIT_COST) {
    return NextResponse.json({ error: `Not enough credits: ${balance}/${CREDIT_COST}`, needsCredits: true, balance }, { status: 402 })
  }

  const product: GeniusProduct = {
    title, price: price != null ? Number(price) : null, compareAtPrice: compareAtPrice != null ? Number(compareAtPrice) : null,
    currency: store.currency || 'SAR', description: description || '', features: Array.isArray(features) ? features : [],
    images: images.filter(Boolean).slice(0, 6),
  }

  // Uploader for the transparent cutout PNG → public URL
  const uploadCutout = async (png: Buffer): Promise<string> => {
    const path = `landing-genius/cut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    const up = await supabaseAdmin.storage.from('store-assets').upload(path, png, { contentType: 'image/png', upsert: true })
    if (up.error) throw new Error('cutout upload: ' + up.error.message)
    return supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl
  }

  // 2) Generate (long-running)
  let html: string
  try {
    const out = await generateGeniusLanding(product, { anthropic, seedance }, uploadCutout)
    html = out.html
    if (!html || !html.includes('</html>')) throw new Error('generation returned incomplete HTML')
  } catch (e: any) {
    return NextResponse.json({ error: `Generation failed: ${e.message}` }, { status: 502 })
  }

  // 3) Live config the storefront injects (keeps offers/price editable, not frozen)
  const landingConfig = {
    productName: title,
    price: product.price,
    currency: product.currency,
    showQuantity: true,
    showNote: false,
    shipping: 0,
    offers: [],
    bump: null,
  }

  // 4) Save onto the product's landing_pages row (upsert)
  const { data: existing } = await supabase.from('landing_pages').select('id').eq('product_id', productId).maybeSingle()
  const row = { landing_type: 'custom_html', custom_html: html, landing_config: landingConfig, ai_generated: true, published: true }
  if (existing?.id) {
    await supabaseAdmin.from('landing_pages').update(row).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('landing_pages').insert({ product_id: productId, store_id: store.id, merchant_id: user.id, ...row })
  }

  // 5) Deduct credits (best-effort on latest row)
  if (creditRows && creditRows[0]) {
    await supabaseAdmin.from('order_credits')
      .update({ credits_used: Number(creditRows[0].credits_used) + CREDIT_COST })
      .eq('id', creditRows[0].id)
  }

  return NextResponse.json({ ok: true, creditsCharged: CREDIT_COST, creditsRemaining: balance - CREDIT_COST })
}
