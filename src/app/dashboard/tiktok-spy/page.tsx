'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { useLang } from '@/lib/i18n/LanguageContext'

export default function TikTokSpyPage() {
  const [store, setStore] = useState<any>(null)
  const [credits, setCredits] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const supabase = createClient()
  const { lang, dir } = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: storeData } = await supabase.from('stores').select('*').eq('merchant_id', user.id).single()
      if (!storeData) { router.push('/dashboard/setup'); return }
      setStore(storeData)
      const { data: creditsData } = await supabase.from('order_credits').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      setCredits(creditsData)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-[#8b8fa8] text-sm">Loading...</div>
    </div>
  )

  const tiktokUrl = 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?period=7&industry=27101000000,20105000000,19103000000,21104000000&objective=PRODUCT_SALES'

  return (
    <div className="min-h-screen bg-[#0f1117] flex" dir={dir}>
      <Sidebar store={store} credits={credits} />
      <main className="flex-1 pt-16 md:pt-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2d35] flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-white">
              <span className="mr-2">🎵</span>
              {lang === 'ar' ? 'تصفح إعلانات تيكتوك' : 'TikTok Ad Spy'}
            </h1>
            <p className="text-[#8b8fa8] text-xs mt-0.5">
              {lang === 'ar' ? 'بيانات حقيقية مباشرة من TikTok Creative Center' : 'Real data directly from TikTok Creative Center'}
            </p>
          </div>
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#1a1d24] border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            ↗ {lang === 'ar' ? 'فتح في تاب جديد' : 'Open in new tab'}
          </a>
        </div>

        {/* iframe wrapper — hides TikTok's top headers */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <iframe
            src={tiktokUrl}
            style={{
              width: '100%',
              height: 'calc(100% + 280px)',
              border: 'none',
              marginTop: '-280px',
              display: 'block',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            title="TikTok Creative Center"
          />
        </div>

      </main>
    </div>
  )
}
