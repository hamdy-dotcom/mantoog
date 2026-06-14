'use client'

export type TikTokTabId = 'dashboard' | 'create-ad' | 'bulk-launch' | 'winners' | 'campaigns'

type Tab = {
  id: TikTokTabId
  icon: string
  labelEn: string
  labelAr: string
}

const TABS: Tab[] = [
  { id: 'dashboard', icon: '📊', labelEn: 'Dashboard', labelAr: 'لوحة الأداء' },
  { id: 'create-ad', icon: '＋', labelEn: 'Create ad', labelAr: 'إنشاء إعلان' },
  { id: 'bulk-launch', icon: '⚡', labelEn: 'Bulk launch', labelAr: 'إطلاق جماعي' },
  { id: 'winners', icon: '🏆', labelEn: 'Winners', labelAr: 'المنتجات الرابحة' },
  { id: 'campaigns', icon: '📋', labelEn: 'Campaigns', labelAr: 'الحملات' },
]

type Props = {
  active: TikTokTabId
  onChange: (id: TikTokTabId) => void
  lang: string
}

export default function TikTokTabBar({ active, onChange, lang }: Props) {
  return (
    <div className="border-b border-[#2a2d35] mb-6 -mx-1">
      <nav
        className="flex gap-0 overflow-x-auto scrollbar-none -mb-px"
        aria-label={lang === 'ar' ? 'أقسام TikTok' : 'TikTok sections'}
      >
        {TABS.map(tab => {
          const isActive = active === tab.id
          const label = lang === 'ar' ? tab.labelAr : tab.labelEn
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-white'
                  : 'text-[#8b8fa8] hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="text-base leading-none opacity-90" aria-hidden>{tab.icon}</span>
                {label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 start-4 end-4 h-0.5 bg-[#3b82f6] rounded-full"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
