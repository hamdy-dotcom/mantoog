'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PendingApprovalNotice, { blockIfScopePending } from '@/components/dashboard/PendingApprovalNotice'
import { isTikTokScopeApproved } from '@/lib/tiktok/scopes'
import {
  AGE_OPTIONS,
  CREATIVE_SOURCES,
  CTA_OPTIONS,
  DEFAULT_ADVANCED,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  type AdGoal,
  type AdvancedSettings,
  type CreateAdWizardPayload,
  type CreativeSource,
  type CtaType,
  type LeadFormSummary,
  type ProductSummary,
  type TargetLocation,
} from '@/lib/tiktok/create-ad/types'
import {
  buildCampaignName,
  previewNameSuffix,
  resolvedAdvancedSummary,
} from '@/lib/tiktok/create-ad/payloads'
import {
  defaultScheduleStartLocal,
  formatScheduleDisplay,
  isValidLocalDatetime,
} from '@/lib/tiktok/create-ad/schedule'
import type { CreateErrorCategory } from '@/lib/tiktok/create-ad/errors'

type Props = {
  lang: string
  dir: string
  fmtMoney: (n: number, digits?: number) => string
  hasActiveAccount: boolean
  onReauthRequired?: () => void
}

type StoreMeta = {
  id: string
  slug: string
  currency: string
  tiktok_pixel_id: string | null
  timezone?: string
  default_schedule_start?: string
}

type LaunchErrorDetail = {
  message: string
  explanation?: string
  code?: number
  request_id?: string
  step?: string
  category?: CreateErrorCategory
  rolled_back?: boolean
  rollback_error?: string
}

function formatLaunchError(detail: LaunchErrorDetail, lang: string): string {
  const lines = [detail.message]
  if (detail.explanation) lines.push(detail.explanation)
  if (detail.code != null) lines.push(`${lang === 'ar' ? 'رمز TikTok' : 'TikTok code'}: ${detail.code}`)
  if (detail.request_id) lines.push(`Request ID: ${detail.request_id}`)
  if (detail.step) lines.push(`${lang === 'ar' ? 'الخطوة' : 'Step'}: ${detail.step}`)
  if (detail.rolled_back) {
    lines.push(lang === 'ar' ? '✓ تم حذف الحملة اليتيمة تلقائياً.' : '✓ Orphan campaign was rolled back automatically.')
  } else if (detail.rolled_back === false) {
    lines.push(lang === 'ar' ? '⚠ تعذر التراجع عن الحملة — تحقق من حساب الإعلانات.' : '⚠ Rollback failed — check your ad account for an orphan campaign.')
  }
  if (detail.rollback_error) lines.push(`Rollback: ${detail.rollback_error}`)
  return lines.join('\n')
}

const STEPS = [
  { id: 1, en: 'Product', ar: 'المنتج' },
  { id: 2, en: 'Creative', ar: 'الإبداع' },
  { id: 3, en: 'Targeting', ar: 'الاستهداف' },
  { id: 4, en: 'Review', ar: 'المراجعة' },
]

function fieldLabel(text: string) {
  return <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider font-medium">{text}</span>
}

function inputClass(disabled = false) {
  return `w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] ${
    disabled ? 'opacity-60 cursor-not-allowed' : ''
  }`
}

function locationLabel(locations: TargetLocation[], locationId: string, lang: string): string {
  const loc = locations.find(l => l.location_id === locationId)
  if (!loc) return locationId || '—'
  return lang === 'ar' ? loc.label_ar : loc.name
}

