'use client'

import TikTokBulkLaunchTab from '@/components/dashboard/TikTokBulkLaunchTab'
import TikTokCreateAdWizard from '@/components/dashboard/TikTokCreateAdWizard'

type LangProps = {
  lang: string
  dir: string
  fmtMoney: (n: number, digits?: number) => string
  hasActiveAccount: boolean
  onReauthRequired?: () => void
}

export function TikTokCreateAdTab({
  lang,
  dir,
  fmtMoney,
  hasActiveAccount,
  onReauthRequired,
}: LangProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-semibold text-base">
          {lang === 'ar' ? 'إنشاء إعلان' : 'Create ad'}
        </h2>
        <p className="text-[#8b8fa8] text-sm mt-1">
          {lang === 'ar'
            ? 'اختر منتجاً، أضف الإبداع، حدّد الاستهداف، وأطلق حملة TikTok في 4 خطوات.'
            : 'Pick a product, add creative, set targeting, and launch a TikTok campaign in 4 steps.'}
        </p>
      </div>

      <TikTokCreateAdWizard
        lang={lang}
        dir={dir}
        fmtMoney={fmtMoney}
        hasActiveAccount={hasActiveAccount}
        onReauthRequired={onReauthRequired}
      />
    </div>
  )
}

export function TikTokBulkLaunchTabPanel({
  lang,
  dir,
  fmtMoney,
  hasActiveAccount,
  onReauthRequired,
}: LangProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-semibold text-base">
          {lang === 'ar' ? 'إطلاق جماعي' : 'Bulk launch'}
        </h2>
        <p className="text-[#8b8fa8] text-sm mt-1">
          {lang === 'ar'
            ? 'أطلق عدة حملات دفعة واحدة — منتج واحد لكل حملة، استهداف مشترك.'
            : 'Launch multiple campaigns at once — one product per campaign, shared targeting.'}
        </p>
      </div>

      <TikTokBulkLaunchTab
        lang={lang}
        dir={dir}
        fmtMoney={fmtMoney}
        hasActiveAccount={hasActiveAccount}
        onReauthRequired={onReauthRequired}
      />
    </div>
  )
}
