import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country_code = searchParams.get('country') || 'EG'
  const last = searchParams.get('period') || '7'
  const order_by = searchParams.get('order_by') || 'impression'
  const category_id = searchParams.get('category') || ''
  const page = searchParams.get('page') || '1'

  const url = new URL('https://tiktok-api23.p.rapidapi.com/api/trending/top-products')
  url.searchParams.set('page', page)
  url.searchParams.set('last', last)
  url.searchParams.set('order_by', order_by)
  url.searchParams.set('order_type', 'desc')
  url.searchParams.set('country_code', country_code)
  if (category_id) url.searchParams.set('category_id', category_id)

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
