'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'
import { recordActivity } from '@/lib/auth/client'

export default function ResetPasswordPage() {
  const { lang, dir } = useLang()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Session is established by verifyOtp on the login page.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      } else {
        setError(lang === 'ar' ? 'انتهت صلاحية الجلسة — اطلب رابطاً جديداً' : 'Session expired — request a new code')        
      }
      setCheckingSession(false)
    })
  }, [lang])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    recordActivity()
    router.push('/dashboard')
  }

  return (
    <div dir={dir} className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Mantoog" className="w-48 h-48 object-contain mx-auto mb-2" />
          <p className="text-[#8b8fa8] text-sm mt-1">
            {lang === 'ar' ? 'تعيين كلمة مرور جديدة' : 'Set a new password'}
          </p>
        </div>

        <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl p-6">
          {checkingSession ? (
            <p className="text-[#8b8fa8] text-sm text-center">
              {lang === 'ar' ? 'جاري التحقق من الرابط...' : 'Verifying link...'}
            </p>
          ) : !sessionReady ? (
            <div className="space-y-4 text-center">
              <p className="text-[#f87171] text-sm">
                {error || (lang === 'ar'
                  ? 'رابط الاستعادة غير صالح أو منتهي. اطلب رابطاً جديداً من صفحة تسجيل الدخول.'
                  : 'Invalid or expired recovery link. Request a new one from the login page.')}
              </p>
              <Link href="/login" className="text-[#3b82f6] hover:underline text-sm">
                {lang === 'ar' ? '← العودة لتسجيل الدخول' : '← Back to sign in'}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                  {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider">
                  {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="mt-1.5 w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
              </div>

              {error && sessionReady && (
                <div className="bg-[#3a1414] border border-[#f87171]/20 rounded-lg px-3 py-2.5">
                  <p className="text-[#f87171] text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading
                  ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (lang === 'ar' ? 'حفظ كلمة المرور' : 'Save password')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
