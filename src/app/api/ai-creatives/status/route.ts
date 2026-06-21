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
  const storeId = searchParams.get('storeId') || null

  if (!requestId || !productId) {
    return NextResponse.json({ error: 'requestId and productId required' }, { status: 400 })
  }

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  // Check fal.ai job status
  let falStatus: string
  try {
    const statusRes = await fetch(`${FAL_BASE}/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${falKey}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!statusRes.ok) {
      return NextResponse.json({ status: 'pending', debug: `status check ${statusRes.status}` })
    }
    const body = await statusRes.json()
    falStatus = body?.status ?? 'UNKNOWN'
  } catch (e: any) {
    return NextResponse.json({ status: 'pending', debug: e?.message })
  }

  if (falStatus === 'FAILED' || falStatus === 'ERROR') {
    return NextResponse.json({ status: 'failed', error: `fal.ai job ${falStatus}` })
  }

  if (falStatus !== 'COMPLETED') {
    return NextResponse.json({ status: 'pending', falStatus })
  }

  // Fetch the result
  let videoUrl: string | null = null
  try {
    const resultRes = await fetch(`${FAL_BASE}/requests/${requestId}`, {
      headers: { 'Authorization': `Key ${falKey}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!resultRes.ok) {
      return NextResponse.json({ status: 'failed', error: `result fetch failed: ${resultRes.status}` })
    }
    const result = await resultRes.json()
    videoUrl = result?.video?.url ?? result?.videos?.[0]?.url ?? null
    if (!videoUrl) {
      return NextResponse.json({ status: 'failed', error: `no video url in result: ${JSON.stringify(result).slice(0, 200)}` })
    }
  } catch (e: any) {
    return NextResponse.json({ status: 'failed', error: `result fetch error: ${e?.message}` })
  }

  // Register video in product_creatives
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('product_creatives')
    .insert({
      product_id: productId,
      store_id: storeId,
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
