import { asTikTokHttpError, isTikTokHttpError, parseTikTokResponse, tiktokGet, tiktokPost } from '@/lib/tiktok/mutations'
import { buildCreateFlowError, buildTikTokHttpFlowError, logTikTokCreateCall, type CreateFlowError, type TikTokRawResponse } from '@/lib/tiktok/create-ad/errors'
import type { CreateAdWizardPayload, CtaType } from '@/lib/tiktok/create-ad/types'
import {
  resolveCreativeSelection,
  type ResolvedCreativeMedia,
} from '@/lib/product-creatives/server'
import type { ProductCreativeItem } from '@/lib/product-creatives/types'
import { TIKTOK } from '@/lib/tiktok/server'
import {
  materialBaseName,
  searchExistingImageId,
  searchExistingVideoId,
  uniqueMaterialName,
  urlDerivedFileName,
} from '@/lib/tiktok/create-ad/creative-material'

type Connection = { advertiser_id: string; access_token: string }

const TIKTOK_UPLOAD_BY_URL = 'UPLOAD_BY_URL'
const TIKTOK_UPLOAD_BY_FILE = 'UPLOAD_BY_FILE'

const VIDEO_POLL_DELAYS_MS = [0, 1500, 2000, 3000, 4000, 5000]
/** Poll /file/video/ad/info/ for poster_url — TikTok often returns it async after upload. */
const POSTER_POLL_DELAYS_MS = [0, 2000, 2000, 2000, 2000, 2000, 2000, 2000]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

/** First upload result row — TikTok often returns `data` as an array, or `data.list[0]`. */
function firstUploadRow(data: unknown): Record<string, unknown> | null {
  if (data == null) return null

  if (Array.isArray(data)) {
    const row = data.find(isRecord)
    return row ?? null
  }

  if (!isRecord(data)) return null

  for (const key of ['list', 'results', 'videos', 'video_list', 'image_list']) {
    const nested = data[key]
    if (Array.isArray(nested)) {
      const row = nested.find(isRecord)
      if (row) return row
    }
  }

  return data
}

type ParsedVideoUpload = {
  video_id: string | null
  poster_url: string | null
  material_id: string | null
  status: string | null
  probe_id: string | null
}

function parseVideoUploadResponse(data: unknown): ParsedVideoUpload {
  const row = firstUploadRow(data)
  if (!row) {
    return { video_id: null, poster_url: null, material_id: null, status: null, probe_id: null }
  }

  const video_id = readStringField(row, ['video_id', 'videoId'])
  const material_id = readStringField(row, ['material_id', 'materialId'])
  const probe_id = readStringField(row, ['id'])
  const poster_url = readStringField(row, ['poster_url', 'video_cover_url', 'cover_url'])
  const status = readStringField(row, [
    'status',
    'process_status',
    'upload_status',
    'video_status',
    'displayable',
  ])

  return {
    video_id: video_id || probe_id,
    poster_url,
    material_id,
    probe_id,
    status,
  }
}

function parseImageUploadResponse(data: unknown): string | null {
  const row = firstUploadRow(data)
  if (!row) return null
  return readStringField(row, ['image_id', 'imageId', 'id', 'material_id'])
}

function logVideoUploadRawResponse(step: string, json: TikTokRawResponse) {
  console.error(`[tiktok/create/${step}] video upload raw response`, {
    code: json.code,
    message: json.message,
    request_id: json.request_id,
    data: json.data,
    full: json,
  })
}

function isVideoStillProcessing(status: string | null): boolean {
  if (!status) return false
  return /PROCESS|PENDING|UPLOAD|WAIT|AUDIT/i.test(status)
}

async function pollVideoIdFromInfo(
  connection: Connection,
  candidateIds: string[]
): Promise<string | null> {
  const ids = [...new Set(candidateIds.map(id => id.trim()).filter(Boolean))]
  if (!ids.length) return null

  for (let attempt = 0; attempt < VIDEO_POLL_DELAYS_MS.length; attempt++) {
    const delay = VIDEO_POLL_DELAYS_MS[attempt]
    if (delay > 0) await sleep(delay)

    const json = await getLogged(
      connection,
      'creative_upload_video_info',
      '/file/video/ad/info/',
      { video_ids: JSON.stringify(ids) }
    )
    if (isTikTokHttpError(json) || json.code !== 0) continue

    const row = firstUploadRow(json.data)
    if (!row) continue

    const video_id = readStringField(row, ['video_id', 'videoId', 'id'])
    const status = readStringField(row, ['status', 'process_status', 'displayable', 'audit_status'])

    if (video_id && !isVideoStillProcessing(status)) {
      return video_id
    }
    if (video_id && attempt === VIDEO_POLL_DELAYS_MS.length - 1) {
      return video_id
    }
  }

  return null
}

function extractVideoInfoRows(data: unknown): Record<string, unknown>[] {
  if (data == null) return []
  if (Array.isArray(data)) return data.filter(isRecord)
  if (!isRecord(data)) return []

  for (const key of ['list', 'videos', 'video_list', 'results']) {
    const nested = data[key]
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }

  return [data]
}

