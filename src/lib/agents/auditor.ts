import { supabaseAdmin } from '@/lib/tiktok/server'
import { activeDeployments, campaignStats, logAction, storeConnection, touchDeployment, utcDate } from '@/lib/agents/core'

// مدقق الطلبات — Order Auditor.
// Source of truth: Mantoog's OWN order book, not the pixel. Produces the confirmation
// and delivery rates مدير الأرباح builds economics on, and logs a daily reconciliation
// of TikTok-reported conversions vs real orders.

export type StoreRates = {
  totalOrders: number
  confirmedOrders: number
  confirmationRate: number | null   // null when the sample is too small to trust
  deliveryRate: number | null
  sampleDays: number
}

const MIN_SAMPLE = 20

export async function computeStoreRates(storeId: string, days = 30): Promise<StoreRates> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('orders').select('status')
    .eq('store_id', storeId).gte('created_at', since).limit(2000)
  const rows = data || []
  const total = rows.length
  const confirmed = rows.filter(r => ['confirmed', 'shipped', 'delivered'].includes(String(r.status))).length
  const delivered = rows.filter(r => String(r.status) === 'delivered').length
  const shippedPool = rows.filter(r => ['shipped', 'delivered', 'returned'].includes(String(r.status))).length
  return {
    totalOrders: total,
    confirmedOrders: confirmed,
    confirmationRate: total >= MIN_SAMPLE ? confirmed / total : null,
    deliveryRate: shippedPool >= MIN_SAMPLE ? delivered / shippedPool : null,
    sampleDays: days,
  }
}

export async function runAuditor(): Promise<{ stores: number }> {
  const deployments = await activeDeployments('auditor')
  const byStore = new Map<string, typeof deployments>()
  for (const d of deployments) byStore.set(d.store_id, [...(byStore.get(d.store_id) || []), d])

  for (const [storeId, rows] of byStore) {
    try {
      const rates = await computeStoreRates(storeId)
      const connection = await storeConnection(storeId)
      const yesterday = utcDate(new Date(Date.now() - 24 * 3600 * 1000))
      let tiktokConv = 0
      if (connection) {
        const stats = await campaignStats(connection, rows.map(r => r.campaign_id), yesterday, yesterday)
        tiktokConv = Object.values(stats).reduce((s, x) => s + x.conversions, 0)
      }
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const { count: realOrders } = await supabaseAdmin
        .from('orders').select('id', { count: 'exact', head: true })
        .eq('store_id', storeId).gte('created_at', since)

      const confPct = rates.confirmationRate != null ? `${Math.round(rates.confirmationRate * 100)}%` : 'عينة غير كافية'
      for (const d of rows) {
        await touchDeployment(d.id)
        await logAction({
          deployment_id: d.id, store_id: storeId, campaign_id: d.campaign_id, agent: 'auditor',
          action: 'audit',
          reason: `آخر ٢٤ ساعة: ${tiktokConv} تحويل TikTok مقابل ${realOrders ?? 0} طلب فعلي · نسبة التأكيد (٣٠ يوم): ${confPct}`,
          data: { rates, tiktokConv, realOrders },
        })
      }
    } catch (e) {
      console.error('[agents/auditor] store failed', storeId, (e as Error).message)
    }
  }
  return { stores: byStore.size }
}