export default function TikTokCreateAdWizard({
  lang,
  dir,
  fmtMoney,
  hasActiveAccount,
  onReauthRequired,
}: Props) {
  const [step, setStep] = useState(1)
  const [loadingCtx, setLoadingCtx] = useState(true)
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [store, setStore] = useState<StoreMeta | null>(null)
  const [ctxError, setCtxError] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null)
  const [creativeSource, setCreativeSource] = useState<CreativeSource | null>(null)
  const [caption, setCaption] = useState('')
  const [cta, setCta] = useState<CtaType>('order_now')
  const [goal, setGoal] = useState<AdGoal>('orders')
  const [dailyBudget, setDailyBudget] = useState('50')
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')
  const [accountTimezone, setAccountTimezone] = useState('UTC')
  const [locationId, setLocationId] = useState('')
  const [locations, setLocations] = useState<TargetLocation[]>([])
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [locationSearch, setLocationSearch] = useState('')
  const [ageGroups, setAgeGroups] = useState<string[]>(['AGE_18_24', 'AGE_25_34', 'AGE_35_44'])
  const [gender, setGender] = useState('GENDER_UNLIMITED')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advanced, setAdvanced] = useState<AdvancedSettings>({ ...DEFAULT_ADVANCED })

  const [leadForms, setLeadForms] = useState<LeadFormSummary[]>([])
  const [leadFormsLoading, setLeadFormsLoading] = useState(false)
  const [leadFormsError, setLeadFormsError] = useState<string | null>(null)
  const [leadFormChoice, setLeadFormChoice] = useState('')
  const [newLeadFormName, setNewLeadFormName] = useState('')
  const [campaignNameSuffix, setCampaignNameSuffix] = useState(() => previewNameSuffix())

  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<LaunchErrorDetail | null>(null)
  const [launchSuccess, setLaunchSuccess] = useState<{
    campaign_id: string
    adgroup_id: string
    message: string
  } | null>(null)

  const creativePending = blockIfScopePending('creative-management')
  const pixelPending = blockIfScopePending('pixel-management')
  const leadGenPending = blockIfScopePending('lead-generation')
  const locationIdRef = useRef(locationId)
  locationIdRef.current = locationId

  const fetchLocations = useCallback(async (search?: string) => {
    setLocationsLoading(true)
    setLocationsError(null)
    try {
      const params = new URLSearchParams({ goal })
      if (search?.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/tiktok/targeting/locations?${params}`)
      const data = await res.json()
      if (data.error === 'reauth_required') {
        onReauthRequired?.()
        return
      }
      if (data.error) {
        setLocationsError(data.error)
        setLocations([])
        return
      }
      const items: TargetLocation[] = data.items || []
      setLocations(items)
      const currentId = locationIdRef.current
      if (items.length && !items.some(l => l.location_id === currentId)) {
        const eg = items.find(l => l.region_code === 'EG')
        setLocationId(eg?.location_id || items[0].location_id)
      }
    } catch {
      setLocationsError('fetch_failed')
      setLocations([])
    } finally {
      setLocationsLoading(false)
    }
  }, [goal, onReauthRequired])

  const fetchLeadForms = useCallback(async () => {
    setLeadFormsLoading(true)
    setLeadFormsError(null)
    try {
      const res = await fetch('/api/tiktok/create/lead-forms')
      const data = await res.json()
      if (data.error === 'reauth_required') {
        onReauthRequired?.()
        return
      }
      if (data.error && data.error !== 'reauth_required') {
        setLeadFormsError(data.error)
        setLeadForms([])
        return
      }
      setLeadForms(data.items || [])
      if (data.error) {
        setLeadFormsError(data.error)
      }
    } catch {
      setLeadFormsError('fetch_failed')
      setLeadForms([])
    } finally {
      setLeadFormsLoading(false)
    }
  }, [onReauthRequired])

  const fetchContext = useCallback(async () => {
    setLoadingCtx(true)
    setCtxError(null)
    try {
      const res = await fetch('/api/tiktok/create/context')
      const data = await res.json()
      if (data.error === 'Unauthorized') {
        setCtxError('auth')
        return
      }
      setStore(data.store || null)
      setProducts(data.products || [])
      const tz = data.store?.timezone || 'UTC'
      setAccountTimezone(tz)
      const defaultStart = data.store?.default_schedule_start || defaultScheduleStartLocal(tz)
      setScheduleStart(prev => prev || defaultStart)
      if (data.error === 'no_active_account') {
        setCtxError('no_account')
      }
    } catch {
      setCtxError('fetch_failed')
    } finally {
      setLoadingCtx(false)
    }
  }, [])

  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  useEffect(() => {
    setCampaignNameSuffix(previewNameSuffix())
  }, [selectedProduct?.id, goal])

  useEffect(() => {
    if (hasActiveAccount && !loadingCtx) fetchLocations()
  }, [hasActiveAccount, loadingCtx, goal, fetchLocations])

  useEffect(() => {
    if (step === 4 && locations.length === 0 && !locationsLoading) fetchLocations()
  }, [step, locations.length, locationsLoading, fetchLocations])

  useEffect(() => {
    if (goal !== 'leads') {
      setLeadFormChoice('')
      setNewLeadFormName('')
      return
    }
    fetchLeadForms()
  }, [goal, fetchLeadForms])

  const leadFormSelection = useMemo(() => {
    if (goal !== 'leads' || !leadFormChoice) return null
    if (leadFormChoice === '__create_new__') {
      const draftName = newLeadFormName.trim()
        || (selectedProduct ? `${selectedProduct.title} — Leads` : 'New lead form')
      return { mode: 'create_new' as const, page_id: null, page_name: draftName }
    }
    const form = leadForms.find(f => f.page_id === leadFormChoice)
    if (!form) return null
    return { mode: 'existing' as const, page_id: form.page_id, page_name: form.page_name }
  }, [goal, leadFormChoice, newLeadFormName, selectedProduct, leadForms])

  const selectProduct = (p: ProductSummary) => {
    setSelectedProduct(p)
    const desc = p.description ? ` — ${p.description.slice(0, 120)}` : ''
    setCaption(`${p.title}${desc}`)
  }

  const toggleAge = (id: string) => {
    setAgeGroups(prev => (prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]))
  }

  const toggleLanguage = (id: string) => {
    setAdvanced(prev => {
      const langs = prev.languages.includes(id)
        ? prev.languages.filter(l => l !== id)
        : [...prev.languages, id]
      return { ...prev, touched: true, languages: langs.length ? langs : ['ar'] }
    })
  }

  const payload = useMemo((): CreateAdWizardPayload | null => {
    if (!selectedProduct || !creativeSource || !store) return null
    const budget = parseFloat(dailyBudget)
    if (!Number.isFinite(budget) || budget <= 0) return null
    return {
      product: selectedProduct,
      creative: { source: creativeSource, caption, cta },
      targeting: {
        goal,
        daily_budget: budget,
        schedule_start: scheduleStart,
        schedule_end: scheduleEnd.trim() || null,
        location_id: locationId,
        age_groups: ageGroups,
        gender,
        advanced,
        lead_form: leadFormSelection,
      },
      store: {
        tiktok_pixel_id: store.tiktok_pixel_id,
        currency: store.currency,
      },
    }
  }, [selectedProduct, creativeSource, store, caption, cta, goal, dailyBudget, scheduleStart, scheduleEnd, locationId, ageGroups, gender, advanced, leadFormSelection])

  const canNext = useMemo(() => {
    if (step === 1) return !!selectedProduct
    if (step === 2) return !!creativeSource && caption.trim().length > 0
    if (step === 3) {
      const b = parseFloat(dailyBudget)
      const budgetOk = Number.isFinite(b) && b > 0 && ageGroups.length > 0
      const scheduleOk = isValidLocalDatetime(scheduleStart)
      const endOk = !scheduleEnd.trim() || isValidLocalDatetime(scheduleEnd)
      const locationOk = !!locationId && !locationsLoading
      if (goal === 'leads') {
        return budgetOk && scheduleOk && endOk && locationOk && !!leadFormSelection
      }
      return budgetOk && scheduleOk && endOk && locationOk
    }
    return true
  }, [step, selectedProduct, creativeSource, caption, dailyBudget, ageGroups, goal, leadFormSelection, scheduleStart, scheduleEnd, locationId, locationsLoading])

  const launch = async () => {
    if (!payload) return
    setLaunching(true)
    setLaunchError(null)
    try {
      const res = await fetch('/api/tiktok/create/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      })
      const data = await res.json()
      if (data.error === 'reauth_required') {
        onReauthRequired?.()
        setLaunching(false)
        return
      }
      if (data.error) {
        setLaunchError({
          message: data.message || String(data.error),
          explanation: data.explanation,
          code: data.code,
          request_id: data.request_id,
          step: data.step,
          category: data.category,
          rolled_back: data.rolled_back,
          rollback_error: data.rollback_error,
        })
        setLaunching(false)
        return
      }
      setLaunchSuccess({
        campaign_id: data.campaign_id,
        adgroup_id: data.adgroup_id,
        message: data.message,
      })
    } catch {
      setLaunchError({ message: lang === 'ar' ? 'فشل الإطلاق' : 'Launch failed' })
    } finally {
      setLaunching(false)
    }
  }

  const pixelState = !store?.tiktok_pixel_id
    ? 'missing'
    : isTikTokScopeApproved('pixel-management')
      ? 'ready'
      : 'detected_pending'

  const advSummary = resolvedAdvancedSummary(advanced)

  if (!hasActiveAccount && !loadingCtx) {
    return (
      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl px-5 py-12 text-center">
        <p className="text-[#8b8fa8] text-sm">
          {lang === 'ar' ? 'اربط حساب TikTok Ads أولاً من أعلى الصفحة.' : 'Connect a TikTok Ads account first using the header above.'}
        </p>
      </div>
    )
  }

  if (launchSuccess) {
    return (
      <div className="bg-[#1a1d24] border border-[#4ade80]/30 rounded-2xl p-6 space-y-4">
        <div className="text-2xl">✓</div>
        <h3 className="text-white font-semibold text-lg">
          {lang === 'ar' ? 'تم إنشاء الحملة ومجموعة الإعلانات' : 'Campaign & ad group created'}
        </h3>
        <p className="text-sm text-[#8b8fa8]">{launchSuccess.message}</p>
        <ul className="text-xs text-[#4a4e60] space-y-1" dir="ltr">
          <li>Campaign: {launchSuccess.campaign_id}</li>
          <li>Ad group: {launchSuccess.adgroup_id}</li>
        </ul>
        {creativePending && (
          <p className="text-sm text-[#fbbf24] bg-[#3a2800]/40 border border-[#fbbf24]/25 rounded-lg px-4 py-3">
            {lang === 'ar'
              ? 'الإبداع محفوظ — سيُنشر تلقائياً بعد موافقة TikTok على صلاحية إدارة المحتوى.'
              : 'Creative saved — it will publish automatically once Creative Management is approved.'}
          </p>
        )}
        {goal === 'leads' && leadGenPending && (
          <p className="text-sm text-[#fbbf24] bg-[#3a2800]/40 border border-[#fbbf24]/25 rounded-lg px-4 py-3">
            {lang === 'ar'
              ? 'نموذج العملاء المحتملين محفوظ — سيُرفق ويُنشر الإعلان بعد موافقة TikTok على صلاحية توليد العملاء المحتملين.'
              : 'Lead form saved — ad publish and form attachment will complete once Lead Generation is approved.'}
          </p>
        )}
        <button
          type="button"
          onClick={() => { setLaunchSuccess(null); setStep(1) }}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2a2d35] text-white hover:bg-[#3a3d48]"
        >
          {lang === 'ar' ? 'إنشاء إعلان آخر' : 'Create another ad'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5" dir={dir}>
      {/* Step indicator */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => s.id < step && setStep(s.id)}
            disabled={s.id > step}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              step === s.id
                ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                : s.id < step
                  ? 'bg-[#1a1d24] border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6]/40 cursor-pointer'
                  : 'bg-[#0f1117] border-[#2a2d35] text-[#4a4e60] cursor-default'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">{s.id}</span>
            {lang === 'ar' ? s.ar : s.en}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 md:p-6">
        {loadingCtx ? (
          <p className="text-sm text-[#8b8fa8] animate-pulse py-8 text-center">
            {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        ) : ctxError === 'fetch_failed' ? (
          <div className="text-center py-8">
            <p className="text-[#f87171] text-sm mb-3">{lang === 'ar' ? 'تعذر التحميل' : 'Could not load'}</p>
            <button type="button" onClick={fetchContext} className="text-xs text-[#60a5fa]">{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>
          </div>
        ) : (
          <>
            {/* Step 1 — Product */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold">{lang === 'ar' ? 'اختر منتجاً' : 'Pick a product'}</h3>
                {products.length === 0 ? (
                  <p className="text-sm text-[#8b8fa8] py-6 text-center">
                    {lang === 'ar' ? 'لا توجد منتجات نشطة. أضف منتجاً من لوحة المنتجات.' : 'No active products. Add one from Products.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pe-1">
                    {products.map(p => {
                      const sel = selectedProduct?.id === p.id
                      const img = p.images[0]
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectProduct(p)}
                          className={`text-start rounded-xl border p-3 transition-all ${
                            sel ? 'border-[#3b82f6] bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/30' : 'border-[#2a2d35] bg-[#0f1117] hover:border-[#3b82f6]/40'
                          }`}
                        >
                          <div className="aspect-video rounded-lg bg-[#1a1d24] overflow-hidden mb-2 flex items-center justify-center">
                            {img ? (
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl opacity-40">📦</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-white line-clamp-2">{p.title}</p>
                          <p className="text-xs text-[#4ade80] mt-1 tabular-nums" dir="ltr">
                            {fmtMoney(p.price, 0)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Creative */}
            {step === 2 && (
              <div className="space-y-5">
                <h3 className="text-white font-semibold">{lang === 'ar' ? 'الإبداع' : 'Creative'}</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {CREATIVE_SOURCES.map(src => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setCreativeSource(src.id)}
                      className={`rounded-xl border p-4 text-start transition-all ${
                        creativeSource === src.id
                          ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                          : 'border-[#2a2d35] bg-[#0f1117] hover:border-[#3b82f6]/40'
                      }`}
                    >
                      <span className="text-2xl">{src.icon}</span>
                      <p className="text-sm font-medium text-white mt-2">{lang === 'ar' ? src.labelAr : src.labelEn}</p>
                      <p className="text-[10px] text-[#4a4e60] mt-1">{lang === 'ar' ? src.descAr : src.descEn}</p>
                    </button>
                  ))}
                </div>

                {creativeSource && (
                  <div className="space-y-4 border-t border-[#2a2d35] pt-4">
                    {creativeSource === 'product_video' && selectedProduct?.images[0] && (
                      <div className="rounded-xl border border-[#2a2d35] bg-[#0f1117] p-4 flex gap-4 items-center">
                        <img src={selectedProduct.images[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />
                        <p className="text-xs text-[#8b8fa8]">
                          {lang === 'ar' ? 'سيتم استخدام صور/فيديو المنتج كإبداع.' : 'Product media will be used as the ad creative.'}
                        </p>
                      </div>
                    )}
                    {(creativeSource === 'upload' || creativeSource === 'carousel') && (
                      <div className="border border-dashed border-[#2a2d35] rounded-xl px-4 py-8 text-center">
                        <p className="text-sm text-[#8b8fa8] mb-3">
                          {creativeSource === 'upload'
                            ? (lang === 'ar' ? 'ارفع الفيديو هنا' : 'Upload your video here')
                            : (lang === 'ar' ? 'ارفع الصور هنا' : 'Upload carousel images here')}
                        </p>
                        <PendingApprovalNotice feature="creative-management" lang={lang} className="text-start" />
                      </div>
                    )}
                    {creativeSource === 'ai_ugc' && (
                      <div className="space-y-3 opacity-60 pointer-events-none">
                        <p className="text-xs text-[#fbbf24]">
                          {lang === 'ar' ? 'قريباً — مولّد UGC بالذكاء الاصطناعي' : 'Coming soon — AI UGC generator'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input disabled className={inputClass(true)} placeholder={lang === 'ar' ? 'السكريبت' : 'Script'} />
                          <input disabled className={inputClass(true)} placeholder={lang === 'ar' ? 'الممثل' : 'Actor'} />
                          <input disabled className={inputClass(true)} placeholder="9:16" />
                        </div>
                      </div>
                    )}

                    <label className="flex flex-col gap-1.5">
                      {fieldLabel(lang === 'ar' ? 'نص الإعلان' : 'Ad caption')}
                      <textarea
                        value={caption}
                        onChange={e => setCaption(e.target.value)}
                        rows={3}
                        className={`${inputClass()} resize-none`}
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      {fieldLabel(lang === 'ar' ? 'زر الحث على الإجراء' : 'Call to action')}
                      <select value={cta} onChange={e => setCta(e.target.value as CtaType)} className={inputClass()}>
                        {CTA_OPTIONS.map(o => (
                          <option key={o.id} value={o.id}>{lang === 'ar' ? o.labelAr : o.labelEn}</option>
                        ))}
                      </select>
                    </label>

                    {creativePending && (
                      <PendingApprovalNotice feature="creative-management" lang={lang} />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Targeting */}
            {step === 3 && (
              <div className="space-y-5">
                <h3 className="text-white font-semibold">{lang === 'ar' ? 'الاستهداف والميزانية' : 'Targeting & budget'}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {GOAL_OPTIONS.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                        goal === g.id
                          ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                          : 'border-[#2a2d35] text-[#8b8fa8] hover:text-white'
                      }`}
                    >
                      {lang === 'ar' ? g.labelAr : g.labelEn}
                    </button>
                  ))}
                </div>

                {goal === 'leads' && (
                  <div className="rounded-xl border border-[#2a2d35] bg-[#0f1117] p-4 space-y-3">
                    <p className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                      {lang === 'ar' ? 'نموذج العملاء المحتملين' : 'Lead form'}
                    </p>
                    <p className="text-xs text-[#4a4e60]">
                      {lang === 'ar'
                        ? 'اختر نموذجاً موجوداً أو أنشئ نموذجاً جديداً — يُفعّل بعد موافقة توليد العملاء المحتملين.'
                        : 'Select or create a lead form — activates with Lead Generation approval.'}
                    </p>

                    {leadFormsLoading ? (
                      <p className="text-sm text-[#8b8fa8] animate-pulse">
                        {lang === 'ar' ? 'جاري تحميل النماذج...' : 'Loading forms...'}
                      </p>
                    ) : (
                      <label className="flex flex-col gap-1.5">
                        {fieldLabel(lang === 'ar' ? 'النموذج' : 'Form')}
                        <select
                          value={leadFormChoice}
                          onChange={e => setLeadFormChoice(e.target.value)}
                          className={inputClass()}
                        >
                          <option value="">
                            {lang === 'ar' ? '— اختر نموذجاً —' : '— Select a form —'}
                          </option>
                          {leadForms.map(f => (
                            <option key={f.page_id} value={f.page_id}>
                              {f.page_name}{f.status ? ` (${f.status})` : ''}
                            </option>
                          ))}
                          <option value="__create_new__">
                            {lang === 'ar' ? '+ إنشاء نموذج جديد' : '+ Create new lead form'}
                          </option>
                        </select>
                      </label>
                    )}

                    {leadFormsError && !leadFormsLoading && leadForms.length === 0 && (
                      <p className="text-xs text-[#fbbf24]">
                        {lang === 'ar'
                          ? 'تعذر تحميل النماذج — يمكنك اختيار إنشاء نموذج جديد.'
                          : 'Could not load existing forms — you can still choose Create new.'}
                      </p>
                    )}

                    {leadFormChoice === '__create_new__' && (
                      <div className="space-y-3 border-t border-[#2a2d35] pt-3">
                        <label className="flex flex-col gap-1.5">
                          {fieldLabel(lang === 'ar' ? 'اسم النموذج (مسودة)' : 'Form name (draft)')}
                          <input
                            type="text"
                            value={newLeadFormName}
                            onChange={e => setNewLeadFormName(e.target.value)}
                            placeholder={
                              selectedProduct
                                ? `${selectedProduct.title} — Leads`
                                : (lang === 'ar' ? 'نموذج عملاء محتملين' : 'Lead form')
                            }
                            className={inputClass()}
                          />
                        </label>
                        <PendingApprovalNotice feature="lead-generation" lang={lang} />
                      </div>
                    )}

                    {leadFormChoice && leadFormChoice !== '__create_new__' && leadGenPending && (
                      <PendingApprovalNotice feature="lead-generation" lang={lang} />
                    )}
                  </div>
                )}

                {goal === 'orders' && (
                  <div className="rounded-xl border border-[#2a2d35] bg-[#0f1117] p-4 space-y-3">
                    <p className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                      {lang === 'ar' ? 'بكسل TikTok' : 'TikTok Pixel'}
                    </p>
                    {pixelState === 'missing' && (
                      <p className="text-sm text-[#fbbf24]">
                        {lang === 'ar'
                          ? '⚠️ لم يتم ربط بكسل TikTok. أضفه من الإعدادات لتتبع الطلبات.'
                          : '⚠️ No TikTok pixel linked. Add it in Settings to track orders.'}
                      </p>
                    )}
                    {pixelState === 'detected_pending' && (
                      <>
                        <p className="text-sm text-[#4ade80]">
                          {lang === 'ar' ? '✓ تم اكتشاف البكسل' : '✓ Pixel detected'}
                          <span className="text-[#4a4e60] ms-2 font-mono text-xs" dir="ltr">{store?.tiktok_pixel_id}</span>
                        </p>
                        <PendingApprovalNotice feature="pixel-management" lang={lang} />
                      </>
                    )}
                    {pixelState === 'ready' && (
                      <p className="text-sm text-[#4ade80]">
                        {lang === 'ar' ? '✓ البكسل جاهز للتحويلات' : '✓ Pixel ready for conversions'}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    {fieldLabel(lang === 'ar' ? 'الميزانية اليومية (EGP)' : 'Daily budget (EGP)')}
                    <input type="number" min="1" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} className={inputClass()} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    {fieldLabel(lang === 'ar' ? 'وقت البدء' : 'Start date & time')}
                    <input
                      type="datetime-local"
                      value={scheduleStart}
                      onChange={e => setScheduleStart(e.target.value)}
                      className={inputClass()}
                    />
                    <span className="text-[10px] text-[#4a4e60]" dir="ltr">
                      {lang === 'ar' ? 'توقيت حساب الإعلانات:' : 'Ad account timezone:'} {accountTimezone}
                    </span>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    {fieldLabel(lang === 'ar' ? 'وقت الانتهاء (اختياري)' : 'End date & time (optional)')}
                    <input
                      type="datetime-local"
                      value={scheduleEnd}
                      onChange={e => setScheduleEnd(e.target.value)}
                      className={inputClass()}
                    />
                    <span className="text-[10px] text-[#4a4e60]">
                      {lang === 'ar'
                        ? 'اتركه فارغاً للجدولة من الآن (SCHEDULE_FROM_NOW)'
                        : 'Leave empty to run from start time with no end (SCHEDULE_FROM_NOW)'}
                    </span>
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    {fieldLabel(lang === 'ar' ? 'الموقع' : 'Location')}
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={e => setLocationSearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          fetchLocations(locationSearch)
                        }
                      }}
                      placeholder={lang === 'ar' ? 'ابحث عن دولة أو منطقة...' : 'Search country or region...'}
                      className={inputClass()}
                    />
                    {locationsLoading ? (
                      <div className="space-y-2">
                        <p className="text-xs text-[#8b8fa8] animate-pulse">
                          {lang === 'ar' ? 'جاري تحميل المواقع...' : 'Loading locations...'}
                        </p>
                        <select disabled className={inputClass(true)}>
                          <option>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</option>
                        </select>
                      </div>
                    ) : (
                      <select
                        value={locationId}
                        onChange={e => setLocationId(e.target.value)}
                        className={inputClass()}
                        disabled={locations.length === 0}
                      >
                        {locations.length === 0 ? (
                          <option value="">
                            {lang === 'ar' ? 'لا توجد مواقع' : 'No locations available'}
                          </option>
                        ) : (
                          locations.map(l => (
                            <option key={l.location_id} value={l.location_id}>
                              {lang === 'ar' ? l.label_ar : l.name}
                              {l.region_code ? ` (${l.region_code})` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                    {locationsError && (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-[#fbbf24]">
                          {lang === 'ar' ? 'تعذر تحميل المواقع — ' : 'Could not load locations — '}
                          {locationsError}
                        </p>
                        <button
                          type="button"
                          onClick={() => fetchLocations()}
                          className="text-xs text-[#60a5fa] hover:underline"
                        >
                          {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] text-[#4a4e60]" dir="ltr">
                      {locationId ? `location_id: ${locationId}` : ''}
                    </span>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    {fieldLabel(lang === 'ar' ? 'الجنس' : 'Gender')}
                    <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass()}>
                      {GENDER_OPTIONS.map(g => (
                        <option key={g.id} value={g.id}>{lang === 'ar' ? g.labelAr : g.labelEn}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  {fieldLabel(lang === 'ar' ? 'الفئة العمرية' : 'Age')}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {AGE_OPTIONS.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAge(a.id)}
                        className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                          ageGroups.includes(a.id)
                            ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                            : 'border-[#2a2d35] text-[#8b8fa8]'
                        }`}
                      >
                        {lang === 'ar' ? a.labelAr : a.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAdvancedOpen(v => !v)}
                  className="flex items-center gap-2 text-xs text-[#8b8fa8] hover:text-white"
                >
                  <span>{advancedOpen ? '▾' : '▸'}</span>
                  {lang === 'ar' ? 'إعدادات متقدمة' : 'Advanced settings'}
                  {!advanced.touched && (
                    <span className="text-[#4a4e60]">({lang === 'ar' ? 'افتراضيات ذكية' : 'smart defaults'})</span>
                  )}
                </button>

                {advancedOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-[#2a2d35] rounded-xl p-4 bg-[#0f1117]">
                    <label className="flex flex-col gap-1.5">
                      {fieldLabel(lang === 'ar' ? 'نوع الحملة' : 'Campaign type')}
                      <select
                        value={advanced.campaignType}
                        onChange={e => setAdvanced({ ...advanced, touched: true, campaignType: e.target.value as AdvancedSettings['campaignType'] })}
                        className={inputClass()}
                      >
                        <option value="standard">{lang === 'ar' ? 'عادية' : 'Standard'}</option>
                        <option value="smart_plus">Smart+</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      {fieldLabel(lang === 'ar' ? 'مستوى الميزانية' : 'Budget level')}
                      <select
                        value={advanced.budgetLevel}
                        onChange={e => setAdvanced({ ...advanced, touched: true, budgetLevel: e.target.value as AdvancedSettings['budgetLevel'] })}
                        className={inputClass()}
                      >
                        <option value="abo">ABO</option>
                        <option value="cbo">CBO</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      {fieldLabel(lang === 'ar' ? 'وضع الميزانية' : 'Budget mode')}
                      <select
                        value={advanced.budgetMode}
                        onChange={e => setAdvanced({ ...advanced, touched: true, budgetMode: e.target.value as AdvancedSettings['budgetMode'] })}
                        className={inputClass()}
                      >
                        <option value="daily">{lang === 'ar' ? 'يومية' : 'Daily'}</option>
                        <option value="lifetime">{lang === 'ar' ? 'إجمالية' : 'Lifetime'}</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      {fieldLabel(lang === 'ar' ? 'استراتيجية المزايدة' : 'Bid strategy')}
                      <select
                        value={advanced.bidStrategy}
                        onChange={e => setAdvanced({ ...advanced, touched: true, bidStrategy: e.target.value as AdvancedSettings['bidStrategy'] })}
                        className={inputClass()}
                      >
                        <option value="auto">{lang === 'ar' ? 'تلقائي' : 'Auto'}</option>
                        <option value="cost_cap">{lang === 'ar' ? 'حد التكلفة' : 'Cost cap'}</option>
                      </select>
                    </label>
                    {advanced.bidStrategy === 'cost_cap' && (
                      <label className="flex flex-col gap-1.5 sm:col-span-2">
                        {fieldLabel(lang === 'ar' ? 'حد المزايدة (EGP)' : 'Bid cap (EGP)')}
                        <input
                          type="number"
                          min="1"
                          value={advanced.bidCap ?? ''}
                          onChange={e => setAdvanced({ ...advanced, touched: true, bidCap: parseFloat(e.target.value) || null })}
                          className={inputClass()}
                        />
                      </label>
                    )}
                    <label className="flex flex-col gap-1.5">
                      {fieldLabel(lang === 'ar' ? 'المواضع' : 'Placement')}
                      <select
                        value={advanced.placement}
                        onChange={e => setAdvanced({ ...advanced, touched: true, placement: e.target.value as AdvancedSettings['placement'] })}
                        className={inputClass()}
                      >
                        <option value="automatic">{lang === 'ar' ? 'تلقائي' : 'Automatic'}</option>
                        <option value="manual">{lang === 'ar' ? 'يدوي' : 'Manual'}</option>
                      </select>
                    </label>
                    <div>
                      {fieldLabel(lang === 'ar' ? 'اللغات' : 'Languages')}
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {LANGUAGE_OPTIONS.map(l => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => toggleLanguage(l.id)}
                            className={`px-3 py-1 rounded-lg text-xs border ${
                              advanced.languages.includes(l.id)
                                ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                                : 'border-[#2a2d35] text-[#8b8fa8]'
                            }`}
                          >
                            {lang === 'ar' ? l.labelAr : l.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 — Review */}
            {step === 4 && selectedProduct && payload && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold">{lang === 'ar' ? 'مراجعة وإطلاق' : 'Review & launch'}</h3>
                <div className="space-y-3 text-sm">
                  <ReviewRow label={lang === 'ar' ? 'المنتج' : 'Product'} value={selectedProduct.title} />
                  <ReviewRow label={lang === 'ar' ? 'الإبداع' : 'Creative'} value={CREATIVE_SOURCES.find(c => c.id === creativeSource)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || '—'} />
                  <ReviewRow label={lang === 'ar' ? 'الهدف' : 'Goal'} value={GOAL_OPTIONS.find(g => g.id === goal)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || '—'} />
                  <ReviewRow label={lang === 'ar' ? 'الميزانية' : 'Budget'} value={fmtMoney(parseFloat(dailyBudget), 0)} />
                  <ReviewRow
                    label={lang === 'ar' ? 'الجدولة' : 'Schedule'}
                    value={
                      scheduleEnd.trim()
                        ? `${formatScheduleDisplay(scheduleStart, accountTimezone)} → ${formatScheduleDisplay(scheduleEnd, accountTimezone)}`
                        : formatScheduleDisplay(scheduleStart, accountTimezone)
                    }
                    mono
                  />
                  <ReviewRow
                    label={lang === 'ar' ? 'الموقع' : 'Location'}
                    value={locationLabel(locations, locationId, lang)}
                  />
                  <ReviewRow
                    label={lang === 'ar' ? 'الجمهور' : 'Audience'}
                    value={`${locationLabel(locations, locationId, lang)} · ${ageGroups.length} ages`}
                  />
                  {goal === 'leads' ? (
                    <ReviewRow
                      label={lang === 'ar' ? 'نموذج العملاء' : 'Lead form'}
                      value={
                        leadFormSelection?.mode === 'create_new'
                          ? (lang === 'ar' ? `جديد: ${leadFormSelection.page_name}` : `New: ${leadFormSelection.page_name}`)
                          : (leadFormSelection?.page_name || '—')
                      }
                    />
                  ) : (
                    <ReviewRow label={lang === 'ar' ? 'صفحة الهبوط' : 'Landing page'} value={selectedProduct.landing_url} mono />
                  )}
                  <ReviewRow
                    label={lang === 'ar' ? 'الحملة' : 'Campaign name'}
                    value={buildCampaignName(selectedProduct.title, goal, campaignNameSuffix)}
                    mono
                  />
                  <div className="border-t border-[#2a2d35] pt-3 mt-3">
                    <p className="text-[10px] text-[#4a4e60] uppercase tracking-wider mb-2">
                      {lang === 'ar' ? 'الإعدادات المتقدمة' : 'Advanced settings'}
                    </p>
                    <ReviewRow label="Type" value={advSummary.campaignType === 'smart_plus' ? 'Smart+' : 'Standard'} />
                    <ReviewRow label="Budget" value={`${advSummary.budgetLevel.toUpperCase()} · ${advSummary.budgetMode}`} />
                    <ReviewRow label="Bid" value={advSummary.bidStrategy === 'cost_cap' ? `Cost cap ${advSummary.bidCap ?? '—'}` : 'Auto'} />
                    <ReviewRow label="Placement" value={advSummary.placement} />
                    <ReviewRow label="Languages" value={advSummary.languages.join(', ')} />
                  </div>
                </div>

                {creativePending && (
                  <p className="text-xs text-[#fbbf24] bg-[#3a2800]/30 border border-[#fbbf24]/20 rounded-lg px-3 py-2">
                    {lang === 'ar'
                      ? 'سيتم إنشاء الحملة ومجموعة الإعلانات. نشر الإبداع ينتظر موافقة صلاحية إدارة المحتوى.'
                      : 'Campaign & ad group will be created. Creative publish waits for Creative Management approval.'}
                  </p>
                )}

                {goal === 'leads' && leadGenPending && (
                  <p className="text-xs text-[#fbbf24] bg-[#3a2800]/30 border border-[#fbbf24]/20 rounded-lg px-3 py-2">
                    {lang === 'ar'
                      ? 'سيتم إنشاء الحملة ومجموعة الإعلانات الآن. ربط نموذج العملاء ونشر الإعلان ينتظر موافقة توليد العملاء المحتملين.'
                      : 'Campaign & ad group will be created now. Lead form attachment and ad publish wait for Lead Generation approval.'}
                  </p>
                )}

                {launchError && (
                  <div className="text-sm text-[#f87171] bg-[#3a1010]/40 border border-[#f87171]/25 rounded-lg px-3 py-2 whitespace-pre-wrap" dir="ltr">
                    {formatLaunchError(launchError, lang)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Nav footer */}
        {!loadingCtx && !ctxError && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#2a2d35]">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="px-4 py-2 rounded-lg text-xs text-[#8b8fa8] hover:text-white disabled:opacity-30"
            >
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] disabled:opacity-40"
              >
                {lang === 'ar' ? 'التالي' : 'Next'}
              </button>
            ) : (
              <button
                type="button"
                onClick={launch}
                disabled={launching || !payload}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#4ade80] text-[#0f1117] hover:bg-[#22c55e] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {launching
                  ? (lang === 'ar' ? 'جاري الإطلاق...' : 'Launching...')
                  : (lang === 'ar' ? 'إطلاق الحملة' : 'Launch campaign')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 py-1">
      <span className="text-[#4a4e60]">{label}</span>
      <span className={`text-white text-end max-w-[65%] truncate ${mono ? 'font-mono text-xs' : ''}`} dir={mono ? 'ltr' : undefined} title={value}>
        {value}
      </span>
    </div>
  )
}
