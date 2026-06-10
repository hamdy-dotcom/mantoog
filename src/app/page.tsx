'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const ar = lang === 'ar'

  useEffect(() => {
    setMounted(true)
  }, [])

  const content = {
    ar: {
      badge: 'مجاني حتى 100 طلب — بدون بطاقة ائتمان',
      headline1: 'أنشئ متجرك الإلكتروني',
      headline2: 'في 60 ثانية',
      sub: 'الذكاء الاصطناعي يصمم صفحة هبوط عربية احترافية من أي رابط منتج — محسّنة للدفع عند الاستلام وأسواق MENA.',
      cta: 'ابدأ مجاناً — 0 جنيه 🚀',
      signin: 'تسجيل الدخول',
      stats: [
        { value: '100', label: 'طلب مجاني للبدء' },
        { value: '+10', label: 'سوق مدعوم' },
        { value: '60s', label: 'لبناء صفحة هبوط' },
        { value: '0', label: 'رسوم شهرية' },
      ],
      how: 'كيف يعمل؟',
      steps: [
        { icon: '🔗', title: 'الصق رابط المنتج', desc: 'من Amazon أو AliExpress أو أي موقع آخر' },
        { icon: '🤖', title: 'Claude يولد المحتوى', desc: 'صفحة هبوط عربية احترافية في ثوانٍ' },
        { icon: '🚀', title: 'انشر وابدأ البيع', desc: 'شارك الرابط في إعلاناتك وابدأ تحقيق الطلبات' },
      ],
      features: 'لماذا Mantoog؟',
      featuresList: [
        { icon: '🌍', title: 'محسّن للسوق العربي', desc: 'لهجات عربية متعددة — مصري، خليجي، مغربي. مع خيارات الدفع عند الاستلام.' },
        { icon: '⚡', title: 'سريع بشكل لا يصدق', desc: 'من رابط المنتج إلى صفحة هبوط جاهزة في أقل من 60 ثانية.' },
        { icon: '📦', title: 'إدارة الطلبات', desc: 'تتبع كل طلب، حالته، وبيانات العميل من لوحة تحكم واحدة.' },
        { icon: '📊', title: 'تحليلات متقدمة', desc: 'معدل التحويل، الزيارات، الطلبات — كل شيء في مكان واحد.' },
        { icon: '🎨', title: 'تصميم احترافي', desc: 'صفحات هبوط جميلة محسّنة للموبايل بلون علامتك التجارية.' },
        { icon: '🔒', title: 'آمن وموثوق', desc: 'مبني على Supabase — بنية تحتية على مستوى المؤسسات.' },
      ],
      cta2: 'ابدأ الآن مجاناً',
      cta2sub: 'لا تحتاج بطاقة ائتمان · 100 طلب مجاني · يمكنك إلغاء الاشتراك في أي وقت',
    },
    en: {
      badge: 'Free until 100 orders — no credit card needed',
      headline1: 'Build your online store',
      headline2: 'in 60 seconds',
      sub: 'AI generates a professional Arabic landing page from any product URL — optimized for COD and MENA markets.',
      cta: 'Start for free — 0 EGP 🚀',
      signin: 'Sign in',
      stats: [
        { value: '100', label: 'Free orders to start' },
        { value: '10+', label: 'Supported markets' },
        { value: '60s', label: 'To build a landing page' },
        { value: '0', label: 'Monthly fee' },
      ],
      how: 'How it works',
      steps: [
        { icon: '🔗', title: 'Paste a product URL', desc: 'From Amazon, AliExpress, or any other site' },
        { icon: '🤖', title: 'Claude generates content', desc: 'Professional Arabic landing page in seconds' },
        { icon: '🚀', title: 'Publish and start selling', desc: 'Share the link in your ads and start getting orders' },
      ],
      features: 'Why Mantoog?',
      featuresList: [
        { icon: '🌍', title: 'Built for Arab markets', desc: 'Multiple Arabic dialects — Egyptian, Gulf, Moroccan. With COD payment options.' },
        { icon: '⚡', title: 'Incredibly fast', desc: 'From product URL to ready landing page in under 60 seconds.' },
        { icon: '📦', title: 'Order management', desc: 'Track every order, its status, and customer data from one dashboard.' },
        { icon: '📊', title: 'Advanced analytics', desc: 'Conversion rate, visits, orders — everything in one place.' },
        { icon: '🎨', title: 'Professional design', desc: 'Beautiful mobile-optimized landing pages in your brand color.' },
        { icon: '🔒', title: 'Secure & reliable', desc: 'Built on Supabase — enterprise-grade infrastructure.' },
      ],
      cta2: 'Start now for free',
      cta2sub: 'No credit card · 100 free orders · Cancel anytime',
    },
  }

  const c = content[lang]

  return (
    <div className="min-h-screen bg-[#0f1117] text-white" dir={ar ? 'rtl' : 'ltr'}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2a2d35]/50 backdrop-blur-xl bg-[#0f1117]/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img src="/logo.svg" alt="Mantoog" className="h-20 w-20 object-contain" />
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              className="text-xs border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              {ar ? 'English' : 'العربية'}
            </button>
            <button onClick={() => router.push('/login')}
              className="text-sm text-[#8b8fa8] hover:text-white transition-colors px-3 py-1.5">
              {c.signin}
            </button>
            <button onClick={() => router.push('/signup')}
              className="text-sm bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-xl font-semibold transition-colors">
              {ar ? 'ابدأ مجاناً' : 'Start free'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Floating 3D objects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            { emoji: '🛍️', x: 5, y: 15, delay: 0, duration: 6, size: 42 },
            { emoji: '📦', x: 88, y: 10, delay: 1, duration: 7, size: 38 },
            { emoji: '🚚', x: 12, y: 60, delay: 2, duration: 8, size: 44 },
            { emoji: '🛒', x: 82, y: 55, delay: 0.5, duration: 6.5, size: 40 },
            { emoji: '💳', x: 92, y: 30, delay: 3, duration: 7.5, size: 34 },
            { emoji: '🏷️', x: 3, y: 38, delay: 1.5, duration: 6, size: 36 },
            { emoji: '📱', x: 75, y: 80, delay: 2.5, duration: 8, size: 38 },
            { emoji: '🎁', x: 20, y: 80, delay: 0.8, duration: 7, size: 40 },
            { emoji: '⚡', x: 50, y: 5, delay: 1.2, duration: 5.5, size: 32 },
            { emoji: '🪑', x: 60, y: 85, delay: 3.5, duration: 7, size: 42 },
            { emoji: '🛋️', x: 35, y: 88, delay: 2, duration: 6.5, size: 44 },
            { emoji: '🍳', x: 95, y: 70, delay: 1.8, duration: 8, size: 36 },
            { emoji: '📣', x: 8, y: 88, delay: 4, duration: 6, size: 38 },
            { emoji: '✨', x: 45, y: 92, delay: 0.3, duration: 5, size: 30 },
            { emoji: '🏠', x: 68, y: 12, delay: 2.8, duration: 7.5, size: 38 },
          ].map((obj, i) => (
            <div
              key={i}
              className="absolute select-none float-obj"
              style={{
                left: `${obj.x}%`,
                top: `${obj.y}%`,
                fontSize: obj.size,
                animation: `float-${i % 3} ${obj.duration}s ease-in-out ${obj.delay}s infinite`,
                filter: 'blur(0.5px)',
              }}
            >
              {obj.emoji}
            </div>
          ))}
        </div>

        {/* Center fade to keep text readable */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(15,17,23,0.85) 0%, transparent 100%)'
        }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 bg-[#1a3a5c] border border-[#3b82f6]/30 text-[#60a5fa] text-xs font-medium px-4 py-2 rounded-full mb-8 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse inline-block" />
            {c.badge}
          </div>

          <img src="/logo.svg" alt="Mantoog" className="w-56 h-56 object-contain mx-auto mb-6" />

          {/* Headline */}
          <h1 className={`text-5xl md:text-7xl font-bold leading-tight mb-6 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            {c.headline1}
            <br />
            <span className="text-[#3b82f6]">{c.headline2}</span>
          </h1>

          {/* Subheadline */}
          <p className={`text-lg text-[#8b8fa8] max-w-2xl mx-auto mb-10 leading-relaxed ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            {c.sub}
          </p>

          {/* CTAs */}
          <div className={`flex items-center justify-center gap-4 flex-wrap ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <button onClick={() => router.push('/signup')}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25">
              {c.cta}
            </button>
            <button onClick={() => router.push('/login')}
              className="border border-[#2a2d35] hover:border-[#3b82f6] text-[#8b8fa8] hover:text-white font-medium px-8 py-4 rounded-2xl text-lg transition-all">
              {c.signin}
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {c.stats.map((stat, i) => (
            <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 text-center hover:border-[#3b82f6] transition-all hover:-translate-y-1 duration-300">
              <div className="text-3xl font-bold text-[#3b82f6] mb-1">{stat.value}</div>
              <div className="text-sm text-[#8b8fa8]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-[#2a2d35]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{c.how}</h2>
          <div className="w-16 h-1 bg-[#3b82f6] rounded-full mx-auto mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {c.steps.map((step, i) => (
              <div key={i} className="relative bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 hover:border-[#3b82f6] transition-all hover:-translate-y-1 duration-300">
                <div className="absolute -top-4 right-6 w-8 h-8 bg-[#3b82f6] rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-[#8b8fa8] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-[#2a2d35]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{c.features}</h2>
          <div className="w-16 h-1 bg-[#3b82f6] rounded-full mx-auto mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.featuresList.map((f, i) => (
              <div key={i} className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl p-6 hover:border-[#3b82f6] transition-all hover:-translate-y-1 duration-300 group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#8b8fa8] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 border-t border-[#2a2d35]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-[#1a3a5c] to-[#1a1d24] border border-[#3b82f6]/30 rounded-3xl p-12">
            <div className="text-5xl mb-6">🚀</div>
            <h2 className="text-3xl font-bold mb-4">{c.cta2}</h2>
            <p className="text-[#8b8fa8] text-sm mb-8">{c.cta2sub}</p>
            <button onClick={() => router.push('/signup')}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25">
              {c.cta}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2d35] px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="font-bold text-white">Mantoog</div>
          <div className="text-xs text-[#4a4e60]">© 2026 Mantoog. {ar ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</div>
          <div className="flex gap-4 text-xs text-[#4a4e60]">
            <a href="/login" className="hover:text-white transition-colors">{ar ? 'تسجيل الدخول' : 'Login'}</a>
            <a href="/signup" className="hover:text-white transition-colors">{ar ? 'إنشاء حساب' : 'Sign up'}</a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-0 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(5deg); }
          66% { transform: translateY(-8px) rotate(-3deg); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(-6deg); }
          66% { transform: translateY(-22px) rotate(4deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(8deg); }
        }
        .float-obj {
          opacity: 0.15;
        }
        @media (max-width: 768px) {
          .float-obj {
            opacity: 0.12;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease forwards;
        }
      `}</style>
    </div>
  )
}
