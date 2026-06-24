import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/tiktok/server'

export type AdminUser = { id: string; email: string }

export async function assertAdmin(): Promise<
  { ok: true; user: AdminUser } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
