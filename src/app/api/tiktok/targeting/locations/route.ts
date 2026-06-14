import { NextRequest, NextResponse } from 'next/server'
import type { AdGoal } from '@/lib/tiktok/create-ad/types'
import { fetchCountryLocations, searchTargetLocations } from '@/lib/tiktok/targeting/locations'
import { resolveOrThrow } from '@/lib/tiktok/mutations'

const VALID_GOALS = new Set<AdGoal>(['leads', 'orders', 'visits'])

export async function GET(req: NextRequest) {
  try {
    const { connection } = await resolveOrThrow()
    const goal = (req.nextUrl.searchParams.get('goal') || 'orders') as AdGoal
    const q = req.nextUrl.searchParams.get('q')?.trim() || ''

    if (!VALID_GOALS.has(goal)) {
      return NextResponse.json({ error: 'invalid_goal' }, { status: 400 })
    }

    if (q) {
      const search = await searchTargetLocations(connection, goal, q)
      return NextResponse.json({
        items: search.items,
        cached: false,
        search: true,
        error: search.error ?? null,
      })
    }

    const result = await fetchCountryLocations(connection, goal)
    return NextResponse.json({
      items: result.items,
      cached: result.cached,
      search: false,
      error: result.error ?? null,
    })
  } catch (e: unknown) {
    const err = e as Error & { status?: number }
    if (err.message === 'reauth_required') {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
