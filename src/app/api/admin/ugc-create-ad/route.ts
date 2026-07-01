import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { createClient } from '@/lib/supabase/server'
import { resolveOrThrow } from '@/lib/tiktok/mutations'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { launchCreateAdAtomic } from '@/lib/tiktok/create-ad/service'
import { DEFAULT_ADVANCED, AGE_OPTIONS, type CreateAdWizardPayload } from '@/lib/tiktok/create-ad/types'
import { fetchCountryLocations } from '@/lib/tiktok/targeting/locations'
import { defaultLocationId } from '@/lib/tiktok/targeting/location-defaults'
import { createPixel } from '@/lib/tiktok/pixels'

export const maxDuration = 120

const CREDIT_COST = 50

// Locked admin template → launches a real TikTok ad from the generated UGC video.
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { productId, videoUrl, caption, dailyBudget, scheduleStart } = await req.json().catch(() => ({}))
  if (!productId || !videoUrl) return NextResponse.json({ error: 'productId and videoUrl required' }, { status: 400 })
  const budget = Number(dailyBudget)
  if (!Number.isFinite(budget) || budget <= 0) return NextResponse.json({ error: 'valid dailyBudget required' }, { status: 400 })
  if (!scheduleStart) return NextResponse.json({ error: 'scheduleStart required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, name, currency, tiktok_pixel_id')
    .eq('merchant_id', user.id)
    .single()
  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  // Credit balance check (order_credits wallet)
  const { data: creditRows } = await supabaseAdmin
    .from('order_credits')
    .select('id, credits_total, credits_used')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })
  const balance = (creditRows || []).reduce((s, r) => s + (Number(r.credits_total) - Number(r.credits_used)), 0)
  if (balance < CREDIT_COST) {
    return NextResponse.json({ error: `Not enough credits: ${balance}/${CREDIT_COST}` }, { status: 402 })
  }

  // Product for the payload
  const { data: product } = await supabase
    .from('products')
    .select('id, title, description, price, currency, images')
    .eq('id', productId)
    .single()
  if (!product) return NextResponse.json({ error: 'product not found' }, { status: 404 })

  // TikTok connection
  let connection: any
  try {
    const resolved = await resolveOrThrow()
    connection = resolved.connection
  } catch (e: any) {
    return NextResponse.json({ error: e.message === 'reauth_required' ? 'reauth_required' : `no active TikTok connection: ${e.message}` }, { status: 401 })
  }

  // Saudi location (defaults from store currency)
  let locationId = ''
  try {
    const loc = await fetchCountryLocations(connection, 'orders')
    locationId = defaultLocationId(loc.items, { storeCurrency: store.currency })
  } catch { /* leave empty; validation will surface */ }
  if (!locationId) return NextResponse.json({ error: 'Could not resolve target location for this store currency' }, { status: 502 })

  // Pixel: reuse store pixel, else best-effort auto-create + save to store
  let pixelId: string | null = store.tiktok_pixel_id
  let pixelWarning: string | null = null
  if (!pixelId) {
    pixelId = await createPixel(connection, `${store.name || 'Store'} Pixel`)
    if (pixelId) {
      await supabaseAdmin.from('stores').update({ tiktok_pixel_id: pixelId }).eq('id', store.id)
    } else {
      pixelWarning = 'No pixel on store and auto-create failed — ad launches without conversion optimization.'
    }
  }

  // Build the locked-template payload
  const payload: CreateAdWizardPayload = {
    product: {
      id: product.id,
      title: product.title,
      description: product.description ?? '',
      price: Number(product.price) || 0,
      currency: product.currency || store.currency || 'SAR',
      images: (product.images as string[]) || [],
      landing_url: '', // service overrides with the public product URL
    },
    creative: {
      source: 'product_video',
      caption: caption || product.title,
      cta: 'order_now',
      media: { video_url: videoUrl },
    },
    targeting: {
      goal: 'orders',
      daily_budget: budget,
      schedule_start: scheduleStart,
      location_id: locationId,
      age_groups: AGE_OPTIONS.map(a => a.id), // all ages (TikTok requires them explicit)
      gender: 'GENDER_UNLIMITED',
      advanced: { ...DEFAULT_ADVANCED, touched: true }, // standard, abo, daily, auto bid/placement, all-day, comments/downloads/sharing on
      conversion_event: 'place_an_order',
    },
    identity: { identity_id: null }, // auto-pick first available
    store: {
      tiktok_pixel_id: pixelId,
      currency: store.currency || 'SAR',
      name: store.name || null,
    },
  }

  const result = await launchCreateAdAtomic(connection, { id: store.id }, payload)
  if (!('ok' in result) || !result.ok) {
    const d = result as any
    const reason = `launch failed at ${d.step || '?'} — ${d.message || d.error || 'unknown'}${d.code ? ` (code ${d.code})` : ''}`
    return NextResponse.json({ error: reason, detail: result }, { status: 502 })
  }

  // Deduct credits (best-effort on latest row)
  if (creditRows && creditRows[0]) {
    await supabaseAdmin
      .from('order_credits')
      .update({ credits_used: Number(creditRows[0].credits_used) + CREDIT_COST })
      .eq('id', creditRows[0].id)
  }

  return NextResponse.json({
    ok: true,
    campaign_id: result.campaign_id,
    adgroup_id: result.adgroup_id,
    ad_id: result.ad_id,
    message: result.message,
    creditsCharged: CREDIT_COST,
    creditsRemaining: balance - CREDIT_COST,
    pixelWarning,
  })
}
