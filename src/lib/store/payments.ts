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

export type SubscriptionPlan = 'creatives' | 'tiktok' | 'both'

export type SubscriptionInput = {
  merchantId: string
  plan: SubscriptionPlan
  priceEgp: number
  paymentMethod?: string
  paymentReference?: string
}

/** Create or renew a subscription and mark the merchant as having paid. */
export async function recordSubscription(input: SubscriptionInput): Promise<{ error?: string }> {
  const { merchantId, plan, priceEgp, paymentMethod, paymentReference } = input

  const periodStart = new Date()
  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + 30)

  // Expire any existing active subscription for this plan
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('merchant_id', merchantId)
    .eq('plan', plan)
    .eq('status', 'active')

  const { error } = await supabaseAdmin.from('subscriptions').insert({
    merchant_id: merchantId,
    plan,
    status: 'active',
    price_egp: priceEgp,
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    payment_method: paymentMethod,
    payment_reference: paymentReference,
  })

  if (error) {
    return { error: error.message }
  }

  await markMerchantHasPaid(merchantId)
  return {}
}
