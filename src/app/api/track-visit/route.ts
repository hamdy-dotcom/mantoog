import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { landing_page_id } = await request.json()
    if (!landing_page_id) return NextResponse.json({ success: false })

    const { error } = await supabase.rpc('increment_visits', { lp_id: landing_page_id })

    if (error) {
      const { data: lp } = await supabase.from('landing_pages').select('visits').eq('id', landing_page_id).single()
      await supabase.from('landing_pages').update({ visits: (lp?.visits || 0) + 1 }).eq('id', landing_page_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
