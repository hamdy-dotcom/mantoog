export type LaunchAdResult = {
  ok: boolean
  ad_id?: string
  ad_name?: string
  video_id?: string | null
  creative_id?: string
  error?: string
}

export type LaunchSuccess = {
  ok: true
  campaign_id: string
  campaign_name: string
  adgroup_id: string
  adgroup_name: string
  /** First successful ad — backward compatible */
  ad_id?: string
  ad_name?: string
  ads: LaunchAdResult[]
  message: string
  partial?: boolean
}
