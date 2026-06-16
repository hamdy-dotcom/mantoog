import { tiktokGet } from '@/lib/tiktok/mutations'
import type { LeadFormSummary } from '@/lib/tiktok/create-ad/types'

type Connection = { advertiser_id: string; access_token: string }

function mapFormRow(row: Record<string, unknown>): LeadFormSummary | null {
  const pageId = row.page_id ?? row.id
  const pageName = row.page_name ?? row.title ?? row.name
  if (pageId == null || pageId === '') return null
  return {
    page_id: String(pageId),
    page_name: String(pageName || `Form ${pageId}`),
    status: row.status != null ? String(row.status) : null,
  }
}

function isInstantFormRow(row: Record<string, unknown>) {
  const pageType = String(row.page_type ?? row.business_type ?? '').toUpperCase()
  if (pageType.includes('INSTANT') || pageType.includes('LEAD')) return true
  if (row.is_instant_form === true) return true
  return !pageType
}

export async function fetchLeadForms(connection: Connection) {
  const attempts: Record<string, string>[] = [
    { page: '1', page_size: '20', filtering: JSON.stringify({ page_types: ['INSTANT_FORM'] }) },
    { page: '1', page_size: '20', filtering: JSON.stringify({ business_type: 'LEAD_GENERATION' }) },
    { page: '1', page_size: '20' },
  ]

  let lastMessage: string | undefined
  for (const extra of attempts) {
    const json = await tiktokGet(connection, '/page/get/', extra)
    if (json.code !== 0) {
      lastMessage = json.message
      continue
    }
    const data = json.data as { list?: unknown[] } | undefined
    const list = (data?.list || []) as Record<string, unknown>[]
    const items = list
      .filter(isInstantFormRow)
      .map(mapFormRow)
      .filter((x): x is LeadFormSummary => x != null)
    return { items }
  }

  return { items: [] as LeadFormSummary[], error: lastMessage }
}
