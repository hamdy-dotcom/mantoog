import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  resolveActiveConnection,
  resolveAdvertiserCurrency,
  resolveAdvertiserTimezone,
} from '@/lib/tiktok/server'
import { defaultScheduleStartLocal } from '@/lib/tiktok/create-ad/schedule'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, currency, tiktok_pixel_id')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const resolved = await resolveActiveConnection()
  if ('error' in resolved) {
    return NextResponse.json({
      error: resolved.error,
      store,
      products: [],
      has_active_account: false,
    })
  }

  const currency = await resolveAdvertiserCurrency(resolved.connection, store.id)
  const timezone = await resolveAdvertiserTimezone(resolved.connection, currency)

  const { data: products } = await supabase
    .from('products')
    .select('id, title, description, price, currency, images, status')
    .eq('store_id', store.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const items = (products || []).map(p => {
    const images = Array.isArray(p.images) ? p.images : []
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: Number(p.price),
      currency: p.currency || currency,
      images,
      landing_url: `${origin}/${store.slug}/${p.id}`,
    }
  })

  return NextResponse.json({
    store: {
      id: store.id,
      slug: store.slug,
      currency,
      tiktok_pixel_id: store.tiktok_pixel_id,
      timezone,
      default_schedule_start: defaultScheduleStartLocal(timezone),
    },
    products: items,
    has_active_account: true,
    advertiser_id: resolved.connection.advertiser_id,
  })
}
