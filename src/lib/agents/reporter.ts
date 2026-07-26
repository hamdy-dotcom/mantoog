import { supabaseAdmin } from '@/lib/tiktok/server'
import {
  activeDeployments, campaignStats, logAction, storeConnection, touchDeployment, utcDate,
} from '@/lib/agents/core'
import { sendAgentEmail } from '@/lib/agents/notify'

// محلل الأداء — daily digest per store: yesterday's spend/conversions/CPA per watched
// campaign, real orders from the Mantoog DB, and every action other agents took.
export async function runReporter(): Promise<{ stores: number; sent: number }> {
  const deployments = await activeDeployments('reporter')
  const byStore = new Map<string, typeof deployments>()
  for (const d of deployments) byStore.set(d.store_id, [...(byStore.get(d.store_id) || []), d])

  let sent = 0
  for (const [storeId, rows] of byStore) {
    try {
      const to = rows.map(r => r.config.alertEmail).find(Boolean)
      if (!to) continue
      const connection = await storeConnection(storeId)
      if (!connection) continue

      const yesterday = utcDate(new Date(Date.now() - 24 * 3600 * 1000))
      const stats = await campaignStats(connection, rows.map(r => r.campaign_id), yesterday, yesterday)

      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const { count: realOrders } = await supabaseAdmin
        .from('orders').select('id', { count: 'exact', head: true })
        .eq('store_id', storeId).gte('created_at', since)
      const { data: actions } = await supabaseAdmin
        .from('agent_actions').select('agent, action, reason, created_at')
        .eq('store_id', storeId).gte('created_at', since)
        .order('created_at', { ascending: false }).limit(20)

      const lines: string[] = []
      let totSpend = 0, totConv = 0
      const currency = rows[0]?.config.currency || ''
      for (const d of rows) {
        const s = stats[d.campaign_id]
        if (!s) continue
        totSpend += s.spend; totConv += s.conversions
        lines.push(
          `<strong style="color:#fff">${d.campaign_name || d.campaign_id}</strong>: صرف ${s.spend.toFixed(0)} ${currency} · ${s.conversions} تحويل${s.cpa != null ? ` · تكلفة الطلب ${s.cpa.toFixed(0)}` : ''}`
        )
      }
      lines.unshift(`إجمالي الأمس: <strong style="color:#fff">${totSpend.toFixed(0)} ${currency}</strong> إنفاق · <strong style="color:#fff">${totConv}</strong> تحويل TikTok · <strong style="color:#fff">${realOrders ?? 0}</strong> طلب فعلي في المتجر (آخر ٢٤ ساعة)`)

      if (actions?.length) {
        lines.push('<strong style="color:#fff">إجراءات الوكلاء:</strong>')
        for (const a of actions) {
          const label = a.action === 'pause' ? 'أوقف' : a.action === 'would_pause' ? 'كان سيوقف (مراقبة)' : a.action
          lines.push(`• ${label} — ${a.reason || ''}`)
        }
      } else {
        lines.push('لا إجراءات من الوكلاء خلال آخر ٢٤ ساعة.')
      }

      const ok = await sendAgentEmail(to, `📊 تقرير الأداء اليومي — ${yesterday}`, lines, 'report')
      if (ok) {
        sent++
        for (const d of rows) {
          await touchDeployment(d.id)
          await logAction({
            deployment_id: d.id, store_id: storeId, campaign_id: d.campaign_id,
            agent: 'reporter', action: 'report', reason: `أُرسل التقرير اليومي (${yesterday})`,
          })
        }
      }
    } catch (e) {
      console.error('[agents/reporter] store run failed', storeId, (e as Error).message)
    }
  }
  return { stores: byStore.size, sent }
}
