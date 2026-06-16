'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { getAuthenticatedUser, loadMerchantStore, signOutAndGoToLogin } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { formatStoreUrlDisplay, getStoreShareUrl } from '@/lib/site-url'

const currencies = [
  { code: 'EGP', label: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'SAR', label: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', label: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'USD', label: 'US Dollar', flag: '🇺🇸' },
  { code: 'MAD', label: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'DZD', label: 'Algerian Dinar', flag: '🇩🇿' },
]

const presetColors = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
]

function StoreUrlDisplay({
  slug,
  label,
  copyLabel,
  copiedLabel,
  copied,
  onCopy,
}: {
  slug?: string | null
  label: string
  copyLabel: string
  copiedLabel: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-4 py-3">
      <div className="text-xs text-[#4a4e60] mb-1">{label}</div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[#3b82f6] font-mono break-all">
          {slug ? formatStoreUrlDisplay(slug) : '—'}
        </div>
        {slug && (
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 text-xs bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? copiedLabel : copyLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const [store, setStore] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('store')

  // Store fields
  const [storeName, setStoreName] = useState('')
  const [currency, setCurrency] = useState('EGP')
  const [language, setLanguage] = useState('ar')
  const [primaryColor, setPrimaryColor] = useState('#3b82f6')
  const [theme, setTheme] = useState('classic')
  const [shippingType, setShippingType] = useState('static')
  const [staticShippingCost, setStaticShippingCost] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [tiktokPixelId, setTiktokPixelId] = useState('')
  const [snapchatPixelId, setSnapchatPixelId] = useState('')
  const [googleAdsConversionId, setGoogleAdsConversionId] = useState('')
  const [googleAdsConversionLabel, setGoogleAdsConversionLabel] = useState('')
  const [savingPixels, setSavingPixels] = useState(false)
  const [addressMode, setAddressMode] = useState<'text' | 'map'>('text')
  const [locationRequired, setLocationRequired] = useState(false)
  const [showQuantity, setShowQuantity] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteRequired, setNoteRequired] = useState(false)

  // Merchant fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const copyStoreUrl = async () => {
    if (!store?.slug) return
    try {
      await navigator.clipboard.writeText(getStoreShareUrl(store.slug))
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    } catch {
      // clipboard may be unavailable; best-effort only
    }
  }

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      const { user, store: storeData } = ctx
      const store = storeData as Record<string, any>

      const { data: merchantData } = await supabase.from('merchants').select('*').eq('id', user.id).single()
      setMerchant(merchantData)
      setFullName(merchantData?.full_name || '')
      setPhone(merchantData?.phone || '')

      setStore(store)
      setStoreName(store.name || '')
      setCurrency(store.currency || 'EGP')
      setLanguage(store.language || 'ar')
      setPrimaryColor(store.primary_color || '#3b82f6')
      setTheme(store.theme || 'classic')
      setShippingType(store.shipping_type || 'static')
      setStaticShippingCost(store.static_shipping_cost?.toString() || '')
      setCustomDomain(store.custom_domain || '')
      setLogoUrl(store.logo_url || '')
      if (store.meta_pixel_id) setMetaPixelId(store.meta_pixel_id)
      if (store.tiktok_pixel_id) setTiktokPixelId(store.tiktok_pixel_id)
      if (store.snapchat_pixel_id) setSnapchatPixelId(store.snapchat_pixel_id)
      if (store.google_ads_conversion_id) setGoogleAdsConversionId(store.google_ads_conversion_id)
      if (store.google_ads_conversion_label) setGoogleAdsConversionLabel(store.google_ads_conversion_label)
      setAddressMode(store.address_mode || (store.enable_location ? 'map' : 'text'))
      setLocationRequired(store.location_required || false)
      setShowQuantity(store.show_quantity || false)
      setShowNote(store.show_note || false)
      setNoteRequired(store.note_required || false)
      setLoading(false)
    }
    init()
  }, [])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    const user = await getAuthenticatedUser(supabase)
    if (!user) {
      await signOutAndGoToLogin(router)
      return
    }

    // Upload new logo if provided
    let newLogoUrl = logoUrl
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `logos/${user.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(path, logoFile)
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(path)
        newLogoUrl = data.publicUrl
      }
    }

    // Update store
    const { error: storeError } = await supabase.from('stores').update({
      name: storeName,
      currency,
      language,
      primary_color: primaryColor,
      theme: theme,
      shipping_type: shippingType,
      static_shipping_cost: shippingType === 'static' ? parseFloat(staticShippingCost) || 0 : null,
      custom_domain: customDomain || null,
      logo_url: newLogoUrl || null,
      address_mode: addressMode,
      location_required: locationRequired,
      show_quantity: showQuantity,
      show_note: showNote,
      note_required: noteRequired,
      updated_at: new Date().toISOString(),
    }).eq('id', store.id)

    // Update merchant
    await supabase.from('merchants').update({
      full_name: fullName,
      phone,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    if (storeError) {
      setError('Failed to save settings.')
      setSaving(false)
      return
    }

    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleSavePixels = async () => {
    setSavingPixels(true)
    await supabase.from('stores').update({
      meta_pixel_id: metaPixelId.trim() || null,
      tiktok_pixel_id: tiktokPixelId.trim() || null,
      snapchat_pixel_id: snapchatPixelId.trim() || null,
      google_ads_conversion_id: googleAdsConversionId.trim() || null,
      google_ads_conversion_label: googleAdsConversionLabel.trim() || null,
    }).eq('id', store.id)
    setStore((prev: any) => ({
      ...prev,
      meta_pixel_id: metaPixelId,
      tiktok_pixel_id: tiktokPixelId,
      snapchat_pixel_id: snapchatPixelId,
      google_ads_conversion_id: googleAdsConversionId,
      google_ads_conversion_label: googleAdsConversionLabel,
    }))
    setSavingPixels(false)
    alert(lang === 'ar' ? '✓ تم حفظ إعدادات البكسل' : '✓ Pixel settings saved')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className={DASHBOARD_MAIN_CLASS}>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{tr.settingsTitle}</h1>
            <p className="text-[#8b8fa8] text-sm mt-1">{tr.settingsSub}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : tr.saveChanges}
          </button>
        </div>

        {success && (
          <div className="mb-6 bg-[#14321f] border border-[#4ade80]/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="text-[#4ade80]">✓</span>
            <p className="text-[#4ade80] text-sm">Settings saved successfully!</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5">
            <p className="text-[#f87171] text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl w-fit mb-6">
          {[
            { id: 'store', label: tr.storeInfo },
            { id: 'brand', label: tr.brandAppearance },
            { id: 'pixels', label: lang === 'ar' ? '📡 التتبع والإعلانات' : '📡 Pixels & Ads' },
            { id: 'checkout', label: { ar: 'نموذج الطلب', en: 'Order Form' }, icon: '🛒' },
            { id: 'shipping', label: tr.shipping },
            { id: 'domain', label: tr.customDomain },
            { id: 'account', label: tr.account },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
            >
              {'icon' in tab && tab.icon ? `${tab.icon} ` : ''}
              {typeof tab.label === 'object' ? tab.label[lang as 'ar' | 'en'] : tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-5">

          {activeTab === 'store' && (
            <>
              <Section title={tr.storeInfo}>
                <Field label={tr.storeName} value={storeName} onChange={setStoreName} />
                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.currency}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {currencies.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setCurrency(c.code)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${currency === c.code ? 'border-[#3b82f6] bg-[#1a3a5c] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}
                      >
                        <span>{c.flag}</span>
                        <span className="font-medium">{c.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.language}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ code: 'ar', label: 'العربية' }, { code: 'en', label: 'English' }].map(l => (
                      <button
                        key={l.code}
                        onClick={() => setLanguage(l.code)}
                        className={`py-2.5 rounded-lg border text-sm transition-colors ${language === l.code ? 'border-[#3b82f6] bg-[#1a3a5c] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Section>
              <Section title={tr.storeUrl}>
                <StoreUrlDisplay
                  slug={store?.slug}
                  label={tr.storeLink}
                  copyLabel={tr.copy}
                  copiedLabel={tr.copied}
                  copied={urlCopied}
                  onCopy={copyStoreUrl}
                />
              </Section>
            </>
          )}

          {activeTab === 'brand' && (
            <Section title={tr.brandAppearance}>
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.storeLogo}</label>
                <div className="flex items-center gap-4">
                  {(logoPreview || logoUrl) ? (
                    <img src={logoPreview || logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-[#2a2d35]" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#0f1117] border border-[#2a2d35] flex items-center justify-center text-[#4a4e60] text-xs">Logo</div>
                  )}
                  <label className="cursor-pointer border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
                    {logoPreview || logoUrl ? 'Change logo' : 'Upload logo'}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                  {(logoPreview || logoUrl) && (
                    <button onClick={() => { setLogoFile(null); setLogoPreview(''); setLogoUrl('') }} className="text-xs text-[#f87171] hover:underline">Remove</button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.brandColor}</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {presetColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setPrimaryColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-8 h-8 rounded-lg transition-all ${primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d24] scale-110' : 'hover:scale-105'}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-[#2a2d35] bg-[#0f1117] cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-[#8b8fa8]">{primaryColor}</span>
                  <div className="w-8 h-8 rounded-lg border border-[#2a2d35]" style={{ backgroundColor: primaryColor }} />
                </div>
              </div>

              {/* Theme Picker */}
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-1">{lang === 'ar' ? '🎨 ثيم صفحة المنتج' : '🎨 Landing Page Theme'}</h3>
                <p className="text-[#8b8fa8] text-sm mb-5">{lang === 'ar' ? 'اختر الثيم المناسب لنوع منتجاتك — سيطبق على جميع صفحات منتجاتك' : 'Choose the theme that fits your products — applies to all your landing pages'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'classic',
                      name: { ar: 'Classic', en: 'Classic' },
                      desc: { ar: 'التصميم الافتراضي العام', en: 'Default general design' },
                      emoji: '🛒',
                      preview: ['#3b82f6', '#1a1d24', '#ffffff'],
                    },
                    {
                      id: 'fashion',
                      name: { ar: 'Theme 2', en: 'Theme 2' },
                      desc: { ar: 'أزياء وموضة — أبيض وأنيق', en: 'Fashion & style — clean white' },
                      emoji: '👗',
                      preview: ['#ffffff', '#111111', '#f3f4f6'],
                    },
                    {
                      id: 'beauty',
                      name: { ar: 'Theme 3', en: 'Theme 3' },
                      desc: { ar: 'جمال وعناية — ألوان ناعمة', en: 'Beauty & skincare — soft tones' },
                      emoji: '💄',
                      preview: ['#fff5f8', '#e8956d', '#2d8c7a'],
                    },
                    {
                      id: 'home',
                      name: { ar: 'Theme 4', en: 'Theme 4' },
                      desc: { ar: 'كريمي وعملي — للمنتجات العامة', en: 'Cream & minimal — general products' },
                      emoji: '🏠',
                      preview: ['#f5f0e8', '#2d5a3d', '#ffffff'],
                    },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative rounded-xl border-2 text-right transition-all overflow-hidden ${theme === t.id ? 'border-[#3b82f6] bg-[#1a3a5c]' : 'border-[#2a2d35] hover:border-[#3b82f6] bg-[#0f1117]'}`}
                    >
                      {theme === t.id && (
                        <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-xs">✓</div>
                      )}

                      <div style={{ width: '100%', height: 200, overflow: 'hidden', position: 'relative', background: '#fff', borderRadius: '10px 10px 0 0' }}>
                        <iframe
                          src={`/theme-preview/${t.id}`}
                          title={`${t.name[lang as 'ar' | 'en']} preview`}
                          style={{
                            width: '390px',
                            height: '844px',
                            border: 'none',
                            transform: 'scale(0.42)',
                            transformOrigin: 'top right',
                            pointerEvents: 'none',
                          }}
                          scrolling="no"
                          loading="lazy"
                        />
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-white text-sm font-semibold">{t.emoji} {t.name[lang as 'ar' | 'en']}</div>
                        </div>
                        <div className="text-[#8b8fa8] text-xs mb-3">{t.desc[lang as 'ar' | 'en']}</div>

                        <a
                          href={`/theme-preview/${t.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-[#3b82f6] hover:underline"
                        >
                          {lang === 'ar' ? 'معاينة كاملة ↗' : 'Full preview ↗'}
                        </a>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {activeTab === 'pixels' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white font-semibold mb-1">{lang === 'ar' ? 'ربط بكسل الإعلانات' : 'Connect ad pixels'}</h2>
                <p className="text-[#8b8fa8] text-sm">{lang === 'ar' ? 'أضف بكسل Meta وTikTok وSnapchat وGoogle Ads لتتبع أداء إعلاناتك وتحسين التحويل' : 'Add your Meta, TikTok, Snapchat, and Google Ads pixels to track ad performance and optimize conversions'}</p>
              </div>

              {/* Meta Pixel */}
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#1877f2]/20 border border-[#1877f2]/30 rounded-xl flex items-center justify-center text-lg">👁️</div>
                  <div>
                    <div className="text-white font-medium">Meta Pixel</div>
                    <div className="text-xs text-[#8b8fa8]">Facebook & Instagram Ads</div>
                  </div>
                  {store.meta_pixel_id && (
                    <span className="mr-auto text-xs bg-[#14321f] text-[#4ade80] border border-[#4ade80]/20 px-2.5 py-1 rounded-full">
                      ✓ {lang === 'ar' ? 'مرتبط' : 'Connected'}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">{lang === 'ar' ? 'Pixel ID' : 'Pixel ID'}</label>
                    <input
                      value={metaPixelId}
                      onChange={e => setMetaPixelId(e.target.value)}
                      placeholder="e.g. 1234567890123456"
                      className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#1877f2] transition-colors font-mono"
                    />
                  </div>
                  <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3 text-xs text-[#4a4e60] leading-relaxed">
                    {lang === 'ar'
                      ? '📍 كيف تجد Pixel ID: اذهب إلى Meta Business Manager → Events Manager → Data Sources → اختر الـ Pixel → انسخ الـ ID'
                      : '📍 How to find your Pixel ID: Go to Meta Business Manager → Events Manager → Data Sources → Select your Pixel → Copy the ID'
                    }
                  </div>
                  <div className="text-xs text-[#8b8fa8]">
                    {lang === 'ar' ? '🔥 الأحداث التي سيتم تتبعها:' : '🔥 Events that will be tracked:'}
                    <span className="text-[#60a5fa] mr-1">PageView</span> ·
                    <span className="text-[#60a5fa] mx-1">ViewContent</span> ·
                    <span className="text-[#60a5fa] mx-1">InitiateCheckout</span> ·
                    <span className="text-[#4ade80] mx-1">Purchase</span>
                  </div>
                </div>
              </div>

              {/* TikTok Pixel */}
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#000000] border border-[#2a2d35] rounded-xl flex items-center justify-center text-lg">🎵</div>
                  <div>
                    <div className="text-white font-medium">TikTok Pixel</div>
                    <div className="text-xs text-[#8b8fa8]">TikTok Ads</div>
                  </div>
                  {store.tiktok_pixel_id && (
                    <span className="mr-auto text-xs bg-[#14321f] text-[#4ade80] border border-[#4ade80]/20 px-2.5 py-1 rounded-full">
                      ✓ {lang === 'ar' ? 'مرتبط' : 'Connected'}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">Pixel ID</label>
                    <input
                      value={tiktokPixelId}
                      onChange={e => setTiktokPixelId(e.target.value)}
                      placeholder="e.g. C8H2ABCDEFGHIJ1234"
                      className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors font-mono"
                    />
                  </div>
                  <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3 text-xs text-[#4a4e60] leading-relaxed">
                    {lang === 'ar'
                      ? '📍 كيف تجد Pixel ID: اذهب إلى TikTok Ads Manager → Assets → Events → Web Events → اختر الـ Pixel → انسخ الـ ID'
                      : '📍 How to find your Pixel ID: Go to TikTok Ads Manager → Assets → Events → Web Events → Select your Pixel → Copy the ID'
                    }
                  </div>
                  <div className="text-xs text-[#8b8fa8]">
                    {lang === 'ar' ? '🔥 الأحداث التي سيتم تتبعها:' : '🔥 Events that will be tracked:'}
                    <span className="text-[#60a5fa] mr-1">ViewContent</span> ·
                    <span className="text-[#60a5fa] mx-1">AddToCart</span> ·
                    <span className="text-[#60a5fa] mx-1">InitiateCheckout</span> ·
                    <span className="text-[#4ade80] mx-1">PlaceAnOrder</span>
                  </div>
                </div>
              </div>

              {/* Snapchat Pixel */}
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#fffc00]/10 border border-[#fffc00]/30 rounded-xl flex items-center justify-center text-lg">👻</div>
                  <div>
                    <div className="text-white font-medium">Snapchat Pixel</div>
                    <div className="text-xs text-[#8b8fa8]">Snapchat Ads</div>
                  </div>
                  {store.snapchat_pixel_id && (
                    <span className="mr-auto text-xs bg-[#14321f] text-[#4ade80] border border-[#4ade80]/20 px-2.5 py-1 rounded-full">
                      ✓ {lang === 'ar' ? 'مرتبط' : 'Connected'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                    Snapchat Pixel ID
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 focus-within:border-[#3b82f6] transition-colors">
                    <span className="text-lg flex-shrink-0">👻</span>
                    <input
                      type="text"
                      value={snapchatPixelId}
                      onChange={e => setSnapchatPixelId(e.target.value)}
                      placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                      className="flex-1 bg-transparent text-sm text-white placeholder-[#4a4e60] focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-[#4a4e60] mt-1.5">
                    {lang === 'ar'
                      ? 'احصل عليه من: Snapchat Ads Manager ← Events Manager ← Pixels'
                      : 'Get it from: Snapchat Ads Manager → Events Manager → Pixels'}
                  </p>
                </div>
              </div>

              {/* Google Ads */}
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#4285f4]/20 border border-[#4285f4]/30 rounded-xl flex items-center justify-center text-lg">📢</div>
                  <div>
                    <div className="text-white font-medium">Google Ads</div>
                    <div className="text-xs text-[#8b8fa8]">Conversion tracking</div>
                  </div>
                  {store.google_ads_conversion_id && store.google_ads_conversion_label && (
                    <span className="mr-auto text-xs bg-[#14321f] text-[#4ade80] border border-[#4ade80]/20 px-2.5 py-1 rounded-full">
                      ✓ {lang === 'ar' ? 'مرتبط' : 'Connected'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                    Google Ads Conversion Tracking
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 focus-within:border-[#3b82f6] transition-colors mb-2">
                    <span className="text-lg flex-shrink-0">📢</span>
                    <input
                      type="text"
                      value={googleAdsConversionId}
                      onChange={e => setGoogleAdsConversionId(e.target.value)}
                      placeholder="Conversion ID — e.g. AW-123456789"
                      className="flex-1 bg-transparent text-sm text-white placeholder-[#4a4e60] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 focus-within:border-[#3b82f6] transition-colors">
                    <span className="text-lg flex-shrink-0">🏷️</span>
                    <input
                      type="text"
                      value={googleAdsConversionLabel}
                      onChange={e => setGoogleAdsConversionLabel(e.target.value)}
                      placeholder="Conversion Label — e.g. AbCdEfGhIj"
                      className="flex-1 bg-transparent text-sm text-white placeholder-[#4a4e60] focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-[#4a4e60] mt-1.5">
                    {lang === 'ar'
                      ? 'احصل عليهم من: Google Ads → Goals → Conversions → Create conversion action'
                      : 'Get from: Google Ads → Goals → Conversions → Create conversion action'}
                  </p>
                </div>
              </div>

              {/* Google Shopping Feed */}
              <div className="bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🛍️</span>
                  <span className="text-sm font-bold text-white">
                    {lang === 'ar' ? 'رابط Google Shopping Feed' : 'Google Shopping Feed URL'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`https://www.mantoog.com/feed/${store?.slug || ''}`}
                    className="flex-1 bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs text-[#8b8fa8] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!store?.slug) return
                      navigator.clipboard.writeText(`https://www.mantoog.com/feed/${store.slug}`)
                    }}
                    className="px-3 py-2 bg-[#3b82f6] text-white rounded-lg text-xs font-bold hover:bg-[#2563eb] transition-colors whitespace-nowrap"
                  >
                    {lang === 'ar' ? 'نسخ' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-[#4a4e60] mt-2">
                  {lang === 'ar'
                    ? 'الصق هذا الرابط في Google Merchant Center → Products → Feeds → Scheduled fetch'
                    : 'Paste this URL in Google Merchant Center → Products → Feeds → Scheduled fetch'}
                </p>
              </div>

              {/* Save button */}
              <button onClick={handleSavePixels} disabled={savingPixels}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors">
                {savingPixels ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ إعدادات البكسل' : 'Save pixel settings')}
              </button>
            </div>
          )}

          {activeTab === 'checkout' && (
            <div className="space-y-6">

              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-1">{lang === 'ar' ? '🔒 حقول ثابتة' : '🔒 Fixed Fields'}</h3>
                <p className="text-[#8b8fa8] text-sm mb-4">{lang === 'ar' ? 'هذه الحقول إلزامية دائماً ولا يمكن إزالتها' : 'These fields are always required and cannot be removed'}</p>
                <div className="space-y-3">
                  {[
                    { label: lang === 'ar' ? 'الاسم' : 'Name', icon: '👤' },
                    { label: lang === 'ar' ? 'رقم الهاتف' : 'Phone Number', icon: '📱' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[#2a2d35] last:border-0">
                      <div className="flex items-center gap-3">
                        <span>{f.icon}</span>
                        <span className="text-white text-sm font-medium">{f.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#4ade80] bg-[#14321f] px-2 py-1 rounded-full">{lang === 'ar' ? 'إلزامي دائماً' : 'Always required'}</span>
                        <div className="w-10 h-5 rounded-full bg-[#3b82f6] opacity-50 cursor-not-allowed relative">
                          <span className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-1">{lang === 'ar' ? '📍 طريقة تحديد العنوان' : '📍 Address Method'}</h3>
                <p className="text-[#8b8fa8] text-sm mb-4">{lang === 'ar' ? 'اختر كيف يحدد العميل عنوان التوصيل' : 'Choose how the customer provides their delivery address'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAddressMode('text')}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${addressMode === 'text' ? 'border-[#3b82f6] bg-[#1a3a5c]' : 'border-[#2a2d35] hover:border-[#3b82f6]'}`}>
                    <div className="text-2xl mb-2">✍️</div>
                    <div className="text-white text-sm font-semibold">{lang === 'ar' ? 'نص يدوي' : 'Text input'}</div>
                    <div className="text-[#8b8fa8] text-xs mt-1">{lang === 'ar' ? 'العميل يكتب عنوانه' : 'Customer types their address'}</div>
                  </button>
                  <button
                    onClick={() => setAddressMode('map')}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${addressMode === 'map' ? 'border-[#3b82f6] bg-[#1a3a5c]' : 'border-[#2a2d35] hover:border-[#3b82f6]'}`}>
                    <div className="text-2xl mb-2">🗺️</div>
                    <div className="text-white text-sm font-semibold">{lang === 'ar' ? 'خريطة تفاعلية' : 'Interactive map'}</div>
                    <div className="text-[#8b8fa8] text-xs mt-1">{lang === 'ar' ? 'العميل يحدد موقعه' : 'Customer pins their location'}</div>
                  </button>
                </div>
                {addressMode === 'map' && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2a2d35]">
                    <div>
                      <div className="text-white text-sm font-medium">{lang === 'ar' ? 'الموقع إلزامي' : 'Location required'}</div>
                      <div className="text-[#4a4e60] text-xs mt-0.5">{lang === 'ar' ? 'لا يمكن إتمام الطلب بدون تحديد الموقع' : 'Customer must pin location to complete order'}</div>
                    </div>
                    <button
                      onClick={() => setLocationRequired(!locationRequired)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${locationRequired ? 'bg-[#1DB87A]' : 'bg-[#2a2d35]'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${locationRequired ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-1">{lang === 'ar' ? '➕ حقول إضافية' : '➕ Extra Fields'}</h3>
                <p className="text-[#8b8fa8] text-sm mb-4">{lang === 'ar' ? 'اختر الحقول الإضافية التي تريد إظهارها في نموذج الطلب' : 'Choose extra fields to show in the order form'}</p>

                <div className="space-y-0">
                  <div className="flex items-center justify-between py-3 border-b border-[#2a2d35]">
                    <div className="flex items-center gap-3">
                      <span>🔢</span>
                      <div>
                        <div className="text-white text-sm font-medium">{lang === 'ar' ? 'الكمية' : 'Quantity'}</div>
                        <div className="text-[#4a4e60] text-xs">{lang === 'ar' ? 'يفتح للعميل زر + و - لاختيار الكمية' : 'Shows +/- quantity selector, defaults to 1'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowQuantity(!showQuantity)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${showQuantity ? 'bg-[#3b82f6]' : 'bg-[#2a2d35]'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showQuantity ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#2a2d35]">
                    <div className="flex items-center gap-3">
                      <span>📝</span>
                      <div>
                        <div className="text-white text-sm font-medium">{lang === 'ar' ? 'ملاحظة العميل' : 'Customer note'}</div>
                        <div className="text-[#4a4e60] text-xs">{lang === 'ar' ? 'حقل نصي للعميل يضع فيه أي ملاحظات' : 'Text field for customer notes or special requests'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowNote(!showNote)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${showNote ? 'bg-[#3b82f6]' : 'bg-[#2a2d35]'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showNote ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {showNote && (
                    <div className="flex items-center justify-between py-3 pr-8 border-b border-[#2a2d35]">
                      <div className="flex items-center gap-3">
                        <span className="text-[#4a4e60]">↳</span>
                        <div>
                          <div className="text-[#8b8fa8] text-sm">{lang === 'ar' ? 'الملاحظة إلزامية' : 'Note required'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setNoteRequired(!noteRequired)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${noteRequired ? 'bg-[#1DB87A]' : 'bg-[#2a2d35]'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${noteRequired ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={handleSave}
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'shipping' && (
            <Section title={tr.shipping}>
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.shippingModel}</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setShippingType('static')}
                    className={`px-3 py-3 rounded-lg border text-sm transition-colors text-left ${shippingType === 'static' ? 'border-[#3b82f6] bg-[#1a3a5c] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}
                  >
                    <div className="font-medium">{tr.fixedPrice}</div>
                    <div className="text-xs opacity-60 mt-0.5">Same cost for all orders</div>
                  </button>
                  <button
                    onClick={() => setShippingType('dynamic')}
                    className={`px-3 py-3 rounded-lg border text-sm transition-colors text-left ${shippingType === 'dynamic' ? 'border-[#3b82f6] bg-[#1a3a5c] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}
                  >
                    <div className="font-medium">{tr.perProduct}</div>
                    <div className="text-xs opacity-60 mt-0.5">Set per each product</div>
                  </button>
                </div>
                {shippingType === 'static' && (
                  <Field label={`Fixed shipping cost (${currency})`} value={staticShippingCost} onChange={setStaticShippingCost} type="number" />
                )}
              </div>
            </Section>
          )}

          {activeTab === 'domain' && (
            <Section title={tr.customDomain}>
              <div className="bg-[#14321f] border border-[#4ade80]/20 rounded-lg px-4 py-3 mb-2">
                <p className="text-[#4ade80] text-sm font-medium mb-2">How to connect your domain</p>
                <ol className="text-[#4ade80]/70 text-xs space-y-1 list-decimal list-inside">
                  <li>Buy a domain from any registrar (GoDaddy, Namecheap, etc.)</li>
                  <li>Add a CNAME record pointing to your Mantoog store URL</li>
                  <li>Enter your domain below and save</li>
                  <li>Wait up to 48 hours for DNS propagation</li>
                </ol>
              </div>
              <Field label={tr.customDomain} value={customDomain} onChange={setCustomDomain} placeholder="yourstore.com" />
              <StoreUrlDisplay
                slug={store?.slug}
                label={tr.storeLink}
                copyLabel={tr.copy}
                copiedLabel={tr.copied}
                copied={urlCopied}
                onCopy={copyStoreUrl}
              />
            </Section>
          )}

          {activeTab === 'account' && (
            <>
              <Section title={tr.personalInfo}>
                <Field label={tr.fullName} value={fullName} onChange={setFullName} />
                <Field label={tr.phone} value={phone} onChange={setPhone} />
                <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-4 py-3">
                  <div className="text-xs text-[#4a4e60] mb-1">{tr.email}</div>
                  <div className="text-sm text-[#8b8fa8]">{merchant?.email}</div>
                </div>
              </Section>
              <Section title={tr.dangerZone}>
                <p className="text-[#8b8fa8] text-sm">Once you delete your account, there is no going back.</p>
                <button className="border border-[#f87171]/30 text-[#f87171] hover:bg-[#3a1414] text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  {tr.deleteAccount}
                </button>
              </Section>
            </>
          )}

        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5 space-y-4">
      <h2 className="text-white font-medium">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
      />
    </div>
  )
}
