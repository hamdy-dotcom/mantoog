import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url).searchParams.get('url') || ''
  if (!url) return NextResponse.json({ title: null })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })

    const html = await res.text()

    const og = html.match(/property="og:title"\s+content="([^"]+)"/i) ||
                html.match(/content="([^"]+)"\s+property="og:title"/i)
    if (og) {
      const title = og[1].replace(/\s*[-|].*?(Amazon|أمازون).*/i, '').trim()
      if (title.length > 3) return NextResponse.json({ title })
    }

    const pt = html.match(/id="productTitle"[^>]*>\s*([^<]{4,})/i)
    if (pt) return NextResponse.json({ title: pt[1].trim() })

    const tg = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (tg) {
      const title = tg[1].replace(/\s*[-|:].*?(Amazon|أمازون).*/i, '').replace(/^(Amazon|أمازون)[^:]*:\s*/i, '').trim()
      if (title.length > 3) return NextResponse.json({ title })
    }

    return NextResponse.json({ title: null })
  } catch {
    return NextResponse.json({ title: null })
  }
}
