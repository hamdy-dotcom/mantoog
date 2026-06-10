'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

export default function NewProductPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const [store, setStore] = useState<any>(null)
  const [mode, setMode] = useState<'url' | 'manual'>('url')
  const [url, setUrl] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [discountPercent, setDiscountPercent] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualComparePrice, setManualComparePrice] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string>('')
  const [previewActiveImg, setPreviewActiveImg] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiContent, setAiContent] = useState<any>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'input' | 'preview'>('input')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [scrapedImages, setScrapedImages] = useState<string[]>([])
  const [productName, setProductName] = useState('')
  const [productShipping, setProductShipping] = useState<'free' | 'fixed'>('free')
  const [productShippingCost, setProductShippingCost] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getStore = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!data) { router.push('/dashboard/setup'); return }
      setStore(data)
    }
    getStore()
  }, [])

  const getOriginalPrice = () => {
    if (!sellingPrice || !discountPercent) return null
    const selling = parseFloat(sellingPrice)
    const discount = parseFloat(discountPercent)
    if (isNaN(selling) || isNaN(discount) || discount <= 0 || discount >= 100) return null
    return (selling / (1 - discount / 100)).toFixed(2)
  }

  const handleScrapeUrl = async () => {
    if (!url.trim()) return
    setScraping(true)
    setScrapeError('')
    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      
      if (data.success && data.title && data.title.length > 3) {
        if (data.title) setProductName(data.title)
        if (data.images?.length > 0) setScrapedImages(data.images)
      } else {
        // Fallback: client-side proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        const proxyRes = await fetch(proxyUrl)
        const proxyData = await proxyRes.json()
        
        if (proxyData.contents) {
          const html = proxyData.contents
          const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/) ||
                            html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/) ||
                            html.match(/<h1[^>]*>([^<]+)<\/h1>/)
          if (titleMatch) setProductName(titleMatch[1].trim().slice(0, 100))
          
          const imgMatches = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.-]+\.jpg/g) || []
          const ogImg = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)
          const uniqueImgs = [...new Set([
            ...(ogImg ? [ogImg[1]] : []),
            ...imgMatches.filter((img: string) => !img.includes('sprite') && !img.includes('icon')).slice(0, 8)
          ])] as string[]
          if (uniqueImgs.length > 0) setScrapedImages(uniqueImgs)
        }
      }
    } catch (error) {
      setScrapeError(lang === 'ar'
        ? 'تعذر جلب بيانات المنتج. هذا الموقع قد لا يدعم الاستيراد التلقائي — يرجى إدخال تفاصيل المنتج يدوياً.'
        : 'Could not fetch product data. This website may not support auto-import — please enter product details manually.')
    }
    setScraping(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImageFiles(prev => [...prev, ...files])
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerateFromUrl = async () => {
    if (!url.trim()) { setError('Please paste a product URL'); return }
    if (!sellingPrice.trim()) { setError('Please enter the selling price'); return }
    setError('')
    setGenerating(true)
    try {
      const originalPrice = getOriginalPrice()
      const res = await fetch('/api/ai/generate-landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          price: sellingPrice,
          originalPrice,
          currency: store?.currency || 'EGP',
          language: store?.language || 'ar',
          productName: productName || '',
          scrapedImages,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setAiContent(data.data)
      setStep('preview')
    } catch (err: any) {
      setError(err.message || 'Failed to generate. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const needsShipping = store?.shipping_type === 'dynamic'

  const handleSaveManual = async () => {
    if (!manualName.trim()) { setError('Please enter a product name'); return }
    if (!manualPrice.trim()) { setError('Please enter a price'); return }
    setError('')
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const uploadedUrls: string[] = []

    // Upload cover first
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()
      const path = `products/${user.id}-${Date.now()}-cover.${ext}`
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(path, coverFile)
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }
    }

    // Upload gallery images
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop()
      const path = `products/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(path, file)
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }
    }

    console.log('Uploaded URLs:', uploadedUrls)

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        store_id: store.id,
        merchant_id: user.id,
        title: manualName,
        description: manualDescription,
        price: parseFloat(manualPrice),
        compare_at_price: manualComparePrice ? parseFloat(manualComparePrice) : null,
        currency: store.currency,
        images: uploadedUrls,
        source_platform: 'manual',
        status: 'active',
        ai_generated: false,
        shipping_type: needsShipping ? productShipping : store.shipping_type,
        shipping_cost: needsShipping
          ? (productShipping === 'free' ? 0 : parseFloat(productShippingCost) || 0)
          : (store.static_shipping_cost || 0),
      })
      .select()
      .single()

    if (productError) {
      setError('Failed to save product.')
      setSaving(false)
      return
    }

    if (product) {
      await supabase.from('landing_pages').insert({
        product_id: product.id,
        store_id: store.id,
        merchant_id: user.id,
        headline: manualName,
        subheadline: manualDescription,
        cta_text: store.language === 'ar' ? 'اطلب الآن' : 'Order Now',
        sections: JSON.stringify({
          benefits: [],
          urgency_text: '',
          trust_text: '',
          description_long: manualDescription,
        }),
        ai_generated: false,
        published: true,
      })
    }

    router.push('/dashboard/products')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const uploadedUrls: string[] = []
    const allFiles = coverFile ? [coverFile, ...imageFiles] : imageFiles
    for (const file of allFiles) {
      const ext = file.name.split('.').pop()
      const path = `products/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(path, file)
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }
    }

    const finalPrice = mode === 'url' ? parseFloat(sellingPrice) : parseFloat(manualPrice)
    const finalCompare = mode === 'url'
      ? parseFloat(getOriginalPrice() || '0')
      : parseFloat(manualComparePrice || '0')

    const finalImages = uploadedUrls.length > 0 ? uploadedUrls : scrapedImages.slice(0, 8)

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        store_id: store.id,
        merchant_id: user.id,
        title: aiContent.product_name || manualName,
        description: aiContent.description_long,
        price: finalPrice,
        compare_at_price: finalCompare || null,
        currency: store.currency,
        images: finalImages,
        source_url: mode === 'url' ? url : null,
        source_platform: mode === 'url' ? 'url' : 'manual',
        status: 'active',
        ai_generated: true,
        shipping_type: needsShipping ? productShipping : store.shipping_type,
        shipping_cost: needsShipping
          ? (productShipping === 'free' ? 0 : parseFloat(productShippingCost) || 0)
          : (store.static_shipping_cost || 0),
      })
      .select()
      .single()

    if (productError) {
      setError('Failed to save product.')
      setSaving(false)
      return
    }

    if (product) {
      await supabase.from('landing_pages').insert({
        product_id: product.id,
        store_id: store.id,
        merchant_id: user.id,
        headline: aiContent.headline,
        subheadline: aiContent.subheadline,
        cta_text: aiContent.cta_text,
        sections: JSON.stringify({
          benefits: aiContent.benefits,
          urgency_text: aiContent.urgency_text,
          trust_text: aiContent.trust_text,
          description_long: aiContent.description_long,
        }),
        ai_generated: true,
        published: true,
      })
    }

    router.push('/dashboard/products')
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  const previewPrice = mode === 'url' ? sellingPrice : manualPrice
  const previewOriginal = mode === 'url' ? getOriginalPrice() : manualComparePrice
  const previewDiscount = mode === 'url' ? discountPercent : (manualComparePrice && manualPrice ? Math.round((1 - parseFloat(manualPrice) / parseFloat(manualComparePrice)) * 100).toString() : '')
  const displayGallery = imagePreviews.length > 0 ? imagePreviews : scrapedImages

  return (
    <div className={`min-h-screen bg-[#0f1117] flex`} dir={dir}>
      <Sidebar store={store} />

      <main className="flex-1 pt-16 md:pt-0 p-4 md:p-8 overflow-auto pb-24 md:pb-8 flex flex-col items-center">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => step === 'preview' ? setStep('input') : router.push('/dashboard/products')}
            className="text-[#8b8fa8] hover:text-white text-sm transition-colors"
          >
            {tr.backBtn}
          </button>
          <h1 className="text-xl font-semibold text-white">
            {step === 'input' ? tr.addProductTitle : tr.reviewSave}
          </h1>
        </div>

        {step === 'input' && (
          <div className="max-w-lg space-y-5 mx-auto">

            {/* Mode tabs */}
            <div className="flex gap-2 p-1 bg-[#1a1d24] border border-[#2a2d35] rounded-xl w-fit">
              <button
                onClick={() => { setMode('url'); setError('') }}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'url' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
              >
                {tr.aiFromUrl}
              </button>
              <button
                onClick={() => { setMode('manual'); setError('') }}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] hover:text-white'}`}
              >
                {tr.manual}
              </button>
            </div>

            {/* URL MODE */}
            {mode === 'url' && (
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="text-white font-medium text-lg mb-1">{tr.aiFromUrlTitle}</h2>
                  <p className="text-[#8b8fa8] text-sm">{tr.aiFromUrlDesc}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">{tr.productUrl}</label>
                  <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onBlur={handleScrapeUrl}
                    placeholder={tr.productUrlPlaceholder}
                    className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>

                {scraping && (
                  <div className="text-xs text-[#8b8fa8] animate-pulse">🔍 Fetching product data...</div>
                )}

                {scrapeError && (
                  <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5">
                    <p className="text-[#f87171] text-xs">{scrapeError}</p>
                  </div>
                )}

                {!scraping && url.includes('aliexpress') && (
                  <div className="bg-[#3a2800] border border-[#fbbf24]/20 rounded-lg px-3 py-2.5">
                    <p className="text-[#fbbf24] text-xs">⚠️ AliExpress blocks automatic scraping. Please upload product images manually and enter the product name below — Claude will generate all the copy.</p>
                  </div>
                )}

                {(!scraping && (url.includes('aliexpress') || (scrapedImages.length === 0 && url.trim()))) && (
                  <div>
                    <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">Product name (optional — helps Claude write better copy)</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      placeholder={tr.productNamePlaceholder}
                      className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </div>
                )}

                {url.includes('aliexpress') && (
                  <div>
                    <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">Upload product images manually</label>
                    <div className="flex flex-wrap gap-2">
                      {imagePreviews.map((src, i) => (
                        <div key={i} className="relative group">
                          <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#2a2d35]" />
                          <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-4 h-4 bg-[#f87171] rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                      ))}
                      <label className="w-16 h-16 border border-dashed border-[#2a2d35] hover:border-[#3b82f6] rounded-lg flex items-center justify-center cursor-pointer text-[#4a4e60] hover:text-[#3b82f6] transition-colors text-xl">
                        +
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}

                {scrapedImages.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2">Scraped images — select to use</div>
                    <div className="flex flex-wrap gap-2">
                      {scrapedImages.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          onClick={() => {
                            if (!imagePreviews.includes(src)) {
                              setImagePreviews(prev => [...prev, src])
                            }
                          }}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-[#2a2d35] hover:border-[#3b82f6] cursor-pointer transition-colors"
                        />
                      ))}
                    </div>
                    <div className="text-xs text-[#4a4e60] mt-1">Click images to select them for your product</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">{tr.sellingPrice} ({store.currency})</label>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={e => setSellingPrice(e.target.value)}
                      placeholder="e.g. 199"
                      className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">{tr.discountPercent}</label>
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={e => setDiscountPercent(e.target.value)}
                      placeholder="e.g. 30"
                      min="1" max="99"
                      className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </div>
                </div>
                {needsShipping && (
                  <div className="mt-4">
                    <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">
                      {lang === 'ar' ? 'سعر الشحن لهذا المنتج' : 'Shipping for this product'}
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <button type="button" onClick={() => setProductShipping('free')}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${productShipping === 'free' ? 'bg-[#14321f] border-[#4ade80] text-[#4ade80]' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#4ade80]'}`}>
                        🚚 {lang === 'ar' ? 'شحن مجاني' : 'Free shipping'}
                      </button>
                      <button type="button" onClick={() => setProductShipping('fixed')}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${productShipping === 'fixed' ? 'bg-[#1a3a5c] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6]'}`}>
                        💵 {lang === 'ar' ? 'سعر محدد' : 'Fixed price'}
                      </button>
                    </div>
                    {productShipping === 'fixed' && (
                      <input type="number" value={productShippingCost} onChange={e => setProductShippingCost(e.target.value)}
                        placeholder={lang === 'ar' ? 'سعر الشحن' : 'Shipping cost'}
                        className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                    )}
                  </div>
                )}
                {sellingPrice && discountPercent && getOriginalPrice() && (
                  <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-4 py-3 flex items-center gap-3">
                    <span className="text-white font-semibold">{sellingPrice} {store.currency}</span>
                    <span className="text-[#8b8fa8] line-through text-sm">{getOriginalPrice()} {store.currency}</span>
                    <span className="bg-[#14321f] text-[#4ade80] text-xs font-medium px-2 py-0.5 rounded-full">{discountPercent}% OFF</span>
                  </div>
                )}
                {error && <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5"><p className="text-[#f87171] text-sm">{error}</p></div>}
                <button
                  onClick={handleGenerateFromUrl}
                  disabled={generating || !url.trim() || !sellingPrice.trim()}
                  className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-lg transition-colors"
                >
                  {generating ? tr.generating : tr.generateBtn}
                </button>
              </div>
            )}

            {/* MANUAL MODE */}
            {mode === 'manual' && (
              <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-white font-medium text-lg mb-1">{tr.manualTitle}</h2>
                  <p className="text-[#8b8fa8] text-sm">{tr.manualDesc}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">{tr.productName}</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder={tr.productNamePlaceholder}
                    className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">{tr.descriptionOptional}</label>
                  <textarea
                    value={manualDescription}
                    onChange={e => setManualDescription(e.target.value)}
                    placeholder={tr.descriptionPlaceholder}
                    rows={3}
                    className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">{tr.sellingPrice} ({store.currency})</label>
                    <input
                      type="number"
                      value={manualPrice}
                      onChange={e => setManualPrice(e.target.value)}
                      placeholder="e.g. 199"
                      className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">{tr.originalPrice} ({store.currency})</label>
                    <input
                      type="number"
                      value={manualComparePrice}
                      onChange={e => setManualComparePrice(e.target.value)}
                      placeholder="Before discount"
                      className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </div>
                </div>
                {manualPrice && manualComparePrice && parseFloat(manualComparePrice) > 0 && (
                  <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-4 py-3 flex items-center gap-3">
                    <span className="text-white font-semibold">{manualPrice} {store.currency}</span>
                    <span className="text-[#8b8fa8] line-through text-sm">{manualComparePrice} {store.currency}</span>
                    <span className="bg-[#14321f] text-[#4ade80] text-xs font-medium px-2 py-0.5 rounded-full">
                      {Math.round((1 - parseFloat(manualPrice) / parseFloat(manualComparePrice)) * 100)}% OFF
                    </span>
                  </div>
                )}
                {needsShipping && (
                  <div>
                    <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-2 block">{lang === 'ar' ? 'سعر الشحن لهذا المنتج' : 'Shipping for this product'}</label>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <button onClick={() => setProductShipping('free')}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${productShipping === 'free' ? 'bg-[#14321f] border-[#4ade80] text-[#4ade80]' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#4ade80]'}`}>
                        🚚 {lang === 'ar' ? 'شحن مجاني' : 'Free shipping'}
                      </button>
                      <button onClick={() => setProductShipping('fixed')}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${productShipping === 'fixed' ? 'bg-[#1a3a5c] border-[#3b82f6] text-white' : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6]'}`}>
                        💵 {lang === 'ar' ? 'سعر محدد' : 'Fixed price'}
                      </button>
                    </div>
                    {productShipping === 'fixed' && (
                      <input type="number" value={productShippingCost} onChange={e => setProductShippingCost(e.target.value)}
                        placeholder={lang === 'ar' ? 'سعر الشحن' : 'Shipping cost'}
                        className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.coverImage}</label>
                  <div className="flex items-center gap-3 mb-4">
                    {coverPreview ? (
                      <img src={coverPreview} className="w-20 h-20 object-cover rounded-lg border border-[#2a2d35]" />
                    ) : (
                      <div className="w-20 h-20 bg-[#0f1117] border border-dashed border-[#2a2d35] rounded-lg flex items-center justify-center text-[#4a4e60] text-xs text-center">Cover</div>
                    )}
                    <label className="cursor-pointer border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
                      {coverPreview ? tr.changeCover : tr.uploadCover}
                      <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </label>
                    {coverPreview && (
                      <button onClick={() => { setCoverFile(null); setCoverPreview('') }} className="text-xs text-[#f87171] hover:underline">{tr.removeImage}</button>
                    )}
                  </div>

                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">{tr.galleryImages}</label>
                  <div className="flex flex-wrap gap-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#2a2d35]" />
                        <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-4 h-4 bg-[#f87171] rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      </div>
                    ))}
                    <label className="w-16 h-16 border border-dashed border-[#2a2d35] hover:border-[#3b82f6] rounded-lg flex items-center justify-center cursor-pointer text-[#4a4e60] hover:text-[#3b82f6] transition-colors text-xl">
                      +
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>
                {error && <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5"><p className="text-[#f87171] text-sm">{error}</p></div>}

                <button
                  onClick={handleSaveManual}
                  disabled={saving || !manualName.trim() || !manualPrice.trim()}
                  className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-3 rounded-lg transition-colors"
                >
                  {saving ? tr.saving : tr.saveProduct}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && aiContent && (
          <div className="space-y-5 w-full max-w-5xl">
            <div className="flex items-center justify-between">
              <div className="bg-[#14321f] border border-[#4ade80]/20 rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="text-[#4ade80]">✓</span>
                <p className="text-[#4ade80] text-sm">{tr.generatedSuccess}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('input'); setAiContent(null) }}
                  className="border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {tr.regenerate}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  {saving ? tr.saving : tr.savePublish}
                </button>
              </div>
            </div>

            {error && <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5"><p className="text-[#f87171] text-sm">{error}</p></div>}

            {/* Live preview */}
            <div className="bg-white rounded-xl overflow-hidden border border-[#2a2d35] w-full" style={{ direction: store?.language === 'ar' ? 'rtl' : 'ltr', fontFamily: 'system-ui, Arial, sans-serif' }}>

              {/* Urgency bar */}
              <div style={{ background: '#ef4444', color: '#fff', padding: '10px 20px', textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
                🔥 {aiContent.urgency_text}
              </div>

              {/* Two column */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, padding: '40px 48px' }}>

                {/* Image side */}
                <div style={{ order: store?.language === 'ar' ? 2 : 1 }}>
                  {(coverPreview || displayGallery.length > 0) ? (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={previewActiveImg === 0 ? (coverPreview || displayGallery[0]) : displayGallery[previewActiveImg - (coverPreview ? 1 : 0)]}
                          style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 12, display: 'block' }}
                        />
                        {/* Nav arrows */}
                        {(coverPreview ? 1 : 0) + displayGallery.length > 1 && (
                          <>
                            <button
                              onClick={() => setPreviewActiveImg(i => Math.max(0, i - 1))}
                              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >‹</button>
                            <button
                              onClick={() => setPreviewActiveImg(i => Math.min((coverPreview ? 1 : 0) + displayGallery.length - 1, i + 1))}
                              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >›</button>
                          </>
                        )}
                      </div>
                      {/* Thumbnails */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {coverPreview && (
                          <img src={coverPreview} onClick={() => setPreviewActiveImg(0)} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: previewActiveImg === 0 ? `2px solid ${store?.primary_color || '#2563eb'}` : '2px solid #e5e7eb' }} />
                        )}
                        {displayGallery.map((src, i) => (
                          <img key={i} src={src} onClick={() => setPreviewActiveImg(coverPreview ? i + 1 : i)} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: previewActiveImg === (coverPreview ? i + 1 : i) ? `2px solid ${store?.primary_color || '#2563eb'}` : '2px solid #e5e7eb' }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1/1', background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#9ca3af' }}>
                      <div style={{ fontSize: 48 }}>📸</div>
                      <div style={{ fontSize: 13 }}>Product images appear here</div>
                    </div>
                  )}
                </div>

                {/* Info side */}
                <div style={{ order: store?.language === 'ar' ? 1 : 2 }}>
                  <span style={{ background: '#f3f4f6', color: '#555', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>الأكثر مبيعاً</span>
                  <h1 style={{ fontSize: 26, fontWeight: 800, margin: '10px 0 8px', color: '#111', lineHeight: 1.3 }}>{aiContent.headline}</h1>
                  <p style={{ fontSize: 15, color: '#555', margin: '0 0 16px', lineHeight: 1.6 }}>{aiContent.subheadline}</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: '#111' }}>{previewPrice} {store?.currency}</span>
                    {previewOriginal && <span style={{ fontSize: 16, color: '#999', textDecoration: 'line-through' }}>{previewOriginal} {store?.currency}</span>}
                    {previewDiscount && <span style={{ background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{previewDiscount}% OFF</span>}
                  </div>

                  <div style={{ background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>🔥 فقط متبقي 9 قطعة</span>
                    </div>
                    <div style={{ background: '#fee2e2', borderRadius: 99, height: 6 }}>
                      <div style={{ background: '#ef4444', height: '100%', width: '60%', borderRadius: 99 }} />
                    </div>
                  </div>

                  {aiContent.benefits?.map((b: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 14, color: '#222' }}>
                      <span>✅</span><span>{b}</span>
                    </div>
                  ))}

                  <button style={{ width: '100%', background: store?.primary_color || '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 16, marginBottom: 8 }}>
                    {aiContent.cta_text}
                  </button>
                  <div style={{ textAlign: 'center', fontSize: 13, color: '#16a34a' }}>🛡️ {aiContent.trust_text}</div>
                </div>
              </div>

              {/* Order form preview */}
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '32px 48px', background: '#f9fafb' }}>
                <div style={{ maxWidth: 520, margin: '0 auto' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, textAlign: 'center', color: '#111' }}>
                    {store?.language === 'ar' ? 'يرجى ادخال معلوماتك لإكمال الطلب' : 'Enter your details to complete order'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['الاسم', 'رقم الهاتف', 'المنطقة / المحافظة'].map((p, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', color: '#9ca3af', fontSize: 14 }}>{p}</div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', fontSize: 14 }}>
                      <span style={{ color: '#555' }}>الإجمالي</span>
                      <span style={{ fontWeight: 700 }}>{previewPrice} {store?.currency}</span>
                    </div>
                    <div style={{ background: store?.primary_color || '#2563eb', color: '#fff', borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 800, textAlign: 'center' }}>
                      {aiContent.cta_text} 🚀
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: '24px 48px 40px', fontSize: 15, color: '#444', lineHeight: 1.9, borderTop: '1px solid #e5e7eb' }}>
                {aiContent.description_long}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
