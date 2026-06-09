import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country') || 'US'
  const period = searchParams.get('period') || '7'
  const order_by = searchParams.get('order_by') || 'impression'
  const page = searchParams.get('page') || '1'

  const url = new URL('https://tiktok-api23.p.rapidapi.com/api/trending/ads')
  url.searchParams.set('page', page)
  url.searchParams.set('period', period)
  url.searchParams.set('limit', '20')
  url.searchParams.set('country', country)
  url.searchParams.set('order_by', order_by)
  url.searchParams.set('objective', '7') // Product sales only
  url.searchParams.set('like', '1') // Top 1-20% most liked

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
        'x-rapidapi-key': process.env.TIKTOK_RAPIDAPI_KEY!,
      },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
