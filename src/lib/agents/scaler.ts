import { supabaseAdmin } from '@/lib/tiktok/server'
import { activeDeployments, campaignStats, logAction, storeConnection, touchDeployment, utcDate } from '@/lib/agents/core'
import { tiktokPost } from '@/lib/tiktok/mutations'
import { sendEmailHtml, buildSimpleAlertHtml } from '@/lib/agents/notify'

// محرك النمو — Growth Scaler.
// Research-grounded rules: +20% budget steps, no more often than every 48h, never
// beyond the merchant's ceiling, only after the campaign proves itself:
//   - deployment older than 48h (learning-phase respect)
//   - >=5 conversions over the last 3 days
//   - 3-day CPA <= targetCpa (dynamic when مدير الأرباح is deployed)
// Smart+ budgets update via /smart_plus/campaign/update/ (verified live).

const STEP = 1.2
const MIN_HOURS_BETWEEN = 48
const MIN_CONV_3D = 5

export async function runScaler(): Promise<{ checked: number; scaled: number }> {
  const deployments = await activeDeployments('scaler')
  let scaled = 0

  const byStore = new Map<string, typeof deployments>()
  for (const d of deployments) byStore.set(d.store_id, [...(byStore.get(d.store_id) || []), d])

  for (const [storeId, rows] of byStore) {
    try {
      const connection = await storeConnection(storeId)
      if (!connection) continue
      const end = utcDate(new Date())
      const start = utcDate(new Date(Date.now() - 2 * 24 * 3600 * 1000))
      const stats = await campaignStats(connection, rows.map(r => r.campaign_id), start, end)

      for (const d of rows) {
        await touchDeployment(d.id)
        const cfg: any = d.config || {}
        const s = stats[d.campaign_id]
        if (!s) continue

        const targetCpa = Number(cfg.targetCpa) || 0
        const ceiling = Number(cfg.budgetCeiling) || 0
        const current = Number(cfg.currentBudget) || 0
        if (targetCpa <= 0 || ceiling <= 0 || current <= 0) continue
        if (!d.smart_plus) continue // standard scaling lands with the duplicate flow later

        const ageOk = Date.now() - new Date((d as any).created_at || 0).getTime() >= MIN_HOURS_BETWEEN * 3600 * 1000
        const cooldownOk = !cfg.lastScaledAt || Date.now() - new Date(cfg.lastScaledAt).getTime() >= MIN_HOURS_BETWEEN * 3600 * 1000
        const winner = s.conversions >= MIN_CONV_3D && s.cpa != null && s.cpa <= targetCpa
        if (!ageOk || !cooldownOk || !winner) continue

        const next = Math.min(Math.round(current * STEP), ceiling)
        if (next <= current) continue

        const res = await tiktokPost(connection, '/smart_plus/campaign/update/', { campaign_id: d.campaign_id, budget: next })
        const ok = res.code === 0
        const currency = cfg.currency || ''
        const reason = `أداء رابح (${s.conversions} تحويل بتكلفة ${s.cpa!.toFixed(0)} ≤ الهدف ${targetCpa}) — الميزانية ${current} ← ${next} ${currency}`
        await logAction({
          deployment_id: d.id, store_id: storeId, campaign_id: d.campaign_id, agent: 'scaler',
          action: ok ? 'scale' : 'error', reason,
          data: { stats: s, from: current, to: next, tiktok_code: res.code, tiktok_message: res.message },
        })
        if (ok) {
          scaled++
          await supabaseAdmin.from('agent_deployments')
            .update({ config: { ...cfg, currentBudget: next, lastScaledAt: new Date().toISOString() } })
            .eq('id', d.id)
          if (cfg.alertEmail) {
            await sendEmailHtml(cfg.alertEmail, `📈 محرك النمو رفع ميزانية: ${d.campaign_name || d.campaign_id}`,
              buildSimpleAlertHtml({
                badge: 'محرك النمو', title: 'رفعنا ميزانية حملة رابحة', lines: [reason,
                  `الحد الأقصى الذي لن نتجاوزه: ${ceiling} ${currency}. الرفع التالي بعد ٤٨ ساعة على الأقل وبنفس شروط الأداء.`],
              }))
          }
        }
      }
    } catch (e) {
      console.error('[agents/scaler] store failed', storeId, (e as Error).message)
    }
  }
  return { checked: deployments.length, scaled }
}
