import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')
  const productId = searchParams.get('productId')
  const storeId = searchParams.get('storeId') || null
  const responseUrl = searchParams.get('responseUrl') || null
  // Use the status_url fal.ai gave us on submit — most reliable
  const statusUrl = searchParams.get('statusUrl')
    || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${requestId}/status`

  if (!requestId || !productId) {
    return NextResponse.json({ error: 'requestId and productId required' }, { status: 400 })
  }

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  // Check fal.ai status
  let statusBody: any
  try {
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${falKey}` },
      signal: AbortSignal.timeout(10000),
    })
    const text = await statusRes.text()
    if (!statusRes.ok) {
      // Expose the actual fal.ai error — do NOT swallow it as "pending"
      return NextResponse.json({
        status: 'failed',
        error: `fal.ai status ${statusRes.status}: ${text.slice(0, 300)}`,
      })
    }
    statusBody = JSON.parse(text)
  } catch (e: any) {
    return NextResponse.json({ status: 'pending', debug: `status fetch error: ${e?.message}` })
  }

  const falStatus: string = statusBody?.status ?? 'UNKNOWN'

  if (falStatus === 'FAILED' || falStatus === 'ERROR') {
    return NextResponse.json({ status: 'failed', error: `fal.ai: ${falStatus}`, debug: statusBody })
  }

  if (falStatus !== 'COMPLETED') {
    return NextResponse.json({ status: 'pending', falStatus })
  }

  // Job is COMPLETED — fetch the video result
  // fal.ai includes response_url in the status body when COMPLETED
  const resultUrl = statusBody?.response_url
    || responseUrl
    || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${requestId}`

  let videoUrl: string | null = null
  try {
    const resultRes = await fetch(resultUrl, {
      headers: { 'Authorization': `Key ${falKey}` },
      signal: AbortSignal.timeout(10000),
    })
    const text = await resultRes.text()
    if (!resultRes.ok) {
      return NextResponse.json({
        status: 'failed',
        error: `fal.ai result ${resultRes.status}: ${text.slice(0, 300)}`,
      })
    }
    const result = JSON.parse(text)
    videoUrl = result?.video?.url
      ?? result?.videos?.[0]?.url
      ?? result?.output?.video?.url
      ?? null
    if (!videoUrl) {
      return NextResponse.json({
        status: 'failed',
        error: `video url not found. result keys: ${Object.keys(result).join(', ')}`,
      })
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

  return NextResponse.json({ status: 'completed', item: row })
}
