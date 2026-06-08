'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/LanguageContext'

const currencies = [
  { code: 'EGP', label: 'Egyptian Pound', labelAr: 'جنيه مصري', flag: '🇪🇬' },
  { code: 'SAR', label: 'Saudi Riyal', labelAr: 'ريال سعودي', flag: '🇸🇦' },
  { code: 'AED', label: 'UAE Dirham', labelAr: 'درهم إماراتي', flag: '🇦🇪' },
  { code: 'MAD', label: 'Moroccan Dirham', labelAr: 'درهم مغربي', flag: '🇲🇦' },
  { code: 'DZD', label: 'Algerian Dinar', labelAr: 'دينار جزائري', flag: '🇩🇿' },
]

const presetColors = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
]

const STEPS = [
  { en: 'Store Info', ar: 'معلومات المتجر' },
  { en: 'Currency & Shipping', ar: 'العملة والشحن' },
  { en: 'Brand', ar: 'الهوية البصرية' },
  { en: 'Review', ar: 'المراجعة' },
]

export default function StoreSetupPage() {
  const { lang, dir } = useLang()
  const ar = lang === 'ar'
  const [step, setStep] = useState(1)
  const [storeName, setStoreName] = useState('')
  const [storeLanguage, setStoreLanguage] = useState('ar')
  const [currency, setCurrency] = useState('EGP')
  const [shippingType, setShippingType] = useState<'static' | 'dynamic'>('static')
  const [staticShippingCost, setStaticShippingCost] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#3b82f6')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkStore = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('stores').select('id').eq('merchant_id', user.id).single()
      if (data) router.replace('/dashboard')
    }
    checkStore()
  }, [])

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) +
    '-' + Math.random().toString(36).slice(2, 6)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let logoUrl = ''
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `logos/${user.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(path, logoFile)
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(path)
        logoUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('stores').insert({
      merchant_id: user.id,
      name: storeName,
      slug: generateSlug(storeName),
      currency,
      language: storeLanguage,
      logo_url: logoUrl || null,
      primary_color: primaryColor,
      shipping_type: shippingType,
      static_shipping_cost: shippingType === 'static' ? parseFloat(staticShippingCost) || 0 : null,
    })

    if (error) {
      setError(ar ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }
    router.replace('/dashboard')
  }

  const canNext = () => {
    if (step === 1) return storeName.trim().length > 0
    if (step === 2) return true
    if (step === 3) return true
    return true
  }

  const selectedCurrency = currencies.find(c => c.code === currency)

  return (
    <div dir={dir} className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-0 mb-10" style={{ direction: 'ltr' }}>
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i + 1 < step ? 'bg-[#4ade80] text-black' : i + 1 === step ? 'bg-[#3b82f6] text-white ring-4 ring-[#3b82f6]/20' : 'bg-[#1a1d24] border border-[#2a2d35] text-[#4a4e60]'}`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${i + 1 === step ? 'text-white' : 'text-[#4a4e60]'}`}>
                  {ar ? s.ar : s.en}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mb-4 mx-1 rounded-full transition-all ${i + 1 < step ? 'bg-[#4ade80]' : 'bg-[#2a2d35]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-8">

          {/* Step 1 — Store Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{ar ? 'معلومات متجرك' : 'Your store info'}</h2>
                <p className="text-[#8b8fa8] text-sm">{ar ? 'أدخل اسم متجرك ولغة العرض' : 'Enter your store name and display language'}</p>
              </div>
              <div>
                <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">{ar ? 'اسم المتجر' : 'Store name'}</label>
                <input
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  placeholder={ar ? 'مثال: متجر الأناقة' : 'e.g. Style Store'}
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">{ar ? 'لغة صفحات المنتجات' : 'Product pages language'}</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { code: 'ar', label: ar ? 'العربية' : 'Arabic', icon: '🇸🇦' },
                    { code: 'en', label: ar ? 'الإنجليزية' : 'English', icon: '🇺🇸' },
                  ].map(l => (
                    <button key={l.code} onClick={() => setStoreLanguage(l.code)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${storeLanguage === l.code ? 'bg-[#1a3a5c] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                      <span>{l.icon}</span> {l.label}
                      {storeLanguage === l.code && <span className="text-[#3b82f6] mr-auto">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Currency & Shipping */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{ar ? 'العملة والشحن' : 'Currency & shipping'}</h2>
                <p className="text-[#8b8fa8] text-sm">{ar ? 'اختر عملة متجرك وطريقة الشحن' : 'Choose your store currency and shipping method'}</p>
              </div>
              <div>
                <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">{ar ? 'العملة' : 'Currency'}</label>
                <div className="space-y-2">
                  {currencies.map(c => (
                    <button key={c.code} onClick={() => setCurrency(c.code)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-colors ${currency === c.code ? 'bg-[#1a3a5c] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                      <span className="text-lg">{c.flag}</span>
                      <span className="font-medium">{ar ? c.labelAr : c.label}</span>
                      <span className="text-[#4a4e60] text-xs mr-auto">{c.code}</span>
                      {currency === c.code && <span className="text-[#3b82f6]">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">{ar ? 'طريقة تسعير الشحن' : 'Shipping pricing method'}</label>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => { setShippingType('static'); setStaticShippingCost('') }}
                    className={`flex items-start gap-3 px-4 py-4 rounded-xl border text-sm transition-colors text-${ar ? 'right' : 'left'} ${shippingType === 'static' ? 'bg-[#1a3a5c] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                    <span className="text-xl mt-0.5">💰</span>
                    <div>
                      <div className="font-semibold mb-0.5">{ar ? 'سعر شحن موحد لكل المنتجات' : 'Same shipping price for all products'}</div>
                      <div className="text-xs opacity-70">{ar ? 'تحدد سعر الشحن مرة واحدة ويُطبق على جميع منتجاتك' : 'Set shipping price once and apply to all your products'}</div>
                    </div>
                    {shippingType === 'static' && <span className="text-[#3b82f6] mr-auto text-base mt-0.5">✓</span>}
                  </button>

                  {shippingType === 'static' && (
                    <div className="grid grid-cols-2 gap-3 px-1">
                      <button onClick={() => setStaticShippingCost('0')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${staticShippingCost === '0' ? 'bg-[#14321f] border-[#4ade80] text-[#4ade80]' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#4ade80] hover:text-white'}`}>
                        🚚 {ar ? 'شحن مجاني' : 'Free shipping'}
                      </button>
                      <button onClick={() => setStaticShippingCost('')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${staticShippingCost !== '0' ? 'bg-[#1a3a5c] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                        💵 {ar ? 'سعر محدد' : 'Fixed amount'}
                      </button>
                    </div>
                  )}

                  {shippingType === 'static' && staticShippingCost !== '0' && (
                    <input
                      type="number"
                      value={staticShippingCost}
                      onChange={e => setStaticShippingCost(e.target.value)}
                      placeholder={ar ? `أدخل سعر الشحن (${currency})` : `Enter shipping cost (${currency})`}
                      className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  )}

                  <button onClick={() => { setShippingType('dynamic'); setStaticShippingCost('') }}
                    className={`flex items-start gap-3 px-4 py-4 rounded-xl border text-sm transition-colors text-${ar ? 'right' : 'left'} ${shippingType === 'dynamic' ? 'bg-[#1a3a5c] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'}`}>
                    <span className="text-xl mt-0.5">📦</span>
                    <div>
                      <div className="font-semibold mb-0.5">{ar ? 'سعر شحن مختلف لكل منتج' : 'Different shipping price per product'}</div>
                      <div className="text-xs opacity-70">{ar ? 'عند إضافة كل منتج ستختار سعر شحنه (مجاني أو سعر محدد)' : 'When adding each product you choose its shipping (free or fixed price)'}</div>
                    </div>
                    {shippingType === 'dynamic' && <span className="text-[#3b82f6] mr-auto text-base mt-0.5">✓</span>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Brand */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{ar ? 'الهوية البصرية' : 'Brand identity'}</h2>
                <p className="text-[#8b8fa8] text-sm">{ar ? 'أضف شعار متجرك واختر لون العلامة التجارية' : 'Add your store logo and choose brand color'}</p>
              </div>
              <div>
                <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">{ar ? 'شعار المتجر (اختياري)' : 'Store logo (optional)'}</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#2a2d35] rounded-xl cursor-pointer hover:border-[#3b82f6] transition-colors bg-[#0f1117] relative overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl mb-2">🖼️</div>
                      <div className="text-xs text-[#8b8fa8]">{ar ? 'انقر لرفع الشعار' : 'Click to upload logo'}</div>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              </div>
              <div>
                <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">{ar ? 'لون العلامة التجارية' : 'Brand color'}</label>
                <div className="flex gap-2 flex-wrap mb-3">
                  {presetColors.map(color => (
                    <button key={color} onClick={() => setPrimaryColor(color)}
                      className={`w-9 h-9 rounded-full transition-all ${primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d24] scale-110' : 'hover:scale-105'}`}
                      style={{ background: color }} />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                  <span className="text-sm text-[#8b8fa8]">{primaryColor}</span>
                  <div className="flex-1 h-8 rounded-lg" style={{ background: primaryColor }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{ar ? 'مراجعة وإنشاء' : 'Review & create'}</h2>
                <p className="text-[#8b8fa8] text-sm">{ar ? 'تأكد من البيانات قبل إنشاء متجرك' : 'Confirm your details before creating your store'}</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: ar ? 'اسم المتجر' : 'Store name', value: storeName },
                  { label: ar ? 'لغة المتجر' : 'Language', value: storeLanguage === 'ar' ? (ar ? 'العربية' : 'Arabic') : (ar ? 'الإنجليزية' : 'English') },
                  { label: ar ? 'العملة' : 'Currency', value: `${selectedCurrency?.flag} ${ar ? selectedCurrency?.labelAr : selectedCurrency?.label} (${currency})` },
                  { label: ar ? 'الشحن' : 'Shipping', value: shippingType === 'static' ? `${ar ? 'سعر ثابت' : 'Fixed'} — ${staticShippingCost || 0} ${currency}` : (ar ? 'حسب المنطقة' : 'By region') },
                  { label: ar ? 'لون العلامة' : 'Brand color', value: primaryColor },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-[#2a2d35] last:border-0">
                    <span className="text-xs text-[#4a4e60] uppercase tracking-wider">{row.label}</span>
                    <div className="flex items-center gap-2">
                      {row.label.includes('color') || row.label.includes('لون') ? (
                        <div className="w-5 h-5 rounded-full" style={{ background: row.value }} />
                      ) : null}
                      <span className="text-sm text-white font-medium">{row.value}</span>
                    </div>
                  </div>
                ))}
                {logoPreview && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-xs text-[#4a4e60] uppercase tracking-wider">{ar ? 'الشعار' : 'Logo'}</span>
                    <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-[#2a2d35]" />
                  </div>
                )}
              </div>
              {error && <div className="text-[#f87171] text-sm text-center">{error}</div>}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center mt-8 justify-between" style={{ direction: 'ltr' }}>
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#2a2d35] text-[#8b8fa8] hover:text-white hover:border-[#3b82f6] transition-colors text-sm font-medium">
                ← {ar ? 'رجوع' : 'Back'}
              </button>
            ) : <div />}
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white transition-colors text-sm font-semibold">
                {ar ? 'التالي' : 'Next'} →
              </button>
            ) : (
              <button onClick={handleCreate} disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#22c55e] disabled:opacity-40 text-black font-bold transition-colors">
                {loading ? (ar ? 'جاري الإنشاء...' : 'Creating...') : (ar ? '🚀 إنشاء المتجر' : '🚀 Create store')}
              </button>
            )}
          </div>
        </div>

        {/* Free credits note */}
        <div className="text-center mt-4 text-xs text-[#4a4e60]">
          🎁 {ar ? 'ستحصل على 100 طلب مجاني عند إنشاء متجرك' : 'You get 100 free orders when you create your store'}
        </div>
      </div>
    </div>
  )
}
