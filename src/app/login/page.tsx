'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { recordActivity } from '@/lib/auth/client'

type View = 'login' | 'forgot' | 'otp'

/* ─── inline SVG icons ───────────────────────────────────────────────────── */
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

/* ─── shared input styles ────────────────────────────────────────────────── */
const inputCls = 'w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#2a3a4a] focus:outline-none focus:border-[#3b82f6]/60 focus:bg-white/[0.07] transition-all duration-200'
const labelCls = 'block text-[11px] font-semibold text-[#3a5470] uppercase tracking-widest mb-2'

/* ─── main component ─────────────────────────────────────────────────────── */
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
    <div dir={dir} className="min-h-screen flex relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #020913 0%, #06142a 45%, #050c1c 100%)' }}>

      {/* ── page-wide background effects ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }} />

      {/* glow orbs — brand side (right in RTL) */}
      <div className="absolute -top-40 -end-20 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)', filter: 'blur(10px)' }} />
      {/* glow orb — form side (left in RTL) */}
      <div className="absolute top-1/2 -start-20 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.13) 0%, transparent 65%)', filter: 'blur(10px)' }} />
      {/* bottom accent */}
      <div className="absolute -bottom-20 start-1/3 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)', filter: 'blur(10px)' }} />

      {/* ── brand content (desktop, appears on RIGHT in RTL) ── */}
      <div className="hidden lg:flex flex-col w-[420px] xl:w-[480px] shrink-0 relative z-10 px-10 xl:px-14 py-12">
        {/* logo */}
        <div className="flex items-center gap-3 mb-16">
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] blur-lg opacity-60" />
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center">
              <img src="/logo.svg" alt="Mantoog" className="w-6 h-6 object-contain" />
            </div>
          </div>
          <span className="text-white text-xl font-bold tracking-tight">منتوج</span>
        </div>

        {/* headline */}
        <div className="flex-1">
          <h1 className="text-[2.6rem] font-black text-white leading-[1.15] mb-5 tracking-tight">
            {ar ? (
              <>حوّل أي رابط<br />
                <span style={{ background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  لمتجر يبيع
                </span><br />في 60 ثانية</>
            ) : (
              <>Turn any link<br />
                <span style={{ background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  into a store
                </span><br />in 60 seconds</>
            )}
          </h1>
          <p className="text-[#3a5470] text-[15px] leading-relaxed mb-10">
            {ar ? 'إدارة طلباتك، إعلاناتك، ومتجرك من مكان واحد' : 'Manage orders, ads, and your store in one place'}
          </p>

          {/* trust signals */}
          <div className="space-y-4 mb-12">
            {[
              { icon: '🆓', ar: '١٠٠ طلب مجاني — بدون بطاقة ائتمان', en: '100 free orders — no credit card' },
              { icon: '⚡', ar: 'متجرك جاهز في أقل من دقيقة', en: 'Your store live in under a minute' },
              { icon: '📊', ar: 'تقارير + إعلانات TikTok مدمجة', en: 'Reports + TikTok ads built in' },
            ].map(sig => (
              <div key={sig.ar} className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {sig.icon}
                </div>
                <span className="text-[#4a6a88] text-[13.5px]">{ar ? sig.ar : sig.en}</span>
              </div>
            ))}
          </div>
        </div>

        {/* stats — single unified card with dividers */}
        <div className="rounded-2xl px-5 py-4 flex items-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { val: '٠٪',    label: ar ? 'عمولة على مبيعاتك' : 'Commission',  color: '#60a5fa' },
            { val: '٩٩.٩٪', label: ar ? 'وقت التشغيل'       : 'Uptime',      color: '#4ade80' },
            { val: '60ث',   label: ar ? 'للإطلاق'            : 'To launch',   color: '#c084fc' },
          ] as const).map((s, i) => (
            <div key={s.label} className="flex-1 flex items-center">
              {i > 0 && <div className="w-px self-stretch mx-3 shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />}
              <div className="flex-1 text-center">
                <div className="text-[19px] font-black mb-0.5" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-[#2a4060] leading-tight">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── subtle vertical divider (desktop only) ── */}
      <div className="hidden lg:block w-px self-stretch my-14 shrink-0"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.07) 75%, transparent)' }} />

      {/* ── form area (appears on LEFT in RTL) ── */}
      <div className="flex-1 flex flex-col relative z-10 px-6 sm:px-10">

        {/* centered form */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px]">

            {/* mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <div className="relative w-12 h-12 shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] blur-xl opacity-50" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center shadow-xl shadow-blue-600/30">
                  <img src="/logo.svg" alt="Mantoog" className="w-7 h-7 object-contain" />
                </div>
              </div>
              <span className="text-white text-xl font-black tracking-tight">منتوج</span>
            </div>

            {/* ── LOGIN VIEW ── */}
            {view === 'login' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-[1.9rem] font-black text-white mb-2 tracking-tight">
                    {ar ? 'أهلاً بعودتك 👋' : 'Welcome back 👋'}
                  </h2>
                  <p className="text-[#3a5470] text-sm">{tr.signIn}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelCls}>{tr.emailLabel}</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-3.5 flex items-center text-[#2a3a4a] pointer-events-none"><MailIcon /></span>
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
                      <span className="absolute inset-y-0 start-3.5 flex items-center text-[#2a3a4a] pointer-events-none"><LockIcon /></span>
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                        placeholder="••••••••" className={inputCls + ' ps-10 pe-11'} />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute inset-y-0 end-0 px-3.5 flex items-center text-[#2a3a4a] hover:text-[#64748b] transition-colors">
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
                    className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', boxShadow: '0 4px 28px rgba(37,99,235,0.35)' }}>
                    <span className={loading ? 'opacity-0' : ''}>{tr.signinBtn}</span>
                    {loading && <span className="absolute inset-0 flex items-center justify-center"><SpinnerIcon /></span>}
                  </button>
                </form>

                <p className="text-sm text-[#2a3a4a] mt-7">
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
                  className="flex items-center gap-2 text-[#3a5470] hover:text-white text-sm mb-7 transition-colors group">
                  <span className="group-hover:-translate-x-0.5 transition-transform"><BackIcon flip={ar} /></span>
                  {ar ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
                </button>

                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>🔑</div>
                  <h2 className="text-[1.9rem] font-black text-white mb-2 tracking-tight">
                    {ar ? 'استعادة كلمة المرور' : 'Reset your password'}
                  </h2>
                  <p className="text-[#3a5470] text-sm">
                    {ar ? 'أدخل بريدك وسنرسل لك كود الاستعادة' : "Enter your email and we'll send a reset code"}
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className={labelCls}>{tr.emailLabel}</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-3.5 flex items-center text-[#2a3a4a] pointer-events-none"><MailIcon /></span>
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
                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', boxShadow: '0 4px 28px rgba(37,99,235,0.35)' }}>
                    <span className={resetLoading ? 'opacity-0' : ''}>{ar ? 'إرسال كود الاستعادة' : 'Send reset code'}</span>
                    {resetLoading && <span className="absolute inset-0 flex items-center justify-center"><SpinnerIcon /></span>}
                  </button>
                </form>
              </div>
            )}

            {/* ── OTP VIEW ── */}
            {view === 'otp' && (
              <div>
                <button onClick={() => setView('forgot')}
                  className="flex items-center gap-2 text-[#3a5470] hover:text-white text-sm mb-7 transition-colors group">
                  <span className="group-hover:-translate-x-0.5 transition-transform"><BackIcon flip={ar} /></span>
                  {ar ? 'العودة' : 'Back'}
                </button>

                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>📬</div>
                  <h2 className="text-[1.9rem] font-black text-white mb-2 tracking-tight">
                    {ar ? 'تحقق من بريدك' : 'Check your inbox'}
                  </h2>
                  <p className="text-[#3a5470] text-sm">
                    {ar ? `أرسلنا كود مكون من 8 أرقام إلى ${resetEmail}` : `We sent an 8-digit code to ${resetEmail}`}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>{ar ? 'كود التحقق' : 'Verification code'}</label>
                    <input value={otpCode}
                      onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setResetError('') }}
                      placeholder="00000000" maxLength={8} dir="ltr"
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-4 text-white text-center text-2xl font-bold tracking-[0.3em] placeholder-[#1a2a3a] focus:outline-none focus:border-[#3b82f6]/60 focus:bg-white/[0.07] transition-all" />
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
                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', boxShadow: '0 4px 28px rgba(37,99,235,0.35)' }}>
                    <span className={resetLoading ? 'opacity-0' : ''}>{ar ? 'تأكيد الكود' : 'Verify code'}</span>
                    {resetLoading && <span className="absolute inset-0 flex items-center justify-center"><SpinnerIcon /></span>}
                  </button>

                  <button onClick={() => { setView('forgot'); setOtpCode(''); setResetError('') }}
                    className="w-full text-sm text-[#3a5470] hover:text-[#64748b] transition-colors py-1">
                    {ar ? 'إعادة إرسال الكود' : 'Resend code'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>{/* end centering */}

        {/* lang toggle — pinned bottom */}
        <div className="flex-shrink-0 py-7 flex justify-start">
          <div className="inline-flex p-1 rounded-xl gap-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['ar', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-5 py-1.5 rounded-[10px] text-xs font-semibold transition-all duration-200 ${
                  lang === l
                    ? 'bg-white/[0.08] text-[#60a5fa]'
                    : 'text-[#2a4060] hover:text-[#4a6a88]'
                }`}>
                {l === 'ar' ? 'العربية' : 'English'}
              </button>
            ))}
          </div>
        </div>

      </div>{/* end form area */}
    </div>
  )
}
