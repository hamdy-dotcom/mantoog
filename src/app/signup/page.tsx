'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { recordActivity } from '@/lib/auth/client'
import { useLang } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

const COUNTRY_CODES = [
  { code: '+20',  country: 'EG', flag: '🇪🇬', digits: 10, placeholder: '10xxxxxxxx' },
  { code: '+966', country: 'SA', flag: '🇸🇦', digits: 9,  placeholder: '5xxxxxxxx'  },
  { code: '+971', country: 'AE', flag: '🇦🇪', digits: 9,  placeholder: '5xxxxxxxx'  },
  { code: '+212', country: 'MA', flag: '🇲🇦', digits: 9,  placeholder: '6xxxxxxxx'  },
  { code: '+213', country: 'DZ', flag: '🇩🇿', digits: 9,  placeholder: '5xxxxxxxx'  },
  { code: '+216', country: 'TN', flag: '🇹🇳', digits: 8,  placeholder: '2xxxxxxx'   },
  { code: '+962', country: 'JO', flag: '🇯🇴', digits: 9,  placeholder: '7xxxxxxxx'  },
  { code: '+965', country: 'KW', flag: '🇰🇼', digits: 8,  placeholder: '9xxxxxxx'   },
  { code: '+974', country: 'QA', flag: '🇶🇦', digits: 8,  placeholder: '3xxxxxxx'   },
  { code: '+973', country: 'BH', flag: '🇧🇭', digits: 8,  placeholder: '3xxxxxxx'   },
  { code: '+968', country: 'OM', flag: '🇴🇲', digits: 8,  placeholder: '9xxxxxxx'   },
]

/* ─── icons ──────────────────────────────────────────────────────────────── */
const UserIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
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
const PhoneIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const StoreIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const AlertIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
)
const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
)

/* ─── shared styles ──────────────────────────────────────────────────────── */
const inputCls = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#4a5568] focus:outline-none focus:border-[#3b82f6]/70 focus:bg-white/[0.08] transition-all duration-200'
const labelCls = 'block text-[11px] font-semibold text-[#6b7a99] uppercase tracking-widest mb-2'

const AURORA_CSS = `
  .aurora{position:absolute;border-radius:9999px;filter:blur(110px);opacity:.28}
  .aurora-1{width:40vw;height:40vw;left:-8vw;top:-6vw;background:radial-gradient(circle,#3b82f6,transparent 70%);animation:drift1 22s ease-in-out infinite}
  .aurora-2{width:35vw;height:35vw;right:-6vw;top:18vh;background:radial-gradient(circle,#7c5cff,transparent 70%);animation:drift2 26s ease-in-out infinite}
  .aurora-3{width:32vw;height:32vw;left:25vw;top:55vh;background:radial-gradient(circle,#0ea5e9,transparent 70%);opacity:.15;animation:drift1 30s ease-in-out infinite}
  .grid-overlay{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,black,transparent 75%)}
  @keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(60px,-40px) scale(1.1)}66%{transform:translate(-30px,60px) scale(.95)}}
  @keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-50px,50px) scale(1.05)}66%{transform:translate(40px,-30px) scale(.98)}}
`

