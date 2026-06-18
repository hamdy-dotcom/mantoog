import { createClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/auth/client'
import type { ProductCreativeItem } from '@/lib/product-creatives/types'

export const CREATIVE_BUCKET = 'store-assets'

/** Capture first frame of a video file as JPEG data URL (best-effort). */
export async function captureVideoThumbnail(file: File): Promise<string | null> {
  if (!file.type.startsWith('video/')) return null
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    video.src = url

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.remove()
    }

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration / 2 || 0)
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 568
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        cleanup()
        resolve(dataUrl)
      } catch {
        cleanup()
        resolve(null)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }
  })
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}

export function formatHttpError(res: Response, rawText: string): string {
  const trimmed = rawText.trim()
  if (res.status === 413 || /entity too large/i.test(trimmed)) {
    return 'File too large — try a smaller video or raise the storage bucket limit.'
  }
  if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed
  }
  return res.statusText || `Request failed (${res.status})`
}

export async function parseJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const rawText = await res.text()
  try {
    return JSON.parse(rawText) as T
  } catch {
    throw new Error(formatHttpError(res, rawText))
  }
}

export type UploadedCreativeFile = {
  url: string
  thumbnail_url: string | null
  type: 'video' | 'image'
  name: string
}

/** Upload creative media directly to Supabase Storage (bypasses Next.js body size limits). */
export async function uploadCreativeToStorage(opts: {
  productId: string
  file: File
  thumbnailFile?: File | null
}): Promise<UploadedCreativeFile> {
  const supabase = createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('Unauthorized')

  const type = opts.file.type.startsWith('video/') ? 'video' : 'image'
  const ext = opts.file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg')
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const path = `products/${user.id}-creative-${opts.productId}-${stamp}.${ext}`

  const { error: uploadError } = await supabase.storage.from(CREATIVE_BUCKET).upload(path, opts.file, {
    contentType: opts.file.type || undefined,
    upsert: false,
  })
  if (uploadError) throw new Error(uploadError.message)

  const { data: pub } = supabase.storage.from(CREATIVE_BUCKET).getPublicUrl(path)
  let thumbnail_url: string | null = type === 'image' ? pub.publicUrl : null

  if (opts.thumbnailFile) {
    const thumbPath = `products/${user.id}-creative-${opts.productId}-${stamp}-thumb.jpg`
    const { error: thumbErr } = await supabase.storage.from(CREATIVE_BUCKET).upload(thumbPath, opts.thumbnailFile, {
      contentType: 'image/jpeg',
    })
    if (!thumbErr) {
      thumbnail_url = supabase.storage.from(CREATIVE_BUCKET).getPublicUrl(thumbPath).data.publicUrl
    }
  }

  return {
    url: pub.publicUrl,
    thumbnail_url,
    type,
    name: opts.file.name,
  }
}

export async function registerCreativeUpload(
  productId: string,
  upload: UploadedCreativeFile,
): Promise<ProductCreativeItem> {
  const res = await fetch(`/api/products/${productId}/creatives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'register_upload',
      url: upload.url,
      thumbnail_url: upload.thumbnail_url,
      name: upload.name,
      type: upload.type,
    }),
  })
  const data = await parseJsonResponse<{ item?: ProductCreativeItem; error?: string }>(res)
  if (!res.ok) throw new Error(data.error || 'upload_failed')
  if (!data.item) throw new Error('upload_failed')
  return data.item
}

/** Upload file to storage, then register the creative row via API. */
export async function uploadAndRegisterCreative(productId: string, file: File): Promise<ProductCreativeItem> {
  let thumbnailFile: File | null = null
  if (file.type.startsWith('video/')) {
    const thumbData = await captureVideoThumbnail(file)
    if (thumbData) {
      thumbnailFile = await dataUrlToFile(thumbData, 'thumb.jpg')
    }
  }

  const uploaded = await uploadCreativeToStorage({ productId, file, thumbnailFile })
  return registerCreativeUpload(productId, uploaded)
}
