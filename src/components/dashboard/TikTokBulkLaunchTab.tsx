'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CreateAdTargetingSection, { DEFAULT_ADVANCED, inputClass } from '@/components/dashboard/CreateAdTargetingSection'
import PendingApprovalNotice, { blockIfScopePending } from '@/components/dashboard/PendingApprovalNotice'
import type { BulkLaunchItemResult } from '@/lib/tiktok/create-ad/bulk-types'
import {
  CREATIVE_SOURCES,
  type AdGoal,
  type AdvancedSettings,
  type CreateAdWizardPayload,
  type CreativeSource,
  type CtaType,
  type LeadFormSummary,
  type ProductSummary,
  type TargetLocation,
} from '@/lib/tiktok/create-ad/types'
import { defaultScheduleStartLocal, isValidLocalDatetime } from '@/lib/tiktok/create-ad/schedule'
import {
  DEFAULT_CONVERSION_EVENT_PREFERENCE,
  type ConversionEventPreference,
  type ConversionEventUiOption,
} from '@/lib/tiktok/create-ad/optimization-events'
import ProductCreativePicker from '@/components/dashboard/ProductCreativePicker'
import type { ProductCreativeItem } from '@/lib/product-creatives/types'

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

function defaultCaption(p: ProductSummary) {
  const desc = p.description ? ` — ${p.description.slice(0, 120)}` : ''
  return `${p.title}${desc}`
}

function sectionTitle(n: number, en: string, ar: string, lang: string) {
  return (
    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#60a5fa] text-xs font-bold flex items-center justify-center shrink-0">
        {n}
      </span>
      {lang === 'ar' ? ar : en}
    </h3>
  )
}

