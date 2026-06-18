import { NextRequest, NextResponse } from 'next/server'
import {
  fetchIntegratedReport,
  parseQueryDates,
  reportPageSize,
  resolveAdvertiserCurrency,
  tiktokApiFailure,
} from '@/lib/tiktok/server'
import { resolveActiveConnection } from '@/lib/tiktok/server-auth'
import { jsonForTikTokFailure } from '@/lib/tiktok/api-errors'

export async function GET(req: NextRequest) {
  const dates = parseQueryDates(req.nextUrl.searchParams)
  if ('error' in dates) {
    return NextResponse.json({ error: dates.error }, { status: 400 })
  }

  const resolved = await resolveActiveConnection()
  if ('error' in resolved) {
    const activeCount = 'activeCount' in resolved ? resolved.activeCount : undefined
    console.log('[tiktok/report] resolve result:', resolved.error, 'active_rows:', activeCount ?? 'n/a')
    if (resolved.error === 'no_active_account') {
      return NextResponse.json({ error: 'no_active_account', active_count: activeCount ?? 0 })
    }
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }
  console.log('[tiktok/report] using advertiser:', resolved.connection.advertiser_id, 'active_rows:', resolved.activeCount)

  const { connection, store } = resolved
  const { start_date, end_date } = dates

  const [currency, json] = await Promise.all([
    resolveAdvertiserCurrency(connection, store.id),
    fetchIntegratedReport(connection, {
      start_date,
      end_date,
      data_level: 'AUCTION_ADVERTISER',
      dimensions: ['stat_time_day'],
      page_size: reportPageSize(start_date, end_date),
    }),
  ])

  if (json.code !== 0) {
    const failure = await tiktokApiFailure(json.code, json.message, {
      storeId: store.id,
      advertiserId: connection.advertiser_id,
    })
    return jsonForTikTokFailure(failure)
  }

  return NextResponse.json({
    data: json.data?.list ?? [],
    currency,
    start_date,
    end_date,
  })
}
