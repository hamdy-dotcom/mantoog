'use client'

import {
  isTikTokScopeApproved,
  TIKTOK_SCOPE_LABELS,
  type TikTokPendingFeature,
} from '@/lib/tiktok/scopes'

type Props = {
  feature: TikTokPendingFeature
  lang: string
  className?: string
}

export default function PendingApprovalNotice({ feature, lang, className = '' }: Props) {
  if (isTikTokScopeApproved(feature)) return null

  const scopeName = lang === 'ar' ? TIKTOK_SCOPE_LABELS[feature].ar : TIKTOK_SCOPE_LABELS[feature].en

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-[#fbbf24]/25 bg-[#3a2800]/40 px-4 py-3 ${className}`}
      role="status"
    >
      <span className="text-base shrink-0 mt-0.5" aria-hidden>⏳</span>
      <div className="min-w-0">
        <p className="text-sm text-[#fbbf24] font-medium leading-snug">
          {lang === 'ar'
            ? 'سيتم تفعيل هذه الميزة بعد موافقة TikTok على الصلاحية المطلوبة (قيد المراجعة).'
            : 'This feature activates once TikTok approves the required permission (under review).'}
        </p>
        <p className="text-xs text-[#fbbf24]/70 mt-1">
          {lang === 'ar' ? `الصلاحية: ${scopeName}` : `Permission: ${scopeName}`}
        </p>
      </div>
    </div>
  )
}

/** Use on submit handlers to block API calls until scope is approved. */
export function blockIfScopePending(feature: TikTokPendingFeature): boolean {
  return !isTikTokScopeApproved(feature)
}
