'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { recordActivity } from '@/lib/auth/client'

type View = 'login' | 'forgot' | 'otp'

/* ─── icons ──────────────────────────────────────────────────────────────── */
const MailIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
  </svg>
)
const LockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const EyeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" x2="23" y1="1" y2="23"/>
  </svg>
)
const BackIcon = ({ flip }: { flip?: boolean }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
)
const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
)
const AlertIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
)
const CheckIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
)

/* ─── shared styles ──────────────────────────────────────────────────────── */
const inputCls = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#4a5568] focus:outline-none focus:border-[#3b82f6]/70 focus:bg-white/[0.08] transition-all duration-200'
const labelCls = 'block text-[11px] font-semibold text-[#6b7a99] uppercase tracking-widest mb-2'

/* ─── aurora styles (same as homepage) ───────────────────────────────────── */
const AURORA_CSS = `
  .aurora{position:absolute;border-radius:9999px;filter:blur(110px);opacity:.28}
  .aurora-1{width:40vw;height:40vw;left:-8vw;top:-6vw;background:radial-gradient(circle,#3b82f6,transparent 70%);animation:drift1 22s ease-in-out infinite}
  .aurora-2{width:35vw;height:35vw;right:-6vw;top:18vh;background:radial-gradient(circle,#7c5cff,transparent 70%);animation:drift2 26s ease-in-out infinite}
  .aurora-3{width:32vw;height:32vw;left:25vw;top:55vh;background:radial-gradient(circle,#0ea5e9,transparent 70%);opacity:.15;animation:drift1 30s ease-in-out infinite}
  .grid-overlay{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,black,transparent 75%)}
  @keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(60px,-40px) scale(1.1)}66%{transform:translate(-30px,60px) scale(.95)}}
  @keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-50px,50px) scale(1.05)}66%{transform:translate(40px,-30px) scale(.98)}}
`

