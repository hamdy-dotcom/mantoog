'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

const COUNTRY_CODES = [
  { code: '+20', country: 'مصر', flag: '🇪🇬', digits: 10, pattern: /^01[0-2,5]\d{8}$/ },
  { code: '+966', country: 'السعودية', flag: '🇸🇦', digits: 9, pattern: /^5\d{8}$/ },
  { code: '+971', country: 'الإمارات', flag: '🇦🇪', digits: 9, pattern: /^5\d{8}$/ },
  { code: '+212', country: 'المغرب', flag: '🇲🇦', digits: 9, pattern: /^[5-7]\d{8}$/ },
  { code: '+213', country: 'الجزائر', flag: '🇩🇿', digits: 9, pattern: /^[5-7]\d{8}$/ },
  { code: '+974', country: 'قطر', flag: '🇶🇦', digits: 8, pattern: /^[3-7]\d{7}$/ },
  { code: '+965', country: 'الكويت', flag: '🇰🇼', digits: 8, pattern: /^[5-9]\d{7}$/ },
  { code: '+973', country: 'البحرين', flag: '🇧🇭', digits: 8, pattern: /^[3-6]\d{7}$/ },
  { code: '+968', country: 'عُمان', flag: '🇴🇲', digits: 8, pattern: /^[7-9]\d{7}$/ },
]

export default function SignupPage() {
  const { lang, dir, setLang } = useLang()
  const tr = t[lang]
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+20')
  const [phoneError, setPhoneError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const validatePhone = (number: string, code: string) => {
    const country = COUNTRY_CODES.find(c => c.code === code)
    if (!country) return false
    const cleaned = number.replace(/\s/g, '')
    return country.pattern.test(cleaned)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPhoneError('')

    // Validate phone
    if (!phone.trim()) {
      setPhoneError(lang === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required')
      setLoading(false)
      return
    }
    if (!validatePhone(phone, countryCode)) {
      const country = COUNTRY_CODES.find(c => c.code === countryCode)
      setPhoneError(lang === 'ar'
        ? `رقم غير صحيح — يجب أن يكون ${country?.digits} أرقام`
        : `Invalid number — must be ${country?.digits} digits`)
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: countryCode + phone,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('merchants').upsert({
        id: data.user.id,
        email,
        phone: countryCode + phone,
      }, { onConflict: 'id' })
    }

    router.push('/dashboard/setup')
  }

  return (
    <div dir={dir} className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">Mantoog</h1>
          <p className="text-[#8b8fa8] text-sm mt-1">{tr.createAccount}</p>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setLang('ar')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${lang === 'ar' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] border border-[#2a2d35] hover:text-white'}`}
          >
            العربية
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${lang === 'en' ? 'bg-[#3b82f6] text-white' : 'text-[#8b8fa8] border border-[#2a2d35] hover:text-white'}`}
          >
            English
          </button>
        </div>

        {/* Card */}
        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
          <form onSubmit={handleSignup} className="space-y-4">

            <div>
              <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                {tr.fullName}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Ahmed Mohamed"
                className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                {tr.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                {tr.passwordLabel}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>

            {/* Phone number */}
            <div>
              <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">
                {lang === 'ar' ? 'رقم الهاتف' : 'Phone number'}
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={e => { setCountryCode(e.target.value); setPhoneError('') }}
                  className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-2 py-3 text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-colors w-32 flex-shrink-0"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => {
                    const val = e.target.value.replace(/[^\d]/g, '')
                    setPhone(val)
                    setPhoneError('')
                  }}
                  placeholder={countryCode === '+20' ? '01xxxxxxxxx' : countryCode === '+966' ? '5xxxxxxxx' : '5xxxxxxxx'}
                  className={`flex-1 bg-[#0f1117] border rounded-xl px-4 py-3 text-white placeholder-[#4a4e60] focus:outline-none transition-colors text-sm ${phoneError ? 'border-[#f87171] focus:border-[#f87171]' : 'border-[#2a2d35] focus:border-[#3b82f6]'}`}
                  dir="ltr"
                />
              </div>
              {phoneError && (
                <p className="text-[#f87171] text-xs mt-1">{phoneError}</p>
              )}
              <p className="text-[#4a4e60] text-xs mt-1">
                {lang === 'ar'
                  ? `${COUNTRY_CODES.find(c => c.code === countryCode)?.country} — ${COUNTRY_CODES.find(c => c.code === countryCode)?.digits} أرقام`
                  : `${COUNTRY_CODES.find(c => c.code === countryCode)?.country} — ${COUNTRY_CODES.find(c => c.code === countryCode)?.digits} digits`
                }
              </p>
            </div>

            {error && (
              <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5">
                <p className="text-[#f87171] text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? `${tr.signupBtn}...` : tr.signupBtn}
            </button>

          </form>
        </div>

        <p className="text-center text-sm text-[#8b8fa8] mt-4">
          {tr.haveAccount}{' '}
          <Link href="/login" className="text-[#3b82f6] hover:underline">
            {tr.signinBtn}
          </Link>
        </p>

        <p className="text-center text-xs text-[#4a4e60] mt-3">
          {tr.freeOrdersNote}
        </p>

      </div>
    </div>
  )
}
