'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const currencies = [
  { code: 'EGP', label: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'SAR', label: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', label: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'USD', label: 'US Dollar', flag: '🇺🇸' },
  { code: 'MAD', label: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'DZD', label: 'Algerian Dinar', flag: '🇩🇿' },
]

export default function StoreSetupPage() {
  const [step, setStep] = useState(1)
  const [storeName, setStoreName] = useState('')
  const [currency, setCurrency] = useState('EGP')
  const [language, setLanguage] = useState('ar')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50)
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const slug = generateSlug(storeName) + '-' + Math.random().toString(36).slice(2, 6)

    const { error } = await supabase.from('stores').insert({
      merchant_id: user.id,
      name: storeName,
      slug,
      currency,
      language,
    })

    if (error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">Set up your store</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">Step {step} of 2</p>
          {/* Progress bar */}
          <div className="mt-4 h-1 bg-[#2a2d35] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3b82f6] rounded-full transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">

          {/* Step 1 — Store name */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white font-medium text-lg mb-1">What's your store name?</h2>
                <p className="text-[#8b8fa8] text-sm">This will be displayed on your landing pages.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">Store name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  placeholder="My Awesome Store"
                  className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!storeName.trim()}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2 — Currency & Language */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-medium text-lg mb-1">Store settings</h2>
                <p className="text-[#8b8fa8] text-sm">Choose your currency and language.</p>
              </div>

              {/* Currency */}
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">Currency</label>
                <div className="grid grid-cols-2 gap-2">
                  {currencies.map(c => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        currency === c.code
                          ? 'border-[#3b82f6] bg-[#1a3a5c] text-white'
                          : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span className="font-medium">{c.code}</span>
                      <span className="text-xs opacity-60 truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-2 block">Language</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLanguage('ar')}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      language === 'ar'
                        ? 'border-[#3b82f6] bg-[#1a3a5c] text-white'
                        : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      language === 'en'
                        ? 'border-[#3b82f6] bg-[#1a3a5c] text-white'
                        : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5">
                  <p className="text-[#f87171] text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-transparent border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {loading ? 'Creating...' : 'Create store'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
