'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { captureVideoThumbnail, dataUrlToFile } from '@/lib/product-creatives/client'
import type { ProductCreativeItem } from '@/lib/product-creatives/types'

const MAX_VIDEO_SELECTION = 5

type Props = {
  productId: string
  lang: string
  dir?: string
  /** video = multi video (max 5); image = single image; carousel = multi image */
  mode: 'video' | 'image' | 'carousel'
  selectedIds: string[]
  onChange: (ids: string[], items: ProductCreativeItem[]) => void
  /** Show inline upload for "my own footage" */
  allowUpload?: boolean
  uploadLabel?: string
  onUploadingChange?: (uploading: boolean) => void
}

export default function ProductCreativePicker({
  productId,
  lang,
  dir = 'ltr',
  mode,
  selectedIds,
  onChange,
  allowUpload = false,
  uploadLabel,
  onUploadingChange,
}: Props) {
  const [items, setItems] = useState<ProductCreativeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewItem, setPreviewItem] = useState<ProductCreativeItem | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/products/${productId}/creatives`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'load_failed')
      const all = (data.items || []) as ProductCreativeItem[]
      const filtered = all.filter(i => {
        if (mode === 'video') return i.type === 'video'
        return i.type === 'image'
      })
      setItems(filtered)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'load_failed')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [productId, mode])

  useEffect(() => { load() }, [load])

  const applySelection = (nextIds: string[]) => {
    const picked = items.filter(i => nextIds.includes(i.id))
    onChange(nextIds, picked)
  }

  const toggleSelect = (item: ProductCreativeItem) => {
    if (mode === 'carousel') {
      const next = selectedIds.includes(item.id)
        ? selectedIds.filter(id => id !== item.id)
        : [...selectedIds, item.id].slice(0, 10)
      applySelection(next)
      return
    }

    if (mode === 'video') {
      if (selectedIds.includes(item.id)) {
        applySelection(selectedIds.filter(id => id !== item.id))
        return
      }
      if (selectedIds.length >= MAX_VIDEO_SELECTION) return
      applySelection([...selectedIds, item.id])
      return
    }

    applySelection([item.id])
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    onUploadingChange?.(true)
    setError('')
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('name', file.name)
      if (file.type.startsWith('video/')) {
        const thumbData = await captureVideoThumbnail(file)
        if (thumbData) {
          form.set('thumbnail', await dataUrlToFile(thumbData, 'thumb.jpg'))
        }
      }

      const res = await fetch(`/api/products/${productId}/creatives`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'upload_failed')

      const item = data.item as ProductCreativeItem
      await load()

      if (mode === 'video') {
        const next = selectedIds.includes(item.id)
          ? selectedIds
          : [...selectedIds, item.id].slice(0, MAX_VIDEO_SELECTION)
        const mergedItems = [...items.filter(i => next.includes(i.id)), item]
          .filter((v, idx, arr) => arr.findIndex(x => x.id === v.id) === idx)
        onChange(next, mergedItems.filter(i => next.includes(i.id)))
      } else {
        onChange([item.id], [item])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'upload_failed')
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const accept = mode === 'video' ? 'video/*' : 'image/*'
  const emptyMsg = mode === 'video'
    ? (lang === 'ar' ? 'لا يوجد فيديو — ارفع من صفحة المنتج أو هنا' : 'No videos — upload on product page or below')
    : (lang === 'ar' ? 'لا توجد صور — ارفع من صفحة المنتج' : 'No images — upload on product page')

  const videoCount = mode === 'video' ? selectedIds.length : 0

  return (
    <div className="space-y-3" dir={dir}>
      {allowUpload && (
        <label className={`flex flex-col items-center justify-center gap-2 border border-dashed rounded-xl px-4 py-5 cursor-pointer transition-colors ${
          uploading
            ? 'border-[#2a2d35] opacity-60 pointer-events-none'
            : 'border-[#2a2d35] hover:border-[#3b82f6] bg-[#0f1117]'
        }`}>
          <span className="text-xl">📤</span>
          <span className="text-xs text-[#8b8fa8]">
            {uploading
              ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...')
              : (uploadLabel || (lang === 'ar' ? 'اضغط لرفع فيديو' : 'Click to upload video'))}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) uploadFile(f)
            }}
          />
        </label>
      )}

      {mode === 'video' && (
        <p className="text-[10px] text-[#4a4e60]">
          {lang === 'ar'
            ? 'يعمل TikTok بشكل أفضل مع 3–5 إعلانات في المجموعة.'
            : 'TikTok works best with 3–5 ads per group.'}
        </p>
      )}

      {error && <p className="text-xs text-[#f87171]">{error}</p>}

      {loading ? (
        <p className="text-xs text-[#8b8fa8] animate-pulse py-2">
          {lang === 'ar' ? 'جاري تحميل الإبداعات...' : 'Loading creatives...'}
        </p>
      ) : items.length === 0 ? (
        <p className="text-xs text-[#8b8fa8] py-3 text-center border border-[#2a2d35] rounded-lg">
          {emptyMsg}
        </p>
      ) : mode === 'video' ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
          {items.map(item => {
            const selected = selectedIds.includes(item.id)
            const atMax = !selected && selectedIds.length >= MAX_VIDEO_SELECTION
            const thumb = item.thumbnail_url || null
            return (
              <div
                key={item.id}
                className={`relative rounded-md overflow-hidden border transition-all ${
                  selected ? 'border-[#3b82f6] ring-1 ring-[#3b82f6]/40' : 'border-[#2a2d35]'
                } ${atMax ? 'opacity-50' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setPreviewItem(item)}
                  className="block w-full aspect-[3/4] bg-[#1a1d24] hover:opacity-90 transition-opacity"
                  aria-label={lang === 'ar' ? 'معاينة الفيديو' : 'Preview video'}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-7 h-7 rounded-full bg-black/55 flex items-center justify-center text-white text-[10px]">
                      ▶
                    </span>
                  </span>
                </button>

                <label
                  className="absolute top-1 start-1 z-10 flex items-center justify-center w-5 h-5 rounded bg-[#0f1117]/90 border border-[#2a2d35] cursor-pointer"
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={atMax}
                    onChange={() => toggleSelect(item)}
                    className="w-3 h-3 accent-[#3b82f6] cursor-pointer disabled:cursor-not-allowed"
                  />
                </label>

                {(item.tiktok_video_id || item.tiktok_image_id) && (
                  <span className="absolute top-1 end-1 text-[7px] bg-[#14321f] text-[#4ade80] px-1 rounded leading-tight">
                    ✓
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
          {items.map(item => {
            const selected = selectedIds.includes(item.id)
            const thumb = item.thumbnail_url || (item.type === 'image' ? item.url : null)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleSelect(item)}
                className={`relative rounded-md overflow-hidden border-2 transition-all ${
                  selected ? 'border-[#3b82f6] ring-1 ring-[#3b82f6]/30' : 'border-[#2a2d35] hover:border-[#3b82f6]/50'
                }`}
              >
                <div className="aspect-square bg-[#1a1d24]">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🖼</div>
                  )}
                </div>
                {(item.tiktok_video_id || item.tiktok_image_id) && (
                  <span className="absolute top-1 end-1 text-[7px] bg-[#14321f] text-[#4ade80] px-1 rounded">
                    ✓
                  </span>
                )}
                {selected && (
                  <span className="absolute bottom-0 inset-x-0 text-center text-[8px] bg-[#3b82f6] text-white py-0.5">
                    {lang === 'ar' ? '✓' : '✓'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {mode === 'video' && videoCount > 0 && (
        <p className="text-[10px] text-[#8b8fa8]">
          {lang === 'ar'
            ? `${videoCount} فيديو محدد → ${videoCount} إعلان`
            : `${videoCount} video${videoCount === 1 ? '' : 's'} selected → ${videoCount} ad${videoCount === 1 ? '' : 's'}`}
        </p>
      )}

      {mode === 'carousel' && selectedIds.length > 0 && (
        <p className="text-[10px] text-[#4a4e60]">
          {lang === 'ar'
            ? `${selectedIds.length} صورة محددة (حد أقصى 10)`
            : `${selectedIds.length} images selected (max 10)`}
        </p>
      )}

      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          dir={dir}
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative w-full max-w-sm bg-[#1a1d24] border border-[#2a2d35] rounded-2xl overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2d35]">
              <p className="text-xs text-[#8b8fa8] truncate pe-2">
                {previewItem.name || (lang === 'ar' ? 'معاينة الفيديو' : 'Video preview')}
              </p>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-[#8b8fa8] hover:text-white text-sm px-2 py-1 rounded"
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
              >
                ✕
              </button>
            </div>
            <video
              key={previewItem.url}
              src={previewItem.url}
              controls
              autoPlay
              playsInline
              className="w-full max-h-[70vh] bg-black object-contain"
            />
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[#2a2d35]">
              <span className="text-[10px] text-[#4a4e60]">
                {selectedIds.includes(previewItem.id)
                  ? (lang === 'ar' ? 'محدد للإطلاق' : 'Selected for launch')
                  : (lang === 'ar' ? 'غير محدد' : 'Not selected')}
              </span>
              <button
                type="button"
                onClick={() => {
                  toggleSelect(previewItem)
                }}
                disabled={!selectedIds.includes(previewItem.id) && selectedIds.length >= MAX_VIDEO_SELECTION}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#3b82f6] text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedIds.includes(previewItem.id)
                  ? (lang === 'ar' ? 'إلغاء التحديد' : 'Deselect')
                  : (lang === 'ar' ? 'تحديد' : 'Select')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