export default function TikTokBulkLaunchTab({
  lang,
  dir,
  fmtMoney,
  hasActiveAccount,
  onReauthRequired,
}: Props) {
  const [loadingCtx, setLoadingCtx] = useState(true)
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [store, setStore] = useState<StoreMeta | null>(null)
  const [ctxError, setCtxError] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [creativeByProduct, setCreativeByProduct] = useState<Record<string, CreativeSource>>({})
  const [selectedCreativeIdsByProduct, setSelectedCreativeIdsByProduct] = useState<Record<string, string[]>>({})
  const [selectedCreativeItemsByProduct, setSelectedCreativeItemsByProduct] = useState<Record<string, ProductCreativeItem[]>>({})

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
  const [ageGroups, setAgeGroups] = useState<string[]>(['AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_100'])
  const [gender, setGender] = useState('GENDER_UNLIMITED')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advanced, setAdvanced] = useState<AdvancedSettings>({ ...DEFAULT_ADVANCED })

  const [leadForms, setLeadForms] = useState<LeadFormSummary[]>([])
  const [leadFormsLoading, setLeadFormsLoading] = useState(false)
  const [leadFormsError, setLeadFormsError] = useState<string | null>(null)
  const [leadFormChoice, setLeadFormChoice] = useState('')
  const [newLeadFormName, setNewLeadFormName] = useState('')
  const [conversionEventOptions, setConversionEventOptions] = useState<ConversionEventUiOption[]>([])
  const [conversionEvent, setConversionEvent] = useState<ConversionEventPreference>(
    DEFAULT_CONVERSION_EVENT_PREFERENCE
  )

  const [launching, setLaunching] = useState(false)
  const [launchResults, setLaunchResults] = useState<BulkLaunchItemResult[] | null>(null)

  const creativePending = blockIfScopePending('creative-management')
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
      setLeadForms(data.items || [])
      if (data.error) setLeadFormsError(data.error)
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
      setScheduleStart(prev => prev || data.store?.default_schedule_start || defaultScheduleStartLocal(tz))
      if (data.pixel_conversion) {
        setConversionEventOptions(data.pixel_conversion.options || [])
        setConversionEvent(
          data.pixel_conversion.default_preference || DEFAULT_CONVERSION_EVENT_PREFERENCE
        )
      }
      if (data.error === 'no_active_account') setCtxError('no_account')
    } catch {
      setCtxError('fetch_failed')
    } finally {
      setLoadingCtx(false)
    }
  }, [])

  useEffect(() => { fetchContext() }, [fetchContext])
  useEffect(() => {
    if (hasActiveAccount && !loadingCtx) fetchLocations()
  }, [hasActiveAccount, loadingCtx, goal, fetchLocations])
  useEffect(() => {
    if (goal === 'leads') fetchLeadForms()
    else {
      setLeadFormChoice('')
      setNewLeadFormName('')
    }
  }, [goal, fetchLeadForms])

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.title.toLowerCase().includes(q))
  }, [products, productSearch])

  const selectedProducts = useMemo(
    () => products.filter(p => selectedIds.has(p.id)),
    [products, selectedIds]
  )

  const toggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setCreativeByProduct(c => {
          const copy = { ...c }
          delete copy[id]
          return copy
        })
        setSelectedCreativeIdsByProduct(c => {
          const copy = { ...c }
          delete copy[id]
          return copy
        })
        setSelectedCreativeItemsByProduct(c => {
          const copy = { ...c }
          delete copy[id]
          return copy
        })
      } else {
        next.add(id)
        setCreativeByProduct(c => ({ ...c, [id]: c[id] || 'product_video' }))
      }
      return next
    })
  }

  const removeProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setCreativeByProduct(c => {
      const copy = { ...c }
      delete copy[id]
      return copy
    })
    setSelectedCreativeIdsByProduct(c => {
      const copy = { ...c }
      delete copy[id]
      return copy
    })
    setSelectedCreativeItemsByProduct(c => {
      const copy = { ...c }
      delete copy[id]
      return copy
    })
  }

  const toggleAge = (id: string) => {
    setAgeGroups(prev => (prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]))
  }

  const toggleLanguage = (id: string) => {
    setAdvanced(prev => {
      const langs = prev.languages.includes(id)
        ? prev.languages.filter(l => l !== id)
        : [...prev.languages, id]
      return { ...prev, touched: true, languages: langs }
    })
  }

  const leadFormSelection = useMemo(() => {
    if (goal !== 'leads' || !leadFormChoice) return null
    const form = leadForms.find(f => f.page_id === leadFormChoice)
    if (!form) return null
    return { mode: 'existing' as const, page_id: form.page_id, page_name: form.page_name }
  }, [goal, leadFormChoice, leadForms])

  const buildPayload = (product: ProductSummary, creative: CreativeSource): CreateAdWizardPayload | null => {
    if (!store) return null
    const budget = parseFloat(dailyBudget)
    if (!Number.isFinite(budget) || budget <= 0) return null
    const ids = selectedCreativeIdsByProduct[product.id] || []
    const items = selectedCreativeItemsByProduct[product.id] || []
    const videoItems = items.filter(i => i.type === 'video')
    const imageItems = items.filter(i => i.type === 'image')
    return {
      product,
      creative: {
        source: creative,
        caption: defaultCaption(product),
        cta: 'order_now' as CtaType,
        creative_ids: ids.length ? ids : null,
        media: creative === 'carousel'
          ? { image_urls: imageItems.map(i => i.url) }
          : creative === 'product_video' || creative === 'upload'
            ? { video_url: videoItems[0]?.url || null }
            : null,
      },
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
        conversion_event: goal === 'orders' ? conversionEvent : null,
      },
      store: {
        tiktok_pixel_id: store.tiktok_pixel_id,
        currency: store.currency,
      },
    }
  }

  const payloads = useMemo(() => {
    const out: CreateAdWizardPayload[] = []
    for (const p of selectedProducts) {
      const creative = creativeByProduct[p.id] || 'product_video'
      const payload = buildPayload(p, creative)
      if (payload) out.push(payload)
    }
    return out
  }, [selectedProducts, creativeByProduct, selectedCreativeIdsByProduct, selectedCreativeItemsByProduct, store, goal, dailyBudget, scheduleStart, scheduleEnd, locationId, ageGroups, gender, advanced, leadFormSelection, conversionEvent])

  const creativeSelectionOk = useMemo(() => {
    for (const p of selectedProducts) {
      const creative = creativeByProduct[p.id] || 'product_video'
      if (creative === 'ai_ugc') return false
      const ids = selectedCreativeIdsByProduct[p.id] || []
      const items = selectedCreativeItemsByProduct[p.id] || []
      if (creative === 'product_video' || creative === 'upload') {
        const videos = items.filter(i => i.type === 'video')
        if (!videos.length || videos.length > 5 || ids.length !== videos.length) return false
      }
      if (creative === 'carousel' && !ids.length) return false
    }
    return true
  }, [selectedProducts, creativeByProduct, selectedCreativeIdsByProduct, selectedCreativeItemsByProduct])

  const canLaunch = useMemo(() => {
    if (!selectedProducts.length || !store || !creativeSelectionOk) return false
    const b = parseFloat(dailyBudget)
    const budgetOk = Number.isFinite(b) && b > 0 && ageGroups.length > 0
    const scheduleOk = isValidLocalDatetime(scheduleStart)
    const endOk = !scheduleEnd.trim() || isValidLocalDatetime(scheduleEnd)
    const locationOk = !!locationId && !locationsLoading
    if (goal === 'leads') return budgetOk && scheduleOk && endOk && locationOk && !!leadFormSelection
    if (goal === 'orders' && !store.tiktok_pixel_id) return false
    return budgetOk && scheduleOk && endOk && locationOk
  }, [selectedProducts, store, creativeSelectionOk, dailyBudget, ageGroups, scheduleStart, scheduleEnd, locationId, locationsLoading, goal, leadFormSelection])

  const totalDailyBudget = useMemo(() => {
    const b = parseFloat(dailyBudget)
    if (!Number.isFinite(b) || b <= 0) return 0
    return b * selectedProducts.length
  }, [dailyBudget, selectedProducts.length])

  const aiUgcCount = useMemo(
    () => selectedProducts.filter(p => creativeByProduct[p.id] === 'ai_ugc').length,
    [selectedProducts, creativeByProduct]
  )

  const launch = async () => {
    if (!canLaunch || !payloads.length) return
    setLaunching(true)
    setLaunchResults(null)
    try {
      const res = await fetch('/api/tiktok/create/bulk-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloads }),
      })
      const data = await res.json()
      if (data.error === 'reauth_required') {
        onReauthRequired?.()
        setLaunching(false)
        return
      }
      setLaunchResults(data.results || [])
    } catch {
      setLaunchResults([])
    } finally {
      setLaunching(false)
    }
  }

  if (!hasActiveAccount && !loadingCtx) {
    return (
      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl px-5 py-12 text-center">
        <p className="text-[#8b8fa8] text-sm">
          {lang === 'ar' ? 'اربط حساب TikTok Ads أولاً من أعلى الصفحة.' : 'Connect a TikTok Ads account first using the header above.'}
        </p>
      </div>
    )
  }

  if (launchResults) {
    const ok = launchResults.filter(r => r.ok).length
    const fail = launchResults.filter(r => !r.ok).length
    return (
      <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 space-y-4" dir={dir}>
        <h3 className="text-white font-semibold text-lg">
          {lang === 'ar'
            ? `${ok} من ${launchResults.length} تم إطلاقها`
            : `${ok} of ${launchResults.length} launched`}
          {fail > 0 && (
            <span className="text-[#f87171] text-sm font-normal ms-2">
              {lang === 'ar' ? `(${fail} فشلت)` : `(${fail} failed)`}
            </span>
          )}
        </h3>
        <ul className="space-y-2 max-h-[360px] overflow-y-auto">
          {launchResults.map(r => (
            <li
              key={r.product_id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                r.ok
                  ? 'border-[#4ade80]/30 bg-[#14321f]/30 text-[#4ade80]'
                  : 'border-[#f87171]/30 bg-[#3a1414]/30 text-[#f87171]'
              }`}
            >
              <div className="flex items-start gap-2">
                <span>{r.ok ? '✓' : '✗'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{r.product_title}</p>
                  {r.ok ? (
                    <div className="text-xs text-[#8b8fa8] mt-0.5" dir="ltr">
                      <p>{r.campaign_id} · {r.adgroup_id}</p>
                      {r.message && <p className="mt-0.5 whitespace-pre-wrap">{r.message}</p>}
                      {r.ads?.length ? (
                        <ul className="mt-1 space-y-0.5">
                          {r.ads.map((ad, i) => (
                            <li key={ad.ad_id || i} className={ad.ok ? '' : 'text-[#f87171]'}>
                              {ad.ok ? `Ad ${i + 1}: ${ad.ad_id}` : `Ad ${i + 1}: ${ad.error || 'failed'}`}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs mt-0.5 whitespace-pre-wrap">{r.error}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {creativePending && ok > 0 && (
          <p className="text-sm text-[#fbbf24] bg-[#3a2800]/40 border border-[#fbbf24]/25 rounded-lg px-4 py-3">
            {lang === 'ar'
              ? 'الإبداع محفوظ — سيُنشر تلقائياً بعد موافقة TikTok على صلاحية إدارة المحتوى.'
              : 'Creative saved — it will publish automatically once Creative Management is approved.'}
          </p>
        )}
        <button
          type="button"
          onClick={() => setLaunchResults(null)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2a2d35] text-white hover:bg-[#3a3d48]"
        >
          {lang === 'ar' ? 'إطلاق دفعة أخرى' : 'Launch another batch'}
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start" dir={dir}>
      {/* Left — form */}
      <div className="space-y-5 min-w-0">
        {loadingCtx ? (
          <p className="text-sm text-[#8b8fa8] animate-pulse py-12 text-center">
            {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        ) : ctxError ? (
          <div className="text-center py-8">
            <p className="text-[#f87171] text-sm mb-3">{lang === 'ar' ? 'تعذر التحميل' : 'Could not load'}</p>
            <button type="button" onClick={fetchContext} className="text-xs text-[#60a5fa]">
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <>
            {/* Section 1 — Products */}
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 space-y-4">
              {sectionTitle(1, 'Pick products', 'اختر المنتجات', lang)}
              <input
                type="search"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث عن منتج...' : 'Search products...'}
                className={inputClass()}
              />
              {products.length === 0 ? (
                <p className="text-sm text-[#8b8fa8] py-4 text-center">
                  {lang === 'ar' ? 'لا توجد منتجات نشطة.' : 'No active products.'}
                </p>
              ) : (
                <div className="max-h-[280px] overflow-y-auto space-y-2 pe-1">
                  {filteredProducts.map(p => {
                    const checked = selectedIds.has(p.id)
                    const img = p.images[0]
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                          checked
                            ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10'
                            : 'border-[#2a2d35] bg-[#0f1117] hover:border-[#3b82f6]/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                          className="rounded border-[#2a2d35] text-[#3b82f6] shrink-0"
                        />
                        <div className="w-12 h-12 rounded-lg bg-[#1a1d24] overflow-hidden shrink-0 flex items-center justify-center">
                          {img ? (
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg opacity-40">📦</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{p.title}</p>
                          <p className="text-xs text-[#4ade80] tabular-nums" dir="ltr">{fmtMoney(p.price, 0)}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Section 2 — Creative per product */}
            {selectedProducts.length > 0 && (
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 space-y-4">
                {sectionTitle(2, 'Choose creative (one per product)', 'اختر الإبداع لكل منتج', lang)}
                <div className="space-y-4">
                  {selectedProducts.map(p => {
                    const creative = creativeByProduct[p.id] || 'product_video'
                    return (
                      <div key={p.id} className="rounded-xl border border-[#2a2d35] bg-[#0f1117] p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <span className="text-xl">📦</span>
                          )}
                          <p className="text-sm font-medium text-white truncate flex-1">{p.title}</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {CREATIVE_SOURCES.map(src => (
                            <label
                              key={src.id}
                              className={`flex flex-col gap-1 rounded-lg border p-2.5 cursor-pointer text-start transition-all ${
                                creative === src.id
                                  ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                                  : 'border-[#2a2d35] hover:border-[#3b82f6]/40'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`creative-${p.id}`}
                                checked={creative === src.id}
                                onChange={() => {
                                  setCreativeByProduct(prev => ({ ...prev, [p.id]: src.id }))
                                  setSelectedCreativeIdsByProduct(prev => ({ ...prev, [p.id]: [] }))
                                  setSelectedCreativeItemsByProduct(prev => ({ ...prev, [p.id]: [] }))
                                }}
                                className="sr-only"
                              />
                              <span>{src.icon}</span>
                              <span className="text-[10px] font-medium text-white leading-tight">
                                {lang === 'ar' ? src.labelAr : src.labelEn}
                              </span>
                            </label>
                          ))}
                        </div>
                        {creative === 'ai_ugc' && (
                          <div className="space-y-2">
                            <p className="text-xs text-[#fbbf24]">
                              {lang === 'ar' ? '＋ توليد UGC بالذكاء الاصطناعي' : '＋ Generate AI UGC'}
                            </p>
                            <PendingApprovalNotice feature="creative-management" lang={lang} className="text-start" />
                          </div>
                        )}
                        {(creative === 'upload' || creative === 'carousel') && (
                          <PendingApprovalNotice feature="creative-management" lang={lang} className="text-start" />
                        )}
                        {(creative === 'product_video' || creative === 'carousel' || creative === 'upload') && (
                          <ProductCreativePicker
                            productId={p.id}
                            lang={lang}
                            dir={dir}
                            mode={creative === 'carousel' ? 'carousel' : 'video'}
                            selectedIds={selectedCreativeIdsByProduct[p.id] || []}
                            onChange={(ids, items) => {
                              setSelectedCreativeIdsByProduct(prev => ({ ...prev, [p.id]: ids }))
                              setSelectedCreativeItemsByProduct(prev => ({ ...prev, [p.id]: items }))
                            }}
                            allowUpload={creative === 'upload'}
                            uploadLabel={lang === 'ar' ? 'اضغط لرفع فيديو' : 'Click to upload video'}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Section 3 — Shared targeting */}
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 space-y-4">
              {sectionTitle(3, 'Targeting & budget (shared)', 'الاستهداف والميزانية (مشترك)', lang)}
              <CreateAdTargetingSection
                lang={lang}
                currency={store?.currency || 'EGP'}
                goal={goal}
                setGoal={setGoal}
                dailyBudget={dailyBudget}
                setDailyBudget={setDailyBudget}
                scheduleStart={scheduleStart}
                setScheduleStart={setScheduleStart}
                scheduleEnd={scheduleEnd}
                setScheduleEnd={setScheduleEnd}
                accountTimezone={accountTimezone}
                locationId={locationId}
                setLocationId={setLocationId}
                locations={locations}
                locationsLoading={locationsLoading}
                locationsError={locationsError}
                locationSearch={locationSearch}
                setLocationSearch={setLocationSearch}
                fetchLocations={fetchLocations}
                ageGroups={ageGroups}
                toggleAge={toggleAge}
                gender={gender}
                setGender={setGender}
                advancedOpen={advancedOpen}
                setAdvancedOpen={setAdvancedOpen}
                advanced={advanced}
                setAdvanced={setAdvanced}
                toggleLanguage={toggleLanguage}
                store={store}
                leadProduct={selectedProducts[0] || null}
                leadForms={leadForms}
                leadFormsLoading={leadFormsLoading}
                leadFormsError={leadFormsError}
                refreshLeadForms={fetchLeadForms}
                leadFormChoice={leadFormChoice}
                setLeadFormChoice={setLeadFormChoice}
                newLeadFormName={newLeadFormName}
                setNewLeadFormName={setNewLeadFormName}
                conversionEventOptions={conversionEventOptions}
                conversionEvent={conversionEvent}
                setConversionEvent={setConversionEvent}
              />
            </div>
          </>
        )}
      </div>

      {/* Right — sticky preview */}
      <div className="lg:sticky lg:top-4 space-y-4">
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-5 space-y-4">
          <p className="text-[10px] text-[#4a4e60] uppercase tracking-wider">
            {lang === 'ar' ? 'معاينة الإطلاق' : 'Launch preview'}
          </p>

          <div className="text-center py-2">
            <p className="text-4xl font-bold text-white tabular-nums">{selectedProducts.length}</p>
            <p className="text-xs text-[#8b8fa8] mt-1">
              {lang === 'ar' ? 'حملات ستُنشأ' : 'campaigns to create'}
            </p>
          </div>

          {selectedProducts.length === 0 ? (
            <p className="text-xs text-[#4a4e60] text-center py-4">
              {lang === 'ar' ? 'اختر منتجاً واحداً على الأقل' : 'Select at least one product'}
            </p>
          ) : (
            <ul className="space-y-2 max-h-[220px] overflow-y-auto">
              {selectedProducts.map(p => {
                const creative = creativeByProduct[p.id] || 'product_video'
                const creativeLabel = CREATIVE_SOURCES.find(c => c.id === creative)
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-[#2a2d35] bg-[#0f1117] px-2.5 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white truncate">{p.title}</p>
                      <p className="text-[#4a4e60] truncate">
                        {creativeLabel ? (lang === 'ar' ? creativeLabel.labelAr : creativeLabel.labelEn) : creative}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(p.id)}
                      className="text-[#4a4e60] hover:text-[#f87171] shrink-0 px-1"
                      aria-label={lang === 'ar' ? 'إزالة' : 'Remove'}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-[#2a2d35] pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-[#8b8fa8]">
              <span>{lang === 'ar' ? 'إجمالي الميزانية اليومية' : 'Total daily budget'}</span>
              <span className="text-white font-semibold tabular-nums" dir="ltr">
                {fmtMoney(totalDailyBudget, 0)}
              </span>
            </div>
            {aiUgcCount > 0 && (
              <div className="flex justify-between text-[#8b8fa8]">
                <span>{lang === 'ar' ? 'رصيد AI UGC' : 'AI UGC credits'}</span>
                <span className="text-[#fbbf24] tabular-nums">{aiUgcCount}</span>
              </div>
            )}
          </div>

          {creativePending && selectedProducts.length > 0 && (
            <p className="text-[10px] text-[#fbbf24] leading-relaxed">
              {lang === 'ar'
                ? 'سيُنشأ الحملة + مجموعة الإعلانات. نشر الإبداع ينتظر موافقة إدارة المحتوى.'
                : 'Creates campaign + ad group each. Creative publish waits for Creative Management approval.'}
            </p>
          )}

          <button
            type="button"
            onClick={launch}
            disabled={launching || !canLaunch}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[#4ade80] text-[#0f1117] hover:bg-[#22c55e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {launching
              ? (lang === 'ar' ? 'جاري الإطلاق...' : 'Launching...')
              : (lang === 'ar'
                ? `🚀 إطلاق ${selectedProducts.length} حملات`
                : `🚀 Launch ${selectedProducts.length} campaigns`)}
          </button>
        </div>
      </div>
    </div>
  )
}
