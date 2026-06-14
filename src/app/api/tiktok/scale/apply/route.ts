import { NextRequest, NextResponse } from 'next/server'
import { resolveOrThrow, updateBudget } from '@/lib/tiktok/mutations'
import { duplicateToScale, type DuplicateScaleMode } from '@/lib/tiktok/scale-duplicate'
import { resolveAdvertiserCurrency, supabaseAdmin } from '@/lib/tiktok/server'
import { endOfAdAccountDayIso } from '@/lib/tiktok/timezone'
import type { EntityLevel } from '@/lib/tiktok/types'
import { respondMutationResult } from '@/lib/tiktok/api-errors'

type Strategy = 'boost_today' | 'duplicate' | 'step_up' | 'custom'

export async function POST(req: NextRequest) {
  try {
    const { connection, store } = await resolveOrThrow()
    const body = await req.json()
    const strategy = body.strategy as Strategy
    const level = (body.level || 'campaigns') as EntityLevel
    const entityId = String(body.entity_id || '')
    const isSmartPlus = Boolean(body.is_smart_plus)
    const currentBudget = parseFloat(String(body.current_budget ?? ''))
    const customBudget = parseFloat(String(body.custom_budget ?? ''))
    const timezone = String(body.timezone || 'Africa/Cairo')
    const duplicateMode = (body.duplicate_mode || 'clone_boost') as DuplicateScaleMode
    const duplicateBudget = parseFloat(String(body.duplicate_budget ?? ''))
    const expandLocationIds = Array.isArray(body.location_ids)
      ? body.location_ids.map(String).filter(Boolean)
      : []
    const expandAgeGroups = Array.isArray(body.age_groups)
      ? body.age_groups.map(String).filter(Boolean)
      : []

    if (!entityId || !['boost_today', 'duplicate', 'step_up', 'custom'].includes(strategy)) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    if (level !== 'campaigns' && level !== 'adgroups') {
      return NextResponse.json({ error: 'invalid_level' }, { status: 400 })
    }

    const baseBudget = Number.isFinite(currentBudget) && currentBudget > 0 ? currentBudget : null
    if (!baseBudget && strategy !== 'custom' && strategy !== 'duplicate') {
      return NextResponse.json({ error: 'no_budget' }, { status: 400 })
    }

    let targetBudget: number
    if (strategy === 'custom') {
      if (!Number.isFinite(customBudget) || customBudget <= 0) {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
      }
      targetBudget = customBudget
    } else if (strategy === 'boost_today') {
      targetBudget = Math.round(baseBudget! * 1.25)
    } else if (strategy === 'step_up') {
      targetBudget = Math.round(baseBudget! * 1.2)
    } else if (strategy === 'duplicate') {
      if (!Number.isFinite(duplicateBudget) || duplicateBudget <= 0) {
        return NextResponse.json({ error: 'invalid_body', message: 'Set a budget for the clone' }, { status: 400 })
      }
      targetBudget = Math.round(duplicateBudget)
    } else {
      targetBudget = Math.round(baseBudget! * 1.25)
    }

    if (strategy === 'duplicate') {
      if (isSmartPlus) {
        return NextResponse.json({
          error: 'smart_plus_not_supported',
          message: 'Duplicate is not supported for Smart+ campaigns via API',
        }, { status: 400 })
      }

      const dup = await duplicateToScale(connection, level, entityId, {
        mode: duplicateMode,
        budget: targetBudget,
        location_ids: duplicateMode === 'clone_expand' ? expandLocationIds : undefined,
        age_groups: duplicateMode === 'clone_expand' ? expandAgeGroups : undefined,
      })
      if ('error' in dup) {
        return respondMutationResult(dup, { storeId: store.id, advertiserId: connection.advertiser_id })
      }
      if (!('ok' in dup) || !dup.ok) {
        return NextResponse.json({ error: 'duplicate_failed' }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        strategy,
        duplicate_mode: duplicateMode,
        entity_id: dup.entity_id,
        campaign_id: dup.campaign_id,
        adgroup_id: dup.adgroup_id,
        name: dup.campaign_name,
        budget: dup.budget,
        duplicated: true,
      })
    }

    const budgetResult = await updateBudget(connection, level, entityId, targetBudget, isSmartPlus)
    if ('error' in budgetResult) {
      return respondMutationResult(budgetResult, { storeId: store.id, advertiserId: connection.advertiser_id })
    }

    if (strategy === 'boost_today' && baseBudget) {
      const revertAt = endOfAdAccountDayIso(timezone)
      const currency = await resolveAdvertiserCurrency(connection, store.id)

      await supabaseAdmin
        .from('tiktok_scaling_tasks')
        .update({ status: 'cancelled' })
        .eq('store_id', store.id)
        .eq('advertiser_id', connection.advertiser_id)
        .eq('entity_level', level)
        .eq('entity_id', entityId)
        .eq('status', 'pending')

      const { error: insertErr } = await supabaseAdmin.from('tiktok_scaling_tasks').insert({
        store_id: store.id,
        advertiser_id: connection.advertiser_id,
        entity_level: level,
        entity_id: entityId,
        original_budget: baseBudget,
        boosted_budget: targetBudget,
        currency,
        revert_at: revertAt,
        is_smart_plus: isSmartPlus,
        status: 'pending',
      })

      if (insertErr) {
        console.error('[scale/apply] scaling task insert failed:', insertErr.message)
      }

      return NextResponse.json({
        ok: true,
        strategy,
        entity_id: entityId,
        budget: targetBudget,
        original_budget: baseBudget,
        revert_at: revertAt,
        surf_boost: true,
      })
    }

    return NextResponse.json({
      ok: true,
      strategy,
      entity_id: entityId,
      budget: targetBudget,
    })
  } catch (e: unknown) {
    const err = e as Error & { status?: number }
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
