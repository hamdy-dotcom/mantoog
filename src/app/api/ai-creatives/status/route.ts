import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

const FAL_QUEUE = 'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')
  const productId = searchParams.get('productId')
  const storeId = searchParams.get('storeId') || null
  // response_url is provided by fal.ai in the submit response — use it directly
  const responseUrl = searchParams.get('responseUrl') || null

  if (!requestId || !productId) {
    return NextResponse.json({ error: 'requestId and productId required' }, { status: 400 })
  }

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  // Poll fal.ai status
  let falStatus: string
  let completedResponseUrl: string | null = null
  try {
    const statusRes = await fetch(`${FAL_QUEUE}/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${falKey}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!statusRes.ok) {
      return NextResponse.json({ status: 'pending' })
    }
    const body = await statusRes.json()
    falStatus = body?.status ?? 'UNKNOWN'
    // fal.ai includes response_url in the COMPLETED status body
    completedResponseUrl = body?.response_url ?? null
  } catch (e: any) {
    return NextResponse.json({ status: 'pending' })
  }

  if (falStatus === 'FAILED' || falStatus === 'ERROR') {
    return NextResponse.json({ status: 'failed', error: `fal.ai job ${falStatus}` })
  }

  if (falStatus !== 'COMPLETED') {
    return NextResponse.json({ status: 'pending', falStatus })
  }

  // Fetch the video result — prefer response_url from fal.ai, fall back to manual URL
  const fetchUrl = completedResponseUrl || responseUrl || `${FAL_QUEUE}/requests/${requestId}`

  let videoUrl: string | null = null
  try {
    const resultRes = await fetch(fetchUrl, {
      headers: { 'Authorization': `Key ${falKey}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!resultRes.ok) {
      return NextResponse.json({ status: 'failed', error: `result fetch ${resultRes.status}` })
    }
    const result = await resultRes.json()
    videoUrl = result?.video?.url
      ?? result?.videos?.[0]?.url
      ?? result?.output?.video?.url
      ?? null
    if (!videoUrl) {
      return NextResponse.json({ status: 'failed', error: `no video url. keys: ${Object.keys(result).join(',')}` })
    }
  } catch (e: any) {
    return NextResponse.json({ status: 'failed', error: `result fetch error: ${e?.message}` })
  }

  // Save to product_creatives
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
