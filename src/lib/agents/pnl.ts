import { supabaseAdmin } from '@/lib/tiktok/server'
import { activeDeployments, logAction, touchDeployment } from '@/lib/agents/core'
import { computeStoreRates } from '@/lib/agents/auditor'

// مدير الأرباح — P&L Optimizer (the brain).
// Computes true unit economics per product and derives the CPA thresholds every
// other agent obeys:
//   margin/delivered = price − cost − COD fee − packaging
//   breakEvenCPA     = margin × confirmationRate × deliveryRate
//   targetCPA        = breakEvenCPA × (1 − desiredMargin%)
// Then writes targetCpa/maxSpendNoOrders into the sibling guardian + scaler
// deployments for the same campaign — thresholds go dynamic, no human guessing.

const DEFAULT_CONFIRMATION = 0.65 // conservative MENA COD priors until real sample
const DEFAULT_DELIVERY = 0.85

export async function runPnl(): Promise<{ checked: number; updated: number }> {
  const deployments = await activeDeployments('pnl')
  let updated = 0

  for (const d of deployments) {
    try {
      await touchDeployment(d.id)
      const cfg: any = d.config || {}
      const productId = cfg.productId
      if (!productId) continue

      const { data: product } = await supabaseAdmin
        .from('products').select('price, cost_price, shipping_cost, store_id')
        .eq('id', productId).maybeSingle()
      if (!product) continue
      const price = Number(product.price) || 0
      const cost = Number(cfg.costPrice ?? product.cost_price) || 0
      if (price <= 0 || cost <= 0) continue

      const rates = await computeStoreRates(d.store_id)
      const conf = rates.confirmationRate ?? DEFAULT_CONFIRMATION
      const deliv = rates.deliveryRate ?? DEFAULT_DELIVERY

      const codFee = Number(cfg.codFee) || 0
      const packaging = Number(cfg.packagingCost) || 0
      const margin = price - cost - codFee - packaging
      const desired = Math.min(Math.max(Number(cfg.desiredMarginPct) || 20, 0), 80) / 100

      const breakEven = margin * conf * deliv
      const target = Math.max(Math.round(breakEven * (1 - desired)), 1)
      const currency = cfg.currency || ''

      if (margin <= 0) {
        await logAction({
          deployment_id: d.id, store_id: d.store_id, campaign_id: d.campaign_id, agent: 'pnl',
          action: 'alert',
          reason: `هامش الربح سالب (${margin.toFixed(0)} ${currency}) — البيع بهذا السعر خاسر حتى بدون إعلانات. راجع السعر أو التكلفة.`,
          data: { price, cost, codFee, packaging, margin },
        })
        continue
      }

      // Push the derived thresholds into the sibling execution agents.
      const { data: siblings } = await supabaseAdmin
        .from('agent_deployments').select('id, agent, config')
        .eq('campaign_id', d.campaign_id).in('agent', ['guardian', 'scaler'])
      for (const s of siblings || []) {
        await supabaseAdmin.from('agent_deployments')
          .update({ config: { ...(s.config as any), targetCpa: target, maxSpendNoOrders: target * 3 } })
          .eq('id', s.id)
      }

      updated++
      const confPct = Math.round(conf * 100), delivPct = Math.round(deliv * 100)
      await logAction({
        deployment_id: d.id, store_id: d.store_id, campaign_id: d.campaign_id, agent: 'pnl',
        action: 'pnl_update',
        reason: `هامش الطلب المُسلَّم ${margin.toFixed(0)} ${currency} · تأكيد ${confPct}% · تسليم ${delivPct}% ← حد التعادل ${breakEven.toFixed(0)} والتكلفة المستهدفة ${target} ${currency} (حُدِّثت حدود الوكلاء)`,
        data: { price, cost, codFee, packaging, margin, conf, deliv, breakEven, target, ratesSample: rates.totalOrders },
      })
    } catch (e) {
      console.error('[agents/pnl] deployment failed', d.id, (e as Error).message)
    }
  }
  return { checked: deployments.length, updated }
}