function findVideoInfoRow(rows: Record<string, unknown>[], video_id: string): Record<string, unknown> | null {
  const normalized = video_id.trim()
  if (normalized) {
    const match = rows.find(row => {
      const id = readStringField(row, ['video_id', 'videoId', 'id'])
      return id === normalized
    })
    if (match) return match
  }
  return rows[0] ?? null
}

function posterUrlFromVideoInfoRow(row: Record<string, unknown>): string | null {
  return readStringField(row, ['poster_url', 'video_cover_url', 'cover_url'])
}

async function pollVideoPosterUrl(
  connection: Connection,
  video_id: string
): Promise<string | null> {
  const ids = [video_id.trim()].filter(Boolean)
  if (!ids.length) return null

  for (let attempt = 0; attempt < POSTER_POLL_DELAYS_MS.length; attempt++) {
    const delay = POSTER_POLL_DELAYS_MS[attempt]
    if (delay > 0) await sleep(delay)

    const json = await getLogged(
      connection,
      'creative_upload_video_info',
      '/file/video/ad/info/',
      { video_ids: JSON.stringify(ids) }
    )

    console.error(
      `[tiktok/create/creative_upload_video_info] poster_url poll attempt ${attempt + 1}/${POSTER_POLL_DELAYS_MS.length}`,
      {
        video_id,
        delay_ms: delay,
        code: json.code,
        message: json.message,
        request_id: json.request_id,
        data: json.data,
        full: json,
      }
    )

    if (isTikTokHttpError(json) || json.code !== 0) continue

    const rows = extractVideoInfoRows(json.data)
    const row = findVideoInfoRow(rows, video_id)
    if (!row) continue

    const poster_url = posterUrlFromVideoInfoRow(row)
    if (poster_url) return poster_url
  }

  return null
}


async function resolveUploadedVideo(
  connection: Connection,
  json: TikTokRawResponse
): Promise<{ ok: true; video_id: string; poster_url: string | null } | CreateFlowError> {
  const parsed = parseVideoUploadResponse(json.data)

  if (parsed.video_id && !isVideoStillProcessing(parsed.status)) {
    return { ok: true, video_id: parsed.video_id, poster_url: parsed.poster_url }
  }

  const pollCandidates = [
    parsed.video_id,
    parsed.material_id,
    parsed.probe_id,
  ].filter((id): id is string => Boolean(id))

  const polled = await pollVideoIdFromInfo(connection, pollCandidates)
  if (polled) {
    return { ok: true, video_id: polled, poster_url: parsed.poster_url }
  }

  if (parsed.video_id) {
    return { ok: true, video_id: parsed.video_id, poster_url: parsed.poster_url }
  }

  return buildCreateFlowError(
    'creative_upload',
    {
      code: json.code,
      message: 'No video_id returned from TikTok upload',
      request_id: json.request_id,
      data: json.data,
    },
    {
      explanation:
        `Upload returned code 0 but no video_id could be parsed or polled. request_id=${json.request_id ?? 'n/a'}. Parsed: ${JSON.stringify(parsed)}`,
    }
  )
}

type MaterialSearchHints = {
  baseNames: string[]
  urlBasename?: string
  sourceUrl?: string
}

async function uploadVideoToTikTok(
  connection: Connection,
  form: FormData,
  logStep: string,
  logRequest: Record<string, unknown>,
  searchHints?: MaterialSearchHints
): Promise<{ ok: true; video_id: string; poster_url: string | null } | CreateFlowError> {
  if (searchHints) {
    const existing = await searchExistingVideoId(connection, searchHints)
    if (existing) {
      console.error(`[tiktok/create/${logStep}] reusing existing video_id`, {
        video_id: existing,
        searchHints,
      })
      return { ok: true, video_id: existing, poster_url: null }
    }
  }

  const json = await tiktokMultipart(connection, '/file/video/ad/upload/', form)
  if (isTikTokHttpError(json)) {
    const http = asTikTokHttpError(json)
    if (http) return buildTikTokHttpFlowError('creative_upload', http)
  }
  logVideoUploadRawResponse(logStep, json)
  logTikTokCreateCall(logStep, '/file/video/ad/upload/', logRequest, json)

  if (json.code !== 0) {
    if (json.code === 40911 && searchHints) {
      const existing = await searchExistingVideoId(connection, searchHints)
      if (existing) {
        console.error(`[tiktok/create/${logStep}] recovered 40911 via material search`, {
          video_id: existing,
        })
        return { ok: true, video_id: existing, poster_url: null }
      }
    }
    return buildCreateFlowError('creative_upload', json)
  }

  return resolveUploadedVideo(connection, json)
}

