import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export type AdminUser = { id: string; email: string }

export async function assertAdmin(req?: NextRequest): Promise<
  { ok: true; user: AdminUser } | { ok: false; response: NextResponse }
> {
  let user = null

  // Try Bearer token first (used by demo page where session is in localStorage only)
  const authHeader = req?.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data } = await supabaseAdmin.auth.getUser(token)
    user = data.user
  }

  // Fall back to cookie-based session
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!admin) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true, user: { id: user.id, email: user.email ?? '' } }
}
