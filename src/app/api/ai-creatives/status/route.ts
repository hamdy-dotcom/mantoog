import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

const FAL_BASE = 'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')
  const productId = searchParams.get('productId')
  const storeId = searchParams.get('storeId')

  if (!requestId || !productId) {
    return NextResponse.json({ error: 'requestId and productId required' }, { status: 400 })
  }

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  const statusRes = await fetch(`${FAL_BASE}/requests/${requestId}/status`, {
    headers: { 'Authorization': `Key ${falKey}` },
  })
  if (!statusRes.ok) return NextResponse.json({ status: 'pending' })

  const { status } = await statusRes.json()

  if (status === 'FAILED' || status === 'ERROR') {
    return NextResponse.json({ status: 'failed', error: 'Generation failed on fal.ai' })
  }

  if (status !== 'COMPLETED') {
    return NextResponse.json({ status: 'pending' })
  }

  // Fetch result
  const resultRes = await fetch(`${FAL_BASE}/requests/${requestId}`, {
    headers: { 'Authorization': `Key ${falKey}` },
  })
  if (!resultRes.ok) return NextResponse.json({ status: 'pending' })

  const result = await resultRes.json()
  const videoUrl: string | null = result.video?.url ?? null
  if (!videoUrl) return NextResponse.json({ status: 'failed', error: 'No video URL in result' })

  // Register in product_creatives
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('product_creatives')
    .insert({
      product_id: productId,
      store_id: storeId || null,
      type: 'video',
      url: videoUrl,
      thumbnail_url: null,
      name: 'AI Generated',
      source: 'ai_ugc',
    })
    .select('*')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ status: 'completed', item: { ...row, virtual: false } })
}
