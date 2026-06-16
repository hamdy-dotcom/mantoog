'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { recordActivity } from '@/lib/auth/client'
export default function LoginPage() {
  const { lang, dir, setLang } = useLang()
  const tr = t[lang]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const router = useRouter()

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetSuccess(false)
    setShowOtpInput(false)
    setOtpCode('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim())

    setResetLoading(false)
    if (error) {
      setResetError(error.message)
      return
    }
    setResetSuccess(true)
    setShowOtpInput(true)
  }

  const verifyOtp = async () => {
    setResetError('')
    if (otpCode.length !== 8) {
      setResetError(lang === 'ar' ? 'أدخل الكود المكون من 8 أرقام' : 'Enter the 8-digit code')
      return
    }

    setResetLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: resetEmail.trim(),
      token: otpCode,
      type: 'recovery',
    })
    setResetLoading(false)

    if (error) {
      setResetError(lang === 'ar' ? 'الكود غير صحيح أو منتهي الصلاحية' : 'Invalid or expired code')
      return
    }

    router.push('/reset-password')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    recordActivity()
    router.push('/dashboard')
  }

  return (
    <div dir={dir} className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Mantoog" className="w-48 h-48 object-contain mx-auto mb-2" />
          <p className="text-[#8b8fa8] text-sm mt-1">{tr.signIn}</p>
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
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                  {tr.emailLabel}
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => {
                    setResetEmail(e.target.value)
                    setResetSuccess(false)
                    setShowOtpInput(false)
                    setOtpCode('')
                    setResetError('')
                  }}
                  required
                  placeholder="you@example.com"
                  className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
              </div>

              {resetError && (
                <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5">
                  <p className="text-[#f87171] text-sm">{resetError}</p>
                </div>
              )}

              {resetSuccess && (
                <div className="bg-[#14321f] border border-[#4ade80]/20 rounded-lg px-3 py-2.5">
                  <p className="text-[#4ade80] text-sm">
                    {lang === 'ar'
                      ? 'تم إرسال كود استعادة كلمة المرور إلى بريدك الإلكتروني'
                      : 'We sent a password reset code to your email'}
                  </p>
                </div>
              )}

              {showOtpInput && (
                <div className="space-y-3">
                  <p className="text-sm text-[#8b8fa8]">
                    {lang === 'ar'
                      ? 'أدخل الكود المكون من 8 أرقام الذي أرسلناه إلى بريدك'
                      : 'Enter the 8-digit code we emailed you'}
                  </p>
                  <input
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="00000000"
                    maxLength={8}
                    dir="ltr"
                    className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-4 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-[#3b82f6]"
                  />
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={resetLoading || otpCode.length !== 8}
                    className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {lang === 'ar' ? 'تأكيد الكود' : 'Verify code'}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading || showOtpInput}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {resetLoading
                  ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                  : (lang === 'ar' ? 'إرسال كود الاستعادة' : 'Send reset code')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetError('')
                  setResetSuccess(false)
                  setShowOtpInput(false)
                  setOtpCode('')
                }}
                className="w-full text-sm text-[#8b8fa8] hover:text-white transition-colors"
              >
                {lang === 'ar' ? '← العودة لتسجيل الدخول' : '← Back to sign in'}
              </button>
            </form>
          ) : (
          <form onSubmit={handleLogin} className="space-y-4">

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
                className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true)
                  setResetEmail(email)
                  setResetError('')
                  setResetSuccess(false)
                }}
                className="mt-2 text-xs text-[#3b82f6] hover:underline"
              >
                نسيت كلمة المرور؟
              </button>
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
              {loading ? `${tr.signinBtn}...` : tr.signinBtn}
            </button>

          </form>
          )}
        </div>

        <p className="text-center text-sm text-[#8b8fa8] mt-4">
          {tr.noAccount}{' '}
          <Link href="/signup" className="text-[#3b82f6] hover:underline">
            {tr.signupBtn}
          </Link>
        </p>

      </div>
    </div>
  )
}
