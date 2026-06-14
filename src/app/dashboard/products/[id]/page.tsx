'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

const statusLabels: Record<string, keyof typeof t.en> = {
  active: 'active',
  draft: 'draft',
  archived: 'archived',
}

export default function EditProductPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const [store, setStore] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [landingPage, setLandingPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Product fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [status, setStatus] = useState('active')
  const [images, setImages] = useState<string[]>([])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])

  // Landing page fields
  const [headline, setHeadline] = useState('')
  const [subheadline, setSubheadline] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [benefits, setBenefits] = useState<string[]>(['', '', '', ''])
  const [urgencyText, setUrgencyText] = useState('')
  const [trustText, setTrustText] = useState('')
  const [descriptionLong, setDescriptionLong] = useState('')

  const [productSizes, setProductSizes] = useState<string[]>([])
  const [productColors, setProductColors] = useState<{ name: string; hex: string }[]>([])
  const [showSizePanel, setShowSizePanel] = useState(false)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#000000')

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .eq('merchant_id', user.id)
        .single()
      if (!productData) { router.push('/dashboard/products'); return }
      setProduct(productData)

      // Set product fields
      setTitle(productData.title || '')
      setDescription(productData.description || '')
      setPrice(productData.price?.toString() || '')
      setComparePrice(productData.compare_at_price?.toString() || '')
      setStatus(productData.status || 'active')
      setImages(productData.images || [])
      setProductSizes(productData.sizes || [])
      setProductColors(productData.colors || [])

      // Get landing page
      const { data: lpData } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('product_id', params.id)
        .single()

      if (lpData) {
        setLandingPage(lpData)
        setHeadline(lpData.headline || '')
        setSubheadline(lpData.subheadline || '')
        setCtaText(lpData.cta_text || '')
        try {
          const sections = typeof lpData.sections === 'string' ? JSON.parse(lpData.sections) : lpData.sections
          setBenefits(sections?.benefits || ['', '', '', ''])
          setUrgencyText(sections?.urgency_text || '')
          setTrustText(sections?.trust_text || '')
          setDescriptionLong(sections?.description_long || '')
        } catch {}
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewImageFiles(prev => [...prev, ...files])
    setNewImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  const removeExistingImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Upload new images
    const uploadedUrls: string[] = []
    for (const file of newImageFiles) {
      const ext = file.name.split('.').pop()
      const path = `products/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(path, file)
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }
    }

    const allImages = [...images, ...uploadedUrls]

    // Update product
    const { error: productError } = await supabase
      .from('products')
      .update({
        title,
        description,
        price: parseFloat(price),
        compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
        status,
        images: allImages,
        sizes: productSizes.length > 0 ? productSizes : null,
        colors: productColors.length > 0 ? productColors : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (productError) {
      setError('Failed to save product.')
      setSaving(false)
      return
    }

    // Update or create landing page
    const sectionsData = JSON.stringify({
      benefits: benefits.filter(b => b.trim()),
      urgency_text: urgencyText,
      trust_text: trustText,
      description_long: descriptionLong,
    })

    if (landingPage) {
      await supabase.from('landing_pages').update({
        headline,
        subheadline,
        cta_text: ctaText,
        sections: sectionsData,
        updated_at: new Date().toISOString(),
      }).eq('id', landingPage.id)
    } else {
      await supabase.from('landing_pages').insert({
        product_id: params.id,
        store_id: store.id,
        merchant_id: user.id,
        headline,
        subheadline,
        cta_text: ctaText,
        sections: sectionsData,
        ai_generated: false,
        published: true,
      })
    }

    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
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
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard/products')} className="text-[#8b8fa8] hover:text-white text-sm transition-colors">{tr.backBtn}</button>
            <h1 className="text-xl font-semibold text-white">{tr.editProduct}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/dashboard/products/${params.id}/creative`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              🎬 {lang === 'ar' ? 'إنشاء إعلان' : 'Create Ad'}
            </button>
            <button
              onClick={() => window.open(`/${store.slug}/${params.id}`, '_blank')}
              className="text-sm font-medium bg-[#1a3a5c] text-[#60a5fa] hover:bg-[#3b82f6] hover:text-white px-4 py-2 rounded-lg transition-colors"
            >
              {tr.productPage}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
            >
              {saving ? tr.saving : tr.saveChanges}
            </button>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-[#14321f] border border-[#4ade80]/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="text-[#4ade80]">✓</span>
            <p className="text-[#4ade80] text-sm">{tr.savedSuccess}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5">
            <p className="text-[#f87171] text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 max-w-5xl">

          {/* LEFT COLUMN */}
          <div className="space-y-5">

            {/* Product info */}
            <Section title={tr.productInfo}>
              <Field label={tr.productTitle} value={title} onChange={setTitle} />
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">{tr.description}</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Price (${store?.currency})`} value={price} onChange={setPrice} type="number" />
                <Field label={`${tr.originalPrice} (${store?.currency})`} value={comparePrice} onChange={setComparePrice} type="number" />
              </div>
              {price && comparePrice && (
                <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className="text-white font-semibold">{price} {store?.currency}</span>
                  <span className="text-[#8b8fa8] line-through text-sm">{comparePrice} {store?.currency}</span>
                  <span className="bg-[#14321f] text-[#4ade80] text-xs font-medium px-2 py-0.5 rounded-full">
                    {Math.round((1 - parseFloat(price) / parseFloat(comparePrice)) * 100)}% OFF
                  </span>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.statusLabel}</label>
                <div className="flex gap-2">
                  {(['active', 'draft', 'archived'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${status === s ? 'bg-[#3b82f6] text-white' : 'bg-[#0f1117] border border-[#2a2d35] text-[#8b8fa8] hover:text-white'}`}
                    >
                      {String(tr[statusLabels[s]] || s)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes & Colors */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider block">
                  {lang === 'ar' ? 'مقاسات وألوان المنتج (اختياري)' : 'Product Sizes & Colors (optional)'}
                </label>

                <div>
                  <button onClick={() => setShowSizePanel(!showSizePanel)}
                    className="flex items-center gap-2 text-sm text-[#3b82f6] hover:text-white border border-[#2a2d35] hover:border-[#3b82f6] px-4 py-2 rounded-lg transition-colors">
                    <span>📏</span>
                    <span>{lang === 'ar' ? 'تعديل المقاسات' : 'Edit Sizes'}</span>
                    {productSizes.length > 0 && <span className="bg-[#3b82f6] text-white text-xs px-2 py-0.5 rounded-full">{productSizes.length}</span>}
                  </button>
                  {showSizePanel && (
                    <div className="mt-3 bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4">
                      <div className="text-xs text-[#8b8fa8] mb-3">{lang === 'ar' ? 'اختر المقاسات المتاحة' : 'Select available sizes'}</div>
                      <div className="flex flex-wrap gap-2">
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'فري سايز'].map(size => (
                          <button key={size} onClick={() => setProductSizes(prev =>
                            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                          )}
                            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                              productSizes.includes(size)
                                ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                                : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'
                            }`}>
                            {size}
                          </button>
                        ))}
                      </div>
                      {productSizes.length > 0 && (
                        <div className="mt-3 text-xs text-[#4ade80]">✓ {productSizes.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <button onClick={() => setShowColorPanel(!showColorPanel)}
                    className="flex items-center gap-2 text-sm text-[#3b82f6] hover:text-white border border-[#2a2d35] hover:border-[#3b82f6] px-4 py-2 rounded-lg transition-colors">
                    <span>🎨</span>
                    <span>{lang === 'ar' ? 'تعديل الألوان' : 'Edit Colors'}</span>
                    {productColors.length > 0 && <span className="bg-[#3b82f6] text-white text-xs px-2 py-0.5 rounded-full">{productColors.length}</span>}
                  </button>
                  {showColorPanel && (
                    <div className="mt-3 bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4">
                      <div className="text-xs text-[#8b8fa8] mb-3">{lang === 'ar' ? 'ألوان المنتج (بحد أقصى 5)' : 'Product colors (max 5)'}</div>
                      {productColors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {productColors.map((color, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-1.5">
                              <div style={{ width: 16, height: 16, borderRadius: '50%', background: color.hex, border: '1px solid #444' }} />
                              <span className="text-sm text-white">{color.name}</span>
                              <button onClick={() => setProductColors(prev => prev.filter((_, idx) => idx !== i))}
                                className="text-[#f87171] text-xs hover:text-white ml-1">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {productColors.length < 5 && (
                        <div className="flex items-center gap-3 mb-3">
                          <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)}
                            className="w-10 h-10 rounded-lg border border-[#2a2d35] cursor-pointer bg-transparent" />
                          <input type="text" value={newColorName} onChange={e => setNewColorName(e.target.value)}
                            placeholder={lang === 'ar' ? 'اسم اللون' : 'Color name'}
                            className="flex-1 bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]" />
                          <button onClick={() => {
                            if (!newColorName.trim()) return
                            setProductColors(prev => [...prev, { name: newColorName.trim(), hex: newColorHex }])
                            setNewColorName('')
                            setNewColorHex('#000000')
                          }}
                            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                            + {lang === 'ar' ? 'إضافة' : 'Add'}
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { name: 'أسود', hex: '#000000' },
                          { name: 'أبيض', hex: '#ffffff' },
                          { name: 'رمادي', hex: '#9ca3af' },
                          { name: 'كحلي', hex: '#1e3a5f' },
                          { name: 'بيج', hex: '#d4b896' },
                          { name: 'أحمر', hex: '#ef4444' },
                          { name: 'أخضر', hex: '#22c55e' },
                        ].map((preset, i) => (
                          <button key={i}
                            disabled={productColors.length >= 5 || !!productColors.find(c => c.hex === preset.hex)}
                            onClick={() => setProductColors(prev => [...prev, preset])}
                            className="flex items-center gap-1.5 border border-[#2a2d35] hover:border-[#3b82f6] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg px-2 py-1 text-xs text-[#8b8fa8] hover:text-white transition-colors">
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.hex, border: '1px solid #444' }} />
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* Images */}
            <Section title={tr.productImages}>
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.currentImages}</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-[#2a2d35]" />
                      <button
                        onClick={() => removeExistingImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#f87171] rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                      {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-white text-xs bg-black/50 rounded-b-lg py-0.5">Cover</span>}
                    </div>
                  ))}
                </div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.addMoreImages}</label>
                <div className="flex flex-wrap gap-2">
                  {newImagePreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-[#2a2d35]" />
                      <button onClick={() => removeNewImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#f87171] rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border border-dashed border-[#2a2d35] hover:border-[#3b82f6] rounded-lg flex items-center justify-center cursor-pointer text-[#4a4e60] hover:text-[#3b82f6] transition-colors text-2xl">
                    +
                    <input type="file" accept="image/*" multiple onChange={handleNewImages} className="hidden" />
                  </label>
                </div>
              </div>
            </Section>
          </div>

          {/* RIGHT COLUMN — Landing page */}
          <div className="space-y-5">
            <Section title={tr.landingContent}>
              <Field label={tr.headline} value={headline} onChange={setHeadline} />
              <Field label={tr.subheadline} value={subheadline} onChange={setSubheadline} />
              <Field label={tr.ctaButton} value={ctaText} onChange={setCtaText} />
              <Field label={tr.urgencyText} value={urgencyText} onChange={setUrgencyText} />
              <Field label={tr.trustText} value={trustText} onChange={setTrustText} />
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.benefits}</label>
                {benefits.map((b, i) => (
                  <input
                    key={i}
                    value={b}
                    onChange={e => {
                      const updated = [...benefits]
                      updated[i] = e.target.value
                      setBenefits(updated)
                    }}
                    placeholder={`Benefit ${i + 1}`}
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                ))}
                <button
                  onClick={() => setBenefits(prev => [...prev, ''])}
                  className="text-xs text-[#3b82f6] hover:underline"
                >
                  {tr.addBenefit}
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">{tr.fullDescription}</label>
                <textarea
                  value={descriptionLong}
                  onChange={e => setDescriptionLong(e.target.value)}
                  rows={5}
                  className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors resize-none"
                />
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5 space-y-4">
      <h2 className="text-white font-medium text-sm uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
      />
    </div>
  )
}
