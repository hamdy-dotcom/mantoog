import {
  activeDeployments, campaignStats, logAction, pauseCampaign,
  storeConnection, touchDeployment, utcDate,
} from '@/lib/agents/core'
import { buildGuardianAlertHtml, sendEmailHtml } from '@/lib/agents/notify'

// مراقب الإنفاق — Budget Guardian.
// Static-threshold rules (Phase 1; مدير الأرباح will supply dynamic targets in Phase 2):
//   R1: spent >= maxSpendNoOrders with ZERO conversions today  → pause
//   R2: >=3 conversions today and CPA > 1.5x target            → pause
// Observe mode (first 48h): logs would_pause + alerts, never acts.
export async function runGuardian(): Promise<{ checked: number; acted: number; errors: number }> {
  const deployments = await activeDeployments('guardian')
  let acted = 0, errors = 0

  // Group by store so each connection/report call covers all its campaigns at once.
  const byStore = new Map<string, typeof deployments>()
  for (const d of deployments) {
    byStore.set(d.store_id, [...(byStore.get(d.store_id) || []), d])
  }

  for (const [storeId, rows] of byStore) {
    try {
      const connection = await storeConnection(storeId)
      if (!connection) continue
      const today = utcDate(new Date())
      const stats = await campaignStats(connection, rows.map(r => r.campaign_id), today, today)

      for (const d of rows) {
        const s = stats[d.campaign_id]
        await touchDeployment(d.id)
        if (!s || s.spend <= 0) continue

        const targetCpa = Number(d.config.targetCpa) || 0
        if (targetCpa <= 0) continue
        const maxSpendNoOrders = Number(d.config.maxSpendNoOrders) || targetCpa * 3
        const currency = d.config.currency || ''

        let breach: string | null = null
        if (s.conversions === 0 && s.spend >= maxSpendNoOrders) {
          breach = `صرفت الحملة ${s.spend.toFixed(0)} ${currency} اليوم دون أي طلب (الحد: ${maxSpendNoOrders.toFixed(0)})`
        } else if (s.conversions >= 3 && s.cpa != null && s.cpa > targetCpa * 1.5) {
          breach = `تكلفة الطلب ${s.cpa.toFixed(0)} ${currency} تجاوزت 1.5× الهدف (${targetCpa.toFixed(0)})`
        }
        if (!breach) continue

        const observing = d.observe_until != null && new Date(d.observe_until) > new Date()
        const name = d.campaign_name || d.campaign_id
        const adsManagerUrl = `https://ads.tiktok.com/i18n/manage/campaign?aadvid=${connection.advertiser_id}`
        const alertHtml = (isObserving: boolean) => buildGuardianAlertHtml({
          campaignName: name, reason: breach!, observing: isObserving,
          stats: { spend: s.spend, conversions: s.conversions, cpa: s.cpa }, currency, adsManagerUrl,
        })

        if (observing) {
          await logAction({
            deployment_id: d.id, store_id: d.store_id, campaign_id: d.campaign_id, agent: 'guardian',
            action: 'would_pause', reason: breach, data: { stats: s, observe: true },
          })
          if (d.config.alertEmail) {
            await sendEmailHtml(d.config.alertEmail, `⚠️ مراقب الإنفاق — تنبيه: ${name}`, alertHtml(true))
          }
          continue
        }

        const res = await pauseCampaign(connection, d.campaign_id, d.smart_plus)
        const ok = res.code === 0
        await logAction({
          deployment_id: d.id, store_id: d.store_id, campaign_id: d.campaign_id, agent: 'guardian',
          action: ok ? 'pause' : 'error',
          reason: breach,
          data: { stats: s, tiktok_code: res.code, tiktok_message: res.message },
        })
        if (ok) {
          acted++
          await touchDeployment(d.id, { status: 'done' })
          if (d.config.alertEmail) {
            await sendEmailHtml(d.config.alertEmail, `⛔ مراقب الإنفاق أوقف حملة: ${name}`, alertHtml(false))
          }
        } else {
          errors++
        }
      }
    } catch (e) {
      errors++
      console.error('[agents/guardian] store run failed', storeId, (e as Error).message)
    }
  }
  return { checked: deployments.length, acted, errors }
}
