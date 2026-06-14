import { updateBudget } from '@/lib/tiktok/mutations'
import { supabaseAdmin } from '@/lib/tiktok/server'
import type { EntityLevel } from '@/lib/tiktok/types'

export async function revertSurfScalingTasks() {
  const now = new Date().toISOString()
  const { data: tasks, error } = await supabaseAdmin
    .from('tiktok_scaling_tasks')
    .select('*')
    .eq('status', 'pending')
    .lte('revert_at', now)
    .limit(50)

  if (error) {
    console.error('[cron/revert-surf-scaling] query error:', error.message)
    return { error: error.message, status: 500 as const }
  }

  let reverted = 0
  let failed = 0
  let skipped = 0

  for (const task of tasks || []) {
    const { data: connRows } = await supabaseAdmin
      .from('tiktok_connections')
      .select('access_token')
      .eq('store_id', task.store_id)
      .eq('advertiser_id', task.advertiser_id)
      .eq('is_active', true)
      .limit(1)

    const token = connRows?.[0]?.access_token
    if (!token) {
      await supabaseAdmin
        .from('tiktok_scaling_tasks')
        .update({ status: 'failed', error_message: 'no_active_connection' })
        .eq('id', task.id)
        .eq('status', 'pending')
      failed++
      continue
    }

    const connection = { advertiser_id: task.advertiser_id, access_token: token }
    const level = task.entity_level as EntityLevel
    const original = Number(task.original_budget)

    const result = await updateBudget(
      connection,
      level,
      task.entity_id,
      original,
      Boolean(task.is_smart_plus)
    )

    if ('error' in result) {
      console.error(
        '[cron/revert-surf-scaling] budget revert failed:',
        task.id,
        result.message || result.error
      )
      await supabaseAdmin
        .from('tiktok_scaling_tasks')
        .update({
          status: 'failed',
          error_message: result.message || result.error,
        })
        .eq('id', task.id)
        .eq('status', 'pending')
      failed++
      continue
    }

    const { data: updated } = await supabaseAdmin
      .from('tiktok_scaling_tasks')
      .update({ status: 'reverted', reverted_at: now })
      .eq('id', task.id)
      .eq('status', 'pending')
      .select('id')

    if (updated?.length) reverted++
    else skipped++
  }

  return {
    success: true as const,
    checked: tasks?.length ?? 0,
    reverted,
    failed,
    skipped,
    timestamp: now,
  }
}
