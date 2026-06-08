import { NextRequest, NextResponse } from 'next/server'

const META_TOKEN = process.env.META_AD_TOKEN!

export async function POST(request: NextRequest) {
  try {
    const { query, country } = await request.json()
    const url = new URL('https://graph.facebook.com/v19.0/ads_archive')
    url.searchParams.set('access_token', META_TOKEN)
    url.searchParams.set('search_terms', query)
    url.searchParams.set('ad_reached_countries', JSON.stringify([country]))
    url.searchParams.set('ad_active_status', 'ACTIVE')
    url.searchParams.set('limit', '12')
    url.searchParams.set('search_type', 'KEYWORD_UNORDERED')
    url.searchParams.set('fields', 'id,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,ad_snapshot_url,page_name')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.error) {
      console.error('Meta ad spy error:', data.error.message)
      return NextResponse.json({ success: false, results: [] })
    }

    const ads = (data.data || []).map((ad: any) => {
      const startDate = ad.ad_delivery_start_time
        ? new Date(ad.ad_delivery_start_time).toLocaleDateString()
        : null
      const daysRunning = ad.ad_delivery_start_time
        ? Math.floor((Date.now() - new Date(ad.ad_delivery_start_time).getTime()) / 86400000)
        : 0
      return {
        advertiser: ad.page_name || 'Unknown',
        text: ad.ad_creative_bodies?.[0] || ad.ad_creative_link_titles?.[0] || '',
        startDate,
        daysRunning,
        url: ad.ad_snapshot_url || null,
        status: 'active',
      }
    })

    return NextResponse.json({ success: true, results: ads })
  } catch (error: any) {
    return NextResponse.json({ success: false, results: [], error: error.message })
  }
}
