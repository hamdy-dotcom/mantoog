'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [merchant, setMerchant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single()
      setMerchant(data)
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#8b8fa8] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex">

      {/* Sidebar */}
      <aside className="w-56 border-r border-[#2a2d35] p-4 flex flex-col gap-1">
        <div className="text-white font-semibold text-lg mb-6 px-3">Mantoog</div>
        <NavItem label="Dashboard" active />
        <NavItem label="Products" />
        <NavItem label="Orders" />
        <NavItem label="Ads" />
        <NavItem label="Analytics" />
        <NavItem label="Settings" />
        <div className="mt-auto">
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="w-full text-left px-3 py-2 text-sm text-[#8b8fa8] hover:text-white hover:bg-[#1f2229] rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">
            Welcome back{merchant?.full_name ? `, ${merchant.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-[#8b8fa8] text-sm mt-1">Here's what's happening with your store today.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total orders" value="0" change="Just getting started" />
          <StatCard label="Revenue" value="0 EGP" change="First order incoming" />
          <StatCard label="Free credits left" value="100" change="Orders remaining" />
        </div>

        {/* Empty state */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h2 className="text-white font-medium text-lg mb-2">Add your first product</h2>
          <p className="text-[#8b8fa8] text-sm mb-6">Paste a product URL or describe what you want to sell — AI will build the landing page for you.</p>
          <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
            Add product
          </button>
        </div>

      </main>
    </div>
  )
}

function NavItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
      active
        ? 'bg-[#1f2229] text-white'
        : 'text-[#8b8fa8] hover:text-white hover:bg-[#1f2229]'
    }`}>
      {label}
    </div>
  )
}

function StatCard({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-5">
      <div className="text-xs font-medium text-[#4a4e60] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-semibold text-white mb-1">{value}</div>
      <div className="text-xs text-[#8b8fa8]">{change}</div>
    </div>
  )
}
