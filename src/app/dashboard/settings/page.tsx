'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

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
  const [shippingType, setShippingType] = useState('static')
  const [staticShippingCost, setStaticShippingCost] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [tiktokPixelId, setTiktokPixelId] = useState('')
  const [savingPixels, setSavingPixels] = useState(false)

  // Merchant fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: merchantData } = await supabase.from('merchants').select('*').eq('id', user.id).single()
      setMerchant(merchantData)
      setFullName(merchantData?.full_name || '')
      setPhone(merchantData?.phone || '')

      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)
      setStoreName(storeData.name || '')
      setCurrency(storeData.currency || 'EGP')
      setLanguage(storeData.language || 'ar')
      setPrimaryColor(storeData.primary_color || '#3b82f6')
      setShippingType(storeData.shipping_type || 'static')
      setStaticShippingCost(storeData.static_shipping_cost?.toString() || '')
      setCustomDomain(storeData.custom_domain || '')
      setLogoUrl(storeData.logo_url || '')
      if (storeData.meta_pixel_id) setMetaPixelId(storeData.meta_pixel_id)
      if (storeData.tiktok_pixel_id) setTiktokPixelId(storeData.tiktok_pixel_id)
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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
      shipping_type: shippingType,
      static_shipping_cost: shippingType === 'static' ? parseFloat(staticShippingCost) || 0 : null,
      custom_domain: customDomain || null,
      logo_url: newLogoUrl || null,
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
    }).eq('id', store.id)
    setStore((prev: any) => ({ ...prev, meta_pixel_id: metaPixelId, tiktok_pixel_id: tiktokPixelId }))
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
    <div className={`min-h-screen bg-[#0f1117] flex`} dir={dir}>
      <Sidebar store={store} />

      <main className="flex-1 pt-16 md:pt-0 p-4 md:p-8 overflow-auto pb-24 md:pb-8">

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
            { id: 'shipping', label: tr.shipping },
            { id: 'domain', label: tr.customDomain },
            { id: 'account', label: tr.account },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
            >
              {tab.label}
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
                <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-4 py-3">
                  <div className="text-xs text-[#4a4e60] mb-1">Your store slug</div>
                  <div className="text-sm text-[#3b82f6] font-mono">localhost:3000/{store?.slug}/[product-id]</div>
                </div>
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
            </Section>
          )}

          {activeTab === 'pixels' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white font-semibold mb-1">{lang === 'ar' ? 'ربط بكسل الإعلانات' : 'Connect ad pixels'}</h2>
                <p className="text-[#8b8fa8] text-sm">{lang === 'ar' ? 'أضف بكسل Meta وTikTok لتتبع أداء إعلاناتك وتحسين التحويل' : 'Add your Meta and TikTok pixels to track ad performance and optimize conversions'}</p>
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

              {/* Save button */}
              <button onClick={handleSavePixels} disabled={savingPixels}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors">
                {savingPixels ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ إعدادات البكسل' : 'Save pixel settings')}
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
              <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-4 py-3">
                <div className="text-xs text-[#4a4e60] mb-1">Current store URL</div>
                <div className="text-sm text-[#3b82f6] font-mono">localhost:3000/{store?.slug}</div>
              </div>
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
