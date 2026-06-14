/** TikTok OAuth scopes pending platform approval. Flip to true when approved. */
export type TikTokPendingFeature = 'creative-management' | 'pixel-management' | 'lead-generation'

export const TIKTOK_SCOPE_APPROVED: Record<TikTokPendingFeature, boolean> = {
  'creative-management': false,
  'pixel-management': false,
  'lead-generation': false,
}

export function isTikTokScopeApproved(feature: TikTokPendingFeature): boolean {
  return TIKTOK_SCOPE_APPROVED[feature]
}

export const TIKTOK_SCOPE_LABELS: Record<TikTokPendingFeature, { en: string; ar: string }> = {
  'creative-management': {
    en: 'Creative Management',
    ar: 'إدارة المحتوى الإبداعي',
  },
  'pixel-management': {
    en: 'Pixel Management',
    ar: 'إدارة البكسل',
  },
  'lead-generation': {
    en: 'Lead Generation',
    ar: 'توليد العملاء المحتملين',
  },
}
