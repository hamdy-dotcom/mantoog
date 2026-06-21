import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

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

  // Submit job to fal.ai queue — returns immediately with request_id
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

  return NextResponse.json({ requestId: request_id, productId, storeId: product.store_id, status: 'pending' })
}
