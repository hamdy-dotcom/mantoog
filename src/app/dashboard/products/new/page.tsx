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
  const [productSizes, setProductSizes] = useState<string[]>([])
  const [productColors, setProductColors] = useState<{ name: string; hex: string }[]>([])
  const [showSizePanel, setShowSizePanel] = useState(false)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#000000')
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
      // Try client-side fetch first (browser IP not blocked)
      const corsProxy = `https://corsproxy.io/?${encodeURIComponent(url)}`
      const browserRes = await fetch(corsProxy)

      if (browserRes.ok) {
        const html = await browserRes.text()

        // Extract title
        const titleMatch =
          html.match(/<span[^>]*id="productTitle"[^>]*>\s*([^<]+)\s*<\/span>/) ||
          html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/) ||
          html.match(/<title>([^<]+)<\/title>/)

        if (titleMatch) {
          const cleanTitle = titleMatch[1].trim().replace(/\s+/g, ' ').slice(0, 100)
          if (cleanTitle.length > 3) setProductName(cleanTitle)
        }

        // Extract images
        const amazonImgs = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+\.jpg/g) || []
        const ogImg = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)
        const noonImgs = html.match(/https:\/\/f\.nooncdn\.com\/p\/[A-Za-z0-9/_.-]+\.jpg/g) || []

        const allImgs = [
          ...(ogImg ? [ogImg[1]] : []),
          ...amazonImgs,
          ...noonImgs,
        ].filter(img => !img.includes('sprite') && !img.includes('icon') && !img.includes('logo'))

        const uniqueImgs = [...new Set(allImgs)].slice(0, 8)
        if (uniqueImgs.length > 0) setScrapedImages(uniqueImgs)

        // If we got something useful, stop here
        if (titleMatch || uniqueImgs.length > 0) {
          setProductSizes(['S', 'M', 'L', 'XL', 'XXL'])
          setProductColors([
            { name: 'أسود', hex: '#000000' },
            { name: 'أبيض', hex: '#ffffff' },
            { name: 'رمادي', hex: '#9ca3af' },
          ])
          setScraping(false)
          return
        }
      }
    } catch {}

    // Fallback to server scraper
    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.success && data.title && data.title.length > 3) {
        setProductName(data.title)
        if (data.images?.length > 0) setScrapedImages(data.images)
        setProductSizes(['S', 'M', 'L', 'XL', 'XXL'])
        setProductColors([
          { name: 'أسود', hex: '#000000' },
          { name: 'أبيض', hex: '#ffffff' },
          { name: 'رمادي', hex: '#9ca3af' },
        ])
      }
    } catch {}

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
        sizes: productSizes.length > 0 ? productSizes : null,
        colors: productColors.length > 0 ? productColors : null,
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
        sizes: productSizes.length > 0 ? productSizes : null,
        colors: productColors.length > 0 ? productColors : null,
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
  const shippingCost = needsShipping
    ? (productShipping === 'free' ? 0 : parseFloat(productShippingCost) || 0)
    : (store.shipping_type === 'static' ? (store.static_shipping_cost || 0) : 0)
  const displayGallery = imagePreviews.length > 0 ? imagePreviews : scrapedImages

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className="flex-1 p-6 md:p-8 overflow-auto pb-24 md:pb-8 mt-14 md:mt-0 flex flex-col items-center">
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
                {/* Sizes & Colors */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider block">
                    {lang === 'ar' ? 'مقاسات وألوان المنتج (اختياري)' : 'Product Sizes & Colors (optional)'}
                  </label>

                    {/* Sizes */}
                    <div>
                      <button onClick={() => setShowSizePanel(!showSizePanel)}
                        className="flex items-center gap-2 text-sm text-[#3b82f6] hover:text-white border border-[#2a2d35] hover:border-[#3b82f6] px-4 py-2 rounded-lg transition-colors">
                        <span>📏</span>
                        <span>{lang === 'ar' ? 'إضافة مقاسات' : 'Add Sizes'}</span>
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
                            <div className="mt-3 text-xs text-[#4ade80]">
                              ✓ {lang === 'ar' ? 'المقاسات المختارة:' : 'Selected:'} {productSizes.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Colors */}
                    <div>
                      <button onClick={() => setShowColorPanel(!showColorPanel)}
                        className="flex items-center gap-2 text-sm text-[#3b82f6] hover:text-white border border-[#2a2d35] hover:border-[#3b82f6] px-4 py-2 rounded-lg transition-colors">
                        <span>🎨</span>
                        <span>{lang === 'ar' ? 'إضافة ألوان' : 'Add Colors'}</span>
                        {productColors.length > 0 && <span className="bg-[#3b82f6] text-white text-xs px-2 py-0.5 rounded-full">{productColors.length}</span>}
                      </button>

                      {showColorPanel && (
                        <div className="mt-3 bg-[#0f1117] border border-[#2a2d35] rounded-xl p-4">
                          <div className="text-xs text-[#8b8fa8] mb-3">{lang === 'ar' ? 'أضف ألوان المنتج (بحد أقصى 5 ألوان)' : 'Add product colors (max 5)'}</div>

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
                                placeholder={lang === 'ar' ? 'اسم اللون (مثال: أسود)' : 'Color name (e.g. Black)'}
                                className="flex-1 bg-[#1a1d24] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]" />
                              <button onClick={() => {
                                if (!newColorName.trim()) return
                                setProductColors(prev => [...prev, { name: newColorName.trim(), hex: newColorHex }])
                                setNewColorName('')
                                setNewColorHex('#000000')
                              }}
                                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                                {lang === 'ar' ? '+ إضافة' : '+ Add'}
                              </button>
                            </div>
                          )}

                          <div>
                            <div className="text-xs text-[#4a4e60] mb-2">{lang === 'ar' ? 'ألوان شائعة:' : 'Quick add:'}</div>
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
                        </div>
                      )}
                    </div>
                </div>
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
            <div className="bg-white rounded-xl overflow-hidden border border-[#2a2d35] w-full" style={{ direction: store?.language === 'ar' ? 'rtl' : 'ltr', fontFamily: 'system-ui, Arial, sans-serif', color: '#111' }}>

              {/* Urgency top bar */}
              <div style={{ background: '#ef4444', color: '#fff', padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                ⏱️ ينتهي العرض في: 00 أيام · 22 ساعات · 47 دقيقة · 13 ثانية
                {Number(shippingCost) === 0 && <span> · 🚚 شحن مجاني</span>}
              </div>

              {/* Two column — desktop */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '32px 40px' }}>

                {/* Image side */}
                <div style={{ order: store?.language === 'ar' ? 2 : 1 }}>
                  {(coverPreview || displayGallery.length > 0) ? (
                    <div>
                      <img
                        src={previewActiveImg === 0 ? (coverPreview || displayGallery[0]) : displayGallery[previewActiveImg - (coverPreview ? 1 : 0)]}
                        style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: 12, display: 'block', background: '#f8f9fa' }}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {coverPreview && <img src={coverPreview} onClick={() => setPreviewActiveImg(0)} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: previewActiveImg === 0 ? `2px solid ${store?.primary_color || '#2563eb'}` : '2px solid #e5e7eb' }} />}
                        {displayGallery.map((src, i) => (
                          <img key={i} src={src} onClick={() => setPreviewActiveImg(coverPreview ? i + 1 : i)} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: previewActiveImg === (coverPreview ? i + 1 : i) ? `2px solid ${store?.primary_color || '#2563eb'}` : '2px solid #e5e7eb' }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1/1', background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📦</div>
                  )}
                </div>

                {/* Info side */}
                <div style={{ order: store?.language === 'ar' ? 1 : 2 }}>
                  <span style={{ background: '#f3f4f6', color: '#555', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>الأكثر مبيعاً</span>
                  <h1 style={{ fontSize: 24, fontWeight: 800, margin: '10px 0 8px', lineHeight: 1.3 }}>{aiContent.headline}</h1>
                  <p style={{ fontSize: 14, color: '#555', margin: '0 0 14px', lineHeight: 1.5 }}>{aiContent.subheadline}</p>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 28, fontWeight: 800 }}>{previewPrice} {store?.currency}</span>
                    {previewOriginal && <span style={{ fontSize: 16, color: '#999', textDecoration: 'line-through' }}>{previewOriginal} {store?.currency}</span>}
                    {previewDiscount && <span style={{ background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{previewDiscount}% خصم</span>}
                  </div>

                  {/* Timer */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🔥 ينتهي العرض في</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[{v:'00',l:'أيام'},{v:'22',l:'ساعات'},{v:'47',l:'دقائق'},{v:'13',l:'ثواني'}].map((t,i) => (
                        <div key={i} style={{ flex: 1, background: '#1f2937', color: '#fff', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800 }}>{t.v}</div>
                          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{t.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>🔥 تبقى 9 قطعة فقط</span>
                      <span style={{ color: '#9ca3af', fontSize: 11 }}>اطلب قبل نفاذ الكمية</span>
                    </div>
                    <div style={{ background: '#e5e7eb', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(to left,#ef4444,#f97316,#22c55e)', width: '60%' }} />
                    </div>
                  </div>

                  {/* Benefits */}
                  {aiContent.benefits?.map((b: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 13, color: '#222' }}>
                      <span>✅</span><span>{b}</span>
                    </div>
                  ))}

                  {/* Trust badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 14, marginBottom: 14 }}>
                    {[
                      { icon: '💵', text: 'الدفع عند الاستلام' },
                      { icon: '🚚', text: Number(shippingCost) === 0 ? 'شحن مجاني' : 'توصيل سريع' },
                      { icon: '↩️', text: 'إرجاع مجاني' },
                      { icon: '✅', text: 'منتج أصلي' },
                    ].map((b, i) => (
                      <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                        <div style={{ fontSize: 16, marginBottom: 2 }}>{b.icon}</div>
                        <div style={{ fontSize: 9, color: '#555' }}>{b.text}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ flex: 2, background: store?.primary_color || '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                      {Number(shippingCost) === 0 ? 'اطلب الآن والتوصيل مجاني 🚀' : 'اطلب الآن 🚀'}
                    </button>
                    <button style={{ flex: 1, background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      أضف للسلة
                    </button>
                  </div>
                </div>
              </div>

              {/* Product details section */}
              {aiContent.description_long && (
                <div style={{ margin: '0 40px 24px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 4, height: 20, background: store?.primary_color || '#2563eb', borderRadius: 99 }} />
                    <span style={{ fontSize: 15, fontWeight: 700 }}>تفاصيل المنتج</span>
                  </div>
                  <div style={{ padding: 20 }}>
                    {aiContent.benefits?.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, marginBottom: 16 }}>
                        {aiContent.benefits.map((b: string, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px' }}>
                            <span>✅</span><span style={{ fontSize: 12, color: '#374151' }}>{b}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.9 }}>{aiContent.description_long}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                      {aiContent.urgency_text && (
                        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>⚡</span><span style={{ fontSize: 12, color: '#c2410c', fontWeight: 600 }}>{aiContent.urgency_text}</span>
                        </div>
                      )}
                      {aiContent.trust_text && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🛡️</span><span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{aiContent.trust_text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div style={{ padding: '0 40px 24px' }}>
                <div style={{ background: '#f8f9fa', borderRadius: 16, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span>⭐⭐⭐⭐⭐</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>4.9/5</span>
                    <span style={{ color: '#888', fontSize: 13 }}>(18 تقييم)</span>
                  </div>
                  {[
                    { name: 'محمد أحمد', comment: 'منتج ممتاز! وصل بسرعة والجودة أحسن من المتوقع 🔥', rating: 5 },
                    { name: 'خالد محمد', comment: 'وصل في 3 أيام وشغال تمام، نصحت فيه كل أصحابي', rating: 5 },
                    { name: 'سامي العمري', comment: 'المنتج كويس بس التغليف كان بسيط شوية، غير كده تمام', rating: 4 },
                  ].map((r, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #e5e7eb', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: store?.primary_color || '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{r.name[0]}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: '#10b981' }}>✓ مشتري موثق {'⭐'.repeat(r.rating)}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{r.comment}</p>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', padding: '8px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>عرض جميع التقييمات (18)</div>
                </div>
              </div>

              {/* Checkout form */}
              <div style={{ padding: '24px 40px 40px', background: '#f0f0f0', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ maxWidth: 520, margin: '0 auto' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
                    يرجى ادخال معلوماتك لإكمال الطلب
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', color: '#9ca3af', fontSize: 14 }}>الاسم</div>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', color: '#9ca3af', fontSize: 14, direction: 'ltr', textAlign: 'right' }}>05xxxxxxxx</div>

                    {(!store?.address_mode || store?.address_mode === 'text') && (
                      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', color: '#9ca3af', fontSize: 14 }}>العنوان تفصيلي (منطقة، مدينة، حي)</div>
                    )}
                    {store?.address_mode === 'map' && (
                      <div style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
                        📡 اضغط هنا لتحديد موقعك تلقائياً
                      </div>
                    )}
                    {store?.show_quantity && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', fontSize: 14 }}>
                        <span style={{ color: '#555' }}>عدد القطع</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</span>
                          <span style={{ fontWeight: 700 }}>1</span>
                          <span style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</span>
                        </div>
                      </div>
                    )}
                    {store?.show_note && (
                      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', color: '#9ca3af', fontSize: 14 }}>ملاحظات إضافية (اختياري)</div>
                    )}
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 6 }}>
                        <span>تكلفة الشحن</span>
                        <span style={{ color: Number(shippingCost) === 0 ? '#16a34a' : '#111', fontWeight: 600 }}>{Number(shippingCost) === 0 ? 'شحن مجاني ✓' : `${shippingCost} ${store?.currency}`}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                        <span>الإجمالي</span>
                        <span>{previewPrice} {store?.currency}</span>
                      </div>
                    </div>
                    <div style={{ background: store?.primary_color || '#2563eb', color: '#fff', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 800, textAlign: 'center' }}>
                      {Number(shippingCost) === 0 ? 'اطلب الآن والتوصيل مجاني 🚀' : 'اطلب الآن 🚀'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  )
}
