'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { recordActivity } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

const COUNTRY_CODES = [
  { code: '+20', country: 'EG', digits: 10, placeholder: '10xxxxxxxx' },
  { code: '+966', country: 'SA', digits: 9, placeholder: '5xxxxxxxx' },
  { code: '+971', country: 'AE', digits: 9, placeholder: '5xxxxxxxx' },
  { code: '+212', country: 'MA', digits: 9, placeholder: '6xxxxxxxx' },
  { code: '+213', country: 'DZ', digits: 9, placeholder: '5xxxxxxxx' },
  { code: '+216', country: 'TN', digits: 8, placeholder: '2xxxxxxx' },
  { code: '+962', country: 'JO', digits: 9, placeholder: '7xxxxxxxx' },
  { code: '+965', country: 'KW', digits: 8, placeholder: '9xxxxxxx' },
  { code: '+974', country: 'QA', digits: 8, placeholder: '3xxxxxxx' },
  { code: '+973', country: 'BH', digits: 8, placeholder: '3xxxxxxx' },
  { code: '+968', country: 'OM', digits: 8, placeholder: '9xxxxxxx' },
]

export default function SignupPage() {
  const { lang, dir, setLang } = useLang()
  const tr = t[lang]
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCode, setSelectedCode] = useState('+20')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [website, setWebsite] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const currentCountry = COUNTRY_CODES.find(c => c.code === selectedCode) || COUNTRY_CODES[0]
  const isValidPhone = phoneNumber.length === currentCountry.digits

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPhoneError('')

    if (!phoneNumber.trim()) {
      setPhoneError(lang === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required')
      setLoading(false)
      return
    }
    if (!isValidPhone) {
      setPhoneError(lang === 'ar'
        ? `رقم غير صحيح — يجب أن يكون ${currentCountry.digits} أرقام`
        : `Invalid number — must be ${currentCountry.digits} digits`)
      setLoading(false)
      return
    }

    const fullPhone = selectedCode + phoneNumber

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: fullPhone,
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
        phone: fullPhone,
        website,
      }, { onConflict: 'id' })
    }

    recordActivity()
    router.push('/dashboard/setup')
  }

  return (
    <div dir={dir} className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Mantoog" className="w-48 h-48 object-contain mx-auto mb-2" />
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

            <div>
              <label className="text-xs text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">
                {lang === 'ar' ? 'رقم الهاتف' : 'Phone number'}
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCode}
                  onChange={e => { setSelectedCode(e.target.value); setPhoneNumber(''); setPhoneError('') }}
                  className="bg-[#0f1117] border border-[#2a2d35] rounded-xl px-2 py-3 text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-colors w-32 flex-shrink-0"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} {c.country}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => {
                    setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, currentCountry.digits))
                    setPhoneError('')
                  }}
                  placeholder={currentCountry.placeholder}
                  maxLength={currentCountry.digits}
                  dir="ltr"
                  className={`flex-1 bg-[#0f1117] border rounded-xl px-4 py-3 text-white placeholder-[#4a4e60] focus:outline-none transition-colors text-sm ${phoneError ? 'border-[#f87171] focus:border-[#f87171]' : 'border-[#2a2d35] focus:border-[#3b82f6]'}`}
                />
              </div>
              {phoneError && (
                <p className="text-[#f87171] text-xs mt-1">{phoneError}</p>
              )}
              <p className="text-[#4a4e60] text-xs mt-1">
                {lang === 'ar'
                  ? `${currentCountry.country} — ${currentCountry.digits} أرقام`
                  : `${currentCountry.country} — ${currentCountry.digits} digits`}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                {lang === 'ar' ? 'اسم متجرك أو صفحتك (اختياري)' : 'Your Store / Page Name (optional)'}
              </label>
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: متجر الأناقة، @mystore' : 'e.g. My Store, @mystore'}
                className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6]"
              />
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
