import { NextRequest, NextResponse } from 'next/server'
import { resolveOrThrow, updateBid } from '@/lib/tiktok/mutations'
import type { BidField, EntityLevel } from '@/lib/tiktok/types'

export async function POST(req: NextRequest) {
  try {
    const { connection } = await resolveOrThrow()
    const { level, entity_id, bid_price, is_smart_plus, bid_field, bid_type, deep_bid_type } = await req.json()
    const price = parseFloat(String(bid_price ?? ''))
    if (!entity_id || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
    const result = await updateBid(
      connection,
      (level || 'adgroups') as EntityLevel,
      String(entity_id),
      price,
      {
        isSmartPlus: Boolean(is_smart_plus),
        bidField: (bid_field as BidField) || 'bid_price',
        bidType: bid_type ? String(bid_type) : null,
        deepBidType: deep_bid_type ? String(deep_bid_type) : null,
      }
    )
    if ('error' in result) {
      console.warn('[tiktok/entity/bid] failed:', result.message, { level, entity_id, bid_field, bid_type })
      return NextResponse.json(result, { status: result.error === 'tiktok_error' ? 502 : 400 })
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 })
  }
}
