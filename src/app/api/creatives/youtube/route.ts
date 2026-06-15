import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('YOUTUBE_API_KEY exists:', !!process.env.YOUTUBE_API_KEY)
  console.log('YOUTUBE_API_KEY length:', process.env.YOUTUBE_API_KEY?.length)
  const keyword = new URL(request.url).searchParams.get('q') || ''
  const ytKey = process.env.YOUTUBE_API_KEY || ''
  if (!keyword) return NextResponse.json({ error: 'Query required' }, { status: 400 })
  if (!ytKey) return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(keyword)}&videoDuration=short&maxResults=15&order=relevance&key=${ytKey}`
  const sr = await fetch(searchUrl)
  const sd = await sr.json()
  if (sd.error) return NextResponse.json({ error: sd.error.message }, { status: 400 })
  if (!sd.items?.length) return NextResponse.json({ videos: [] })

  const ids = sd.items.map((i: any) => i.id.videoId).join(',')
  const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids}&key=${ytKey}`)
  const statsData = await statsRes.json()
  const statsMap: any = {}
  ;(statsData.items || []).forEach((i: any) => { statsMap[i.id] = i })

  const videos = sd.items.map((item: any) => {
    const vid = item.id.videoId
    const st = statsMap[vid]
    const views = parseInt(st?.statistics?.viewCount || 0)
    const likes = parseInt(st?.statistics?.likeCount || 0)
    const comments = parseInt(st?.statistics?.commentCount || 0)
    const eng = views > 0 ? ((likes + comments) / views) : 0
    const score = Math.min(99, Math.round(30 + Math.log10(views + 10) * 9 + eng * 500))
    return {
      id: vid, platform: 'youtube',
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      nickname: item.snippet.channelTitle,
      thumb: (item.snippet.thumbnails.high || item.snippet.thumbnails.default || {}).url || '',
      views, likes, comments, shares: 0, score,
      url: `https://www.youtube.com/shorts/${vid}`,
      ytId: vid
    }
  })

  return NextResponse.json({ videos })
}
