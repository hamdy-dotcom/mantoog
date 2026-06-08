'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

export default function AdsPage() {
  const { lang, dir } = useLang()
  const tr = t[lang]
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-[#0f1117] flex`} dir={dir}>
      <Sidebar store={store} />

      <main className="flex-1 pt-16 md:pt-0 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">{tr.adsTitle}</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">{tr.adsSub}</p>
        </div>

        {/* Coming soon banner */}
        <div className="bg-[#1a3a5c] border border-[#3b82f6]/30 rounded-xl p-5 mb-8 flex items-center gap-4">
          <div className="text-3xl">🚀</div>
          <div>
            <div className="text-white font-medium mb-1">{tr.adsComingSoon}</div>
            <div className="text-[#8b8fa8] text-sm">{tr.adsComingSoonDesc}</div>
          </div>
        </div>

        {/* Platform cards */}
        <div className="grid grid-cols-2 gap-6 max-w-3xl">

          {/* Meta */}
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#1877f2] flex items-center justify-center text-white font-bold text-lg">f</div>
              <div>
                <div className="text-white font-medium">{tr.metaAds}</div>
                <div className="text-xs text-[#8b8fa8]">{tr.metaAdsSub}</div>
              </div>
              <span className="ml-auto text-xs font-medium bg-[#3a2800] text-[#fbbf24] px-2 py-1 rounded-full">{tr.comingSoon}</span>
            </div>
            <div className="space-y-2 mb-5">
              {tr.metaFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#8b8fa8]">
                  <span className="text-[#4a4e60]">○</span>{f}
                </div>
              ))}
            </div>
            <button disabled className="w-full bg-[#1877f2] opacity-40 cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg">
              {tr.connectMeta}
            </button>
          </div>

          {/* TikTok */}
          <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white font-bold text-lg">T</div>
              <div>
                <div className="text-white font-medium">{tr.tiktokAds}</div>
                <div className="text-xs text-[#8b8fa8]">{tr.tiktokAdsSub}</div>
              </div>
              <span className="ml-auto text-xs font-medium bg-[#3a2800] text-[#fbbf24] px-2 py-1 rounded-full">{tr.comingSoon}</span>
            </div>
            <div className="space-y-2 mb-5">
              {tr.tiktokFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#8b8fa8]">
                  <span className="text-[#4a4e60]">○</span>{f}
                </div>
              ))}
            </div>
            <button disabled className="w-full bg-[#ff0050] opacity-40 cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg">
              {tr.connectTiktok}
            </button>
          </div>
        </div>

        {/* What you'll be able to do */}
        <div className="mt-8 max-w-3xl">
          <h2 className="text-white font-medium mb-4">{tr.adsWhatsComingTitle}</h2>
          <div className="grid grid-cols-3 gap-4">
            {tr.whatsComingFeatures.map((item, i) => (
              <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-4">
                <div className="text-2xl mb-3">{item.icon}</div>
                <div className="text-white font-medium text-sm mb-1">{item.title}</div>
                <div className="text-[#8b8fa8] text-xs leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
