import { isTikTokHttpError, tiktokGet } from '@/lib/tiktok/mutations'
import type { CreateAdWizardPayload } from '@/lib/tiktok/create-ad/types'

type Connection = { advertiser_id: string; access_token: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function readStringField(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]
    if (value == null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return null
}

function sanitizeMaterialName(value: string): string {
  return value
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function urlDerivedFileName(url: string): string {
  try {
    const path = new URL(url).pathname
    const base = path.split('/').filter(Boolean).pop() || 'video'
    return base.split('?')[0] || 'video'
  } catch {
    const base = url.split('/').filter(Boolean).pop() || 'video'
    return base.split('?')[0] || 'video'
  }
}

export function materialBaseName(
  payload: CreateAdWizardPayload,
  opts?: { url?: string | null; fileName?: string | null; kind?: 'video' | 'image'; index?: number }
): string {
  const product = sanitizeMaterialName(payload.product.title || 'product')
  const suffix = opts?.kind === 'image' ? `img-${(opts.index ?? 0) + 1}` : 'video'
  if (opts?.fileName) {
    return sanitizeMaterialName(`${product}-${opts.fileName}`)
  }
  if (opts?.url) {
    return sanitizeMaterialName(`${product}-${urlDerivedFileName(opts.url)}`)
  }
  return sanitizeMaterialName(`${product}-${suffix}`)
}

/** TikTok file_name max 100 chars — append short unique suffix to avoid 40911 collisions. */
export function uniqueMaterialName(base: string): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const maxBase = Math.max(1, 100 - suffix.length - 1)
  const trimmedBase = sanitizeMaterialName(base).slice(0, maxBase) || 'creative'
  return `${trimmedBase}-${suffix}`.slice(0, 100)
}

function extractSearchRows(data: unknown): Record<string, unknown>[] {
  if (data == null) return []
  if (Array.isArray(data)) return data.filter(isRecord)
  if (!isRecord(data)) return []

  for (const key of ['list', 'videos', 'video_list', 'materials']) {
    const nested = data[key]
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

function searchHasMore(data: unknown, page: number, rowCount: number): boolean {
  if (!isRecord(data)) return false
  const pageInfo = data.page_info
  if (isRecord(pageInfo)) {
    const totalPage = Number(pageInfo.total_page)
    const currentPage = Number(pageInfo.page)
    if (Number.isFinite(totalPage) && Number.isFinite(currentPage)) {
      return currentPage < totalPage
    }
    if (pageInfo.has_more === true) return true
  }
  return rowCount >= 20
}

function fileNameMatches(
  fileName: string | null,
  hints: { baseNames: string[]; urlBasename?: string; uploadFileName?: string }
): boolean {
  if (!fileName) return false
  if (hints.uploadFileName && fileName === hints.uploadFileName) return true
  if (hints.urlBasename && fileName === hints.urlBasename) return true
  return hints.baseNames.some(base => {
    if (!base) return false
    return fileName === base
  })
}

/** TikTok documents GET /file/video/ad/search/ — not POST. */
async function searchVideoMaterialPages(
  connection: Connection,
  hints: { baseNames: string[]; urlBasename?: string; sourceUrl?: string; uploadFileName?: string }
): Promise<string | null> {
  const path = '/file/video/ad/search/'
  const normalizedSource = hints.sourceUrl?.trim() || null

  for (let page = 1; page <= 5; page++) {
    const json = await tiktokGet(connection, path, {
      page: String(page),
      page_size: '20',
    })

    if (isTikTokHttpError(json)) {
      console.error('[tiktok/create/creative_search] video search HTTP error', json)
      return null
    }
    if (json.code !== 0) {
      console.error('[tiktok/create/creative_search] video search API error', {
        path,
        method: 'GET',
        code: json.code,
        message: json.message,
        request_id: json.request_id,
      })
      return null
    }

    const rows = extractSearchRows(json.data)
    for (const row of rows) {
      const materialId = readStringField(row, ['video_id', 'id'])
      const fileName = readStringField(row, ['file_name', 'video_name', 'name'])
      const materialUrl = readStringField(row, ['video_url', 'preview_url', 'url'])

      if (!materialId) continue

      if (normalizedSource && materialUrl && materialUrl.trim() === normalizedSource) {
        return materialId
      }
      if (fileNameMatches(fileName, hints)) {
        return materialId
      }
    }

    if (!searchHasMore(json.data, page, rows.length)) break
  }

  return null
}

export async function searchExistingVideoId(
  connection: Connection,
  hints: { baseNames: string[]; urlBasename?: string; sourceUrl?: string; uploadFileName?: string }
): Promise<string | null> {
  return searchVideoMaterialPages(connection, hints)
}

/**
 * TikTok has no /file/image/ad/search/ endpoint (only /file/image/ad/info/ by known ids).
 * Image dedup relies on cached tiktok_image_id and unique file_name on upload.
 */
export async function searchExistingImageId(
  _connection: Connection,
  _hints: { baseNames: string[]; urlBasename?: string; sourceUrl?: string }
): Promise<string | null> {
  return null
}
