'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ADMIN_EMAILS = ['admin@mantoog.com']

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')

    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      setError('Access denied. Admin only.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#3b82f6] rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-4">M</div>
          <h1 className="text-xl font-bold text-white">Mantoog Admin</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">Restricted access only</p>
        </div>

        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="admin@mantoog.com"
              className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-xl px-4 py-3 text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors text-sm"
            />
          </div>

          {error && (
            <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-4 py-2.5 text-[#f87171] text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? 'Logging in...' : 'Login to Admin →'}
          </button>
        </div>

        <p className="text-center text-xs text-[#4a4e60] mt-4">
          Not an admin? <a href="/login" className="text-[#3b82f6] hover:underline">Go to merchant login</a>
        </p>
      </div>
    </div>
  )
}
