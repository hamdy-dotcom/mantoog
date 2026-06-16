'use client'

import PendingApprovalNotice, { blockIfScopePending } from '@/components/dashboard/PendingApprovalNotice'
import ConversionEventField from '@/components/dashboard/ConversionEventField'
import { isTikTokScopeApproved } from '@/lib/tiktok/scopes'
import type { ConversionEventPreference, ConversionEventUiOption } from '@/lib/tiktok/create-ad/optimization-events'
import { DEFAULT_CONVERSION_EVENT_PREFERENCE } from '@/lib/tiktok/create-ad/optimization-events'
import {
  AGE_OPTIONS,
  DEFAULT_ADVANCED,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  type AdGoal,
  type AdvancedSettings,
  type LeadFormSummary,
  type ProductSummary,
  type TargetLocation,
} from '@/lib/tiktok/create-ad/types'

const ALL_18_PLUS_AGE_IDS = ['AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_100'] as const

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))

function buildWeeklyDaypartingFromHours(selectedHours: number[]): string {
  const hourSet = new Set(selectedHours.filter(h => Number.isFinite(h) && h >= 0 && h <= 23))
  const day = Array.from({ length: 48 }, (_, idx) => {
    const hour = Math.floor(idx / 2)
    return hourSet.has(hour) ? '1' : '0'
  }).join('')
  return day.repeat(7)
}

const LEADS_CENTER_URL = 'https://ads.tiktok.com/'

const PLACEMENT_OPTIONS: { id: string; labelEn: string; labelAr: string; noteEn?: string; noteAr?: string }[] = [
  { id: 'PLACEMENT_TIKTOK', labelEn: 'TikTok', labelAr: 'Tik توك' },
  { id: 'PLACEMENT_PANGLE', labelEn: 'Pangle / Global App Bundle', labelAr: 'Pangle / Global App Bundle' },
  { id: 'PLACEMENT_SEARCH', labelEn: 'Search', labelAr: 'بحث', noteEn: 'Where available', noteAr: 'حسب التوفر' },
]

function fieldLabel(text: string) {
  return <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider font-medium">{text}</span>
}

function inputClass(disabled = false) {
  return `w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] ${
    disabled ? 'opacity-60 cursor-not-allowed' : ''
  }`
}

type Props = {
  lang: string
  currency: string
  goal: AdGoal
  setGoal: (g: AdGoal) => void
  dailyBudget: string
  setDailyBudget: (v: string) => void
  scheduleStart: string
  setScheduleStart: (v: string) => void
  scheduleEnd: string
  setScheduleEnd: (v: string) => void
  accountTimezone: string
  locationId: string
  setLocationId: (v: string) => void
  locations: TargetLocation[]
  locationsLoading: boolean
  locationsError: string | null
  locationSearch: string
  setLocationSearch: (v: string) => void
  fetchLocations: (search?: string) => void
  ageGroups: string[]
  toggleAge: (id: string) => void
  gender: string
  setGender: (v: string) => void
  advancedOpen: boolean
  setAdvancedOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  advanced: AdvancedSettings
  setAdvanced: (v: AdvancedSettings | ((prev: AdvancedSettings) => AdvancedSettings)) => void
  toggleLanguage: (id: string) => void
  store: { tiktok_pixel_id: string | null } | null
  leadProduct?: ProductSummary | null
  leadForms: LeadFormSummary[]
  leadFormsLoading: boolean
  leadFormsError: string | null
  refreshLeadForms?: () => void
  leadFormChoice: string
  setLeadFormChoice: (v: string) => void
  newLeadFormName: string
  setNewLeadFormName: (v: string) => void
  conversionEventOptions?: ConversionEventUiOption[]
  conversionEvent?: ConversionEventPreference
  setConversionEvent?: (v: ConversionEventPreference) => void
}

