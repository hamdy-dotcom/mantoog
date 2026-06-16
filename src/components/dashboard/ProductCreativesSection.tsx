'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { captureVideoThumbnail, dataUrlToFile } from '@/lib/product-creatives/client'
import { isVirtualCreativeId, type ProductCreativeItem } from '@/lib/product-creatives/types'

type Props = {
  productId: string
  lang: string
  productImages?: string[]
}

export default function ProductCreativesSection({ productId, lang, productImages = [] }: Props) {
  const [items, setItems] = useState<ProductCreativeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/products/${productId}/creatives`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'load_failed')
      setItems(data.items || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'load_failed')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => { load() }, [load])

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('name', file.name)

      if (file.type.startsWith('video/')) {
        const thumbData = await captureVideoThumbnail(file)
        if (thumbData) {
          const thumbFile = await dataUrlToFile(thumbData, 'thumb.jpg')
          form.set('thumbnail', thumbFile)
        }
      }

      const res = await fetch(`/api/products/${productId}/creatives`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'upload_failed')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'upload_failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const registerProductMedia = async (url: string) => {
    setError('')
    try {
      const res = await fetch(`/api/products/${productId}/creatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_product_media', url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'register_failed')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'register_failed')
    }
  }

  const deleteCreative = async (id: string) => {
    if (isVirtualCreativeId(id)) return
    if (!confirm(lang === 'ar' ? 'حذف هذا الإبداع؟' : 'Delete this creative?')) return
    setError('')
    try {
      const res = await fetch(`/api/products/${productId}/creatives/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'delete_failed')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'delete_failed')
    }
  }

  const unregisteredImages = productImages.filter(
    url => url && !items.some(i => i.url === url)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#8b8fa8]">
          {lang === 'ar'
            ? 'ارفع فيديوهات وصور لاستخدامها في إعلانات TikTok'
            : 'Upload videos and images for TikTok ads'}
        </p>
        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
          uploading ? 'bg-[#2a2d35] text-[#8b8fa8] pointer-events-none' : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
        }`}>
          {uploading
            ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...')
            : (lang === 'ar' ? '+ رفع إبداع' : '+ Upload creative')}
          <input
            ref={fileRef}
            type="file"
            accept="video/*,image/*"
            className="hidden"
            disabled={uploading}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) uploadFile(f)
            }}
          />
        </label>
      </div>

      {error && (
        <p className="text-xs text-[#f87171]">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[#8b8fa8] animate-pulse py-4">
          {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#8b8fa8] py-4 text-center border border-dashed border-[#2a2d35] rounded-xl">
          {lang === 'ar' ? 'لا توجد إبداعات بعد — ارفع فيديو أو صورة' : 'No creatives yet — upload a video or image'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map(item => (
            <CreativeCard
              key={item.id}
              item={item}
              lang={lang}
              onDelete={() => deleteCreative(item.id)}
            />
          ))}
        </div>
      )}

      {unregisteredImages.length > 0 && (
        <div className="border-t border-[#2a2d35] pt-4 space-y-2">
          <p className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
            {lang === 'ar' ? 'صور المنتج الحالية' : 'Product images (add to library)'}
          </p>
          <div className="flex flex-wrap gap-2">
            {unregisteredImages.map(url => (
              <button
                key={url}
                type="button"
                onClick={() => registerProductMedia(url)}
                className="relative group w-20 h-20 rounded-lg overflow-hidden border border-[#2a2d35] hover:border-[#3b82f6] transition-colors"
                title={lang === 'ar' ? 'إضافة للمكتبة' : 'Add to library'}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-lg transition-opacity">
                  +
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreativeCard({
  item,
  lang,
  onDelete,
}: {
  item: ProductCreativeItem
  lang: string
  onDelete: () => void
}) {
  const thumb = item.thumbnail_url || (item.type === 'image' ? item.url : null)
  const cached = item.tiktok_video_id || item.tiktok_image_id

  return (
    <div className="relative rounded-xl border border-[#2a2d35] bg-[#0f1117] overflow-hidden group">
      <div className={`${item.type === 'video' ? 'aspect-[9/16]' : 'aspect-square'} bg-[#1a1d24] flex items-center justify-center`}>
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">{item.type === 'video' ? '🎬' : '🖼️'}</span>
        )}
        {item.type === 'video' && (
          <span className="absolute top-2 start-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
            {lang === 'ar' ? 'فيديو' : 'Video'}
          </span>
        )}
        {cached && (
          <span className="absolute top-2 end-2 text-[10px] bg-[#14321f] text-[#4ade80] px-1.5 py-0.5 rounded" title="TikTok cached">
            TikTok ✓
          </span>
        )}
        {item.virtual && (
          <span className="absolute bottom-2 start-2 text-[10px] bg-[#3a2800] text-[#fbbf24] px-1.5 py-0.5 rounded">
            {lang === 'ar' ? 'صورة منتج' : 'Product'}
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-[10px] text-[#8b8fa8] truncate" title={item.name || item.url}>
          {item.name || (item.type === 'video' ? 'Video' : 'Image')}
        </p>
      </div>
      {!item.virtual && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2 end-2 w-6 h-6 rounded-full bg-[#f87171] text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          aria-label="Delete"
        >
          ×
        </button>
      )}
    </div>
  )
}
