import { supabaseAdmin } from '@/lib/tiktok/server'

/** Flip stores.has_paid for a merchant (idempotent). Call on any confirmed payment. */
export async function markMerchantHasPaid(merchantId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('stores')
    .update({ has_paid: true, updated_at: new Date().toISOString() })
    .eq('merchant_id', merchantId)
    .eq('has_paid', false)

  if (error) {
    console.error('[store/payments] markMerchantHasPaid failed:', error.message, { merchantId })
  }
}

export type CreditPurchaseInput = {
  merchantId: string
  creditsTotal: number
  bundleType: string
  pricePaid: number
}

/** Insert a paid credit bundle and mark the merchant as having paid. */
export async function recordCreditPurchase(input: CreditPurchaseInput): Promise<{ error?: string }> {
  const { merchantId, creditsTotal, bundleType, pricePaid } = input

  const { error: insertError } = await supabaseAdmin.from('order_credits').insert({
    merchant_id: merchantId,
    credits_total: creditsTotal,
    credits_used: 0,
    bundle_type: bundleType,
    price_paid: pricePaid,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  if (pricePaid > 0) {
    await markMerchantHasPaid(merchantId)
  }

  return {}
}
