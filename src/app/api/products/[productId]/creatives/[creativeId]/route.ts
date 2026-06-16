import { NextRequest, NextResponse } from 'next/server'
import { deleteProductCreative } from '@/lib/product-creatives/server'

type RouteCtx = { params: Promise<{ productId: string; creativeId: string }> }

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { productId, creativeId } = await ctx.params
  const result = await deleteProductCreative(productId, creativeId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