async function uploadImageToTikTok(
  connection: Connection,
  form: FormData,
  logStep: string,
  logRequest: Record<string, unknown>,
  searchHints?: MaterialSearchHints
): Promise<{ ok: true; image_id: string } | CreateFlowError> {
  if (searchHints) {
    const existing = await searchExistingImageId(connection, searchHints)
    if (existing) {
      console.error(`[tiktok/create/${logStep}] reusing existing image_id`, {
        image_id: existing,
        searchHints,
      })
      return { ok: true, image_id: existing }
    }
  }

  const json = await tiktokMultipart(connection, '/file/image/ad/upload/', form)
  if (isTikTokHttpError(json)) {
    const http = asTikTokHttpError(json)
    if (http) return buildTikTokHttpFlowError('creative_upload', http)
  }
  logTikTokCreateCall(logStep, '/file/image/ad/upload/', logRequest, json)

  if (json.code !== 0) {
    if (json.code === 40911 && searchHints) {
      const existing = await searchExistingImageId(connection, searchHints)
      if (existing) {
        console.error(`[tiktok/create/${logStep}] recovered 40911 via material search`, {
          image_id: existing,
        })
        return { ok: true, image_id: existing }
      }
    }
    return buildCreateFlowError('creative_upload', json)
  }

  const image_id = parseImageUploadResponse(json.data)
  if (!image_id) {
    return buildCreateFlowError('creative_upload', {
      code: json.code,
      message: 'No image_id returned from TikTok upload',
      request_id: json.request_id,
      data: json.data,
    })
  }

  return { ok: true, image_id }
}

async function uploadCoverFromPosterUrl(
  connection: Connection,
  payload: CreateAdWizardPayload,
  poster_url: string,
  video_id: string
): Promise<{ ok: true; image_id: string } | CreateFlowError> {
  const baseName = materialBaseName(payload, { url: poster_url, kind: 'image' })
  const fileName = uniqueMaterialName(`${baseName}-cover`)
  const searchHints: MaterialSearchHints = {
    baseNames: [baseName, `${video_id}-cover`],
    urlBasename: urlDerivedFileName(poster_url),
    sourceUrl: poster_url,
  }

  const form = new FormData()
  form.set('upload_type', TIKTOK_UPLOAD_BY_URL)
  form.set('image_url', poster_url)
  form.set('file_name', fileName)
  return uploadImageToTikTok(
    connection,
    form,
    'creative_upload_cover',
    { upload_type: TIKTOK_UPLOAD_BY_URL, image_url: poster_url, file_name: fileName },
    searchHints
  )
}

async function uploadCoverFromProductImage(
  connection: Connection,
  payload: CreateAdWizardPayload,
  video_id: string,
  imageUrl: string
): Promise<{ ok: true; image_id: string } | CreateFlowError> {
  const baseName = materialBaseName(payload, { url: imageUrl, kind: 'image' })
  const fileName = uniqueMaterialName(`${baseName}-cover-fallback`)
  const searchHints: MaterialSearchHints = {
    baseNames: [baseName, `${video_id}-cover-fallback`],
    urlBasename: urlDerivedFileName(imageUrl),
    sourceUrl: imageUrl,
  }

  const form = new FormData()
  form.set('upload_type', TIKTOK_UPLOAD_BY_URL)
  form.set('image_url', imageUrl)
  form.set('file_name', fileName)
  return uploadImageToTikTok(
    connection,
    form,
    'creative_upload_cover_fallback',
    { upload_type: TIKTOK_UPLOAD_BY_URL, image_url: imageUrl, file_name: fileName },
    searchHints
  )
}

async function finalizeVideoCreative(
  connection: Connection,
  payload: CreateAdWizardPayload,
  uploaded: { video_id: string; poster_url: string | null },
  resolved: ResolvedCreativeMedia,
  video_url: string | null
): Promise<{ ok: true; creative: UploadedCreative } | CreateFlowError> {
  let poster_url = uploaded.poster_url
  if (!poster_url) {
    poster_url = await pollVideoPosterUrl(connection, uploaded.video_id)
  }

  let cover: { ok: true; image_id: string } | CreateFlowError

  if (poster_url) {
    cover = await uploadCoverFromPosterUrl(
      connection,
      payload,
      poster_url,
      uploaded.video_id
    )
  } else {
    const productImage = (payload.product.images || []).find(url => url && String(url).trim())
    if (productImage) {
      console.error(
        '[tiktok/create/creative_upload_cover] poster_url missing after polling — using product image fallback',
        {
          video_id: uploaded.video_id,
          product_image_url: productImage,
        }
      )
      cover = await uploadCoverFromProductImage(
        connection,
        payload,
        uploaded.video_id,
        productImage
      )
    } else {
      return buildCreateFlowError('creative_upload', {
        message: 'No poster_url returned from TikTok video upload',
      }, {
        explanation:
          'TikTok did not return a cover thumbnail after polling and this product has no image to use as a fallback cover. Add a product image or retry with a different video.',
      })
    }
  }

  if ('error' in cover) return cover

  const creative: UploadedCreative = {
    video_id: uploaded.video_id,
    cover_image_id: cover.image_id,
    image_ids: [cover.image_id],
    creative_ids: resolved.creative_ids,
    video_url,
  }
  logVideoCreativeForAdCreate(creative)
  return { ok: true, creative }
}