export default function SignupPage() {
  const { lang, dir, setLang } = useLang()
  const tr = t[lang]
  const ar = lang === 'ar'

  const [step,         setStep]         = useState<'form' | 'verify'>('form')
  const [fullName,     setFullName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPw,       setShowPw]       = useState(false)
  const [selectedCode, setSelectedCode] = useState('+20')
  const [phoneNumber,  setPhoneNumber]  = useState('')
  const [website,      setWebsite]      = useState('')
  const [phoneError,   setPhoneError]   = useState('')
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [resending,    setResending]    = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const currentCountry = COUNTRY_CODES.find(c => c.code === selectedCode) || COUNTRY_CODES[0]
  const isValidPhone = phoneNumber.length === currentCountry.digits

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setPhoneError('')

    if (!phoneNumber.trim()) {
      setPhoneError(ar ? 'رقم الهاتف مطلوب' : 'Phone number is required')
      setLoading(false); return
    }
    if (!isValidPhone) {
      setPhoneError(ar
        ? `رقم غير صحيح — يجب أن يكون ${currentCountry.digits} أرقام`
        : `Invalid number — must be ${currentCountry.digits} digits`)
      setLoading(false); return
    }

    const fullPhone = selectedCode + phoneNumber
    const callbackUrl = `${window.location.origin}/auth/callback?next=/dashboard/setup`
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, phone: fullPhone },
        emailRedirectTo: callbackUrl,
      },
    })

    if (error) { setError(error.message); setLoading(false); return }

    if (data.session) {
      // Email confirmation disabled — user is signed in immediately
      if (data.user) {
        await supabase.from('merchants').upsert(
          { id: data.user.id, email, phone: fullPhone, website },
          { onConflict: 'id' }
        )
      }
      recordActivity()
      router.push('/dashboard/setup')
    } else {
      // Email confirmation required — show OTP step
      setLoading(false)
      setStep('verify')
    }
  }

  const handleResend = async () => {
    setResending(true); setError('')
    const callbackUrl = `${window.location.origin}/auth/callback?next=/dashboard/setup`
    await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: callbackUrl } })
    setResending(false)
  }

  return (
    <div dir={dir} className="min-h-screen bg-[#0b0d12] text-white overflow-x-hidden">
      <style>{AURORA_CSS}</style>

      {/* ── aurora background ── */}
      <div className="fixed inset-0 pointer-events-none -z-0" aria-hidden>
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="aurora aurora-3" />
        <div className="grid-overlay" />
      </div>

      {/* ── nav ── */}
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
      <div className="relative z-10 flex items-center justify-center min-h-screen px-5 pt-28 pb-12">
        <div className="w-full max-w-[440px]">

          {step === 'verify' ? (
            /* ── OTP verification step ── */
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#1e3a5c] border border-[#3b82f6]/30 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-[#60a5fa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
                  </svg>
                </div>
                <h2 className="text-[1.75rem] font-black text-white mb-2 tracking-tight">
                  {ar ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
                </h2>
                <p className="text-[#9aa0b4] text-sm leading-relaxed">
                  {ar
                    ? `أرسلنا كود التحقق إلى ${email}. أدخل الكود للمتابعة.`
                    : `We sent a verification code to ${email}. Enter it below to continue.`}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7 space-y-5">
                {/* Email preview chip */}
                <div className="flex items-center gap-3 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-[#60a5fa] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
                  </svg>
                  <span className="text-sm text-white font-medium truncate">{email}</span>
                </div>

                <p className="text-[#9aa0b4] text-sm leading-relaxed">
                  {ar
                    ? 'افتح بريدك الإلكتروني واضغط على زر "تأكيد البريد الإلكتروني" لإكمال إنشاء حسابك.'
                    : 'Open your email and click the "Confirm Email Address" button to complete your account setup.'}
                </p>

                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="text-red-400"><AlertIcon /></span>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="text-center space-y-3">
                  <p className="text-[#6b7a99] text-sm">
                    {ar ? 'لم يصلك الإيميل؟' : "Didn't receive the email?"}{' '}
                    <button
                      onClick={handleResend}
                      disabled={resending}
                      className="text-[#3b82f6] hover:text-[#60a5fa] font-semibold transition-colors disabled:opacity-50 cursor-pointer">
                      {resending ? (ar ? 'جاري الإرسال...' : 'Sending...') : (ar ? 'إعادة الإرسال' : 'Resend')}
                    </button>
                  </p>
                  <p className="text-[#4a5568] text-xs">
                    {ar ? 'تحقق من مجلد السبام إذا لم تجده' : "Check your spam folder if you don't see it"}
                  </p>
                  <button
                    onClick={() => { setStep('form'); setError('') }}
                    className="text-[#4a5568] hover:text-[#9aa0b4] text-xs transition-colors cursor-pointer block mx-auto">
                    {ar ? '← تعديل البريد الإلكتروني' : '← Edit email'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ── Signup form ── */
            <>
          <div className="mb-8">
            <h2 className="text-[2rem] font-black text-white mb-2 tracking-tight">
              {ar ? 'أنشئ حسابك مجاناً 🚀' : 'Create your free account 🚀'}
            </h2>
            <p className="text-[#9aa0b4] text-sm">{tr.createAccount}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7">
            <form onSubmit={handleSignup} className="space-y-4">

              {/* full name */}
              <div>
                <label className={labelCls}>{tr.fullName}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3.5 flex items-center text-[#4a5568] pointer-events-none"><UserIcon /></span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                    placeholder={ar ? 'أحمد محمد' : 'Ahmed Mohamed'}
                    className={inputCls + ' ps-10'} />
                </div>
              </div>

              {/* email */}
              <div>
                <label className={labelCls}>{tr.emailLabel}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3.5 flex items-center text-[#4a5568] pointer-events-none"><MailIcon /></span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com" className={inputCls + ' ps-10'} />
                </div>
              </div>

              {/* password */}
              <div>
                <label className={labelCls}>{tr.passwordLabel}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3.5 flex items-center text-[#4a5568] pointer-events-none"><LockIcon /></span>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••" minLength={6} className={inputCls + ' ps-10 pe-11'} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute inset-y-0 end-0 px-3.5 flex items-center text-[#4a5568] hover:text-[#9aa0b4] transition-colors">
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* phone */}
              <div>
                <label className={labelCls}>{ar ? 'رقم الهاتف' : 'Phone number'}</label>
                <div className="flex gap-2">
                  <div className="relative shrink-0">
                    <select value={selectedCode}
                      onChange={e => { setSelectedCode(e.target.value); setPhoneNumber(''); setPhoneError('') }}
                      className="appearance-none bg-white/[0.06] border border-white/[0.1] rounded-xl ps-3 pe-7 py-3.5 text-white text-sm focus:outline-none focus:border-[#3b82f6]/70 transition-all w-[90px] cursor-pointer">
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code} style={{ background: '#0b0d12' }}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <span className="absolute inset-y-0 end-2 flex items-center pointer-events-none text-[#4a5568]">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 start-3.5 flex items-center text-[#4a5568] pointer-events-none"><PhoneIcon /></span>
                    <input type="tel" value={phoneNumber} dir="ltr"
                      onChange={e => { setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, currentCountry.digits)); setPhoneError('') }}
                      placeholder={currentCountry.placeholder} maxLength={currentCountry.digits}
                      className={`${inputCls} ps-10 ${phoneError ? 'border-red-500/50' : ''}`} />
                  </div>
                </div>
                {phoneError ? (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                    <AlertIcon />{phoneError}
                  </p>
                ) : (
                  <p className="text-[#4a5568] text-[11px] mt-1.5">
                    {currentCountry.flag} {currentCountry.country} — {currentCountry.digits} {ar ? 'أرقام' : 'digits'}
                  </p>
                )}
              </div>

              {/* store name */}
              <div>
                <label className={labelCls}>
                  {ar ? 'اسم متجرك أو صفحتك' : 'Store / page name'}
                  <span className="ms-1.5 normal-case tracking-normal font-normal text-[#4a5568]">
                    ({ar ? 'اختياري' : 'optional'})
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3.5 flex items-center text-[#4a5568] pointer-events-none"><StoreIcon /></span>
                  <input type="text" value={website} onChange={e => setWebsite(e.target.value)}
                    placeholder={ar ? 'مثال: متجر الأناقة، @mystore' : 'e.g. My Store, @mystore'}
                    className={inputCls + ' ps-10'} />
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
                className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                style={{ background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)', boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}>
                <span className={loading ? 'opacity-0' : ''}>{tr.signupBtn}</span>
                {loading && <span className="absolute inset-0 flex items-center justify-center"><SpinnerIcon /></span>}
              </button>

            </form>
          </div>

          <p className="text-sm text-[#6b7a99] mt-6 text-center">
            {tr.haveAccount}{' '}
            <Link href="/login" className="text-[#3b82f6] hover:text-[#60a5fa] font-semibold transition-colors">
              {tr.signinBtn}
            </Link>
          </p>

          <p className="text-[#4a5568] text-xs mt-3 text-center">{tr.freeOrdersNote}</p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
