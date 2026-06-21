import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 60

const FAL_BASE = 'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video'

function buildPrompt(title: string, description: string | null): string {
  const desc = description?.trim() ? ` ${description.slice(0, 200)}` : ''
  return `Create a compelling vertical short-form video ad for: ${title}.${desc} Show the product in use, highlight key benefits, with dynamic engaging visuals suitable for TikTok. 9:16 format, modern energetic style.`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, prompt: userPrompt } = await req.json().catch(() => ({}))
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, title, description, store_id, merchant_id')
    .eq('id', productId)
    .eq('merchant_id', user.id)
    .single()
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  const prompt = (typeof userPrompt === 'string' && userPrompt.trim()) ? userPrompt.trim() : buildPrompt(product.title, product.description)

  // Submit to fal.ai queue
  const submitRes = await fetch(FAL_BASE, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, duration: '5', aspect_ratio: '9:16' }),
  })
  if (!submitRes.ok) {
    const txt = await submitRes.text()
    return NextResponse.json({ error: `fal.ai error: ${txt.slice(0, 200)}` }, { status: 502 })
  }
  const { request_id } = await submitRes.json()
  if (!request_id) return NextResponse.json({ error: 'fal.ai did not return a request_id' }, { status: 502 })

  // Poll for completion (max 55s, check every 4s)
  const statusUrl = `${FAL_BASE}/requests/${request_id}/status`
  const resultUrl = `${FAL_BASE}/requests/${request_id}`
  const deadline = Date.now() + 55_000
  let videoUrl: string | null = null

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000))
    const statusRes = await fetch(statusUrl, { headers: { 'Authorization': `Key ${falKey}` } })
    if (!statusRes.ok) continue
    const { status } = await statusRes.json()
    if (status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, { headers: { 'Authorization': `Key ${falKey}` } })
      if (resultRes.ok) {
        const result = await resultRes.json()
        videoUrl = result.video?.url ?? null
      }
      break
    }
    if (status === 'FAILED' || status === 'ERROR') {
      return NextResponse.json({ error: 'fal.ai generation failed' }, { status: 500 })
    }
  }

  if (!videoUrl) {
    return NextResponse.json({ error: 'Generation timed out — please retry' }, { status: 504 })
  }

  const { data: row, error: insertErr } = await supabaseAdmin
    .from('product_creatives')
    .insert({
      product_id: productId,
      store_id: product.store_id,
      type: 'video',
      url: videoUrl,
      thumbnail_url: null,
      name: 'AI Generated',
      source: 'ai_ugc',
    })
    .select('*')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ item: { ...row, virtual: false } })
}
