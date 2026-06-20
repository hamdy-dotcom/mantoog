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
const inputCls = 'w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-[#2a3a4a] focus:outline-none focus:border-[#3b82f6]/60 focus:bg-white/[0.07] transition-all duration-200'
const labelCls = 'block text-[11px] font-semibold text-[#3a5470] uppercase tracking-widest mb-2'

/* ─── page ───────────────────────────────────────────────────────────────── */
export default function SignupPage() {
  const { lang, dir, setLang } = useLang()
  const tr = t[lang]
  const ar = lang === 'ar'

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

  const router = useRouter()
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
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone: fullPhone } },
    })

    if (error) { setError(error.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('merchants').upsert(
        { id: data.user.id, email, phone: fullPhone, website },
        { onConflict: 'id' }
      )
    }

    recordActivity()
    router.push('/dashboard/setup')
  }

  return (
    <div dir={dir} className="min-h-screen flex relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #020913 0%, #06142a 45%, #050c1c 100%)' }}>

      {/* ── page-wide background ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }} />
      <div className="absolute -top-40 -end-20 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)', filter: 'blur(10px)' }} />
      <div className="absolute top-1/2 -start-20 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.13) 0%, transparent 65%)', filter: 'blur(10px)' }} />
      <div className="absolute -bottom-20 start-1/3 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)', filter: 'blur(10px)' }} />

      {/* ── brand panel (RIGHT in RTL) ── */}
      <div className="hidden lg:flex flex-col w-[420px] xl:w-[480px] shrink-0 relative z-10 px-10 xl:px-14 py-12">
        <div className="flex items-center gap-3 mb-16">
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] blur-lg opacity-60" />
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center">
              <img src="/logo.svg" alt="Mantoog" className="w-6 h-6 object-contain" />
            </div>
          </div>
          <span className="text-white text-xl font-bold tracking-tight">منتوج</span>
        </div>

        <div className="flex-1">
          <h1 className="text-[2.6rem] font-black text-white leading-[1.15] mb-5 tracking-tight">
            {ar ? (
              <>ابدأ مجاناً<br />
                <span style={{ background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  متجرك جاهز
                </span><br />في 60 ثانية</>
            ) : (
              <>Start free<br />
                <span style={{ background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  your store ready
                </span><br />in 60 seconds</>
            )}
          </h1>
          <p className="text-[#3a5470] text-[15px] leading-relaxed mb-10">
            {ar ? 'إدارة طلباتك، إعلاناتك، ومتجرك من مكان واحد' : 'Manage orders, ads, and your store in one place'}
          </p>

          <div className="space-y-4 mb-12">
            {[
              { icon: '🆓', ar: '١٠٠ طلب مجاني — بدون بطاقة ائتمان', en: '100 free orders — no credit card' },
              { icon: '⚡', ar: 'متجرك جاهز في أقل من دقيقة',         en: 'Your store live in under a minute' },
              { icon: '📊', ar: 'تقارير + إعلانات TikTok مدمجة',       en: 'Reports + TikTok ads built in'   },
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

      {/* ── vertical divider ── */}
      <div className="hidden lg:block w-px self-stretch my-14 shrink-0"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.07) 75%, transparent)' }} />

      {/* ── form area (LEFT in RTL) ── */}
      <div className="flex-1 flex flex-col relative z-10 px-6 sm:px-10">

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[420px]">

            {/* mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="relative w-11 h-11 shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] blur-xl opacity-50" />
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#7c5cff] flex items-center justify-center shadow-xl shadow-blue-600/30">
                  <img src="/logo.svg" alt="Mantoog" className="w-6 h-6 object-contain" />
                </div>
              </div>
              <span className="text-white text-xl font-black tracking-tight">منتوج</span>
            </div>

            {/* heading */}
            <div className="mb-7">
              <h2 className="text-[1.9rem] font-black text-white mb-2 tracking-tight">
                {ar ? 'أنشئ حسابك مجاناً 🚀' : 'Create your free account 🚀'}
              </h2>
              <p className="text-[#3a5470] text-sm">{tr.createAccount}</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">

              {/* full name */}
              <div>
                <label className={labelCls}>{tr.fullName}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3.5 flex items-center text-[#2a3a4a] pointer-events-none"><UserIcon /></span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                    placeholder={ar ? 'أحمد محمد' : 'Ahmed Mohamed'}
                    className={inputCls + ' ps-10'} />
                </div>
              </div>

              {/* email */}
              <div>
                <label className={labelCls}>{tr.emailLabel}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3.5 flex items-center text-[#2a3a4a] pointer-events-none"><MailIcon /></span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    className={inputCls + ' ps-10'} />
                </div>
              </div>

              {/* password */}
              <div>
                <label className={labelCls}>{tr.passwordLabel}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3.5 flex items-center text-[#2a3a4a] pointer-events-none"><LockIcon /></span>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••" minLength={6}
                    className={inputCls + ' ps-10 pe-11'} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute inset-y-0 end-0 px-3.5 flex items-center text-[#2a3a4a] hover:text-[#64748b] transition-colors">
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* phone */}
              <div>
                <label className={labelCls}>{ar ? 'رقم الهاتف' : 'Phone number'}</label>
                <div className="flex gap-2">
                  {/* country code select */}
                  <div className="relative shrink-0">
                    <select value={selectedCode}
                      onChange={e => { setSelectedCode(e.target.value); setPhoneNumber(''); setPhoneError('') }}
                      className="appearance-none bg-white/[0.05] border border-white/[0.1] rounded-xl ps-3 pe-7 py-3 text-white text-sm focus:outline-none focus:border-[#3b82f6]/60 transition-all w-[90px] cursor-pointer"
                      style={{ backgroundImage: 'none' }}>
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code} style={{ background: '#06142a' }}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <span className="absolute inset-y-0 end-2 flex items-center pointer-events-none text-[#2a3a4a]">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                    </span>
                  </div>
                  {/* number input */}
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 start-3.5 flex items-center text-[#2a3a4a] pointer-events-none"><PhoneIcon /></span>
                    <input type="tel" value={phoneNumber} dir="ltr"
                      onChange={e => { setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, currentCountry.digits)); setPhoneError('') }}
                      placeholder={currentCountry.placeholder}
                      maxLength={currentCountry.digits}
                      className={`${inputCls} ps-10 ${phoneError ? 'border-red-500/50 focus:border-red-500/70' : ''}`} />
                  </div>
                </div>
                {phoneError ? (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                    <span className="w-3 h-3 text-red-400 shrink-0"><AlertIcon /></span>{phoneError}
                  </p>
                ) : (
                  <p className="text-[#2a4060] text-[11px] mt-1.5">
                    {ar ? `${currentCountry.flag} ${currentCountry.country} — ${currentCountry.digits} أرقام` : `${currentCountry.flag} ${currentCountry.country} — ${currentCountry.digits} digits`}
                  </p>
                )}
              </div>

              {/* website / store name (optional) */}
              <div>
                <label className={labelCls}>
                  {ar ? 'اسم متجرك أو صفحتك' : 'Store / page name'}
                  <span className="ms-1.5 text-[#1a3050] normal-case tracking-normal font-normal">
                    {ar ? '(اختياري)' : '(optional)'}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 start-3.5 flex items-center text-[#2a3a4a] pointer-events-none"><StoreIcon /></span>
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
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', boxShadow: '0 4px 28px rgba(37,99,235,0.35)' }}>
                <span className={loading ? 'opacity-0' : ''}>{tr.signupBtn}</span>
                {loading && <span className="absolute inset-0 flex items-center justify-center"><SpinnerIcon /></span>}
              </button>

            </form>

            <p className="text-sm text-[#2a3a4a] mt-6">
              {tr.haveAccount}{' '}
              <Link href="/login" className="text-[#3b82f6] hover:text-[#60a5fa] font-semibold transition-colors">
                {tr.signinBtn}
              </Link>
            </p>

            <p className="text-[#1e3a5f] text-xs mt-3">{tr.freeOrdersNote}</p>

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
