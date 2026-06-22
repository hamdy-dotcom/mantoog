'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { DASHBOARD_MAIN_CLASS } from '@/components/dashboard/dashboard-layout'
import { getAuthenticatedUser, loadMerchantStore, signOutAndGoToLogin } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import ProductCreativesSection from '@/components/dashboard/ProductCreativesSection'

const statusLabels: Record<string, keyof typeof t.en> = {
  active: 'active',
  draft: 'draft',
  archived: 'archived',
}

type Tab = 'general' | 'media' | 'pricing' | 'variants' | 'landing' | 'marketing' | 'creatives'

const IconInfo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
  </svg>
)
const IconPhoto = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" />
  </svg>
)
const IconTag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 0 0 3 5.5v2.879a2.5 2.5 0 0 0 .732 1.767l6.5 6.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-6.5-6.5A2.5 2.5 0 0 0 8.38 3H5.5ZM6 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
  </svg>
)
const IconGrid = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
  </svg>
)
const IconDoc = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0-6a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd" />
  </svg>
)
const IconSparkles = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
  </svg>
)
const IconFilm = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" />
  </svg>
)
const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
  </svg>
)
const IconExclaim = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
  </svg>
)

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
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [status, setStatus] = useState('active')
  const [images, setImages] = useState<string[]>([])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])

  const [headline, setHeadline] = useState('')
  const [subheadline, setSubheadline] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [benefits, setBenefits] = useState<string[]>(['', '', '', ''])
  const [urgencyText, setUrgencyText] = useState('')
  const [trustText, setTrustText] = useState('')
  const [descriptionLong, setDescriptionLong] = useState('')

  const [productSizes, setProductSizes] = useState<string[]>([])
  const [productColors, setProductColors] = useState<{ name: string; hex: string }[]>([])
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#000000')
  const [offers, setOffers] = useState<{ id: string; quantity: number; price: number }[]>([])
  const [newOfferQty, setNewOfferQty] = useState('')
  const [newOfferPrice, setNewOfferPrice] = useState('')
  const [upsell, setUpsell] = useState<{ type: 'bump' | 'post_purchase'; product_id: string; product_title: string; product_image: string | null; sale_price: number; active: boolean } | null>(null)
  const [showUpsellModal, setShowUpsellModal] = useState(false)
  const [upsellModalType, setUpsellModalType] = useState<'bump' | 'post_purchase'>('bump')
  const [upsellModalStep, setUpsellModalStep] = useState<'pick' | 'price'>('pick')
  const [upsellProducts, setUpsellProducts] = useState<any[]>([])
  const [upsellSearch, setUpsellSearch] = useState('')
  const [upsellPickedProduct, setUpsellPickedProduct] = useState<any>(null)
  const [upsellSalePrice, setUpsellSalePrice] = useState('')
  const [loadingUpsellProducts, setLoadingUpsellProducts] = useState(false)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const ctx = await loadMerchantStore(supabase, router, '*')
      if (!ctx) return
      setStore(ctx.store)

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .eq('merchant_id', ctx.user.id)
        .single()
      if (!productData) { router.push('/dashboard/products'); return }
      setProduct(productData)

      setTitle(productData.title || '')
      setDescription(productData.description || '')
      setPrice(productData.price?.toString() || '')
      setComparePrice(productData.compare_at_price?.toString() || '')
      setStatus(productData.status || 'active')
      setImages(productData.images || [])
      setProductSizes(productData.sizes || [])
      setProductColors(productData.colors || [])
      setOffers(productData.offers || [])
      setUpsell(productData.upsell || null)

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

  const removeExistingImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index))
  const removeNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const openUpsellModal = async (type: 'bump' | 'post_purchase') => {
    setUpsellModalType(type)
    setUpsellModalStep('pick')
    setUpsellPickedProduct(null)
    setUpsellSalePrice('')
    setUpsellSearch('')
    setShowUpsellModal(true)
    setLoadingUpsellProducts(true)
    const { data } = await supabase
      .from('products')
      .select('id, title, images, price')
      .eq('store_id', store.id)
      .neq('id', params.id as string)
      .eq('status', 'active')
      .order('title')
    setUpsellProducts(data || [])
    setLoadingUpsellProducts(false)
  }

  const confirmUpsell = () => {
    if (!upsellPickedProduct || !upsellSalePrice) return
    setUpsell({
      type: upsellModalType,
      product_id: upsellPickedProduct.id,
      product_title: upsellPickedProduct.title,
      product_image: upsellPickedProduct.images?.[0] || null,
      sale_price: parseFloat(upsellSalePrice),
      active: true,
    })
    setShowUpsellModal(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    const user = await getAuthenticatedUser(supabase)
    if (!user) { await signOutAndGoToLogin(router); return }

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
        offers,
        upsell,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (productError) {
      setError('Failed to save product.')
      setSaving(false)
      return
    }

    const sectionsData = JSON.stringify({
      benefits: benefits.filter(b => b.trim()),
      urgency_text: urgencyText,
      trust_text: trustText,
      description_long: descriptionLong,
    })

    if (landingPage) {
      await supabase.from('landing_pages').update({
        headline, subheadline, cta_text: ctaText, sections: sectionsData,
        updated_at: new Date().toISOString(),
      }).eq('id', landingPage.id)
    } else {
      await supabase.from('landing_pages').insert({
        product_id: params.id, store_id: store.id, merchant_id: user.id,
        headline, subheadline, cta_text: ctaText, sections: sectionsData,
        ai_generated: false, published: true,
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

  const mediaBadge = images.length + newImagePreviews.length || undefined
  const variantsBadge = (productSizes.length + productColors.length) || undefined
  const marketingBadge = (offers.length + (upsell ? 1 : 0)) || undefined

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'general',   label: lang === 'ar' ? 'عام'         : 'General',      icon: <IconInfo /> },
    { id: 'media',     label: lang === 'ar' ? 'الصور'       : 'Media',        icon: <IconPhoto />,    badge: mediaBadge },
    { id: 'pricing',   label: lang === 'ar' ? 'التسعير'     : 'Pricing',      icon: <IconTag /> },
    { id: 'variants',  label: lang === 'ar' ? 'المتغيرات'   : 'Variants',     icon: <IconGrid />,     badge: variantsBadge },
    { id: 'landing',   label: lang === 'ar' ? 'الصفحة'      : 'Landing Page', icon: <IconDoc /> },
    { id: 'marketing', label: lang === 'ar' ? 'التسويق'     : 'Marketing',    icon: <IconSparkles />, badge: marketingBadge },
    { id: 'creatives', label: lang === 'ar' ? 'الإعلانات'   : 'Creatives',    icon: <IconFilm /> },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} />

      <main className={DASHBOARD_MAIN_CLASS}>

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => router.push('/dashboard/products')}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1d24] border border-[#2a2d35] text-[#8b8fa8] hover:text-white hover:border-[#3b82f6] transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-xs text-[#4a4e60] mb-0.5">{lang === 'ar' ? 'المنتجات' : 'Products'}</p>
              <h1 className="text-white font-semibold text-base truncate leading-tight">{title || (lang === 'ar' ? 'منتج' : 'Product')}</h1>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
              status === 'active'   ? 'bg-[#14321f] text-[#4ade80]' :
              status === 'draft'    ? 'bg-[#2a2d35] text-[#8b8fa8]' :
                                      'bg-[#3a1414] text-[#f87171]'
            }`}>{String(tr[statusLabels[status]] || status)}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.open(`/${store.slug}/${params.id}`, '_blank')}
              className="hidden sm:flex items-center gap-2 text-sm bg-[#1a1d24] border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white px-4 py-2 rounded-xl transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
              </svg>
              {tr.productPage}
            </button>
            <button
              onClick={() => router.push('/dashboard/tiktok')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer">
              <IconFilm />
              <span className="hidden sm:inline">{lang === 'ar' ? 'إنشاء إعلان' : 'Create Ad'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
              {saving ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {tr.saving}
                </>
              ) : tr.saveChanges}
            </button>
          </div>
        </div>

        {success && (
          <div className="mb-5 bg-[#14321f] border border-[#4ade80]/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-[#4ade80] shrink-0"><IconCheck /></span>
            <p className="text-[#4ade80] text-sm">{tr.savedSuccess}</p>
          </div>
        )}
        {error && (
          <div className="mb-5 bg-[#3a1414] border border-[#f87171]/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-[#f87171] shrink-0"><IconExclaim /></span>
            <p className="text-[#f87171] text-sm">{error}</p>
          </div>
        )}

        {/* ── Tab layout ── */}
        <div className="flex flex-col md:flex-row gap-5 md:gap-6 md:items-start">

          {/* Tab nav — horizontal scroll on mobile, vertical sidebar on desktop */}
          <nav className="w-full md:w-48 md:shrink-0 bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden flex flex-row overflow-x-auto md:flex-col md:overflow-x-visible">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap
                  md:w-full md:gap-3 md:border-s-2 md:whitespace-normal md:shrink-1 ${
                  activeTab === tab.id
                    ? 'bg-[#1e3a5c]/50 text-[#60a5fa] md:border-s-[#3b82f6]'
                    : 'text-[#8b8fa8] hover:text-white hover:bg-[#1f2229] md:border-s-transparent'
                }`}>
                <span className={`shrink-0 ${activeTab === tab.id ? 'text-[#3b82f6]' : 'text-[#4a4e60]'}`}>{tab.icon}</span>
                <span className="md:flex-1 text-start">{tab.label}</span>
                {tab.badge != null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.id ? 'bg-[#3b82f6] text-white' : 'bg-[#2a2d35] text-[#8b8fa8]'
                  }`}>{tab.badge}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* ──── GENERAL ──── */}
            {activeTab === 'general' && (
              <Card title={lang === 'ar' ? 'معلومات المنتج' : 'Product Info'} icon={<IconInfo />}>
                <Field label={tr.productTitle} value={title} onChange={setTitle} placeholder={lang === 'ar' ? 'اسم المنتج' : 'Product title'} />
                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] mb-2 block">{tr.description}</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={5}
                    placeholder={lang === 'ar' ? 'وصف قصير للمنتج...' : 'Short product description...'}
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all resize-none placeholder-[#4a4e60]"
                  />
                </div>
              </Card>
            )}

            {/* ──── MEDIA ──── */}
            {activeTab === 'media' && (
              <Card
                title={lang === 'ar' ? 'صور المنتج' : 'Product Images'}
                subtitle={lang === 'ar' ? 'الصورة الأولى هي صورة الغلاف' : 'First image is used as the cover'}
                icon={<IconPhoto />}>

                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#2a2d35] hover:border-[#3b82f6] rounded-2xl cursor-pointer transition-all group bg-[#0f1117] hover:bg-[#1a2a3a]/20">
                  <div className="flex flex-col items-center gap-2 text-[#4a4e60] group-hover:text-[#3b82f6] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8">
                      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{lang === 'ar' ? 'اسحب الصور هنا أو انقر للرفع' : 'Drop images here or click to upload'}</span>
                    <span className="text-xs">PNG, JPG, WebP</span>
                  </div>
                  <input type="file" accept="image/*" multiple onChange={handleNewImages} className="hidden" />
                </label>

                {(images.length > 0 || newImagePreviews.length > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative group aspect-square">
                        <img src={img} alt="" className="w-full h-full object-cover rounded-xl border border-[#2a2d35]" />
                        {i === 0 && (
                          <div className="absolute bottom-1.5 start-1.5 bg-[#3b82f6] text-white text-[10px] px-1.5 py-0.5 rounded-md font-semibold">Cover</div>
                        )}
                        <button onClick={() => removeExistingImage(i)}
                          className="absolute top-1.5 end-1.5 w-6 h-6 bg-[#f87171] rounded-full text-white text-xs hidden group-hover:flex items-center justify-center cursor-pointer">×</button>
                      </div>
                    ))}
                    {newImagePreviews.map((src, i) => (
                      <div key={`n${i}`} className="relative group aspect-square">
                        <img src={src} alt="" className="w-full h-full object-cover rounded-xl border border-[#3b82f6]/40" />
                        <div className="absolute bottom-1.5 start-1.5 bg-[#1e3a5c] text-[#60a5fa] text-[10px] px-1.5 py-0.5 rounded-md font-semibold">New</div>
                        <button onClick={() => removeNewImage(i)}
                          className="absolute top-1.5 end-1.5 w-6 h-6 bg-[#f87171] rounded-full text-white text-xs hidden group-hover:flex items-center justify-center cursor-pointer">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* ──── PRICING ──── */}
            {activeTab === 'pricing' && (
              <>
                <Card title={lang === 'ar' ? 'السعر' : 'Pricing'} icon={<IconTag />}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={`${lang === 'ar' ? 'سعر البيع' : 'Sale Price'} (${store?.currency})`} value={price} onChange={setPrice} type="number" placeholder="0" />
                    <Field label={`${tr.originalPrice} (${store?.currency})`} value={comparePrice} onChange={setComparePrice} type="number" placeholder="0" />
                  </div>
                  {price && comparePrice && parseFloat(price) < parseFloat(comparePrice) && (
                    <div className="bg-gradient-to-r from-[#0d2b1a] to-[#0f1f10] border border-[#4ade80]/20 rounded-2xl px-6 py-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#4a4e60] mb-1">{lang === 'ar' ? 'العميل يدفع' : 'Customer pays'}</p>
                        <p className="text-3xl font-bold text-white">{price} <span className="text-base font-normal text-[#8b8fa8]">{store?.currency}</span></p>
                        <p className="text-sm text-[#8b8fa8] line-through mt-1">{comparePrice} {store?.currency}</p>
                      </div>
                      <div className="text-center">
                        <div className="bg-[#4ade80] text-[#0a1f12] font-bold text-3xl px-5 py-3 rounded-2xl leading-none">
                          {Math.round((1 - parseFloat(price) / parseFloat(comparePrice)) * 100)}%
                        </div>
                        <p className="text-xs text-[#4ade80] mt-1.5 font-semibold">OFF</p>
                      </div>
                    </div>
                  )}
                </Card>

                <Card title={lang === 'ar' ? 'حالة المنتج' : 'Product Status'} icon={<IconInfo />}>
                  <div className="flex bg-[#0f1117] border border-[#2a2d35] rounded-xl p-1 gap-1">
                    {(['active', 'draft', 'archived'] as const).map(s => (
                      <button key={s} onClick={() => setStatus(s)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                          status === s
                            ? s === 'active'   ? 'bg-[#14321f] text-[#4ade80]'
                              : s === 'draft'  ? 'bg-[#2a2d35] text-white'
                                               : 'bg-[#3a1414] text-[#f87171]'
                            : 'text-[#4a4e60] hover:text-[#8b8fa8]'
                        }`}>
                        {String(tr[statusLabels[s]] || s)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#4a4e60]">
                    {status === 'active'   ? (lang === 'ar' ? 'المنتج مرئي للعملاء' : 'Product is visible to customers')
                   : status === 'draft'    ? (lang === 'ar' ? 'المنتج مخفي عن العملاء' : 'Product is hidden from customers')
                                           : (lang === 'ar' ? 'المنتج مؤرشف' : 'Product is archived')}
                  </p>
                </Card>
              </>
            )}

            {/* ──── VARIANTS ──── */}
            {activeTab === 'variants' && (
              <>
                <Card title={lang === 'ar' ? 'المقاسات' : 'Sizes'} subtitle={lang === 'ar' ? 'اختر المقاسات المتاحة' : 'Select available sizes'} icon={<IconGrid />}>
                  <div className="flex flex-wrap gap-2">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'فري سايز'].map(size => (
                      <button key={size} onClick={() => setProductSizes(prev =>
                        prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                      )}
                        className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                          productSizes.includes(size)
                            ? 'bg-[#1e3a5c] border-[#3b82f6] text-[#60a5fa]'
                            : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white bg-[#0f1117]'
                        }`}>{size}</button>
                    ))}
                  </div>
                  {productSizes.length > 0 && (
                    <div className="flex items-center gap-2 bg-[#14321f]/60 border border-[#4ade80]/20 rounded-xl px-4 py-2.5">
                      <span className="text-[#4ade80] shrink-0"><IconCheck /></span>
                      <span className="text-xs text-[#4ade80] font-medium">{productSizes.join(' · ')}</span>
                    </div>
                  )}
                </Card>

                <Card title={lang === 'ar' ? 'الألوان' : 'Colors'} subtitle={lang === 'ar' ? 'حد أقصى 5 ألوان' : 'Maximum 5 colors'} icon={<IconGrid />}>
                  <div>
                    <p className="text-xs text-[#4a4e60] mb-3">{lang === 'ar' ? 'ألوان سريعة' : 'Quick presets'}</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: lang === 'ar' ? 'أسود' : 'Black', hex: '#000000' },
                        { name: lang === 'ar' ? 'أبيض' : 'White', hex: '#ffffff' },
                        { name: lang === 'ar' ? 'رمادي' : 'Gray',  hex: '#9ca3af' },
                        { name: lang === 'ar' ? 'كحلي' : 'Navy',   hex: '#1e3a5f' },
                        { name: lang === 'ar' ? 'بيج'   : 'Beige', hex: '#d4b896' },
                        { name: lang === 'ar' ? 'أحمر'  : 'Red',   hex: '#ef4444' },
                        { name: lang === 'ar' ? 'أخضر'  : 'Green', hex: '#22c55e' },
                      ].map((preset, i) => (
                        <button key={i}
                          disabled={productColors.length >= 5 || !!productColors.find(c => c.hex === preset.hex)}
                          onClick={() => setProductColors(prev => [...prev, preset])}
                          className="flex items-center gap-2 border border-[#2a2d35] hover:border-[#3b82f6] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-xs text-[#8b8fa8] hover:text-white transition-all cursor-pointer bg-[#0f1117]">
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: preset.hex, border: '1px solid rgba(255,255,255,0.2)' }} />
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {productColors.length < 5 && (
                    <div>
                      <p className="text-xs text-[#4a4e60] mb-3">{lang === 'ar' ? 'لون مخصص' : 'Custom color'}</p>
                      <div className="flex items-center gap-3">
                        <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)}
                          className="w-12 h-12 rounded-xl border border-[#2a2d35] cursor-pointer bg-transparent" />
                        <input type="text" value={newColorName} onChange={e => setNewColorName(e.target.value)}
                          placeholder={lang === 'ar' ? 'اسم اللون' : 'Color name'}
                          className="flex-1 bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors" />
                        <button onClick={() => {
                          if (!newColorName.trim()) return
                          setProductColors(prev => [...prev, { name: newColorName.trim(), hex: newColorHex }])
                          setNewColorName('')
                          setNewColorHex('#000000')
                        }}
                          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm px-5 py-3 rounded-xl transition-colors font-medium cursor-pointer whitespace-nowrap">
                          + {lang === 'ar' ? 'إضافة' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}

                  {productColors.length > 0 && (
                    <div>
                      <p className="text-xs text-[#4a4e60] mb-3">{lang === 'ar' ? 'الألوان المحددة' : 'Selected colors'}</p>
                      <div className="flex flex-wrap gap-2">
                        {productColors.map((color, i) => (
                          <div key={i} className="flex items-center gap-2 bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2.5">
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: color.hex, border: '1px solid rgba(255,255,255,0.15)' }} />
                            <span className="text-sm text-white">{color.name}</span>
                            <button onClick={() => setProductColors(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-[#4a4e60] hover:text-[#f87171] text-xs transition-colors cursor-pointer ms-1">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* ──── LANDING PAGE ──── */}
            {activeTab === 'landing' && (
              <>
                <Card title={lang === 'ar' ? 'المحتوى الرئيسي' : 'Above the Fold'} subtitle={lang === 'ar' ? 'العناوين وزر الشراء' : 'Headlines and call-to-action'} icon={<IconDoc />}>
                  <Field label={tr.headline}    value={headline}    onChange={setHeadline}    placeholder={lang === 'ar' ? 'العنوان الرئيسي...' : 'Main headline...'} />
                  <Field label={tr.subheadline} value={subheadline} onChange={setSubheadline} placeholder={lang === 'ar' ? 'العنوان الفرعي...' : 'Subheadline...'} />
                  <Field label={tr.ctaButton}   value={ctaText}     onChange={setCtaText}     placeholder={lang === 'ar' ? 'نص زر الشراء...' : 'Buy button text...'} />
                </Card>

                <Card title={lang === 'ar' ? 'الإقناع والثقة' : 'Trust & Urgency'} icon={<IconDoc />}>
                  <Field label={tr.urgencyText} value={urgencyText} onChange={setUrgencyText} placeholder={lang === 'ar' ? 'مثال: عرض محدود 24 ساعة فقط' : 'e.g. Limited offer – 24 hours only'} />
                  <Field label={tr.trustText}   value={trustText}   onChange={setTrustText}   placeholder={lang === 'ar' ? 'مثال: ضمان استرداد 30 يوم' : 'e.g. 30-day money-back guarantee'} />
                </Card>

                <Card title={tr.benefits} subtitle={lang === 'ar' ? 'أبرز فوائد المنتج' : 'Key product benefits'} icon={<IconDoc />}>
                  <div className="space-y-3">
                    {benefits.map((b, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#1e3a5c] border border-[#3b82f6]/30 text-[#60a5fa] text-xs flex items-center justify-center shrink-0 font-bold">{i + 1}</div>
                        <input
                          value={b}
                          onChange={e => { const u = [...benefits]; u[i] = e.target.value; setBenefits(u) }}
                          placeholder={`${lang === 'ar' ? 'ميزة' : 'Benefit'} ${i + 1}`}
                          className="flex-1 bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all placeholder-[#4a4e60]"
                        />
                      </div>
                    ))}
                    <button onClick={() => setBenefits(prev => [...prev, ''])}
                      className="text-xs text-[#3b82f6] hover:text-white transition-colors cursor-pointer ms-9">
                      + {tr.addBenefit}
                    </button>
                  </div>
                </Card>

                <Card title={tr.fullDescription} icon={<IconDoc />}>
                  <textarea
                    value={descriptionLong}
                    onChange={e => setDescriptionLong(e.target.value)}
                    rows={7}
                    placeholder={lang === 'ar' ? 'وصف تفصيلي للمنتج...' : 'Detailed product description...'}
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all resize-none placeholder-[#4a4e60]"
                  />
                </Card>
              </>
            )}

            {/* ──── MARKETING ──── */}
            {activeTab === 'marketing' && (
              <>
                <Card
                  title={lang === 'ar' ? 'العروض الترويجية' : 'Bundle Offers'}
                  subtitle={lang === 'ar' ? 'شجّع العملاء على شراء كميات أكبر' : 'Encourage customers to buy more'}
                  icon={<IconSparkles />}>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {offers.map(offer => {
                      const savings = parseFloat(price || '0') * offer.quantity - offer.price
                      return (
                        <div key={offer.id} className="relative group bg-[#0f1117] border border-[#2a2d35] hover:border-[#3b82f6]/40 rounded-2xl p-4 transition-all">
                          <button onClick={() => setOffers(prev => prev.filter(o => o.id !== offer.id))}
                            className="absolute top-2.5 end-2.5 w-5 h-5 rounded-full bg-[#2a2d35] hover:bg-[#f87171] text-[#8b8fa8] hover:text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer">✕</button>
                          <div className="text-4xl font-bold text-white mb-1">×{offer.quantity}</div>
                          <div className="text-lg font-bold text-[#4ade80]">{offer.price} <span className="text-sm font-normal text-[#8b8fa8]">{store?.currency}</span></div>
                          {savings > 0 && (
                            <div className="mt-2 inline-flex bg-[#14321f] border border-[#4ade80]/20 text-[#4ade80] text-xs px-2 py-1 rounded-lg font-medium">
                              {lang === 'ar' ? `وفر ${savings.toFixed(0)}` : `Save ${savings.toFixed(0)}`}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <div className="bg-[#0f1117] border border-dashed border-[#2a2d35] hover:border-[#3b82f6]/40 rounded-2xl p-4 space-y-2.5 transition-all">
                      <p className="text-xs text-[#4a4e60] font-medium">{lang === 'ar' ? 'عرض جديد' : 'New offer'}</p>
                      <input type="number" value={newOfferQty} onChange={e => setNewOfferQty(e.target.value)}
                        placeholder={lang === 'ar' ? 'الكمية (2+)' : 'Qty (2+)'} min="2"
                        className="w-full bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors placeholder-[#4a4e60]" />
                      <input type="number" value={newOfferPrice} onChange={e => setNewOfferPrice(e.target.value)}
                        placeholder={lang === 'ar' ? 'السعر' : 'Price'}
                        className="w-full bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors placeholder-[#4a4e60]" />
                      <button onClick={() => {
                        const q = parseInt(newOfferQty)
                        const p = parseFloat(newOfferPrice)
                        if (!q || q < 2 || !p || p <= 0) return
                        setOffers(prev => [...prev, { id: Date.now().toString(), quantity: q, price: p }])
                        setNewOfferQty('')
                        setNewOfferPrice('')
                      }}
                        className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm py-2 rounded-xl transition-colors font-medium cursor-pointer">
                        + {lang === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#4a4e60]">
                    {lang === 'ar' ? 'مثال: قطعتان بـ 170 ريال بدلاً من 200 ريال' : 'Example: 2 items for 170 SAR instead of 200 SAR'}
                  </p>
                </Card>

                <Card
                  title={lang === 'ar' ? 'Upsell' : 'Upsell'}
                  subtitle={lang === 'ar' ? 'اعرض منتجاً إضافياً للعميل' : 'Offer an extra product to customers'}
                  icon={<IconSparkles />}>

                  {!upsell ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button onClick={() => openUpsellModal('bump')}
                        className="flex flex-col gap-3 bg-[#0f1117] border border-[#2a2d35] hover:border-[#3b82f6] rounded-2xl p-5 text-start transition-all group cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-[#1e3a5c]/60 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] group-hover:bg-[#1e3a5c] transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M1 1.75A.75.75 0 0 1 1.75 1h1.628a1.75 1.75 0 0 1 1.734 1.51L5.18 3a65.25 65.25 0 0 1 13.36 1.412.75.75 0 0 1 .58.875 48.645 48.645 0 0 1-1.618 6.2.75.75 0 0 1-.712.513H6a2.503 2.503 0 0 0-2.292 1.5H17.25a.75.75 0 0 1 0 1.5H2.76a.75.75 0 0 1-.748-.807 4.002 4.002 0 0 1 2.716-3.486L3.626 2.716a.25.25 0 0 0-.248-.216H1.75A.75.75 0 0 1 1 1.75ZM6 17.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-[#60a5fa] transition-colors">Order Bump</p>
                          <p className="text-xs text-[#4a4e60] mt-1 leading-relaxed">{lang === 'ar' ? 'منتج إضافي يظهر قبل زر الشراء' : 'Extra product shown before the CTA'}</p>
                        </div>
                      </button>

                      <button onClick={() => openUpsellModal('post_purchase')}
                        className="flex flex-col gap-3 bg-[#0f1117] border border-[#2a2d35] hover:border-[#8b5cf6] rounded-2xl p-5 text-start transition-all group cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-[#2e1d5e]/60 border border-[#8b5cf6]/30 flex items-center justify-center text-[#8b5cf6] group-hover:bg-[#2e1d5e] transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-[#a78bfa] transition-colors">Post-purchase</p>
                          <p className="text-xs text-[#4a4e60] mt-1 leading-relaxed">{lang === 'ar' ? 'عرض يظهر بعد تأكيد الطلب' : 'Offer shown after order is confirmed'}</p>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#0f1117] border border-[#2a2d35] rounded-2xl overflow-hidden">
                      <div className={`h-1 ${upsell.type === 'bump' ? 'bg-gradient-to-r from-[#3b82f6] to-[#60a5fa]' : 'bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa]'}`} />
                      <div className="p-4 flex items-center gap-4">
                        {upsell.product_image && (
                          <img src={upsell.product_image} alt="" className="w-14 h-14 rounded-xl object-cover border border-[#2a2d35] shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-1.5 ${
                            upsell.type === 'bump' ? 'bg-[#1e3a5c] text-[#60a5fa]' : 'bg-[#2e1d5e] text-[#a78bfa]'
                          }`}>
                            {upsell.type === 'bump' ? 'Order Bump' : 'Post-purchase'}
                          </span>
                          <p className="text-sm font-semibold text-white truncate">{upsell.product_title}</p>
                          <p className="text-sm text-[#4ade80] font-medium">{upsell.sale_price} {store?.currency}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => openUpsellModal(upsell.type)}
                            className="text-xs font-medium text-[#8b8fa8] hover:text-white border border-[#2a2d35] hover:border-[#3b82f6] px-3 py-2 rounded-xl transition-all cursor-pointer">
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button onClick={() => setUpsell(null)}
                            className="text-xs font-medium text-[#f87171] hover:text-white border border-[#2a2d35] hover:border-[#f87171] px-3 py-2 rounded-xl transition-all cursor-pointer">
                            {lang === 'ar' ? 'حذف' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* ──── CREATIVES ──── */}
            {activeTab === 'creatives' && (
              <Card title={lang === 'ar' ? 'إبداعات الإعلان' : 'Ad Creatives'} icon={<IconFilm />}>
                <ProductCreativesSection
                  productId={String(params.id)}
                  lang={lang}
                  productImages={images}
                />
              </Card>
            )}

          </div>
        </div>
      </main>

      {/* ── Upsell product picker modal ── */}
      {showUpsellModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUpsellModal(false) }}>
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d35] shrink-0">
              <div>
                <p className="text-white font-semibold text-sm">
                  {upsellModalType === 'bump' ? 'Order Bump' : 'Post-purchase Upsell'}
                </p>
                <p className="text-xs text-[#4a4e60] mt-0.5">
                  {upsellModalStep === 'pick'
                    ? (lang === 'ar' ? 'اختر المنتج الذي سيُعرض' : 'Pick the product to offer')
                    : (lang === 'ar' ? 'حدد سعر البيع الخاص' : 'Set the special sale price')}
                </p>
              </div>
              <button onClick={() => setShowUpsellModal(false)} className="text-[#4a4e60] hover:text-white text-xl transition-colors cursor-pointer">✕</button>
            </div>

            {upsellModalStep === 'pick' ? (
              <>
                <div className="px-4 py-3 border-b border-[#2a2d35] shrink-0">
                  <input
                    autoFocus
                    value={upsellSearch}
                    onChange={e => setUpsellSearch(e.target.value)}
                    placeholder={lang === 'ar' ? 'ابحث عن منتج...' : 'Search products...'}
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {loadingUpsellProducts && <div className="py-10 text-center text-[#4a4e60] text-sm">Loading...</div>}
                  {!loadingUpsellProducts && upsellProducts.length === 0 && (
                    <div className="py-10 text-center text-[#4a4e60] text-sm">
                      {lang === 'ar' ? 'لا توجد منتجات أخرى في متجرك' : 'No other active products in your store'}
                    </div>
                  )}
                  {upsellProducts
                    .filter(p => !upsellSearch || p.title?.toLowerCase().includes(upsellSearch.toLowerCase()))
                    .map(p => (
                      <div key={p.id} onClick={() => setUpsellPickedProduct(p)}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-[#2a2d35] last:border-0 cursor-pointer transition-colors ${upsellPickedProduct?.id === p.id ? 'bg-[#1a3a5c]' : 'hover:bg-[#1f2229]'}`}>
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
                          : <div className="w-10 h-10 rounded-lg bg-[#0f1117] border border-[#2a2d35] shrink-0 flex items-center justify-center text-lg">📦</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{p.title}</p>
                          <p className="text-xs text-[#4a4e60]">{p.price} {store?.currency}</p>
                        </div>
                        {upsellPickedProduct?.id === p.id && <span className="text-[#4ade80] text-sm shrink-0">✓</span>}
                      </div>
                    ))}
                </div>
                <div className="px-4 py-3 border-t border-[#2a2d35] shrink-0">
                  <button
                    onClick={() => { if (upsellPickedProduct) { setUpsellSalePrice(''); setUpsellModalStep('price') } }}
                    disabled={!upsellPickedProduct}
                    className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors cursor-pointer">
                    {lang === 'ar' ? 'التالي ←' : 'Next →'}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-[#0f1117] border border-[#2a2d35] rounded-xl p-3">
                  {upsellPickedProduct?.images?.[0] && (
                    <img src={upsellPickedProduct.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover border border-[#2a2d35] shrink-0" />
                  )}
                  <div>
                    <p className="text-sm text-white font-medium">{upsellPickedProduct?.title}</p>
                    <p className="text-xs text-[#4a4e60]">{lang === 'ar' ? 'السعر الأصلي:' : 'Original price:'} {upsellPickedProduct?.price} {store?.currency}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8b8fa8] mb-1.5 block">
                    {lang === 'ar' ? `سعر البيع الخاص (${store?.currency})` : `Special sale price (${store?.currency})`}
                  </label>
                  <input
                    autoFocus type="number" value={upsellSalePrice} onChange={e => setUpsellSalePrice(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: 25' : 'e.g. 25'}
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                  {upsellSalePrice && upsellPickedProduct && parseFloat(upsellSalePrice) < upsellPickedProduct.price && (
                    <p className="mt-1.5 text-xs text-[#4ade80]">
                      {lang === 'ar'
                        ? `العميل يوفر ${(upsellPickedProduct.price - parseFloat(upsellSalePrice)).toFixed(0)} ${store?.currency}`
                        : `Customer saves ${(upsellPickedProduct.price - parseFloat(upsellSalePrice)).toFixed(0)} ${store?.currency}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setUpsellModalStep('pick')}
                    className="flex-1 bg-[#1f2229] hover:bg-[#2a2d35] border border-[#2a2d35] text-[#8b8fa8] hover:text-white text-sm py-2.5 rounded-xl transition-colors cursor-pointer">
                    {lang === 'ar' ? '→ رجوع' : '← Back'}
                  </button>
                  <button onClick={confirmUpsell}
                    disabled={!upsellSalePrice || parseFloat(upsellSalePrice) <= 0}
                    className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors cursor-pointer">
                    {lang === 'ar' ? '✓ حفظ العرض' : '✓ Save offer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2a2d35]">
        {icon && <span className="text-[#3b82f6] shrink-0">{icon}</span>}
        <div>
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-[#4a4e60] text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-[#8b8fa8] mb-2 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all placeholder-[#4a4e60]"
      />
    </div>
  )
}
