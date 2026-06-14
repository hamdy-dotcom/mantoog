export type BulkLaunchItemResult = {
  product_id: string
  product_title: string
  ok: boolean
  campaign_id?: string
  adgroup_id?: string
  campaign_name?: string
  message?: string
  error?: string
  step?: string
  code?: number
  request_id?: string
  explanation?: string
  rolled_back?: boolean
}