function logVideoCreativeForAdCreate(creative: UploadedCreative) {
  console.error('[tiktok/create/creative_upload] video creative ready for /ad/create/', {
    video_id: creative.video_id,
    cover_image_id: creative.cover_image_id,
    image_ids: creative.image_ids,
    video_url: creative.video_url,
  })
}

function mapTikTokCallToAction(cta: CtaType): string {
  const map: Record<CtaType, string> = {
    order_now: 'ORDER_NOW',
    shop_now: 'SHOP_NOW',
    learn_more: 'LEARN_MORE',
  }
  return map[cta] || 'SHOP_NOW'
}

function uniqueAdName(base: string): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
  const trimmed = base.trim().slice(0, Math.max(1, 90 - suffix.length))
  return `${trimmed}-${suffix}`.slice(0, 100)
}

async function postLogged(
  connection: Connection,
  step: string,
  path: string,
  body: Record<string, unknown>
): Promise<TikTokRawResponse> {
  const json = (await tiktokPost(connection, path, body)) as TikTokRawResponse
  if (isTikTokHttpError(json)) {
    console.error(`[tiktok/create/${step}] POST ${path} HTTP error`, json)
    return json
  }
  logTikTokCreateCall(step, path, body, json)
  return json
}

async function getLogged(
  connection: Connection,
  step: string,
  path: string,
  extra: Record<string, string> = {}
): Promise<TikTokRawResponse> {
  const json = (await tiktokGet(connection, path, extra)) as TikTokRawResponse
  if (isTikTokHttpError(json)) {
    console.error(`[tiktok/create/${step}] GET ${path} HTTP error`, json)
    return json
  }
  // Get requests are small; still log response code/message for debugging.
  console.error(`[tiktok/create/${step}] GET ${path}`, { extra, code: json.code, message: json.message, request_id: json.request_id })
  return json
}

function extractIdentityRows(data: unknown): Record<string, unknown>[] {
  if (data == null || typeof data !== 'object') return []
  const container = data as Record<string, unknown>
  const list = container.list ?? container.identity_list ?? container.identities
  if (!Array.isArray(list)) return []
  return list.filter((row): row is Record<string, unknown> => row != null && typeof row === 'object')
}

export type IdentityChoice = {
  identity_id: string
  identity_type?: string | null
  display_name?: string | null
  identity_authorized_bc_id?: string | null
}

type ParsedIdentity = IdentityChoice & {
  available_status: string | null
  can_push_video: boolean | null
}

const IDENTITY_TYPE_PRIORITY: Record<string, number> = {
  BC_AUTH_TT: 0,
  TT_USER: 1,
  CUSTOMIZED_USER: 2,
  AUTH_CODE: 3,
}

function readBoolField(row: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = row[key]
    if (value === true || value === false) return value
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return null
}

function parseIdentityRow(row: Record<string, unknown>): ParsedIdentity {
  const identity_id = readStringField(row, ['identity_id', 'id']) || ''
  const identity_type = readStringField(row, [
    'identity_type',
    'identityType',
    'type',
    'identity_authorized_type',
  ])
  const display_name = readStringField(row, [
    'display_name',
    'displayName',
    'name',
    'identity_name',
  ])
  const identity_authorized_bc_id = readStringField(row, [
    'identity_authorized_bc_id',
    'identityAuthorizedBcId',
    'authorized_bc_id',
  ])
  const available_status = readStringField(row, ['available_status', 'availableStatus'])
  const can_push_video = readBoolField(row, ['can_push_video', 'canPushVideo'])

  return {
    identity_id,
    identity_type,
    display_name,
    identity_authorized_bc_id,
    available_status,
    can_push_video,
  }
}

function isIdentityUsableForAds(identity: ParsedIdentity): boolean {
  if (identity.can_push_video === false) return false

  const isAvailable = identity.available_status === 'AVAILABLE'
  const canPush = identity.can_push_video === true

  if (isAvailable || canPush) return true

  // AUTH_CODE / null-capability storefront identities are not ad-usable.
  if (identity.identity_type === 'AUTH_CODE') return false
  if (identity.can_push_video == null && identity.available_status == null) return false

  return false
}

function identitySelectionScore(identity: ParsedIdentity): number {
  let score = (IDENTITY_TYPE_PRIORITY[identity.identity_type || ''] ?? 10) * 10
  if (identity.available_status !== 'AVAILABLE') score += 100
  if (identity.can_push_video !== true) score += 10
  return score
}

function selectUsableIdentity(
  rows: Record<string, unknown>[],
  preferredIdentityId?: string | null
): ParsedIdentity | null {
  const parsed = rows.map(parseIdentityRow).filter(i => i.identity_id)
  const usable = parsed.filter(isIdentityUsableForAds)
  if (!usable.length) return null

  if (preferredIdentityId) {
    const preferred = usable.find(i => i.identity_id === String(preferredIdentityId))
    if (preferred) return preferred
  }

  return [...usable].sort((a, b) => identitySelectionScore(a) - identitySelectionScore(b))[0]
}