export default function LoginPage() {
  const { lang, dir, setLang } = useLang()
  const tr = t[lang]
  const ar = lang === 'ar'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const [view, setView]                 = useState<View>('login')
  const [resetEmail, setResetEmail]     = useState('')
  const [otpCode, setOtpCode]           = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError]     = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) { setError(ar ? 'البريد أو كلمة المرور غير صحيحة' : 'Invalid email or password'); setLoading(false); return }
    recordActivity()
    router.push('/dashboard')
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true); setResetError('')
    const { error } = await createClient().auth.resetPasswordForEmail(resetEmail.trim())
    setResetLoading(false)
    if (error) { setResetError(error.message); return }
    setResetSuccess(true)
    setView('otp')
  }

  const verifyOtp = async () => {
    setResetError('')
    if (otpCode.length !== 8) { setResetError(ar ? 'أدخل الكود المكون من 8 أرقام' : 'Enter the 8-digit code'); return }
    setResetLoading(true)
    const { error } = await createClient().auth.verifyOtp({ email: resetEmail.trim(), token: otpCode, type: 'recovery' })
    setResetLoading(false)
    if (error) { setResetError(ar ? 'الكود غير صحيح أو منتهي الصلاحية' : 'Invalid or expired code'); return }
    router.push('/reset-password')
  }

  return (
    <div dir={dir} className="min-h-screen bg-[#0b0d12] text-white overflow-x-hidden">
      <style>{AURORA_CSS}</style>

      {/* ── aurora background (identical to homepage) ── */}
      <div className="fixed inset-0 pointer-events-none -z-0" aria-hidden>
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="aurora aurora-3" />
        <div className="grid-overlay" />
      </div>

      {/* ── nav (identical to homepage) ── */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 pt-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0b0d12]/70 backdrop-blur-xl px-4 sm:px-6 py-3 shadow-lg shadow-black/20">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Mantoog" className="h-9 w-9 object-contain" />
            <span className="font-extrabold text-lg tracking-tight">Mantoog</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-sm text-[#9aa0b4]">
            <a href="/#features" className="hover:text-white transition-colors">{ar ? 'المميزات' : 'Features'}</a>
            <a href="/#how" className="hover:text-white transition-colors">{ar ? 'كيف يعمل' : 'How it works'}</a>
            <a href="/#pricing" className="hover:text-white transition-colors">{ar ? 'الأسعار' : 'Pricing'}</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="cursor-pointer text-xs font-medium border border-white/10 hover:border-white/25 text-[#9aa0b4] hover:text-white px-3 py-1.5 rounded-lg transition-colors">
              {ar ? 'EN' : 'ع'}
            </button>
            <Link href="/login" className="hidden sm:inline text-sm text-[#9aa0b4] hover:text-white transition-colors px-3 py-1.5 font-medium">
              {ar ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
            <Link href="/signup" className="text-sm font-semibold bg-white text-[#0b0d12] hover:bg-white/90 px-4 py-2 rounded-xl transition-colors">
              {ar ? 'ابدأ مجاناً' : 'Start free'}
            </Link>
          </div>
        </nav>
      </header>

      {/* ── form centered below nav ── */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-5 pt-24 pb-12">
        <div className="w-full max-w-[420px]">

          {/* ── LOGIN VIEW ── */}
          {view === 'login' && (
            <div>
              <div className="mb-8">
                <h2 className="text-[2rem] font-black text-white mb-2 tracking-tight">
                  {ar ? 'أهلاً بعودتك 👋' : 'Welcome back 👋'}
                </h2>
                <p className="text-[#9aa0b4] text-sm">{tr.signIn}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7 space-y-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelCls}>{tr.emailLabel}</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-3.5 flex items-center text-[#4a5568] pointer-events-none"><MailIcon /></span>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        placeholder="you@example.com" className={inputCls + ' ps-10'} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls} style={{ marginBottom: 0 }}>{tr.passwordLabel}</label>
                      <button type="button"
                        onClick={() => { setView('forgot'); setResetEmail(email); setResetError(''); setResetSuccess(false) }}
                        className="text-[11px] text-[#3b82f6] hover:text-[#60a5fa] font-medium transition-colors">
                        {ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-3.5 flex items-center text-[#4a5568] pointer-events-none"><LockIcon /></span>
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                        placeholder="••••••••" className={inputCls + ' ps-10 pe-11'} />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute inset-y-0 end-0 px-3.5 flex items-center text-[#4a5568] hover:text-[#9aa0b4] transition-colors">
                        {showPw ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span className="text-red-400"><AlertIcon /></span>
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)', boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}>
                    <span className={loading ? 'opacity-0' : ''}>{tr.signinBtn}</span>
                    {loading && <span className="absolute inset-0 flex items-center justify-center"><SpinnerIcon /></span>}
                  </button>
                </form>
              </div>

              <p className="text-sm text-[#6b7a99] mt-6 text-center">
                {tr.noAccount}{' '}
                <Link href="/signup" className="text-[#3b82f6] hover:text-[#60a5fa] font-semibold transition-colors">
                  {tr.signupBtn}
                </Link>
              </p>
            </div>
          )}

          {/* ── FORGOT VIEW ── */}
          {view === 'forgot' && (
            <div>
              <button onClick={() => { setView('login'); setResetError('') }}
                className="flex items-center gap-2 text-[#6b7a99] hover:text-white text-sm mb-7 transition-colors group">
                <span className="group-hover:-translate-x-0.5 transition-transform"><BackIcon flip={ar} /></span>
                {ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>🔑</div>
                <h2 className="text-[2rem] font-black text-white mb-2 tracking-tight">
                  {ar ? 'استعادة كلمة المرور' : 'Reset your password'}
                </h2>
                <p className="text-[#9aa0b4] text-sm">
                  {ar ? 'أدخل بريدك وسنرسل لك كود الاستعادة' : "Enter your email and we'll send a reset code"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className={labelCls}>{tr.emailLabel}</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-3.5 flex items-center text-[#4a5568] pointer-events-none"><MailIcon /></span>
                      <input type="email" value={resetEmail}
                        onChange={e => { setResetEmail(e.target.value); setResetSuccess(false) }}
                        required placeholder="you@example.com" className={inputCls + ' ps-10'} />
                    </div>
                  </div>

                  {resetError && (
                    <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span className="text-red-400"><AlertIcon /></span>
                      <p className="text-red-400 text-sm">{resetError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={resetLoading}
                    className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)', boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}>
                    <span className={resetLoading ? 'opacity-0' : ''}>{ar ? 'إرسال كود الاستعادة' : 'Send reset code'}</span>
                    {resetLoading && <span className="absolute inset-0 flex items-center justify-center"><SpinnerIcon /></span>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── OTP VIEW ── */}
          {view === 'otp' && (
            <div>
              <button onClick={() => setView('forgot')}
                className="flex items-center gap-2 text-[#6b7a99] hover:text-white text-sm mb-7 transition-colors group">
                <span className="group-hover:-translate-x-0.5 transition-transform"><BackIcon flip={ar} /></span>
                {ar ? 'العودة' : 'Back'}
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>📬</div>
                <h2 className="text-[2rem] font-black text-white mb-2 tracking-tight">
                  {ar ? 'تحقق من بريدك' : 'Check your inbox'}
                </h2>
                <p className="text-[#9aa0b4] text-sm">
                  {ar ? `أرسلنا كود مكون من 8 أرقام إلى ${resetEmail}` : `We sent an 8-digit code to ${resetEmail}`}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7 space-y-4">
                <div>
                  <label className={labelCls}>{ar ? 'كود التحقق' : 'Verification code'}</label>
                  <input value={otpCode}
                    onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setResetError('') }}
                    placeholder="00000000" maxLength={8} dir="ltr"
                    className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-4 text-white text-center text-2xl font-bold tracking-[0.3em] placeholder-[#2a3a4a] focus:outline-none focus:border-[#3b82f6]/70 focus:bg-white/[0.08] transition-all" />
                </div>

                {resetError && (
                  <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="text-red-400"><AlertIcon /></span>
                    <p className="text-red-400 text-sm">{resetError}</p>
                  </div>
                )}

                {resetSuccess && (
                  <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <span className="text-emerald-400"><CheckIcon /></span>
                    <p className="text-emerald-400 text-sm">{ar ? 'تم إرسال الكود بنجاح' : 'Code sent successfully'}</p>
                  </div>
                )}

                <button onClick={verifyOtp} disabled={resetLoading || otpCode.length !== 8}
                  className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)', boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}>
                  <span className={resetLoading ? 'opacity-0' : ''}>{ar ? 'تأكيد الكود' : 'Verify code'}</span>
                  {resetLoading && <span className="absolute inset-0 flex items-center justify-center"><SpinnerIcon /></span>}
                </button>

                <button onClick={() => { setView('forgot'); setOtpCode(''); setResetError('') }}
                  className="w-full text-sm text-[#6b7a99] hover:text-[#9aa0b4] transition-colors py-1">
                  {ar ? 'إعادة إرسال الكود' : 'Resend code'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
