export type AdGoal = 'leads' | 'orders' | 'visits'

import type { ConversionEventPreference } from '@/lib/tiktok/create-ad/optimization-events'

export type CreativeSource = 'product_video' | 'upload' | 'carousel' | 'ai_ugc'

export type CtaType = 'order_now' | 'shop_now' | 'learn_more'

export type CampaignTypeOption = 'standard' | 'smart_plus'
export type BudgetLevelOption = 'abo' | 'cbo'
export type BudgetModeOption = 'daily' | 'lifetime'
export type BidStrategyOption = 'auto' | 'cost_cap'
export type PlacementOption = 'automatic' | 'manual'
export type SpendingPowerOption = 'ALL' | 'HIGH'
export type DaypartingModeOption = 'all_day' | 'custom_hours'

export type ProductSummary = {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  images: string[]
  landing_url: string
}

export type AdvancedSettings = {
  touched: boolean
  campaignType: CampaignTypeOption
  budgetLevel: BudgetLevelOption
  budgetMode: BudgetModeOption
  bidStrategy: BidStrategyOption
  bidCap: number | null
  placement: PlacementOption
  /** When placement=manual, explicit placements array for TikTok API. */
  placements: string[]
  /** Empty = All languages (no restriction). */
  languages: string[]
  spending_power: SpendingPowerOption
  dayparting_mode: DaypartingModeOption
  /** 168-char weekly bitmask (7*48) when dayparting_mode=custom_hours. */
  dayparting: string | null
  /** Ad controls (defaults = TikTok defaults: comments on, download on, share on). */
  comment_disabled: boolean
  video_download_disabled: boolean
  share_disabled: boolean
}

export const DEFAULT_ADVANCED: AdvancedSettings = {
  touched: false,
  campaignType: 'standard',
  budgetLevel: 'abo',
  budgetMode: 'daily',
  bidStrategy: 'auto',
  bidCap: null,
  placement: 'automatic',
  placements: [],
  languages: [],
  spending_power: 'ALL',
  dayparting_mode: 'all_day',
  dayparting: null,
  comment_disabled: false,
  video_download_disabled: false,
  share_disabled: false,
}

export type LeadFormMode = 'existing' | 'create_new'

export type LeadFormSelection = {
  mode: LeadFormMode
  page_id: string | null
  page_name: string | null
}

export type LeadFormSummary = {
  page_id: string
  page_name: string
  status?: string | null
}

export type CreateAdWizardPayload = {
  product: ProductSummary
  creative: {
    source: CreativeSource
    caption: string
    cta: CtaType
    /** Selected product_creatives ids (real UUIDs; virtual ids resolved server-side). */
    creative_ids?: string[] | null
    /** Optional media hints for server-side upload/publish. */
    media?: {
      /** For product-video URL uploads (or any public URL). */
      video_url?: string | null
      /** For image ads: public image URLs (server will upload). */
      image_urls?: string[] | null
    } | null
  }
  targeting: {
    goal: AdGoal
    daily_budget: number
    /** Account-local wall clock: YYYY-MM-DDTHH:mm */
    schedule_start: string
    /** Optional end; account-local YYYY-MM-DDTHH:mm */
    schedule_end?: string | null
    location_id: string
    age_groups: string[]
    gender: string
    advanced: AdvancedSettings
    lead_form?: LeadFormSelection | null
    /** Conversion optimization preference for orders goal (mapped server-side to TikTok event). */
    conversion_event?: ConversionEventPreference | null
  }
  /** Optional identity selection. If missing, server will pick the first available identity. */
  identity?: {
    identity_id?: string | null
  } | null
  store: {
    tiktok_pixel_id: string | null
    currency: string
    /** Merchant storefront display name for TikTok ad display_name. */
    name?: string | null
  }
}

export const GOAL_OPTIONS: { id: AdGoal; objective: string; labelEn: string; labelAr: string }[] = [
  { id: 'leads', objective: 'LEAD_GENERATION', labelEn: 'Get leads', labelAr: 'جلب عملاء محتملين' },
  { id: 'orders', objective: 'WEB_CONVERSIONS', labelEn: 'Get orders', labelAr: 'جلب طلبات' },
  { id: 'visits', objective: 'TRAFFIC', labelEn: 'Get visits', labelAr: 'جلب زيارات' },
]

export const CTA_OPTIONS: { id: CtaType; labelEn: string; labelAr: string }[] = [
  { id: 'order_now', labelEn: 'Order now', labelAr: 'اطلب الآن' },
  { id: 'shop_now', labelEn: 'Shop now', labelAr: 'تسوق الآن' },
  { id: 'learn_more', labelEn: 'Learn more', labelAr: 'اعرف المزيد' },
]

export const CREATIVE_SOURCES: { id: CreativeSource; icon: string; labelEn: string; labelAr: string; descEn: string; descAr: string }[] = [
  { id: 'product_video', icon: '🎬', labelEn: 'Product video', labelAr: 'فيديو المنتج', descEn: 'Use your product video', descAr: 'استخدم فيديو المنتج' },
  { id: 'upload', icon: '📤', labelEn: 'My own footage', labelAr: 'فيديو خاص بي', descEn: 'Upload your own clip', descAr: 'ارفع فيديو من جهازك' },
  { id: 'carousel', icon: '🖼️', labelEn: 'Image carousel', labelAr: 'صور متعددة', descEn: 'Swipeable product images', descAr: 'صور المنتج بشكل متتابع' },
  { id: 'ai_ugc', icon: '🤖', labelEn: 'AI UGC', labelAr: 'UGC بالذكاء الاصطناعي', descEn: 'AI-generated creator video', descAr: 'فيديو مولّد بالذكاء الاصطناعي' },
]

export type TargetLocation = {
  location_id: string
  name: string
  label_ar: string
  region_code: string
  level: string
}

export const AGE_OPTIONS = [
  { id: 'AGE_18_24', labelEn: '18–24', labelAr: '18–24' },
  { id: 'AGE_25_34', labelEn: '25–34', labelAr: '25–34' },
  { id: 'AGE_35_44', labelEn: '35–44', labelAr: '35–44' },
  { id: 'AGE_45_54', labelEn: '45–54', labelAr: '45–54' },
  { id: 'AGE_55_100', labelEn: '55+', labelAr: '55+' },
]

export const GENDER_OPTIONS = [
  { id: 'GENDER_UNLIMITED', labelEn: 'All', labelAr: 'الكل' },
  { id: 'GENDER_MALE', labelEn: 'Men', labelAr: 'رجال' },
  { id: 'GENDER_FEMALE', labelEn: 'Women', labelAr: 'نساء' },
]

export const LANGUAGE_OPTIONS = [
  { id: 'ar', labelEn: 'Arabic', labelAr: 'العربية' },
  { id: 'en', labelEn: 'English', labelAr: 'الإنجليزية' },
]
