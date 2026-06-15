import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const keyword = new URL(request.url).searchParams.get('q') || ''
  if (!keyword) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  const rapidKey = process.env.RAPIDAPI_KEY || ''
  const url = `https://tiktok-api23.p.rapidapi.com/api/search/video?keyword=${encodeURIComponent(keyword)}&cursor=0&search_id=0`

  const res = await fetch(url, {
    headers: {
      'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
      'x-rapidapi-key': rapidKey,
    },
  })
  const data = await res.json()

  let items: any[] = []
  if (Array.isArray(data)) items = data
  else if (Array.isArray(data?.data)) items = data.data
  else if (Array.isArray(data?.data?.videos)) items = data.data.videos
  else if (Array.isArray(data?.data?.items)) items = data.data.items
  else if (Array.isArray(data?.itemList)) items = data.itemList
  else if (Array.isArray(data?.item_list)) items = data.item_list
  else {
    for (const key of Object.keys(data || {})) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        const f = data[key][0]
        if (f && (f.id || f.aweme_id || f.desc)) { items = data[key]; break }
      }
      if (data[key] && typeof data[key] === 'object') {
        for (const k2 of Object.keys(data[key] || {})) {
          if (Array.isArray(data[key][k2]) && data[key][k2].length > 0) {
            const f = data[key][k2][0]
            if (f && (f.id || f.aweme_id || f.desc)) { items = data[key][k2]; break }
          }
        }
      }
    }
  }

  const videos = items.map((v: any, i: number) => {
    const id = String(v.id || v.aweme_id || v.video_id || i)
    const stats = v.stats || v.statistics || v.stat || {}
    const plays = parseInt(v.playCount || stats.playCount || stats.play_count || stats.vv || 0) || 0
    const likes = parseInt(v.diggCount || stats.diggCount || stats.like_count || 0) || 0
    const comments = parseInt(v.commentCount || stats.commentCount || stats.comment_count || 0) || 0
    const shares = parseInt(v.shareCount || stats.shareCount || stats.share_count || 0) || 0
    const author = v.author || v.authorInfo || v.user || {}
    const nickname = author.uniqueId || author.unique_id || author.nickname || 'unknown'
    const displayName = author.nickname || nickname
    const title = v.desc || v.title || '(بدون عنوان)'
    const vid = v.video || {}
    let thumb = vid.cover || vid.originCover || v.thumbnail || v.cover || ''
    if (thumb && typeof thumb === 'object') thumb = thumb?.urlList?.[0] || ''
    const eng = plays > 0 ? ((likes + comments + shares) / plays) : 0
    const score = Math.min(99, Math.round(20 + Math.log10(plays + 10) * 8 + eng * 400))
    return { id, platform: 'tiktok', title, channel: displayName, nickname, thumb: String(thumb), views: plays, likes, comments, shares, score, url: `https://www.tiktok.com/@${nickname}/video/${id}`, ytId: null }
  }).filter((v: any) => v.id)

  return NextResponse.json({ videos })
}