function logIdentityGetDiagnostics(
  json: TikTokRawResponse,
  identities: Record<string, unknown>[],
  picked: ParsedIdentity
) {
  console.error('[tiktok/create/identity] GET /identity/get/ raw response', JSON.stringify(json, null, 2))
  console.error(
    '[tiktok/create/identity] identities summary',
    identities.map(row => {
      const parsed = parseIdentityRow(row)
      return {
        identity_id: parsed.identity_id,
        identity_type: parsed.identity_type,
        display_name: parsed.display_name,
        identity_authorized_bc_id: parsed.identity_authorized_bc_id,
        available_status: parsed.available_status,
        can_push_video: parsed.can_push_video,
        usable_for_ads: isIdentityUsableForAds(parsed),
      }
    })
  )
  console.error('[tiktok/create/identity] picked identity for /ad/create/', picked)
}

export async function resolveTikTokIdentity(
  connection: Connection,
  preferredIdentityId?: string | null
): Promise<{ ok: true; identity: IdentityChoice } | CreateFlowError> {
  const json = await getLogged(connection, 'identity', '/identity/get/')
  if (isTikTokHttpError(json)) {
    const http = asTikTokHttpError(json)
    if (http) return buildTikTokHttpFlowError('pending_ad', http)
  }
  if (json.code !== 0) return buildCreateFlowError('pending_ad', json)

  const identityRows = extractIdentityRows(json.data)

  if (!identityRows.length) {
    console.error('[tiktok/create/identity] GET /identity/get/ raw response (empty list)', JSON.stringify(json, null, 2))
    return {
      error: 'tiktok_error',
      step: 'pending_ad',
      message: 'No TikTok identity found for this ad account.',
      category: 'missing_required_field',
      explanation:
        'TikTok ads require an identity (posting account). Connect/create an identity in TikTok Ads Manager, then retry.',
    }
  }

  const picked = selectUsableIdentity(identityRows, preferredIdentityId)
  if (!picked) {
    logIdentityGetDiagnostics(json, identityRows, parseIdentityRow(identityRows[0]))
    return {
      error: 'tiktok_error',
      step: 'pending_ad',
      message: 'No TikTok identity is available for video ads on this ad account.',
      category: 'missing_required_field',
      explanation:
        'Link an ads-ready TikTok identity (e.g. BC_AUTH_TT with available_status AVAILABLE and can_push_video true) in TikTok Ads Manager, then retry.',
    }
  }

  const identity: IdentityChoice = {
    identity_id: picked.identity_id,
    identity_type: picked.identity_type,
    display_name: picked.display_name,
    identity_authorized_bc_id: picked.identity_authorized_bc_id,
  }
  logIdentityGetDiagnostics(json, identityRows, picked)

  if (!identity.identity_id) {
    return {
      error: 'tiktok_error',
      step: 'pending_ad',
      message: 'TikTok identity row is missing identity_id.',
      category: 'missing_required_field',
      explanation: 'Check /identity/get/ response in server logs and reconnect the TikTok account if needed.',
    }
  }

  if (!identity.identity_type) {
    return {
      error: 'tiktok_error',
      step: 'pending_ad',
      message: `TikTok identity ${identity.identity_id} is missing identity_type in /identity/get/ response.`,
      category: 'missing_required_field',
      explanation:
        'Do not guess identity_type — inspect server logs for the raw /identity/get/ response and pass the exact type TikTok returns.',
    }
  }

  return { ok: true, identity }
}

