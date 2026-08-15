'use client'

import { useEffect, useState } from 'react'
import GatewayFieldInput from './GatewayFieldInput'
import GatewayLogo from './GatewayLogo'
import { GATEWAY_DEFINITIONS, supportsCurrency } from '@/lib/payment-gateways/registry'
import type { GatewayId, GatewayState } from '@/lib/payment-gateways/types'

type Props = { lang: string }

type Draft = {
  values: Record<string, unknown>
  replacing: Record<string, boolean>
  clear: string[]
}

const emptyDraft = (): Draft => ({ values: {}, replacing: {}, clear: [] })

/** Payments tab. Saves through /api/dashboard/payment-gateways, NOT the
 *  settings page's shared handleSave — secrets must not travel that client
 *  path. */
export default function PaymentGatewaysTab({ lang }: Props) {
  const ar = lang === 'ar'

  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('')
  const [states, setStates] = useState<Record<string, GatewayState>>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [open, setOpen] = useState<GatewayId | null>(null)
  const [saving, setSaving] = useState<GatewayId | null>(null)
  const [saved, setSaved] = useState<GatewayId | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<GatewayId | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/payment-gateways')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) {
          setCurrency(d.currency ?? '')
          const byId: Record<string, GatewayState> = {}
          for (const g of d.gateways as GatewayState[]) byId[g.gateway] = g
          setStates(byId)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const draftFor = (id: GatewayId) => drafts[id] ?? emptyDraft()

  const patchDraft = (id: GatewayId, patch: Partial<Draft>) =>
    setDrafts(prev => ({ ...prev, [id]: { ...draftFor(id), ...patch } }))

  const setValue = (id: GatewayId, key: string, value: unknown) =>
    patchDraft(id, { values: { ...draftFor(id).values, [key]: value } })

  const save = async (id: GatewayId, enabled: boolean) => {
    setSaving(id)
    setErrors(prev => ({ ...prev, [id]: '' }))

    const draft = draftFor(id)

    try {
      const res = await fetch('/api/dashboard/payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway: id, enabled, values: draft.values, clear: draft.clear }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`)

      setStates(prev => ({ ...prev, [id]: data.gateway as GatewayState }))
      // Drop the draft so secrets fall back to their masked "saved" display.
      setDrafts(prev => ({ ...prev, [id]: emptyDraft() }))
      setSaved(id)
      setTimeout(() => setSaved(s => (s === id ? null : s)), 2500)
    } catch (e) {
      setErrors(prev => ({ ...prev, [id]: e instanceof Error ? e.message : 'Save failed' }))
    } finally {
      setSaving(null)
    }
  }

  const copyWebhook = async (id: GatewayId, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(c => (c === id ? null : c)), 2000)
    } catch {
      // clipboard may be unavailable; best-effort only
    }
  }

  if (loading) {
    return <div className="text-[#8b8fa8] text-sm">{ar ? 'جاري التحميل...' : 'Loading…'}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-semibold mb-1">
          {ar ? 'بوابات الدفع' : 'Payment gateways'}
        </h2>
        <p className="text-[#8b8fa8] text-sm">
          {ar
            ? 'اربط بوابة دفع لتحصيل المدفوعات من عملائك. تُحفظ المفاتيح السرية مشفّرة ولا تظهر مرة أخرى.'
            : 'Connect a gateway to collect payments from your customers. Secret keys are stored encrypted and never shown again.'}
        </p>
      </div>

      {GATEWAY_DEFINITIONS.map(def => {
        const state = states[def.id]
        const draft = draftFor(def.id)
        // Two independent blockers: the store's currency, and whether the
        // gateway has an adapter yet (`implemented`, which only the server
        // knows). `state` is undefined until the first fetch resolves — assume
        // implemented then, so the list doesn't flash "coming soon" on load.
        const implemented = state?.available ?? true
        const currencyOk = !currency || supportsCurrency(def, currency)
        const available = currencyOk && implemented
        const isOpen = open === def.id
        const connected = state?.enabled

        return (
          <div
            key={def.id}
            className={`bg-[#1a1d24] border rounded-xl p-5 ${
              available ? 'border-[#2a2d35]' : 'border-[#2a2d35] opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <GatewayLogo id={def.id} label={def.label} emoji={def.emoji} />
              <div className="min-w-0">
                <div className="text-white font-medium">{def.label}</div>
                <div className="text-xs text-[#8b8fa8]">
                  {!currencyOk
                    ? ar
                      ? `غير متاح لمتاجر ${currency}`
                      : `Not available for ${currency} stores`
                    : !implemented
                      ? ar
                        ? 'قريباً'
                        : 'Coming soon'
                      : def.supportedCurrencies.join(' · ')}
                </div>
              </div>

              {connected && (
                <span className="ms-auto text-xs bg-[#14321f] text-[#4ade80] border border-[#4ade80]/20 px-2.5 py-1 rounded-full">
                  ✓ {ar ? 'مفعّل' : 'Enabled'}
                </span>
              )}

              {available && (
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : def.id)}
                  className={`${connected ? '' : 'ms-auto'} text-xs text-[#8b8fa8] hover:text-white border border-[#2a2d35] hover:border-[#3b82f6] px-3 py-1.5 rounded-lg transition-colors cursor-pointer`}
                >
                  {isOpen ? (ar ? 'إغلاق' : 'Close') : ar ? 'إعداد' : 'Configure'}
                </button>
              )}
            </div>

            {available && isOpen && (
              <div className="mt-5 space-y-4 border-t border-[#2a2d35] pt-5">
                {def.fields.map(field => (
                  <GatewayFieldInput
                    key={field.key}
                    field={field}
                    lang={lang}
                    value={
                      draft.values[field.key] ??
                      (field.secret ? '' : state?.publicConfig?.[field.key] ?? '')
                    }
                    secret={field.secret ? state?.secrets?.[field.key] : undefined}
                    replacing={draft.replacing[field.key]}
                    onChange={v => setValue(def.id, field.key, v)}
                    onReplace={() =>
                      patchDraft(def.id, {
                        replacing: { ...draft.replacing, [field.key]: true },
                      })
                    }
                    onCancelReplace={() => {
                      const values = { ...draft.values }
                      delete values[field.key]
                      patchDraft(def.id, {
                        values,
                        replacing: { ...draft.replacing, [field.key]: false },
                      })
                    }}
                    onRemove={() =>
                      patchDraft(def.id, { clear: [...draft.clear, field.key] })
                    }
                  />
                ))}

                {/* Only shown when the merchant registers the URL themselves;
                    Tabby's endpoint is registered through its API instead. */}
                {def.webhookSetup === 'manual' && state?.webhookUrl && (
                  <div>
                    <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">
                      {ar ? 'رابط الإشعارات (Webhook)' : 'Webhook URL'}
                    </label>
                    <div className="flex items-center gap-2 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5">
                      <span className="flex-1 text-xs text-[#8b8fa8] font-mono truncate" dir="ltr">
                        {state.webhookUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyWebhook(def.id, state.webhookUrl)}
                        className="text-xs text-[#3b82f6] hover:text-[#60a5fa] cursor-pointer"
                      >
                        {copied === def.id ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#4a4e60] mt-1.5">
                      {ar
                        ? 'أضف هذا الرابط في لوحة تحكم مزوّد الدفع لاستقبال تحديثات حالة الدفع.'
                        : "Add this URL in your provider's dashboard to receive payment status updates."}
                    </p>
                  </div>
                )}

                {draft.clear.length > 0 && (
                  <p className="text-[11px] text-[#f87171]">
                    {ar
                      ? `سيتم حذف: ${draft.clear.join('، ')} عند الحفظ`
                      : `Will be removed on save: ${draft.clear.join(', ')}`}
                  </p>
                )}

                {errors[def.id] && (
                  <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-4 py-2.5 text-[#f87171] text-sm">
                    {errors[def.id]}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={saving === def.id}
                    onClick={() => save(def.id, true)}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {saving === def.id
                      ? ar
                        ? 'جاري الحفظ...'
                        : 'Saving…'
                      : connected
                        ? ar
                          ? 'حفظ التغييرات'
                          : 'Save changes'
                        : ar
                          ? 'حفظ وتفعيل'
                          : 'Save & enable'}
                  </button>

                  {connected && (
                    <button
                      type="button"
                      disabled={saving === def.id}
                      onClick={() => save(def.id, false)}
                      className="text-sm text-[#8b8fa8] hover:text-[#f87171] transition-colors cursor-pointer"
                    >
                      {ar ? 'تعطيل' : 'Disable'}
                    </button>
                  )}

                  {saved === def.id && (
                    <span className="text-xs text-[#4ade80]">{ar ? 'تم الحفظ' : 'Saved'}</span>
                  )}

                  {def.docsUrl && (
                    <a
                      href={def.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ms-auto text-xs text-[#8b8fa8] hover:text-white underline underline-offset-2"
                    >
                      {ar ? 'الدليل' : 'Docs'}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