export default function CreateAdTargetingSection({
  lang,
  currency,
  goal,
  setGoal,
  dailyBudget,
  setDailyBudget,
  scheduleStart,
  setScheduleStart,
  scheduleEnd,
  setScheduleEnd,
  accountTimezone,
  locationId,
  setLocationId,
  locations,
  locationsLoading,
  locationsError,
  locationSearch,
  setLocationSearch,
  fetchLocations,
  ageGroups,
  toggleAge,
  gender,
  setGender,
  advancedOpen,
  setAdvancedOpen,
  advanced,
  setAdvanced,
  toggleLanguage,
  store,
  leadProduct,
  leadForms,
  leadFormsLoading,
  leadFormsError,
  refreshLeadForms,
  leadFormChoice,
  setLeadFormChoice,
  newLeadFormName,
  setNewLeadFormName,
  conversionEventOptions = [],
  conversionEvent = DEFAULT_CONVERSION_EVENT_PREFERENCE,
  setConversionEvent,
}: Props) {
  const leadGenPending = blockIfScopePending('lead-generation')
  const pixelState = !store?.tiktok_pixel_id
    ? 'missing'
    : isTikTokScopeApproved('pixel-management')
      ? 'ready'
      : 'detected_pending'

  return (
    <div className="space-y-5">
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
              ? 'أنشئ النموذج على TikTok (Leads Center) ثم ارجع هنا واضغط تحديث.'
              : 'Create the form in TikTok Leads Center, then come back and click Refresh.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={LEADS_CENTER_URL}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-lg text-xs border border-[#2a2d35] text-[#8b8fa8] hover:text-white hover:border-[#3b82f6]"
            >
              {lang === 'ar' ? 'فتح Leads Center على TikTok' : 'Open TikTok Leads Center'}
            </a>
            <button
              type="button"
              onClick={() => refreshLeadForms?.()}
              disabled={!refreshLeadForms || leadFormsLoading}
              className="px-3 py-2 rounded-lg text-xs border border-[#2a2d35] text-[#8b8fa8] hover:text-white disabled:opacity-40"
            >
              {lang === 'ar' ? 'تحديث النماذج' : 'Refresh forms'}
            </button>
          </div>
          {leadFormsLoading ? (
            <p className="text-sm text-[#8b8fa8] animate-pulse">
              {lang === 'ar' ? 'جاري تحميل النماذج...' : 'Loading forms...'}
            </p>
          ) : (
            <label className="flex flex-col gap-1.5">
              {fieldLabel(lang === 'ar' ? 'النموذج' : 'Form')}
              <select value={leadFormChoice} onChange={e => setLeadFormChoice(e.target.value)} className={inputClass()}>
                <option value="">{lang === 'ar' ? '— اختر نموذجاً —' : '— Select a form —'}</option>
                {leadForms.map(f => (
                  <option key={f.page_id} value={f.page_id}>
                    {f.page_name}{f.status ? ` (${f.status})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {leadFormChoice && leadGenPending && (
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
          {pixelState !== 'missing' && conversionEventOptions.length > 0 && setConversionEvent && (
            <ConversionEventField
              lang={lang}
              options={conversionEventOptions}
              value={conversionEvent}
              onChange={setConversionEvent}
              inputClassName={inputClass()}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          {fieldLabel(lang === 'ar' ? `الميزانية اليومية (${currency})` : `Daily budget (${currency})`)}
          <input type="number" min="1" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} className={inputClass()} />
        </label>
        <label className="flex flex-col gap-1.5">
          {fieldLabel(lang === 'ar' ? 'وقت البدء' : 'Start date & time')}
          <input type="datetime-local" value={scheduleStart} onChange={e => setScheduleStart(e.target.value)} className={inputClass()} />
          <span className="text-[10px] text-[#4a4e60]" dir="ltr">
            {lang === 'ar' ? 'توقيت حساب الإعلانات:' : 'Ad account timezone:'} {accountTimezone}
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          {fieldLabel(lang === 'ar' ? 'وقت الانتهاء (اختياري)' : 'End date & time (optional)')}
          <input type="datetime-local" value={scheduleEnd} onChange={e => setScheduleEnd(e.target.value)} className={inputClass()} />
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
            <select disabled className={inputClass(true)}>
              <option>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</option>
            </select>
          ) : (
            <select
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className={inputClass()}
              disabled={locations.length === 0}
            >
              {locations.length === 0 ? (
                <option value="">{lang === 'ar' ? 'لا توجد مواقع' : 'No locations available'}</option>
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
            <button type="button" onClick={() => fetchLocations()} className="text-xs text-[#60a5fa] hover:underline text-start">
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          )}
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
          <button
            type="button"
            onClick={() => {
              const allSelected = ALL_18_PLUS_AGE_IDS.every(id => ageGroups.includes(id))
              if (allSelected) {
                // Keep at least 18–24 selected as a sane floor.
                toggleAge('AGE_18_24')
                return
              }
              for (const id of ALL_18_PLUS_AGE_IDS) {
                if (!ageGroups.includes(id)) toggleAge(id)
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
              ALL_18_PLUS_AGE_IDS.every(id => ageGroups.includes(id))
                ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                : 'border-[#2a2d35] text-[#8b8fa8]'
            }`}
          >
            {lang === 'ar' ? 'الكل (18+)' : 'All (18+)'}
          </button>
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
              {fieldLabel(lang === 'ar' ? `حد المزايدة (${currency})` : `Bid cap (${currency})`)}
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
                        onChange={e => {
                          const nextPlacement = e.target.value as AdvancedSettings['placement']
                          setAdvanced(prev => {
                            const next = { ...prev, touched: true, placement: nextPlacement }
                            if (nextPlacement === 'manual' && (!next.placements || next.placements.length === 0)) {
                              next.placements = ['PLACEMENT_TIKTOK']
                            }
                            return next
                          })
                        }}
              className={inputClass()}
            >
              <option value="automatic">{lang === 'ar' ? 'تلقائي' : 'Automatic'}</option>
              <option value="manual">{lang === 'ar' ? 'يدوي' : 'Manual'}</option>
            </select>
          </label>
                    {advanced.placement === 'manual' && (
                      <div className="sm:col-span-2">
                        {fieldLabel(lang === 'ar' ? 'اختر المواضع' : 'Select placements')}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {PLACEMENT_OPTIONS.map(p => {
                            const selected = advanced.placements?.includes(p.id)
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setAdvanced(prev => {
                                  const has = prev.placements.includes(p.id)
                                  const placements = has
                                    ? prev.placements.filter(x => x !== p.id)
                                    : [...prev.placements, p.id]
                                  return { ...prev, touched: true, placements }
                                })}
                                className={`px-3 py-1 rounded-lg text-xs border ${
                                  selected
                                    ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                                    : 'border-[#2a2d35] text-[#8b8fa8] hover:text-white'
                                }`}
                              >
                                {lang === 'ar' ? p.labelAr : p.labelEn}
                                {(p.noteEn || p.noteAr) && (
                                  <span className="text-[#4a4e60] ms-1">
                                    ({lang === 'ar' ? (p.noteAr || p.noteEn) : (p.noteEn || p.noteAr)})
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-[#4a4e60] mt-1.5">
                          {lang === 'ar'
                            ? 'إذا لم يتم اختيار شيء، سيتم استخدام TikTok تلقائياً.'
                            : 'If none selected, TikTok will be used by default.'}
                        </p>
                      </div>
                    )}
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 text-sm text-[#8b8fa8]">
                        <input
                          type="checkbox"
                          checked={advanced.comment_disabled}
                          onChange={e => setAdvanced(prev => ({ ...prev, touched: true, comment_disabled: e.target.checked }))}
                        />
                        {lang === 'ar' ? 'تعطيل التعليقات' : 'Disable comments'}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[#8b8fa8]">
                        <input
                          type="checkbox"
                          checked={advanced.video_download_disabled}
                          onChange={e => setAdvanced(prev => ({ ...prev, touched: true, video_download_disabled: e.target.checked }))}
                        />
                        {lang === 'ar' ? 'تعطيل تنزيل الفيديو' : 'Disable video download'}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[#8b8fa8]">
                        <input
                          type="checkbox"
                          checked={advanced.share_disabled}
                          onChange={e => setAdvanced(prev => ({ ...prev, touched: true, share_disabled: e.target.checked }))}
                        />
                        {lang === 'ar' ? 'تعطيل المشاركة' : 'Disable sharing'}
                      </label>
                    </div>
          <div>
            {fieldLabel(lang === 'ar' ? 'اللغات' : 'Languages')}
            <div className="flex flex-wrap gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setAdvanced(prev => ({ ...prev, touched: true, languages: [] }))}
                className={`px-3 py-1 rounded-lg text-xs border ${
                  (advanced.languages?.length ?? 0) === 0
                    ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                    : 'border-[#2a2d35] text-[#8b8fa8]'
                }`}
              >
                {lang === 'ar' ? 'الكل' : 'All'}
              </button>
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
            <p className="text-[10px] text-[#4a4e60] mt-1.5">
              {lang === 'ar'
                ? 'افتراضيًا: الكل (بدون تقييد).'
                : 'Default: All (no restriction).'}
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            {fieldLabel(lang === 'ar' ? 'قوة الإنفاق' : 'Spending power')}
            <select
              value={advanced.spending_power}
              onChange={e => setAdvanced(prev => ({ ...prev, touched: true, spending_power: e.target.value as AdvancedSettings['spending_power'] }))}
              className={inputClass()}
            >
              <option value="ALL">{lang === 'ar' ? 'الكل' : 'All'}</option>
              <option value="HIGH">{lang === 'ar' ? 'قوة إنفاق عالية' : 'High spending power'}</option>
            </select>
          </label>
          <div className="sm:col-span-2 space-y-2">
            {fieldLabel(lang === 'ar' ? 'جدولة العرض (Dayparting)' : 'Ad schedule (dayparting)')}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdvanced(prev => ({ ...prev, touched: true, dayparting_mode: 'all_day', dayparting: null }))}
                className={`px-3 py-1 rounded-lg text-xs border ${
                  advanced.dayparting_mode === 'all_day'
                    ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                    : 'border-[#2a2d35] text-[#8b8fa8]'
                }`}
              >
                {lang === 'ar' ? 'طوال اليوم' : 'Run all day'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultHours = Array.from({ length: 24 }, (_, h) => h)
                  setAdvanced(prev => ({
                    ...prev,
                    touched: true,
                    dayparting_mode: 'custom_hours',
                    dayparting: prev.dayparting && prev.dayparting.length === 168 ? prev.dayparting : buildWeeklyDaypartingFromHours(defaultHours),
                  }))
                }}
                className={`px-3 py-1 rounded-lg text-xs border ${
                  advanced.dayparting_mode === 'custom_hours'
                    ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                    : 'border-[#2a2d35] text-[#8b8fa8]'
                }`}
              >
                {lang === 'ar' ? 'تحديد ساعات' : 'Set hours'}
              </button>
            </div>

            {advanced.dayparting_mode === 'custom_hours' && (
              <div className="border border-[#2a2d35] rounded-xl p-3 bg-[#0b0d12]">
                <p className="text-[10px] text-[#4a4e60] mb-2">
                  {lang === 'ar'
                    ? 'اختر ساعات التشغيل (يُطبق على كل أيام الأسبوع).'
                    : 'Pick active hours (applies to all days).'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {HOUR_LABELS.map((label, h) => {
                    const mask = advanced.dayparting || ''
                    const day = mask.slice(0, 48)
                    const on = day[2 * h] === '1' && day[2 * h + 1] === '1'
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          const current = new Set<number>()
                          if (advanced.dayparting && advanced.dayparting.length === 168) {
                            const d0 = advanced.dayparting.slice(0, 48)
                            for (let hh = 0; hh < 24; hh++) {
                              if (d0[2 * hh] === '1' && d0[2 * hh + 1] === '1') current.add(hh)
                            }
                          } else {
                            for (let hh = 0; hh < 24; hh++) current.add(hh)
                          }
                          if (current.has(h)) current.delete(h)
                          else current.add(h)
                          const nextMask = buildWeeklyDaypartingFromHours([...current])
                          setAdvanced(prev => ({ ...prev, touched: true, dayparting_mode: 'custom_hours', dayparting: nextMask }))
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] border ${
                          on
                            ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-white'
                            : 'border-[#2a2d35] text-[#8b8fa8]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { DEFAULT_ADVANCED, fieldLabel, inputClass }