async function tiktokMultipart(
  connection: Connection,
  path: string,
  form: FormData
): Promise<TikTokRawResponse> {
  // TikTok upload endpoints are multipart; include advertiser_id in the form.
  form.set('advertiser_id', connection.advertiser_id)
  const url = `${TIKTOK}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Access-Token': connection.access_token,
    },
    body: form,
  })
  return parseTikTokResponse(res, { method: 'POST', url })
}

export const MAX_VIDEO_ADS_PER_GROUP = 5

export type UploadedCreative = {
  video_id?: string | null
  image_ids?: string[]
  cover_image_id?: string | null
  /** product_creatives ids used — for TikTok cache write-back */
  creative_ids?: string[]
  video_url?: string | null
  image_urls?: string[]
}

function resolvedForVideoItem(videoItem: ProductCreativeItem): ResolvedCreativeMedia {
  const creative_ids = videoItem.virtual ? [] : [videoItem.id]
  return {
    items: [videoItem],
    video_url: videoItem.url,
    image_urls: [],
    creative_ids,
  }
}

async function resolveMediaForPayload(payload: CreateAdWizardPayload): Promise<ResolvedCreativeMedia> {
  return resolveCreativeSelection({
    productId: payload.product.id,
    productImages: payload.product.images || [],
    creativeIds: payload.creative.creative_ids,
    videoUrl: payload.creative.media?.video_url,
    imageUrls: payload.creative.media?.image_urls || undefined,
  })
}

function cachedImagesFromItems(items: ProductCreativeItem[]): UploadedCreative | null {
  const images = items.filter(i => i.type === 'image' && i.tiktok_image_id)
  if (!images.length) return null
  const allHaveCache = items.filter(i => i.type === 'image').every(i => i.tiktok_image_id)
  if (!allHaveCache) return null
  return {
    image_ids: images.map(i => i.tiktok_image_id!),
    creative_ids: items.filter(i => !i.virtual).map(i => i.id),
    image_urls: images.map(i => i.url),
  }
}

export async function uploadSingleVideoCreative(opts: {
  connection: Connection
  payload: CreateAdWizardPayload
  videoItem: ProductCreativeItem
  videoFile?: File | null
  videoIndex?: number
}): Promise<{ ok: true; creative: UploadedCreative } | CreateFlowError> {
  const { connection, payload, videoItem, videoFile, videoIndex = 0 } = opts
  const resolved = resolvedForVideoItem(videoItem)

  if (videoItem.tiktok_video_id && videoItem.tiktok_image_id) {
    const creative: UploadedCreative = {
      video_id: videoItem.tiktok_video_id,
      cover_image_id: videoItem.tiktok_image_id,
      image_ids: [videoItem.tiktok_image_id],
      creative_ids: resolved.creative_ids,
      video_url: videoItem.url,
    }
    logVideoCreativeForAdCreate(creative)
    return { ok: true, creative }
  }

  if (videoItem.tiktok_video_id) {
    return finalizeVideoCreative(
      connection,
      payload,
      { video_id: videoItem.tiktok_video_id, poster_url: null },
      resolved,
      videoItem.url
    )
  }

  const url = videoItem.url || null
  if (!url && !videoFile) {
    return {
      error: 'validation_error',
      step: 'validation',
      message: 'No product video selected. Pick a video from the product library or upload one.',
      category: 'missing_required_field',
      explanation: 'Add a video creative on the product page or upload footage here.',
    }
  }

  if (url && !videoFile) {
    const urlBasename = urlDerivedFileName(url)
    const baseName = materialBaseName(payload, { url, kind: 'video', index: videoIndex })
    const fileName = uniqueMaterialName(baseName)
    const searchHints: MaterialSearchHints = {
      baseNames: [baseName, urlBasename],
      urlBasename,
      sourceUrl: url,
    }

    const form = new FormData()
    form.set('upload_type', TIKTOK_UPLOAD_BY_URL)
    form.set('video_url', url)
    form.set('file_name', fileName)
    const uploaded = await uploadVideoToTikTok(
      connection,
      form,
      'creative_upload_video_url',
      { upload_type: TIKTOK_UPLOAD_BY_URL, video_url: url, file_name: fileName },
      searchHints
    )
    if ('error' in uploaded) return uploaded

    return finalizeVideoCreative(connection, payload, uploaded, resolved, url)
  }

  if (!videoFile) {
    return {
      error: 'validation_error',
      step: 'validation',
      message: 'Video file is required for upload creative source.',
      category: 'missing_required_field',
      explanation: 'Pick a video file to upload, then retry.',
    }
  }

  const baseName = materialBaseName(payload, { fileName: videoFile.name, kind: 'video', index: videoIndex })
  const fileName = uniqueMaterialName(baseName)
  const searchHints: MaterialSearchHints = {
    baseNames: [baseName, videoFile.name],
  }

  const form = new FormData()
  form.set('upload_type', TIKTOK_UPLOAD_BY_FILE)
  form.set('file_name', fileName)
  form.set('video_file', videoFile, fileName)
  const uploaded = await uploadVideoToTikTok(
    connection,
    form,
    'creative_upload_video_file',
    { upload_type: TIKTOK_UPLOAD_BY_FILE, file_name: fileName },
    searchHints
  )
  if ('error' in uploaded) return uploaded

  return finalizeVideoCreative(connection, payload, uploaded, resolved, videoItem.url || null)
}

export async function uploadCreativeToTikTok(opts: {
  connection: Connection
  payload: CreateAdWizardPayload
  /** Optional browser File for "upload" source. */
  videoFile?: File | null
  /** Optional browser Files for carousel. */
  imageFiles?: File[]
}): Promise<{ ok: true; creative: UploadedCreative } | CreateFlowError> {
  const { connection, payload } = opts
  const src = payload.creative.source
  const resolved = await resolveMediaForPayload(payload)

  if (src === 'product_video' || src === 'upload') {
    const videoItem = resolved.items.find(i => i.type === 'video')
    if (!videoItem) {
      return {
        error: 'validation_error',
        step: 'validation',
        message: 'No product video selected. Pick a video from the product library or upload one.',
        category: 'missing_required_field',
        explanation: 'Add a video creative on the product page or upload footage here.',
      }
    }
    return uploadSingleVideoCreative({
      connection,
      payload,
      videoItem,
      videoFile: opts.videoFile ?? null,
    })
  }

  if (src === 'carousel') {
    const cached = cachedImagesFromItems(resolved.items)
    if (cached?.image_ids?.length) {
      return { ok: true, creative: cached }
    }

    const files = opts.imageFiles && opts.imageFiles.length ? opts.imageFiles : null
    const urls = resolved.image_urls.length
      ? resolved.image_urls
      : (payload.creative.media?.image_urls || payload.product.images || [])

    if (!files && (!urls || !urls.length)) {
      return {
        error: 'validation_error',
        step: 'validation',
        message: 'At least one image is required for carousel creative source.',
        category: 'missing_required_field',
        explanation: 'Select images from the product library or upload carousel images.',
      }
    }

    const image_ids: string[] = []
    const uploadedUrls: string[] = []

    if (files) {
      for (const [index, file] of files.slice(0, 10).entries()) {
        const baseName = materialBaseName(payload, { fileName: file.name, kind: 'image', index })
        const fileName = uniqueMaterialName(baseName)
        const searchHints: MaterialSearchHints = {
          baseNames: [baseName, file.name],
        }

        const form = new FormData()
        form.set('upload_type', TIKTOK_UPLOAD_BY_FILE)
        form.set('file_name', fileName)
        form.set('image_file', file, fileName)
        const uploaded = await uploadImageToTikTok(
          connection,
          form,
          'creative_upload_image_file',
          { upload_type: TIKTOK_UPLOAD_BY_FILE, file_name: fileName },
          searchHints
        )
        if ('error' in uploaded) return uploaded
        image_ids.push(uploaded.image_id)
      }
    } else {
      for (const [index, url] of urls.slice(0, 10).entries()) {
        const urlBasename = urlDerivedFileName(url)
        const baseName = materialBaseName(payload, { url, kind: 'image', index })
        const fileName = uniqueMaterialName(baseName)
        const searchHints: MaterialSearchHints = {
          baseNames: [baseName, urlBasename],
          urlBasename,
          sourceUrl: url,
        }

        const form = new FormData()
        form.set('upload_type', TIKTOK_UPLOAD_BY_URL)
        form.set('image_url', url)
        form.set('file_name', fileName)
        const uploaded = await uploadImageToTikTok(
          connection,
          form,
          'creative_upload_image_url',
          { upload_type: TIKTOK_UPLOAD_BY_URL, image_url: url, file_name: fileName },
          searchHints
        )
        if ('error' in uploaded) return uploaded
        image_ids.push(uploaded.image_id)
        uploadedUrls.push(url)
      }
    }

    if (!image_ids.length) {
      return {
        error: 'tiktok_error',
        step: 'creative_upload',
        message: 'No image_id returned from TikTok upload.',
        category: 'unknown',
      }
    }

    return {
      ok: true,
      creative: {
        image_ids,
        creative_ids: resolved.creative_ids,
        image_urls: uploadedUrls.length ? uploadedUrls : urls.slice(0, 10),
      },
    }
  }

  // ai_ugc is not implemented yet
  return {
    error: 'validation_error',
    step: 'validation',
    message: 'AI UGC creative source is not supported yet.',
    category: 'unknown',
  }
}

const TIKTOK_DISPLAY_NAME_MAX = 40

function truncateDisplayName(name: string): string {
  return name.trim().slice(0, TIKTOK_DISPLAY_NAME_MAX)
}

function preferredStoreDisplayName(payload: CreateAdWizardPayload): string | null {
  const name = payload.store.name?.trim()
  if (!name) return null
  return truncateDisplayName(name)
}

function identityFallbackDisplayName(
  identity: IdentityChoice,
  payload: CreateAdWizardPayload
): string {
  return truncateDisplayName(identity.display_name || payload.product.title || 'Shop')
}

function isDisplayNameRejected(json: TikTokRawResponse): boolean {
  const text = `${json.message || ''} ${JSON.stringify(json.data ?? '')}`.toLowerCase()
  return /display.?name|displayname|identity.*name|brand.*name|app.*name/i.test(text)
}

function buildAdCreativeObject(opts: {
  payload: CreateAdWizardPayload
  identity: IdentityChoice
  creative: UploadedCreative
  ad_name: string
  display_name: string
}): Record<string, unknown> {
  const { payload, identity, creative, ad_name, display_name } = opts
  const adv = payload.targeting.advanced

  const creativeObject: Record<string, unknown> = {
    ad_name,
    ad_text: payload.creative.caption,
    identity_id: identity.identity_id,
    identity_type: identity.identity_type,
    call_to_action: mapTikTokCallToAction(payload.creative.cta),
    display_name,
  }

  if (identity.identity_authorized_bc_id) {
    creativeObject.identity_authorized_bc_id = identity.identity_authorized_bc_id
  }

  if (adv?.comment_disabled) creativeObject.comment_disabled = true
  if (adv?.video_download_disabled) creativeObject.video_download_disabled = true
  if (adv?.share_disabled) creativeObject.share_disabled = true

  if (payload.targeting.goal === 'leads') {
    const lf = payload.targeting.lead_form
    if (lf?.mode === 'existing' && lf.page_id) {
      creativeObject.page_id = lf.page_id
    }
  } else {
    creativeObject.landing_page_url = payload.product.landing_url
  }

  if (creative.video_id) {
    creativeObject.ad_format = 'SINGLE_VIDEO'
    creativeObject.video_id = creative.video_id
    const coverIds = creative.image_ids?.length
      ? creative.image_ids
      : creative.cover_image_id
        ? [creative.cover_image_id]
        : []
    if (coverIds.length) {
      creativeObject.image_ids = coverIds
    }
  } else if (creative.image_ids?.length) {
    creativeObject.ad_format = 'SINGLE_IMAGE'
    creativeObject.image_ids = creative.image_ids
  }

  return creativeObject
}

function parseAdCreateResponse(
  json: TikTokRawResponse,
  ad_name: string
): { ok: true; ad_id: string; ad_name: string } | CreateFlowError {
  if (isTikTokHttpError(json)) {
    const http = asTikTokHttpError(json)
    if (http) return buildTikTokHttpFlowError('ad', http)
  }
  if (json.code !== 0) {
    return buildCreateFlowError('ad', json)
  }

  const data = json.data as Record<string, unknown> | undefined
  const nested = data?.creatives
  const firstCreative = Array.isArray(nested) ? nested[0] as Record<string, unknown> | undefined : undefined
  const ad_id = String(
    data?.ad_id
    || (data?.ad_ids as unknown[] | undefined)?.[0]
    || firstCreative?.ad_id
    || ''
  )
  if (!ad_id) {
    return buildCreateFlowError('ad', {
      code: json.code,
      message: 'No ad_id in TikTok response',
      request_id: json.request_id,
      data: json.data,
    })
  }

  return { ok: true, ad_id, ad_name }
}

export async function createTikTokAd(opts: {
  connection: Connection
  payload: CreateAdWizardPayload
  adgroup_id: string
  identity: IdentityChoice
  creative: UploadedCreative
  /** 0-based index when creating multiple video ads in one ad group. */
  adIndex?: number
}): Promise<{ ok: true; ad_id: string; ad_name: string } | CreateFlowError> {
  const { connection, payload, adgroup_id, identity, creative, adIndex } = opts

  const titleBase = payload.product.title.slice(0, 35)
  const adLabel = adIndex != null && adIndex >= 0
    ? `${titleBase} - Ad ${adIndex + 1}`
    : `${titleBase} - Ad`
  const ad_name = uniqueAdName(adLabel)
  if (!identity.identity_type) {
    return {
      error: 'tiktok_error',
      step: 'ad',
      message: 'identity_type is required for /ad/create/ but was not returned by /identity/get/.',
      category: 'missing_required_field',
      explanation: 'Check server logs for /identity/get/ raw response — do not guess identity_type.',
    }
  }

  const identityDisplayName = identityFallbackDisplayName(identity, payload)
  const storeDisplayName = preferredStoreDisplayName(payload)
  const primaryDisplayName = storeDisplayName || identityDisplayName

  const postAd = async (display_name: string) => {
    const creativeObject = buildAdCreativeObject({
      payload,
      identity,
      creative,
      ad_name,
      display_name,
    })
    const body: Record<string, unknown> = {
      adgroup_id,
      creatives: [creativeObject],
    }
    const fullRequest = {
      advertiser_id: connection.advertiser_id,
      ...body,
    }
    console.error('[tiktok/create/ad] POST /ad/create/ request body (full JSON)', JSON.stringify(fullRequest, null, 2))
    console.error('[tiktok/create/ad] creative identity + video check', {
      identity_id: identity.identity_id,
      identity_type: identity.identity_type,
      identity_authorized_bc_id: identity.identity_authorized_bc_id ?? null,
      display_name,
      video_id: creativeObject.video_id ?? null,
      image_ids: creativeObject.image_ids ?? null,
      ad_format: creativeObject.ad_format ?? null,
    })
    return postLogged(connection, 'ad', '/ad/create/', body)
  }

  let json = await postAd(primaryDisplayName)
  if (
    json.code !== 0
    && storeDisplayName
    && storeDisplayName !== identityDisplayName
    && isDisplayNameRejected(json)
  ) {
    console.error('[tiktok/create/ad] store display_name rejected — retrying with identity display_name', {
      store_display_name: storeDisplayName,
      identity_display_name: identityDisplayName,
      code: json.code,
      message: json.message,
      request_id: json.request_id,
    })
    json = await postAd(identityDisplayName)
  }

  if (json.code !== 0) {
    console.error('[tiktok/create/ad] POST /ad/create/ failed', {
      code: json.code,
      message: json.message,
      request_id: json.request_id,
      display_name: json.code !== 0 && storeDisplayName ? primaryDisplayName : undefined,
    })
  }

  return parseAdCreateResponse(json, ad_name)
}

