import type { CreateAdWizardPayload } from '@/lib/tiktok/create-ad/types'
import { getProductLandingUrl } from '@/lib/site-url'
import { supabaseAdmin } from '@/lib/tiktok/server'

/** Always send TikTok a public production landing URL, never localhost. */
export async function withPublicProductLandingUrl(
  payload: CreateAdWizardPayload,
  storeId: string
): Promise<CreateAdWizardPayload> {
  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('slug')
    .eq('id', storeId)
    .single()

  if (!store?.slug || !payload.product?.id) return payload

  return {
    ...payload,
    product: {
      ...payload.product,
      landing_url: getProductLandingUrl(store.slug, payload.product.id),
    },
  }
}
