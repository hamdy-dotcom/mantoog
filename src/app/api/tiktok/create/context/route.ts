import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  resolveActiveConnection,
  resolveAdvertiserCurrency,
  resolveAdvertiserTimezone,
} from '@/lib/tiktok/server'
import { defaultScheduleStartLocal } from '@/lib/tiktok/create-ad/schedule'
import { getProductLandingUrl } from '@/lib/site-url'
import { resolveConversionPixel } from '@/lib/tiktok/pixels'
import {
  buildConversionUiOptions,
  defaultConversionPreference,
} from '@/lib/tiktok/create-ad/optimization-events'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, name, currency, tiktok_pixel_id')
    .eq('merchant_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'no_store' }, { status: 404 })

  const resolved = await resolveActiveConnection()
  if ('error' in resolved) {
    return NextResponse.json({
      error: resolved.error,
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        currency: store.currency || 'SAR',
        ad_currency: store.currency || 'SAR',
        tiktok_pixel_id: store.tiktok_pixel_id,
      },
      products: [],
      has_active_account: false,
    })
  }

  const storeCurrency = store.currency || 'SAR'
  const adCurrency = await resolveAdvertiserCurrency(resolved.connection, store.id)
  const timezone = await resolveAdvertiserTimezone(resolved.connection, adCurrency)

  const { data: products } = await supabase
    .from('products')
    .select('id, title, description, price, currency, images, status')
    .eq('store_id', store.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const items = (products || []).map(p => {
    const images = Array.isArray(p.images) ? p.images : []
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: Number(p.price),
      currency: p.currency || storeCurrency,
      images,
      landing_url: getProductLandingUrl(store.slug, p.id),
    }
  })

  let pixel_conversion: {
    available_events: string[]
    default_optimization_event: string
    default_preference: string
    options: ReturnType<typeof buildConversionUiOptions>
  } | null = null

  if (store.tiktok_pixel_id) {
    const pixelResolved = await resolveConversionPixel(
      resolved.connection,
      store.tiktok_pixel_id
    )
    if (!('error' in pixelResolved)) {
      pixel_conversion = {
        available_events: pixelResolved.available_events,
        default_optimization_event: pixelResolved.optimization_event,
        default_preference: defaultConversionPreference(pixelResolved.available_events),
        options: buildConversionUiOptions(pixelResolved.available_events),
      }
    }
  }

  return NextResponse.json({
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      currency: storeCurrency,
      ad_currency: adCurrency,
      tiktok_pixel_id: store.tiktok_pixel_id,
      timezone,
      default_schedule_start: defaultScheduleStartLocal(timezone),
    },
    products: items,
    has_active_account: true,
    advertiser_id: resolved.connection.advertiser_id,
    pixel_conversion,
  })
}
