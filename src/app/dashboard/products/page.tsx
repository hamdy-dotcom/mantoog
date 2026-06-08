'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

export default function ProductsPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('merchant_id', user.id)
        .single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)

      const { data: productsData } = await supabase
        .from('products')
        .select('*, landing_pages(id, published)')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })
      setProducts(productsData || [])
      setLoading(false)
    }
    init()
  }, [])

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

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{tr.productsTitle}</h1>
            <p className="text-[#8b8fa8] text-sm mt-1">{products.length} product{products.length !== 1 ? 's' : ''} in your store</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/products/new')}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {tr.addNew}
          </button>
        </div>

        {/* Empty state */}
        {products.length === 0 ? (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-white font-medium text-lg mb-2">{tr.noProducts}</h2>
            <p className="text-[#8b8fa8] text-sm mb-6">{tr.noProductsDesc}</p>
            <button
              onClick={() => router.push('/dashboard/products/new')}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              {tr.addNew}
            </button>
          </div>
        ) : (
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#2a2d35]">
              <span className="col-span-4 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">Product</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">Price</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">Landing page</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider">Status</span>
              <span className="col-span-2 text-xs font-medium text-[#4a4e60] uppercase tracking-wider"></span>
            </div>

            {/* Products */}
            {products.map(product => (
              <div key={product.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-[#2a2d35] last:border-0 hover:bg-[#1f2229] transition-colors items-center">

                {/* Product info */}
                <div className="col-span-4 flex items-center gap-3">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} className="w-10 h-10 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#0f1117] border border-[#2a2d35] flex items-center justify-center text-[#4a4e60] text-xs shrink-0">📦</div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{product.title}</div>
                    <div className="text-xs text-[#4a4e60] mt-0.5">
                      {product.source_platform === 'url' ? '🔗 URL import' : '✏️ Manual'}
                      {product.ai_generated && ' · ✦ AI'}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-2">
                  <div className="text-sm text-white">{product.price} {product.currency}</div>
                  {product.compare_at_price && (
                    <div className="text-xs text-[#4a4e60] line-through">{product.compare_at_price} {product.currency}</div>
                  )}
                </div>

                {/* Landing page */}
                <div className="col-span-2">
                  {product.landing_pages?.length > 0 ? (
                    <span className="bg-[#14321f] text-[#4ade80] text-xs font-medium px-2 py-1 rounded-full">
                      {product.landing_pages[0].published ? '● Live' : '○ Draft'}
                    </span>
                  ) : (
                    <span className="bg-[#1f2229] text-[#8b8fa8] text-xs font-medium px-2 py-1 rounded-full">No page</span>
                  )}
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    product.status === 'active'
                      ? 'bg-[#14321f] text-[#4ade80]'
                      : product.status === 'draft'
                      ? 'bg-[#1f2229] text-[#8b8fa8]'
                      : 'bg-[#3a1414] text-[#f87171]'
                  }`}>
                    {product.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end items-center gap-3">
                  <button
                    onClick={() => window.open(`/${store.slug}/${product.id}`, '_blank')}
                    className="text-xs font-medium bg-[#1a3a5c] text-[#60a5fa] hover:bg-[#3b82f6] hover:text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {tr.productPage}
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                    className="text-xs text-[#8b8fa8] hover:text-white transition-colors"
                  >
                    {tr.edit}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
