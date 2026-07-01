import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'

export async function GET(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')
  const responseUrl = searchParams.get('responseUrl') || null
  const statusUrl = searchParams.get('statusUrl')
    || (requestId ? `https://queue.fal.run/fal-ai/veo3.1/lite/requests/${requestId}/status` : null)

  // statusUrl (preferred) OR requestId is required
  if (!statusUrl) return NextResponse.json({ error: 'statusUrl or requestId required' }, { status: 400 })

  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  let statusBody: any
  try {
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${falKey}` },
      signal: AbortSignal.timeout(10000),
    })
    const text = await statusRes.text()
    if (!statusRes.ok) {
      return NextResponse.json({
        status: 'failed',
        error: `fal.ai status ${statusRes.status}: ${text.slice(0, 300)}`,
      })
    }
    statusBody = JSON.parse(text)
  } catch (e: any) {
    return NextResponse.json({ status: 'pending', debug: e?.message })
  }

  const falStatus: string = statusBody?.status ?? 'UNKNOWN'

  if (falStatus === 'FAILED' || falStatus === 'ERROR') {
    return NextResponse.json({ status: 'failed', error: `fal.ai: ${falStatus}` })
  }

  if (falStatus !== 'COMPLETED') {
    return NextResponse.json({ status: 'pending', falStatus })
  }

  // COMPLETED — fetch video result
  const resultUrl = statusBody?.response_url
    || responseUrl
    || `https://queue.fal.run/fal-ai/veo3.1/lite/requests/${requestId}`

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
    videoUrl = result?.video?.url ?? result?.videos?.[0]?.url ?? result?.output?.video?.url ?? null
    if (!videoUrl) {
      return NextResponse.json({
        status: 'failed',
        error: `video url not found. keys: ${Object.keys(result).join(', ')}`,
      })
    }
  } catch (e: any) {
    return NextResponse.json({ status: 'failed', error: `result fetch error: ${e?.message}` })
  }

  return NextResponse.json({ status: 'completed', videoUrl })
}
