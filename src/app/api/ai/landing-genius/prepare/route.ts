import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { prepareAssets, type GeniusProduct } from '@/lib/landing-genius/generate'

export const runtime = 'nodejs'
export const maxDuration = 180

const CREDIT_COST = 200

// Stage 1: art direction + AI images + cutout. Split from the final assembly so no
// single request hits the function time limit. Does NOT charge credits (finish does).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, price, compareAtPrice, description, features, images, stage } = await req.json().catch(() => ({}))
  if (!title || !Array.isArray(images) || !images.length) {
    return NextResponse.json({ error: 'title and images required' }, { status: 400 })
  }

  const anthropic = process.env.ANTHROPIC_API_KEY
  const seedance = process.env.SEEDANCE_API_KEY
  if (!anthropic || !seedance) return NextResponse.json({ error: 'AI keys not configured' }, { status: 500 })

  // Fail fast if not enough credits (charged only at finish)
  const { data: creditRows } = await supabaseAdmin
    .from('order_credits').select('credits_total, credits_used').eq('merchant_id', user.id)
  const balance = (creditRows || []).reduce((s, r) => s + (Number(r.credits_total) - Number(r.credits_used)), 0)
  if (balance < CREDIT_COST) return NextResponse.json({ error: `Not enough credits: ${balance}/${CREDIT_COST}`, needsCredits: true }, { status: 402 })

  const { data: store } = await supabase.from('stores').select('currency').eq('merchant_id', user.id).single()

  const product: GeniusProduct = {
    title, price: price != null ? Number(price) : null, compareAtPrice: compareAtPrice != null ? Number(compareAtPrice) : null,
    currency: store?.currency || 'SAR', description: description || '', features: Array.isArray(features) ? features : [],
    images: images.filter(Boolean).slice(0, 6),
  }

  const uploadCutout = async (png: Buffer): Promise<string> => {
    const path = `landing-genius/cut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    const up = await supabaseAdmin.storage.from('store-assets').upload(path, png, { contentType: 'image/png', upsert: true })
    if (up.error) throw new Error('cutout upload: ' + up.error.message)
    return supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl
  }

  try {
    // Staged pipeline: content ONLY (one Claude call, ~60-90s — far under the limit).
    // Images run in parallel via /start-images + /image-status; the sum never lives
    // inside one invocation again (that sum is what caused the 504s).
    if (stage === 'art') {
      const { artDirectContent } = await import('@/lib/landing-genius/generate')
      const art = await artDirectContent(product, anthropic)
      return NextResponse.json({ ok: true, art })
    }
    const { art, generated, cutoutUrl } = await prepareAssets(product, { anthropic, seedance }, uploadCutout)
    return NextResponse.json({ ok: true, art, generated, cutoutUrl })
  } catch (e: any) {
    // Curated Arabic only — raw technical detail goes to server logs, never the UI.
    console.error('[landing-genius/prepare] failed:', e?.message)
    const msg = /art_direction_json/.test(String(e?.message))
      ? 'رد الذكاء الاصطناعي وصل غير مكتمل — أعد المحاولة وغالبًا ستنجح.'
      : 'تعذّر تجهيز الصفحة المميزة — أعد المحاولة بعد قليل.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
