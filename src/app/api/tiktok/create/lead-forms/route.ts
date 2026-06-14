import { NextResponse } from 'next/server'
import { fetchLeadForms } from '@/lib/tiktok/create-ad/lead-forms'
import { resolveOrThrow } from '@/lib/tiktok/mutations'

export async function GET() {
  try {
    const { connection } = await resolveOrThrow()
    const result = await fetchLeadForms(connection)
    return NextResponse.json({
      items: result.items,
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
