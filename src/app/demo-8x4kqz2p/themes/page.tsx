'use client'
import { useState } from 'react'

type CardStyle = 'standard'|'editorial'|'wellness'|'tech'|'playful'|'brutalist'|'gallery'|'clinical'|'artisan'|'hype'|'fashion'
type LayoutKey = 'centered'|'editorial'|'wellness'|'dark_tech'|'playful'|'brutalist'|'gallery'|'trust'|'artisan'|'neon'|'fashion'

type Theme = {
  id:string; nameAr:string; nicheAr:string; emoji:string; dark:boolean
  cardStyle:CardStyle; layout:LayoutKey
  pageBg:string; sectionBg:string; cardBg:string; navBg:string; footerBg:string
  formBg:string; inputBg:string; border:string; inputBorder:string; cardBorder:string
  text:string; subtext:string; muted:string
  accent:string; accentDark:string; accentText:string; accentGlow:string
  badgeBg:string; badgeText:string; discountBg:string
  timerBg:string; timerText:string
  font:string; headingFont:string; headingWeight:number
  radius:string; radiusSm:string; radiusBtn:string
  heroGradient:string; heroTextColor:string; starColor:string; divider:string; urgencyBg:string
}

const T:Theme[] = [
  { id:'classic', nameAr:'كلاسيك', nicheAr:'متعدد الاستخدامات', emoji:'🛒', dark:false, cardStyle:'standard', layout:'centered',
    pageBg:'#f8f9fc', sectionBg:'#f0f2f8', cardBg:'#fff', navBg:'rgba(255,255,255,0.92)', footerBg:'#111827',
    formBg:'#fff', inputBg:'#f9fafb', border:'#e4e7ef', inputBorder:'#d1d5db', cardBorder:'#e4e7ef',
    text:'#111827', subtext:'#374151', muted:'#9ca3af',
    accent:'#2563eb', accentDark:'#1d4ed8', accentText:'#fff', accentGlow:'rgba(37,99,235,0.15)',
    badgeBg:'#dbeafe', badgeText:'#1d4ed8', discountBg:'#dc2626', timerBg:'#1e3a8a', timerText:'#fff',
    font:"'Inter',system-ui,sans-serif", headingFont:"'Inter',system-ui,sans-serif", headingWeight:800,
    radius:'14px', radiusSm:'8px', radiusBtn:'10px',
    heroGradient:'linear-gradient(135deg,#eff6ff 0%,#f8f9fc 60%,#e0e7ff 100%)', heroTextColor:'#111827',
    starColor:'#f59e0b', divider:'#e4e7ef', urgencyBg:'#dc2626' },

  { id:'luxe', nameAr:'لوكس', nicheAr:'مجوهرات · موضة · عطور', emoji:'👑', dark:true, cardStyle:'editorial', layout:'editorial',
    pageBg:'#080808', sectionBg:'#111', cardBg:'#141414', navBg:'rgba(8,8,8,0.95)', footerBg:'#030303',
    formBg:'#141414', inputBg:'#1a1a1a', border:'#2a2218', inputBorder:'#2a2218', cardBorder:'#2a2218',
    text:'#f5f0e8', subtext:'#c9b99a', muted:'#7a6a50',
    accent:'#c9993a', accentDark:'#a87c28', accentText:'#0a0a0a', accentGlow:'rgba(201,153,58,0.22)',
    badgeBg:'rgba(201,153,58,0.12)', badgeText:'#c9993a', discountBg:'#7a3000', timerBg:'rgba(201,153,58,0.1)', timerText:'#c9993a',
    font:"'Cormorant Garamond',Georgia,serif", headingFont:"'Cormorant Garamond',Georgia,serif", headingWeight:600,
    radius:'0px', radiusSm:'0px', radiusBtn:'0px',
    heroGradient:'radial-gradient(ellipse at 50% 0%,rgba(201,153,58,0.12) 0%,#080808 60%)', heroTextColor:'#f5f0e8',
    starColor:'#c9993a', divider:'#2a2218', urgencyBg:'#7a3000' },

  { id:'fresh', nameAr:'فريش', nicheAr:'صحة · غذاء · مكملات', emoji:'🌿', dark:false, cardStyle:'wellness', layout:'wellness',
    pageBg:'#f0faf4', sectionBg:'#e8f7ee', cardBg:'#fff', navBg:'rgba(240,250,244,0.92)', footerBg:'#14532d',
    formBg:'#f7fef9', inputBg:'#f0faf4', border:'#bbf7d0', inputBorder:'#86efac', cardBorder:'#bbf7d0',
    text:'#14532d', subtext:'#166534', muted:'#6b7280',
    accent:'#16a34a', accentDark:'#15803d', accentText:'#fff', accentGlow:'rgba(22,163,74,0.18)',
    badgeBg:'#dcfce7', badgeText:'#15803d', discountBg:'#dc2626', timerBg:'#14532d', timerText:'#bbf7d0',
    font:"'DM Sans',system-ui,sans-serif", headingFont:"'DM Sans',system-ui,sans-serif", headingWeight:800,
    radius:'18px', radiusSm:'10px', radiusBtn:'50px',
    heroGradient:'linear-gradient(135deg,#dcfce7 0%,#f0faf4 100%)', heroTextColor:'#14532d',
    starColor:'#f59e0b', divider:'#bbf7d0', urgencyBg:'#15803d' },

  { id:'bolt', nameAr:'بولت', nicheAr:'إلكترونيات · جيمنج · تقنية', emoji:'⚡', dark:true, cardStyle:'tech', layout:'dark_tech',
    pageBg:'#080c10', sectionBg:'#0a0f14', cardBg:'#0d1117', navBg:'rgba(8,12,16,0.95)', footerBg:'#050709',
    formBg:'#0d1117', inputBg:'#0d1117', border:'#1f2d3d', inputBorder:'#21262d', cardBorder:'#1f2d3d',
    text:'#e6edf3', subtext:'#8b949e', muted:'#484f58',
    accent:'#00d4ff', accentDark:'#00aed4', accentText:'#000', accentGlow:'rgba(0,212,255,0.2)',
    badgeBg:'rgba(0,212,255,0.1)', badgeText:'#00d4ff', discountBg:'#7c3aed', timerBg:'rgba(0,212,255,0.08)', timerText:'#00d4ff',
    font:"'Space Grotesk',system-ui,sans-serif", headingFont:"'Space Grotesk',system-ui,sans-serif", headingWeight:700,
    radius:'8px', radiusSm:'4px', radiusBtn:'6px',
    heroGradient:'radial-gradient(ellipse at 50% -20%,rgba(0,212,255,0.15) 0%,#080c10 55%)', heroTextColor:'#e6edf3',
    starColor:'#00d4ff', divider:'#1f2d3d', urgencyBg:'#7c3aed' },

  { id:'soft', nameAr:'سوفت', nicheAr:'أطفال · هدايا · عناية بالبشرة', emoji:'🌸', dark:false, cardStyle:'playful', layout:'playful',
    pageBg:'#fdf4ff', sectionBg:'#fae8ff', cardBg:'#fff', navBg:'rgba(253,244,255,0.92)', footerBg:'#2e1065',
    formBg:'#faf5ff', inputBg:'#fdf4ff', border:'#f0abfc', inputBorder:'#e879f9', cardBorder:'#f0abfc',
    text:'#3b0764', subtext:'#6b21a8', muted:'#a855f7',
    accent:'#c026d3', accentDark:'#a21caf', accentText:'#fff', accentGlow:'rgba(192,38,211,0.15)',
    badgeBg:'#fae8ff', badgeText:'#a21caf', discountBg:'#9333ea', timerBg:'#3b0764', timerText:'#f0abfc',
    font:"'Nunito',system-ui,sans-serif", headingFont:"'Nunito',system-ui,sans-serif", headingWeight:800,
    radius:'24px', radiusSm:'14px', radiusBtn:'50px',
    heroGradient:'linear-gradient(135deg,#fae8ff 0%,#fdf4ff 60%,#ede9fe 100%)', heroTextColor:'#3b0764',
    starColor:'#f59e0b', divider:'#f0abfc', urgencyBg:'#9333ea' },

  { id:'bold', nameAr:'بولد', nicheAr:'ستريت · رياضة · شباب', emoji:'🔥', dark:false, cardStyle:'brutalist', layout:'brutalist',
    pageBg:'#fff', sectionBg:'#f3f4f6', cardBg:'#fff', navBg:'#000', footerBg:'#000',
    formBg:'#f3f4f6', inputBg:'#fff', border:'#111827', inputBorder:'#111827', cardBorder:'#111827',
    text:'#000', subtext:'#1f2937', muted:'#6b7280',
    accent:'#000', accentDark:'#1f2937', accentText:'#fff', accentGlow:'rgba(0,0,0,0.1)',
    badgeBg:'#000', badgeText:'#fff', discountBg:'#dc2626', timerBg:'#111827', timerText:'#fff',
    font:"'Space Grotesk',system-ui,sans-serif", headingFont:"'Space Grotesk',system-ui,sans-serif", headingWeight:900,
    radius:'0px', radiusSm:'0px', radiusBtn:'0px',
    heroGradient:'#000', heroTextColor:'#fff', starColor:'#f59e0b', divider:'#e5e7eb', urgencyBg:'#dc2626' },

  { id:'minimal', nameAr:'مينيمال', nicheAr:'ديكور · أثاث · فن', emoji:'🏺', dark:false, cardStyle:'gallery', layout:'gallery',
    pageBg:'#fafaf9', sectionBg:'#f5f5f4', cardBg:'#fff', navBg:'rgba(250,250,249,0.95)', footerBg:'#1c1917',
    formBg:'#fff', inputBg:'#fafaf9', border:'#e7e5e4', inputBorder:'#d6d3d1', cardBorder:'#e7e5e4',
    text:'#1c1917', subtext:'#57534e', muted:'#a8a29e',
    accent:'#a16207', accentDark:'#92400e', accentText:'#fff', accentGlow:'rgba(161,98,7,0.12)',
    badgeBg:'#fef9c3', badgeText:'#854d0e', discountBg:'#b45309', timerBg:'#1c1917', timerText:'#fef9c3',
    font:"'Playfair Display',Georgia,serif", headingFont:"'Playfair Display',Georgia,serif", headingWeight:700,
    radius:'2px', radiusSm:'2px', radiusBtn:'2px',
    heroGradient:'#fafaf9', heroTextColor:'#1c1917', starColor:'#f59e0b', divider:'#e7e5e4', urgencyBg:'#92400e' },

  { id:'trust', nameAr:'تراست', nicheAr:'طب · صيدلة · معدات', emoji:'💊', dark:false, cardStyle:'clinical', layout:'trust',
    pageBg:'#f0f7ff', sectionBg:'#e6f2ff', cardBg:'#fff', navBg:'rgba(255,255,255,0.95)', footerBg:'#0f172a',
    formBg:'#f8faff', inputBg:'#f8faff', border:'#bfdbfe', inputBorder:'#93c5fd', cardBorder:'#bfdbfe',
    text:'#1e3a5f', subtext:'#1e40af', muted:'#64748b',
    accent:'#1d4ed8', accentDark:'#1e40af', accentText:'#fff', accentGlow:'rgba(29,78,216,0.15)',
    badgeBg:'#dbeafe', badgeText:'#1e40af', discountBg:'#dc2626', timerBg:'#1e3a8a', timerText:'#bfdbfe',
    font:"'DM Sans',system-ui,sans-serif", headingFont:"'DM Sans',system-ui,sans-serif", headingWeight:700,
    radius:'8px', radiusSm:'4px', radiusBtn:'6px',
    heroGradient:'linear-gradient(135deg,#dbeafe 0%,#f0f7ff 100%)', heroTextColor:'#1e3a5f',
    starColor:'#f59e0b', divider:'#bfdbfe', urgencyBg:'#1d4ed8' },

  { id:'warm', nameAr:'وارم', nicheAr:'يدوي · محلي · حرفي', emoji:'🤝', dark:false, cardStyle:'artisan', layout:'artisan',
    pageBg:'#fdf6ee', sectionBg:'#fbecd8', cardBg:'#fffbf5', navBg:'rgba(253,246,238,0.95)', footerBg:'#2c1200',
    formBg:'#fffbf5', inputBg:'#fdf6ee', border:'#e8c9a0', inputBorder:'#d9b48c', cardBorder:'#e8c9a0',
    text:'#3d1c00', subtext:'#7c4a1e', muted:'#b07d52',
    accent:'#c2612a', accentDark:'#a84f22', accentText:'#fff', accentGlow:'rgba(194,97,42,0.18)',
    badgeBg:'#fef3e2', badgeText:'#92400e', discountBg:'#92400e', timerBg:'#3d1c00', timerText:'#fef3e2',
    font:"'Lora',Georgia,serif", headingFont:"'Lora',Georgia,serif", headingWeight:700,
    radius:'12px', radiusSm:'8px', radiusBtn:'50px',
    heroGradient:'linear-gradient(135deg,#fef3e2 0%,#fdf6ee 100%)', heroTextColor:'#3d1c00',
    starColor:'#c2612a', divider:'#e8c9a0', urgencyBg:'#92400e' },

  { id:'neon', nameAr:'نيون', nicheAr:'بيوتي · كوزميتكس · هايب', emoji:'✨', dark:true, cardStyle:'hype', layout:'neon',
    pageBg:'#07001a', sectionBg:'#0a0020', cardBg:'rgba(255,255,255,0.05)', navBg:'rgba(7,0,26,0.9)', footerBg:'#030008',
    formBg:'rgba(255,255,255,0.04)', inputBg:'rgba(255,255,255,0.06)', border:'rgba(168,85,247,0.25)', inputBorder:'rgba(168,85,247,0.35)', cardBorder:'rgba(168,85,247,0.2)',
    text:'#f8f0ff', subtext:'#d8b4fe', muted:'#7c3aed',
    accent:'#a855f7', accentDark:'#7c3aed', accentText:'#fff', accentGlow:'rgba(168,85,247,0.3)',
    badgeBg:'rgba(168,85,247,0.18)', badgeText:'#e879f9', discountBg:'#be185d', timerBg:'rgba(168,85,247,0.12)', timerText:'#e879f9',
    font:"'Outfit',system-ui,sans-serif", headingFont:"'Outfit',system-ui,sans-serif", headingWeight:800,
    radius:'16px', radiusSm:'10px', radiusBtn:'50px',
    heroGradient:'radial-gradient(ellipse at 50% -10%,rgba(168,85,247,0.35) 0%,rgba(190,24,93,0.12) 40%,#07001a 70%)', heroTextColor:'#f8f0ff',
    starColor:'#e879f9', divider:'rgba(168,85,247,0.2)', urgencyBg:'#be185d' },

  { id:'fashion', nameAr:'موضة', nicheAr:'ملابس · موضة · إكسسوارات', emoji:'👗', dark:false, cardStyle:'fashion', layout:'fashion',
    pageBg:'#faf8f5', sectionBg:'#f2ede8', cardBg:'#fff', navBg:'rgba(250,248,245,0.97)', footerBg:'#1a1a1a',
    formBg:'#fff', inputBg:'#faf8f5', border:'#e5ddd6', inputBorder:'#c8b8a8', cardBorder:'transparent',
    text:'#1a1a1a', subtext:'#4a4040', muted:'#9a8880',
    accent:'#1a1a1a', accentDark:'#000', accentText:'#fff', accentGlow:'rgba(26,26,26,0.08)',
    badgeBg:'#1a1a1a', badgeText:'#fff', discountBg:'#8b1a1a', timerBg:'#1a1a1a', timerText:'#faf8f5',
    font:"'DM Sans',system-ui,sans-serif", headingFont:"'Playfair Display',Georgia,serif", headingWeight:700,
    radius:'0px', radiusSm:'0px', radiusBtn:'0px',
    heroGradient:'#1a1a1a', heroTextColor:'#faf8f5',
    starColor:'#c9993a', divider:'#e5ddd6', urgencyBg:'#8b1a1a' },
]

const PRODUCTS = [
  { id:1, emoji:'🎧', name:'سماعة إيربودز برو',   price:299, compare:599, tag:'الأكثر مبيعاً', specs:['ANC فعّال','30 ساعة بطارية'],    benefit:'مُعزز للتركيز والإنتاجية',  orders:324 },
  { id:2, emoji:'⌚', name:'ساعة ذكية سبورت',      price:449, compare:799, tag:'جديد',          specs:['GPS دقيق','مقاومة للماء'],        benefit:'تتبّع صحتك يومياً',          orders:198 },
  { id:3, emoji:'🎒', name:'حقيبة ظهر عملية',      price:199, compare:350, tag:'',              specs:['20 لتر','USB شارج'],              benefit:'رفيقك في كل رحلة',           orders:412 },
  { id:4, emoji:'💡', name:'مصباح ذكي LED',         price:89,  compare:149, tag:'خصم 40%',       specs:['16 مليون لون','تحكم صوتي'],       benefit:'أضاءة مريحة لعيونك',         orders:156 },
  { id:5, emoji:'🧴', name:'كريم ترطيب فاخر',      price:129, compare:220, tag:'',              specs:['100% طبيعي','خالي من البارابين'],  benefit:'بشرة نضرة ومشرقة',           orders:287 },
  { id:6, emoji:'📱', name:'حامل هاتف مغناطيسي',   price:59,  compare:99,  tag:'مميز',          specs:['MagSafe','360°'],                benefit:'ثبات مثالي في السيارة',       orders:543 },
]
type Product = typeof PRODUCTS[0]
const STORE = { name:'متجر النجوم', tagline:'اكتشف منتجات مميزة بأفضل الأسعار' }

/* ── HERO VARIANTS ────────────────────────────────────────────────── */
function StoreHero({ k, onShop }:{ k:Theme; onShop:()=>void }) {

  if (k.layout === 'editorial') return (
    <div style={{ display:'flex', alignItems:'center', gap:40, padding:'60px 32px', borderBottom:`1px solid ${k.border}` }}>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:10, letterSpacing:'0.25em', color:k.muted, textTransform:'uppercase', marginBottom:14 }}>COLLECTION 2025</p>
        <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:52, color:k.accent, lineHeight:1.05, margin:'0 0 16px' }}>{STORE.name}</h1>
        <div style={{ width:48, height:1, background:k.accent, marginBottom:18 }} />
        <p style={{ fontSize:14, color:k.subtext, lineHeight:1.9, marginBottom:30 }}>{STORE.tagline}</p>
        <button onClick={onShop} style={{ background:'transparent', color:k.accent, border:`1px solid ${k.accent}`, padding:'10px 28px', fontSize:11, letterSpacing:'0.12em', cursor:'pointer', textTransform:'uppercase', fontFamily:k.font }}>SHOP NOW →</button>
      </div>
      <div style={{ fontSize:90, opacity:0.7, flexShrink:0 }}>👑</div>
    </div>
  )

  if (k.layout === 'wellness') return (
    <div style={{ background:k.heroGradient, padding:'44px 24px', textAlign:'center', borderBottom:`1px solid ${k.border}` }}>
      <div style={{ fontSize:32, marginBottom:8 }}>🌿🍃🌱</div>
      <div style={{ display:'inline-block', background:k.accent, color:'#fff', fontSize:10, fontWeight:700, padding:'4px 14px', borderRadius:50, marginBottom:14, letterSpacing:'0.08em' }}>100% طبيعي · خالٍ من المواد الكيميائية</div>
      <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:36, color:k.heroTextColor, margin:'0 0 10px' }}>{STORE.name}</h1>
      <p style={{ color:k.subtext, fontSize:13, marginBottom:22 }}>{STORE.tagline}</p>
      <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
        <button onClick={onShop} style={{ background:k.accent, color:'#fff', border:'none', padding:'11px 24px', borderRadius:50, fontSize:13, fontWeight:700, cursor:'pointer' }}>🌿 تسوق الآن</button>
        <button style={{ background:'#fff', color:k.accent, border:`1px solid ${k.accent}`, padding:'11px 18px', borderRadius:50, fontSize:12, cursor:'pointer' }}>تعرف علينا</button>
      </div>
    </div>
  )

  if (k.layout === 'dark_tech') return (
    <div style={{ background:k.heroGradient, padding:'56px 24px', textAlign:'center', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:`radial-gradient(circle,${k.accentGlow} 1px,transparent 1px)`, backgroundSize:'24px 24px', opacity:0.5, pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'inline-block', background:k.badgeBg, border:`1px solid ${k.accent}`, color:k.accent, fontSize:10, fontWeight:700, padding:'4px 14px', borderRadius:4, marginBottom:16, letterSpacing:'0.1em' }}>⚡ NEW DROP 2025</div>
        <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:44, color:k.accent, margin:'0 0 10px', textShadow:`0 0 30px ${k.accent}` }}>{STORE.name}</h1>
        <p style={{ color:k.subtext, fontSize:13, marginBottom:26 }}>{STORE.tagline}</p>
        <button onClick={onShop} style={{ background:k.accent, color:k.accentText, border:'none', padding:'11px 24px', borderRadius:k.radiusBtn, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:`0 0 24px ${k.accent}` }}>تسوق الآن</button>
        <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:22, flexWrap:'wrap' }}>
          {['سماعات','ساعات','إكسسوارات','جيمنج'].map(c=>(
            <div key={c} style={{ fontSize:10, color:k.muted, padding:'4px 12px', border:`1px solid ${k.border}`, borderRadius:4, cursor:'pointer' }}>{c}</div>
          ))}
        </div>
      </div>
    </div>
  )

  if (k.layout === 'playful') return (
    <div style={{ background:k.heroGradient, padding:'44px 24px', textAlign:'center', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:130, height:130, borderRadius:'50%', background:'rgba(192,38,211,0.1)', top:-30, right:'8%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:80, height:80, borderRadius:'50%', background:'rgba(147,51,234,0.1)', bottom:-20, left:'12%', pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ fontSize:30, marginBottom:6 }}>🌸💕✨</div>
        <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:34, color:k.heroTextColor, margin:'0 0 8px' }}>{STORE.name}</h1>
        <p style={{ color:k.subtext, fontSize:13, marginBottom:20 }}>{STORE.tagline}</p>
        <button onClick={onShop} style={{ background:`linear-gradient(135deg,${k.accent},#9333ea)`, color:'#fff', border:'none', padding:'12px 28px', borderRadius:50, fontSize:14, fontWeight:800, cursor:'pointer' }}>💕 تسوقي الآن</button>
      </div>
    </div>
  )

  if (k.layout === 'brutalist') return (
    <div>
      <div style={{ background:'#000', padding:'44px 24px' }}>
        <p style={{ fontSize:10, color:'#555', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:10 }}>EST. 2025 — {STORE.name}</p>
        <h1 style={{ fontFamily:k.headingFont, fontWeight:900, fontSize:'clamp(40px,9vw,76px)', color:'#fff', margin:0, lineHeight:0.9, textTransform:'uppercase' }}>SHOP<br/>THE<br/>BEST</h1>
      </div>
      <div style={{ background:k.discountBg, padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'#fff', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>🔥 عروض محدودة</span>
        <button onClick={onShop} style={{ background:'#fff', color:'#000', border:'none', padding:'8px 20px', fontSize:12, fontWeight:900, cursor:'pointer', textTransform:'uppercase' }}>تسوق الآن →</button>
      </div>
    </div>
  )

  if (k.layout === 'gallery') return (
    <div style={{ padding:'72px 32px', textAlign:'center', borderBottom:`1px solid ${k.divider}` }}>
      <p style={{ fontSize:10, letterSpacing:'0.25em', color:k.muted, textTransform:'uppercase', marginBottom:18 }}>{STORE.name}</p>
      <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:50, color:k.text, margin:'0 0 6px', lineHeight:1.05 }}>مجموعة ٢٠٢٥</h1>
      <div style={{ width:28, height:1, background:k.accent, margin:'18px auto' }} />
      <p style={{ fontSize:12, color:k.muted, marginBottom:28 }}>{STORE.tagline}</p>
      <button onClick={onShop} style={{ background:'transparent', color:k.text, border:`1px solid ${k.text}`, padding:'10px 28px', fontSize:11, letterSpacing:'0.12em', cursor:'pointer', textTransform:'uppercase', fontFamily:k.headingFont }}>اكتشف المجموعة</button>
    </div>
  )

  if (k.layout === 'trust') return (
    <div>
      <div style={{ background:k.accent, padding:'36px 24px', textAlign:'center' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.8)', marginBottom:10 }}>✅ منتجات موثوقة · ضمان رسمي · شحن آمن</p>
        <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:34, color:'#fff', margin:'0 0 10px' }}>{STORE.name}</h1>
        <p style={{ color:'rgba(255,255,255,0.85)', fontSize:13, marginBottom:20 }}>{STORE.tagline}</p>
        <button onClick={onShop} style={{ background:'#fff', color:k.accent, border:'none', padding:'11px 24px', borderRadius:k.radiusBtn, fontSize:13, fontWeight:700, cursor:'pointer' }}>تسوق بثقة →</button>
      </div>
      <div style={{ background:k.sectionBg, padding:'10px 24px', display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap', borderBottom:`1px solid ${k.border}` }}>
        {['🏅 ضمان سنة','🚚 شحن مجاني','↩️ إرجاع مجاني','✅ منتجات أصلية'].map(b=>(
          <span key={b} style={{ fontSize:11, color:k.subtext, fontWeight:600 }}>{b}</span>
        ))}
      </div>
    </div>
  )

  if (k.layout === 'artisan') return (
    <div style={{ background:k.heroGradient, padding:'48px 24px', textAlign:'center', borderBottom:`2px dashed ${k.border}` }}>
      <div style={{ display:'inline-block', background:k.badgeBg, color:k.accent, fontSize:11, fontWeight:700, padding:'5px 14px', borderRadius:50, marginBottom:16, border:`1px solid ${k.border}` }}>🤝 صنع بأيدٍ محلية · نكهة أصيلة</div>
      <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:38, color:k.heroTextColor, margin:'0 0 10px' }}>{STORE.name}</h1>
      <p style={{ color:k.subtext, fontSize:14, marginBottom:24, fontStyle:'italic' }}>{STORE.tagline}</p>
      <button onClick={onShop} style={{ background:k.accent, color:'#fff', border:'none', padding:'12px 28px', borderRadius:50, fontSize:13, fontWeight:700, cursor:'pointer' }}>اكتشف المنتجات 🌾</button>
    </div>
  )

  if (k.layout === 'neon') return (
    <div style={{ background:k.heroGradient, padding:'56px 24px', textAlign:'center', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'rgba(168,85,247,0.15)', filter:'blur(80px)', top:-100, left:'50%', transform:'translateX(-50%)', pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1 }}>
        <p style={{ fontSize:11, color:'#e879f9', fontWeight:700, marginBottom:10 }}>✨ 12,430 طلب هذا الشهر</p>
        <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:44, margin:'0 0 10px', background:'linear-gradient(135deg,#f8f0ff,#e879f9)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{STORE.name}</h1>
        <p style={{ color:k.subtext, fontSize:13, marginBottom:24 }}>{STORE.tagline}</p>
        <button onClick={onShop} style={{ background:'linear-gradient(135deg,#a855f7,#be185d)', color:'#fff', border:'none', padding:'12px 28px', borderRadius:50, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 0 30px rgba(168,85,247,0.5)' }}>✨ تسوقي الآن</button>
      </div>
    </div>
  )

  if (k.layout === 'fashion') return (
    <div>
      {/* Editorial dark hero strip */}
      <div style={{ background:'#1a1a1a', padding:'52px 28px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(-45deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 0,transparent 8px)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <p style={{ fontSize:9, letterSpacing:'0.38em', color:'#9a8880', textTransform:'uppercase', margin:'0 0 22px', fontFamily:"'DM Sans',system-ui,sans-serif" }}>NEW COLLECTION — SPRING / SUMMER 2025</p>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:46, color:'#faf8f5', lineHeight:1.08, margin:'0 0 22px' }}>
            الأناقة<br/>في كل خطوة
          </h1>
          <div style={{ width:30, height:1, background:'rgba(250,248,245,0.25)', margin:'0 auto 24px' }} />
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={onShop} style={{ background:'transparent', color:'#faf8f5', border:'1px solid rgba(250,248,245,0.45)', padding:'11px 26px', fontSize:10, letterSpacing:'0.16em', cursor:'pointer', textTransform:'uppercase', fontFamily:"'DM Sans',system-ui,sans-serif" }}>اكتشف المجموعة</button>
            <button style={{ background:'#faf8f5', color:'#1a1a1a', border:'none', padding:'11px 22px', fontSize:10, letterSpacing:'0.12em', cursor:'pointer', textTransform:'uppercase', fontFamily:"'DM Sans',system-ui,sans-serif", fontWeight:700 }}>تخفيضات الموسم</button>
          </div>
        </div>
      </div>
      {/* Category navigation strip */}
      <div style={{ background:'#faf8f5', borderBottom:'1px solid #e5ddd6', padding:'0 20px', display:'flex', gap:0, overflowX:'auto' }}>
        {['الكل','نساء','رجال','أطفال','إكسسوارات','تخفيضات'].map((cat,i)=>(
          <button key={cat} style={{ padding:'12px 18px', background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:i===0?700:400, color:i===0?'#1a1a1a':'#9a8880', borderBottom:i===0?'2px solid #1a1a1a':'2px solid transparent', flexShrink:0, letterSpacing:'0.06em', fontFamily:"'DM Sans',system-ui,sans-serif", whiteSpace:'nowrap' }}>{cat}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ background:k.heroGradient, padding:'56px 24px', textAlign:'center' }}>
      <div style={{ display:'inline-block', background:k.badgeBg, color:k.badgeText, fontSize:10, fontWeight:700, padding:'5px 14px', borderRadius:50, marginBottom:16 }}>✦ متجر موثوق · توصيل سريع</div>
      <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:40, color:k.heroTextColor, margin:'0 0 10px' }}>{STORE.name}</h1>
      <p style={{ color:k.subtext, fontSize:14, marginBottom:24 }}>{STORE.tagline}</p>
      <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
        <button onClick={onShop} style={{ background:k.accent, color:k.accentText, border:'none', padding:'12px 24px', borderRadius:k.radiusBtn, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:`0 4px 20px ${k.accentGlow}` }}>تسوق الآن ↓</button>
        <button style={{ background:'transparent', color:k.subtext, border:`1px solid ${k.border}`, padding:'12px 18px', borderRadius:k.radiusBtn, fontSize:13, cursor:'pointer' }}>تواصل معنا</button>
      </div>
    </div>
  )
}

/* ── PRODUCT CARD VARIANTS ────────────────────────────────────────── */
function ProductCard({ p, k, onClick }:{ p:Product; k:Theme; onClick:()=>void }) {
  const disc = Math.round((1-p.price/p.compare)*100)

  if (k.cardStyle === 'editorial') return (
    <div onClick={onClick} style={{ display:'flex', gap:16, borderBottom:`1px solid ${k.border}`, padding:'18px 0', cursor:'pointer' }}>
      <div style={{ width:76, height:76, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, background:k.sectionBg }}>{p.emoji}</div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:9, letterSpacing:'0.2em', color:k.muted, textTransform:'uppercase', margin:'0 0 4px' }}>{p.tag||'COLLECTION'}</p>
        <p style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:17, color:k.text, margin:'0 0 4px' }}>{p.name}</p>
        <p style={{ fontSize:11, color:k.subtext, lineHeight:1.6, margin:'0 0 10px', fontStyle:'italic' }}>{p.benefit}</p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:15, fontWeight:600, color:k.accent }}>{p.price} SAR</span>
          <span style={{ fontSize:10, color:k.muted, letterSpacing:'0.1em', textTransform:'uppercase', borderBottom:`1px solid ${k.accent}`, cursor:'pointer' }}>ORDER →</span>
        </div>
      </div>
    </div>
  )

  if (k.cardStyle === 'wellness') return (
    <div onClick={onClick} style={{ background:k.cardBg, borderRadius:k.radius, border:`1px solid ${k.border}`, overflow:'hidden', cursor:'pointer' }}>
      <div style={{ background:`linear-gradient(135deg,${k.sectionBg},${k.pageBg})`, padding:'20px', textAlign:'center', position:'relative' }}>
        <div style={{ fontSize:50 }}>{p.emoji}</div>
        {p.tag&&<div style={{ position:'absolute', top:8, right:8, background:k.accent, color:'#fff', fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:50 }}>{p.tag}</div>}
      </div>
      <div style={{ padding:'12px' }}>
        <p style={{ fontSize:13, fontWeight:700, color:k.text, margin:'0 0 6px' }}>{p.name}</p>
        {p.specs.map(s=>(
          <div key={s} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:k.subtext, marginBottom:3 }}>
            <span style={{ color:k.accent, fontWeight:700 }}>✓</span>{s}
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'8px 0' }}>
          <span style={{ fontSize:16, fontWeight:800, color:k.accent }}>{p.price} <span style={{ fontSize:10 }}>SAR</span></span>
          <span style={{ fontSize:10, color:k.muted, textDecoration:'line-through' }}>{p.compare}</span>
        </div>
        <button style={{ width:'100%', padding:'8px', background:k.accent, color:'#fff', border:'none', borderRadius:50, fontSize:12, fontWeight:700, cursor:'pointer' }}>اطلب الآن 🌿</button>
      </div>
    </div>
  )

  if (k.cardStyle === 'tech') return (
    <div onClick={onClick} style={{ background:k.cardBg, border:`1px solid ${k.cardBorder}`, borderRadius:k.radius, overflow:'hidden', cursor:'pointer', position:'relative' }}>
      <div style={{ background:`radial-gradient(ellipse at 40% 40%,${k.accentGlow},${k.sectionBg})`, padding:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:50, borderBottom:`1px solid ${k.border}` }}>
        {p.emoji}
        {p.tag&&<div style={{ position:'absolute', top:8, right:8, background:k.accent, color:k.accentText, fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:3 }}>{p.tag}</div>}
      </div>
      <div style={{ padding:'8px 12px 6px', borderBottom:`1px solid ${k.border}`, display:'flex', gap:5, flexWrap:'wrap' }}>
        {p.specs.map(s=><span key={s} style={{ fontSize:9, color:k.accent, background:k.badgeBg, padding:'2px 6px', borderRadius:3, fontWeight:700 }}>⚡ {s}</span>)}
      </div>
      <div style={{ padding:'10px 12px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:k.text, margin:'0 0 6px' }}>{p.name}</p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:17, fontWeight:800, color:k.accent }}>{p.price}</span>
          <span style={{ background:k.discountBg, color:'#fff', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:3 }}>-{disc}%</span>
        </div>
        <button style={{ width:'100%', padding:'8px', background:k.accent, color:k.accentText, border:'none', borderRadius:k.radiusBtn, fontSize:12, fontWeight:700, cursor:'pointer', boxShadow:`0 0 12px ${k.accentGlow}` }}>اطلب ⚡</button>
      </div>
    </div>
  )

  if (k.cardStyle === 'playful') return (
    <div onClick={onClick} style={{ background:k.cardBg, borderRadius:k.radius, border:`2px solid ${k.cardBorder}`, overflow:'hidden', cursor:'pointer' }}>
      <div style={{ background:`linear-gradient(135deg,${k.sectionBg},${k.pageBg})`, padding:'24px 16px', textAlign:'center', borderBottom:`2px solid ${k.border}` }}>
        <div style={{ fontSize:54 }}>{p.emoji}</div>
        {p.tag&&<div style={{ display:'inline-block', background:k.badgeBg, color:k.badgeText, fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:50, marginTop:6 }}>💕 {p.tag}</div>}
      </div>
      <div style={{ padding:'12px' }}>
        <p style={{ fontSize:13, fontWeight:800, color:k.text, margin:'0 0 3px' }}>{p.name}</p>
        <p style={{ fontSize:11, color:k.muted, margin:'0 0 8px' }}>{p.benefit}</p>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <span style={{ fontSize:16, fontWeight:800, color:k.accent }}>{p.price}</span>
          <span style={{ background:k.discountBg, color:'#fff', fontSize:9, padding:'2px 6px', borderRadius:50, fontWeight:700 }}>-{disc}%</span>
        </div>
        <button style={{ width:'100%', padding:'9px', background:`linear-gradient(135deg,${k.accent},${k.accentDark})`, color:'#fff', border:'none', borderRadius:50, fontSize:12, fontWeight:800, cursor:'pointer' }}>💕 أطلبيها</button>
      </div>
    </div>
  )

  if (k.cardStyle === 'brutalist') return (
    <div onClick={onClick} style={{ background:k.cardBg, border:`2px solid ${k.cardBorder}`, cursor:'pointer', position:'relative' }}>
      <div style={{ background:'#f3f4f6', padding:'28px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:58, borderBottom:`2px solid ${k.cardBorder}` }}>
        {p.emoji}
        {p.tag&&<div style={{ position:'absolute', top:0, left:0, background:k.discountBg, color:'#fff', fontSize:9, fontWeight:900, padding:'4px 8px', textTransform:'uppercase' }}>{p.tag}</div>}
      </div>
      <div style={{ padding:'12px' }}>
        <p style={{ fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.06em', color:k.text, margin:'0 0 4px' }}>{p.name}</p>
        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10 }}>
          <span style={{ fontSize:26, fontWeight:900, color:k.text }}>{p.price}</span>
          <span style={{ fontSize:11, color:k.muted, textDecoration:'line-through' }}>{p.compare}</span>
        </div>
        <button style={{ width:'100%', padding:'10px', background:'#000', color:'#fff', border:'none', fontSize:11, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em' }}>ORDER NOW →</button>
      </div>
    </div>
  )

  if (k.cardStyle === 'gallery') return (
    <div onClick={onClick} style={{ cursor:'pointer', textAlign:'center' }}>
      <div style={{ background:k.sectionBg, aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:58, border:`1px solid ${k.border}`, marginBottom:10 }}>{p.emoji}</div>
      <p style={{ fontSize:12, color:k.text, margin:'0 0 2px', fontFamily:k.headingFont }}>{p.name}</p>
      <p style={{ fontSize:12, color:k.muted, margin:0 }}>{p.price} SAR</p>
    </div>
  )

  if (k.cardStyle === 'clinical') return (
    <div onClick={onClick} style={{ background:k.cardBg, border:`1px solid ${k.border}`, borderRadius:k.radius, overflow:'hidden', cursor:'pointer' }}>
      <div style={{ background:k.sectionBg, padding:'18px', textAlign:'center', borderBottom:`1px solid ${k.border}`, position:'relative' }}>
        <div style={{ fontSize:46 }}>{p.emoji}</div>
        <div style={{ position:'absolute', top:8, right:8, background:k.accent, color:'#fff', fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:3 }}>✅ موثوق</div>
      </div>
      <div style={{ padding:'12px' }}>
        <p style={{ fontSize:13, fontWeight:700, color:k.text, margin:'0 0 6px' }}>{p.name}</p>
        {p.specs.map(s=>(
          <div key={s} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:k.subtext, marginBottom:3 }}>
            <span style={{ color:k.accent }}>✓</span>{s}
          </div>
        ))}
        <div style={{ background:k.sectionBg, padding:'5px 8px', borderRadius:4, fontSize:10, color:k.subtext, margin:'8px 0' }}>🏅 ضمان سنة كاملة</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:15, fontWeight:800, color:k.accent }}>{p.price} SAR</span>
          <span style={{ fontSize:10, color:k.muted, textDecoration:'line-through' }}>{p.compare}</span>
        </div>
        <button style={{ width:'100%', padding:'8px', background:k.accent, color:'#fff', border:'none', borderRadius:k.radiusBtn, fontSize:12, fontWeight:700, cursor:'pointer' }}>اطلب الآن ✅</button>
      </div>
    </div>
  )

  if (k.cardStyle === 'artisan') return (
    <div onClick={onClick} style={{ background:k.cardBg, border:`1px dashed ${k.cardBorder}`, borderRadius:k.radius, overflow:'hidden', cursor:'pointer' }}>
      <div style={{ background:`linear-gradient(135deg,${k.sectionBg},${k.pageBg})`, padding:'20px', textAlign:'center', borderBottom:`1px dashed ${k.border}`, position:'relative' }}>
        <div style={{ fontSize:50 }}>{p.emoji}</div>
        <div style={{ position:'absolute', top:8, left:8, background:k.badgeBg, color:k.accent, fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:50, border:`1px solid ${k.border}` }}>🤝 يدوي</div>
      </div>
      <div style={{ padding:'12px' }}>
        <p style={{ fontSize:13, fontWeight:700, fontFamily:k.headingFont, color:k.text, margin:'0 0 3px' }}>{p.name}</p>
        <p style={{ fontSize:11, color:k.muted, fontStyle:'italic', margin:'0 0 8px' }}>{p.benefit}</p>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ fontSize:15, fontWeight:700, color:k.accent }}>{p.price} SAR</span>
          <span style={{ fontSize:11, color:k.muted, textDecoration:'line-through' }}>{p.compare}</span>
        </div>
        <button style={{ width:'100%', padding:'8px', background:k.accent, color:'#fff', border:'none', borderRadius:50, fontSize:12, fontWeight:700, cursor:'pointer' }}>اطلب 🌾</button>
      </div>
    </div>
  )

  if (k.cardStyle === 'hype') return (
    <div onClick={onClick} style={{ background:k.cardBg, border:`1px solid ${k.accentGlow}`, borderRadius:k.radius, overflow:'hidden', cursor:'pointer', backdropFilter:'blur(10px)', boxShadow:`0 4px 20px ${k.accentGlow}` }}>
      <div style={{ background:`radial-gradient(ellipse at 50% 30%,${k.accentGlow},transparent)`, padding:'20px', textAlign:'center', borderBottom:`1px solid ${k.border}` }}>
        <div style={{ fontSize:50 }}>{p.emoji}</div>
        <p style={{ fontSize:10, color:'#e879f9', fontWeight:700, margin:'4px 0 0' }}>🔥 {p.orders} طلب اليوم</p>
      </div>
      <div style={{ padding:'10px 12px' }}>
        <p style={{ fontSize:12, fontWeight:700, color:k.text, margin:'0 0 6px' }}>{p.name}</p>
        <p style={{ fontSize:9, color:'#e879f9', margin:'0 0 3px' }}>⚠️ بقي {10+p.id*3} قطعة فقط</p>
        <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.1)', overflow:'hidden', marginBottom:8 }}>
          <div style={{ width:`${60+p.id*7}%`, height:'100%', background:'linear-gradient(90deg,#a855f7,#be185d)' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
          <span style={{ fontSize:16, fontWeight:800, color:k.accent }}>{p.price}</span>
          <span style={{ background:k.discountBg, color:'#fff', fontSize:9, padding:'2px 6px', borderRadius:50, fontWeight:700 }}>-{disc}%</span>
        </div>
        <button style={{ width:'100%', padding:'9px', background:'linear-gradient(135deg,#a855f7,#be185d)', color:'#fff', border:'none', borderRadius:50, fontSize:12, fontWeight:800, cursor:'pointer', boxShadow:'0 0 12px rgba(168,85,247,0.5)' }}>✨ اطلبي الآن</button>
      </div>
    </div>
  )

  if (k.cardStyle === 'fashion') return (
    <div onClick={onClick} style={{ cursor:'pointer', position:'relative' }}>
      {/* Portrait image — 2:3 ratio */}
      <div style={{ aspectRatio:'2/3', background:`linear-gradient(160deg,${k.sectionBg} 0%,${k.pageBg} 100%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:62, position:'relative', overflow:'hidden' }}>
        {p.emoji}
        {/* Wishlist heart */}
        <div style={{ position:'absolute', top:10, left:10, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(250,248,245,0.85)', fontSize:14, color:'#4a4040', cursor:'pointer' }}>♡</div>
        {/* SALE / NEW label */}
        {p.tag && (
          <div style={{ position:'absolute', top:10, right:0, fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#fff', textTransform:'uppercase', fontFamily:"'DM Sans',system-ui,sans-serif", background: p.tag.includes('خصم')?'#8b1a1a':'#1a1a1a', padding:'4px 9px' }}>
            {p.tag.includes('خصم')?'SALE':p.tag==='جديد'?'NEW':'HOT'}
          </div>
        )}
        {/* Color swatches */}
        <div style={{ position:'absolute', bottom:10, right:10, display:'flex', gap:4 }}>
          {['#1a1a1a','#c9993a','#8b1a1a'].map(c=>(
            <div key={c} style={{ width:11, height:11, borderRadius:'50%', background:c, border:'1.5px solid rgba(255,255,255,0.85)', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
          ))}
        </div>
      </div>
      {/* Card info */}
      <div style={{ padding:'9px 0 13px' }}>
        <p style={{ fontSize:12, color:'#1a1a1a', margin:'0 0 3px', fontFamily:"'DM Sans',system-ui,sans-serif", fontWeight:500, lineHeight:1.3 }}>{p.name}</p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
            <span style={{ fontSize:12, color:'#1a1a1a', fontWeight:600 }}>{p.price}</span>
            <span style={{ fontSize:10, color:'#9a8880', textDecoration:'line-through' }}>{p.compare}</span>
          </div>
          <div style={{ display:'flex', gap:3 }}>
            {['S','M','L'].map(s=>(
              <div key={s} style={{ width:17, height:17, border:'1px solid #e5ddd6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'#9a8880', fontFamily:"'DM Sans',system-ui,sans-serif" }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div onClick={onClick} style={{ background:k.cardBg, border:`1px solid ${k.cardBorder}`, borderRadius:k.radius, overflow:'hidden', cursor:'pointer' }}>
      <div style={{ aspectRatio:'1', background:`radial-gradient(ellipse at 60% 40%,${k.accentGlow},${k.sectionBg})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:50, position:'relative' }}>
        {p.emoji}
        <div style={{ position:'absolute', top:8, right:8, background:k.discountBg, color:'#fff', fontSize:10, fontWeight:700, padding:'3px 7px', borderRadius:50 }}>-{disc}%</div>
        {p.tag&&<div style={{ position:'absolute', top:8, left:8, background:k.badgeBg, color:k.badgeText, fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:50 }}>{p.tag}</div>}
      </div>
      <div style={{ padding:'12px' }}>
        <p style={{ fontSize:13, fontWeight:600, color:k.text, margin:'0 0 4px' }}>{p.name}</p>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <span style={{ fontSize:15, fontWeight:800, color:k.accent }}>{p.price}</span>
          <span style={{ fontSize:10, color:k.accent }}>SAR</span>
          <span style={{ fontSize:11, color:k.muted, textDecoration:'line-through' }}>{p.compare}</span>
        </div>
        <button style={{ width:'100%', padding:'8px', background:k.accent, color:k.accentText, border:'none', cursor:'pointer', borderRadius:k.radiusBtn, fontSize:12, fontWeight:700 }}>اطلب الآن</button>
      </div>
    </div>
  )
}

/* ── STORE HOME ───────────────────────────────────────────────────── */
function StoreHomePreview({ k, onProductClick }:{ k:Theme; onProductClick:()=>void }) {
  const isList = k.cardStyle === 'editorial'
  /* auto-fill: 3 cols in ~480px content space (container minus 40px padding) */
  const gridCols = k.cardStyle === 'gallery'
    ? 'repeat(auto-fill,minmax(110px,1fr))'
    : k.cardStyle === 'fashion'
    ? 'repeat(auto-fill,minmax(130px,1fr))'
    : 'repeat(auto-fill,minmax(140px,1fr))'
  return (
    <div style={{ background:k.pageBg, color:k.text, fontFamily:k.font }}>
      <nav style={{ background:k.navBg, backdropFilter:'blur(12px)', borderBottom:`1px solid ${k.divider}`, padding:'0 20px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14 }}>{k.emoji}</span>
          <span style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:17, color:k.layout==='brutalist'?'#fff':k.accent }}>{STORE.name}</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:11, color:k.muted }}>6 منتجات</span>
          <div style={{ fontSize:10, color:k.subtext, background:k.badgeBg, padding:'3px 8px', borderRadius:k.radiusSm }}>🚚 مجاني</div>
        </div>
      </nav>
      <StoreHero k={k} onShop={onProductClick} />
      {!isList && k.cardStyle !== 'gallery' && k.cardStyle !== 'fashion' && (
        <div style={{ padding:'28px 20px 14px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, height:1, background:k.divider }} />
          <span style={{ fontSize:10, fontWeight:700, color:k.muted, letterSpacing:'0.1em', textTransform:'uppercase' }}>جميع المنتجات</span>
          <div style={{ flex:1, height:1, background:k.divider }} />
        </div>
      )}
      {k.cardStyle === 'fashion' && (
        <div style={{ padding:'20px 20px 10px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
          <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:18, fontWeight:700, color:'#1a1a1a', margin:0 }}>الأكثر مبيعاً</p>
          <p style={{ fontSize:10, color:'#9a8880', margin:0, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>عرض الكل →</p>
        </div>
      )}
      <div style={{ padding: isList ? '16px 32px 48px' : '0 20px 48px', display: isList ? 'block' : 'grid', gridTemplateColumns:gridCols, gap: k.cardStyle==='gallery' ? 16 : k.cardStyle==='fashion' ? '6px 12px' : 12 }}>
        {PRODUCTS.map(p=><ProductCard key={p.id} p={p} k={k} onClick={onProductClick} />)}
      </div>
      <div style={{ background:k.footerBg, padding:'24px', textAlign:'center' }}>
        <p style={{ fontFamily:k.headingFont, fontSize:16, fontWeight:k.headingWeight, color:k.accent, margin:'0 0 4px' }}>{STORE.name} {k.emoji}</p>
        <p style={{ fontSize:10, color:'#6b7280', margin:0 }}>مدعوم بـ <span style={{ color:k.accent }}>منتوج</span> · جميع الحقوق محفوظة 2025</p>
      </div>
    </div>
  )
}

/* ── PRODUCT PAGE: EDITORIAL ──────────────────────────────────────── */
function EditorialProductPage({ k, onBack }:{ k:Theme; onBack:()=>void }) {
  const p = PRODUCTS[0]
  return (
    <div style={{ background:k.pageBg, color:k.text, fontFamily:k.font }}>
      <nav style={{ background:k.navBg, backdropFilter:'blur(12px)', borderBottom:`1px solid ${k.border}`, padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:20 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:k.muted, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase' }}>← {STORE.name}</button>
        <span style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:16, color:k.accent }}>{k.emoji}</span>
      </nav>
      <div style={{ display:'flex', minHeight:'80vh' }}>
        <div style={{ flex:'0 0 45%', background:`radial-gradient(ellipse at 40% 40%,${k.accentGlow},${k.sectionBg})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:120 }}>{p.emoji}</div>
        <div style={{ flex:1, padding:'56px 40px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <p style={{ fontSize:10, letterSpacing:'0.25em', color:k.muted, textTransform:'uppercase', marginBottom:20 }}>LUXURY COLLECTION 2025</p>
          <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:40, color:k.text, lineHeight:1.1, margin:'0 0 14px' }}>{p.name}</h1>
          <div style={{ width:48, height:1, background:k.accent, marginBottom:18 }} />
          <p style={{ fontSize:13, color:k.subtext, lineHeight:1.9, marginBottom:30 }}>{p.benefit} · {p.specs.join(' · ')}</p>
          <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:32 }}>
            <span style={{ fontSize:30, fontWeight:600, color:k.accent }}>{p.price} SAR</span>
            <span style={{ fontSize:13, color:k.muted }}>كان {p.compare}</span>
          </div>
          <div style={{ borderTop:`1px solid ${k.border}`, paddingTop:22 }}>
            <p style={{ fontSize:10, letterSpacing:'0.08em', color:k.muted, textTransform:'uppercase', marginBottom:14 }}>COMPLETE YOUR ORDER</p>
            {['الاسم الكامل','رقم الهاتف','العنوان'].map(label=>(
              <div key={label} style={{ background:k.inputBg, border:`1px solid ${k.inputBorder}`, padding:'10px 14px', fontSize:12, color:k.muted, marginBottom:8 }}>{label}</div>
            ))}
            <button style={{ width:'100%', marginTop:8, padding:'14px', background:'transparent', color:k.accent, border:`1px solid ${k.accent}`, fontSize:11, letterSpacing:'0.12em', cursor:'pointer', textTransform:'uppercase', fontFamily:k.font }}>CONFIRM ORDER — {p.price} SAR</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── PRODUCT PAGE: BRUTALIST ──────────────────────────────────────── */
function BrutalistProductPage({ k, onBack }:{ k:Theme; onBack:()=>void }) {
  const p = PRODUCTS[0]
  const disc = Math.round((1-p.price/p.compare)*100)
  return (
    <div style={{ background:'#fff', color:'#000', fontFamily:k.font }}>
      <nav style={{ background:'#000', padding:'0 20px', height:50, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#fff', fontSize:12, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.08em' }}>← BACK</button>
        <span style={{ color:'#fff', fontWeight:900, fontSize:15, textTransform:'uppercase', letterSpacing:'0.05em' }}>{STORE.name}</span>
      </nav>
      <div style={{ background:k.discountBg, padding:'10px 20px', textAlign:'center', color:'#fff', fontSize:12, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.05em' }}>
        🔥 LIMITED DROP — {disc}% OFF TODAY ONLY
      </div>
      <div style={{ background:'#f3f4f6', padding:'60px 20px', textAlign:'center', fontSize:100, borderBottom:'2px solid #000' }}>{p.emoji}</div>
      <div style={{ padding:'24px 20px' }}>
        <p style={{ fontSize:10, letterSpacing:'0.2em', color:'#6b7280', textTransform:'uppercase', margin:'0 0 8px' }}>سماعات · إيربودز</p>
        <h1 style={{ fontFamily:k.headingFont, fontWeight:900, fontSize:34, textTransform:'uppercase', margin:'0 0 10px', lineHeight:1 }}>{p.name}</h1>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:20, borderBottom:'2px solid #000', paddingBottom:20 }}>
          <span style={{ fontSize:38, fontWeight:900 }}>{p.price}</span>
          <span style={{ fontSize:15 }}>SAR</span>
          <span style={{ fontSize:13, color:'#6b7280', textDecoration:'line-through' }}>{p.compare}</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
          {p.specs.map(s=>(
            <div key={s} style={{ display:'flex', gap:10, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <span>—</span><span>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ border:'2px solid #000', padding:16, marginBottom:12 }}>
          <p style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 12px' }}>ENTER DETAILS</p>
          {['FULL NAME','PHONE','ADDRESS'].map(l=>(
            <div key={l} style={{ border:'2px solid #000', padding:'10px 12px', fontSize:11, color:'#6b7280', fontWeight:700, letterSpacing:'0.05em', marginBottom:8 }}>{l}</div>
          ))}
        </div>
        <button style={{ width:'100%', padding:'16px', background:'#000', color:'#fff', border:'none', fontSize:13, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em' }}>ORDER NOW — {p.price} SAR →</button>
      </div>
    </div>
  )
}

/* ── PRODUCT PAGE: GALLERY ────────────────────────────────────────── */
function GalleryProductPage({ k, onBack }:{ k:Theme; onBack:()=>void }) {
  const p = PRODUCTS[0]
  return (
    <div style={{ background:k.pageBg, color:k.text, fontFamily:k.font }}>
      <nav style={{ background:k.navBg, borderBottom:`1px solid ${k.divider}`, padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:k.muted, fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase' }}>← العودة</button>
        <span style={{ fontFamily:k.headingFont, fontSize:13, color:k.muted, letterSpacing:'0.08em', textTransform:'uppercase' }}>{STORE.name}</span>
      </nav>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'48px 24px' }}>
        <div style={{ background:k.sectionBg, aspectRatio:'4/3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:110, border:`1px solid ${k.border}`, marginBottom:40 }}>{p.emoji}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:'0.2em', color:k.muted, textTransform:'uppercase', margin:'0 0 8px' }}>مجموعة 2025</p>
            <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:26, color:k.text, margin:'0 0 8px' }}>{p.name}</h1>
            <p style={{ fontSize:13, color:k.muted, fontStyle:'italic', margin:0 }}>{p.benefit}</p>
          </div>
          <div style={{ textAlign:'left', flexShrink:0 }}>
            <p style={{ fontSize:24, fontWeight:700, color:k.accent, margin:0 }}>{p.price}</p>
            <p style={{ fontSize:11, color:k.muted, textDecoration:'line-through', margin:0 }}>{p.compare}</p>
          </div>
        </div>
        <div style={{ height:1, background:k.divider, marginBottom:28 }} />
        {['الاسم الكامل','رقم الهاتف','العنوان'].map(label=>(
          <div key={label} style={{ marginBottom:12 }}>
            <p style={{ fontSize:10, letterSpacing:'0.1em', color:k.muted, textTransform:'uppercase', margin:'0 0 6px' }}>{label}</p>
            <div style={{ background:k.inputBg, border:`1px solid ${k.inputBorder}`, padding:'10px 14px', fontSize:12, color:k.muted, borderRadius:k.radiusSm }}>{label}</div>
          </div>
        ))}
        <button style={{ width:'100%', marginTop:16, padding:'14px', background:k.accent, color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:k.radiusBtn }}>تأكيد الطلب — {p.price} SAR</button>
      </div>
    </div>
  )
}

/* ── PRODUCT PAGE: STANDARD (with per-theme extras) ──────────────── */
function StandardProductPage({ k, onBack }:{ k:Theme; onBack:()=>void }) {
  const p = PRODUCTS[0]
  const disc = Math.round((1-p.price/p.compare)*100)
  return (
    <div style={{ background:k.pageBg, color:k.text, fontFamily:k.font }}>
      <div style={{ background:k.urgencyBg, color:'#fff', fontSize:12, textAlign:'center', padding:'8px', fontWeight:700 }}>🔥 عرض محدود — شحن مجاني اليوم فقط!</div>
      <nav style={{ background:k.navBg, backdropFilter:'blur(12px)', borderBottom:`1px solid ${k.divider}`, padding:'0 20px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:20 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:k.subtext, fontSize:12 }}>← {STORE.name}</button>
        <span style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:16, color:k.accent }}>{k.emoji}</span>
      </nav>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'20px' }}>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap', marginBottom:28 }}>
          <div style={{ flex:'0 0 auto', width:220 }}>
            <div style={{ width:220, height:220, borderRadius:k.radius, border:`1px solid ${k.cardBorder}`, background:`radial-gradient(ellipse at 40% 40%,${k.accentGlow},${k.sectionBg})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:80, boxShadow:`0 8px 40px ${k.accentGlow}` }}>{p.emoji}</div>
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              {['🎧','📦','🔋'].map((e,i)=>(
                <div key={i} style={{ width:52, height:52, borderRadius:k.radiusSm, border:i===0?`2px solid ${k.accent}`:`1px solid ${k.cardBorder}`, background:k.cardBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, cursor:'pointer' }}>{e}</div>
              ))}
            </div>
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            {k.layout==='neon'&&(
              <div style={{ background:k.badgeBg, border:`1px solid ${k.accentGlow}`, borderRadius:k.radiusSm, padding:'6px 12px', fontSize:11, color:'#e879f9', fontWeight:700, marginBottom:10 }}>🔥 {p.orders} شخص طلب هذا المنتج اليوم</div>
            )}
            <div style={{ display:'inline-block', background:k.badgeBg, color:k.badgeText, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:50, marginBottom:8 }}>⭐ الأكثر مبيعاً</div>
            <h1 style={{ fontFamily:k.headingFont, fontWeight:k.headingWeight, fontSize:22, lineHeight:1.3, margin:'0 0 8px' }}>{p.name}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:28, fontWeight:800, color:k.accent }}>{p.price}</span>
              <span style={{ fontSize:12, color:k.accent }}>SAR</span>
              <span style={{ fontSize:13, color:k.muted, textDecoration:'line-through' }}>{p.compare}</span>
              <span style={{ background:k.discountBg, color:'#fff', fontSize:10, fontWeight:700, padding:'3px 7px', borderRadius:50 }}>-{disc}%</span>
            </div>
            <div style={{ background:k.timerBg, color:k.timerText, borderRadius:k.radiusSm, padding:'9px 12px', display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:700, marginBottom:12 }}>
              ⏰ ينتهي العرض:
              {['02','45','18'].map((n,i)=>(
                <span key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <span style={{ background:k.accent, color:k.accentText, borderRadius:4, padding:'2px 6px', fontSize:13 }}>{n}</span>
                  <span style={{ fontSize:9, opacity:0.7 }}>{['س','د','ث'][i]}</span>
                </span>
              ))}
            </div>
            {k.layout==='dark_tech'&&(
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                {['ANC فعّال','30 ساعة','Bluetooth 5.3','IPX5 مقاوم'].map(s=>(
                  <div key={s} style={{ background:k.sectionBg, border:`1px solid ${k.border}`, borderRadius:k.radiusSm, padding:'6px 10px', fontSize:11, color:k.accent, fontWeight:700 }}>⚡ {s}</div>
                ))}
              </div>
            )}
            {k.layout==='wellness'&&(
              <div style={{ background:k.sectionBg, border:`1px solid ${k.border}`, borderRadius:k.radius, padding:12, marginBottom:12 }}>
                <p style={{ fontSize:11, fontWeight:700, color:k.text, margin:'0 0 6px' }}>🌿 المكونات الطبيعية</p>
                {['زيت جوز الهند','فيتامين E','خلاصة الألوة فيرا'].map(i=>(
                  <p key={i} style={{ fontSize:11, color:k.subtext, margin:'0 0 3px' }}>✓ {i}</p>
                ))}
              </div>
            )}
            {k.layout==='trust'&&(
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                {['🏅 ISO 9001','✅ FDA مُعتمد','🔬 مختبر','🛡️ ضمان'].map(c=>(
                  <div key={c} style={{ background:k.sectionBg, border:`1px solid ${k.border}`, borderRadius:k.radiusSm, padding:'4px 8px', fontSize:10, color:k.subtext, fontWeight:600 }}>{c}</div>
                ))}
              </div>
            )}
            {k.layout==='artisan'&&(
              <div style={{ border:`1px dashed ${k.border}`, borderRadius:k.radius, padding:12, marginBottom:12, background:k.sectionBg }}>
                <p style={{ fontSize:11, fontWeight:700, color:k.accent, margin:'0 0 4px' }}>🤝 قصة المنتج</p>
                <p style={{ fontSize:11, color:k.subtext, lineHeight:1.7, margin:0, fontStyle:'italic' }}>صُنع هذا المنتج يدوياً في ورشة صغيرة بالرياض، بأيدٍ محلية تحمل موروثاً أصيلاً.</p>
              </div>
            )}
            {k.layout==='playful'&&(
              <div style={{ marginBottom:12 }}>
                <p style={{ fontSize:11, fontWeight:700, color:k.text, margin:'0 0 6px' }}>اختاري اللون 💕</p>
                <div style={{ display:'flex', gap:8 }}>
                  {['#ff9de2','#c026d3','#7c3aed','#f0abfc'].map(c=>(
                    <div key={c} style={{ width:26, height:26, borderRadius:'50%', background:c, cursor:'pointer', border:`2px solid ${c==='#c026d3'?'#000':'transparent'}` }} />
                  ))}
                </div>
              </div>
            )}
            {k.layout==='neon'&&(
              <div style={{ marginBottom:12 }}>
                <p style={{ fontSize:10, color:'#e879f9', fontWeight:700, margin:'0 0 4px' }}>⚠️ بقي 12 قطعة فقط!</p>
                <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
                  <div style={{ width:'72%', height:'100%', background:'linear-gradient(90deg,#a855f7,#be185d)' }} />
                </div>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
              {['جودة استثنائية','بطارية تدوم طويلاً','مقاومة للماء','ضمان سنة كاملة'].map(b=>(
                <div key={b} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12 }}>
                  <span style={{ width:17, height:17, borderRadius:'50%', background:k.accentGlow, color:k.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0 }}>✓</span>
                  <span style={{ color:k.subtext }}>{b}</span>
                </div>
              ))}
            </div>
            <button style={{ width:'100%', padding:'13px', borderRadius:k.radiusBtn, fontSize:14, fontWeight:700, cursor:'pointer', border:'none', background:k.layout==='neon'?'linear-gradient(135deg,#a855f7,#be185d)':k.accent, color:k.accentText, boxShadow:`0 4px 20px ${k.accentGlow}` }}>
              🛒 اطلب الآن — {p.price} SAR
            </button>
          </div>
        </div>
        <div style={{ background:k.formBg, border:`1px solid ${k.border}`, borderRadius:k.radius, padding:18, maxWidth:420, marginBottom:28 }}>
          <p style={{ fontSize:13, fontWeight:700, margin:'0 0 12px' }}>📋 أدخل بياناتك لإتمام الطلب</p>
          {['الاسم الكامل','رقم الهاتف','العنوان'].map(label=>(
            <div key={label} style={{ marginBottom:9 }}>
              <p style={{ fontSize:10, color:k.muted, margin:'0 0 3px', fontWeight:600 }}>{label}</p>
              <div style={{ background:k.inputBg, border:`1px solid ${k.inputBorder}`, borderRadius:k.radiusSm, padding:'9px 12px', fontSize:12, color:k.muted }}>{label}</div>
            </div>
          ))}
          <button style={{ width:'100%', marginTop:6, padding:'12px', borderRadius:k.radiusBtn, fontSize:13, fontWeight:700, cursor:'pointer', border:'none', background:k.layout==='neon'?'linear-gradient(135deg,#a855f7,#be185d)':k.accent, color:k.accentText }}>✅ تأكيد الطلب — {p.price} SAR</button>
        </div>
        <div>
          <p style={{ fontFamily:k.headingFont, fontSize:16, fontWeight:k.headingWeight, margin:'0 0 10px' }}>تقييمات العملاء</p>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <span style={{ color:k.starColor, fontSize:15 }}>★★★★★</span>
            <span style={{ fontWeight:700, fontSize:13 }}>4.9</span>
            <span style={{ fontSize:12, color:k.muted }}>(312 تقييم)</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:10 }}>
            {[{n:'أحمد محمد',c:'منتج ممتاز جداً، الجودة فاقت توقعاتي!'},{n:'سارة علي',c:'التوصيل كان سريعاً والمنتج رائع.'},{n:'محمد خالد',c:'أفضل شراء في السنة، أنصح به بشدة.'}].map((r,i)=>(
              <div key={i} style={{ background:k.cardBg, border:`1px solid ${k.cardBorder}`, borderRadius:k.radius, padding:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:k.accentGlow, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:k.accent }}>{r.n[0]}</div>
                  <div>
                    <p style={{ fontSize:11, fontWeight:700, margin:0 }}>{r.n}</p>
                    <p style={{ color:k.starColor, fontSize:10, margin:0 }}>★★★★★</p>
                  </div>
                </div>
                <p style={{ fontSize:11, color:k.subtext, lineHeight:1.6, margin:0 }}>{r.c}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background:k.footerBg, padding:'22px', textAlign:'center' }}>
        <p style={{ fontFamily:k.headingFont, fontSize:15, fontWeight:k.headingWeight, color:k.accent, margin:'0 0 4px' }}>{STORE.name} {k.emoji}</p>
        <p style={{ fontSize:10, color:'#6b7280', margin:0 }}>مدعوم بـ <span style={{ color:k.accent }}>منتوج</span></p>
      </div>
    </div>
  )
}

/* ── PRODUCT PAGE: FASHION ────────────────────────────────────────── */
function FashionProductPage({ k, onBack }:{ k:Theme; onBack:()=>void }) {
  const p = PRODUCTS[0]
  const disc = Math.round((1-p.price/p.compare)*100)
  return (
    <div style={{ background:k.pageBg, color:k.text, fontFamily:k.font }}>
      {/* Nav */}
      <nav style={{ background:k.navBg, borderBottom:`1px solid ${k.divider}`, padding:'0 20px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:20 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:k.muted, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:k.font }}>← {STORE.name}</button>
        <span style={{ fontFamily:k.headingFont, fontSize:16, color:k.text, fontWeight:700 }}>👗</span>
        <span style={{ fontSize:10, color:k.muted, letterSpacing:'0.08em', cursor:'pointer' }}>♡ المفضلة</span>
      </nav>
      {/* Breadcrumb */}
      <div style={{ padding:'9px 20px', borderBottom:`1px solid ${k.divider}`, fontSize:10, color:k.muted, display:'flex', gap:6, alignItems:'center' }}>
        <span>الرئيسية</span><span style={{ opacity:0.4 }}>/</span>
        <span>نساء</span><span style={{ opacity:0.4 }}>/</span>
        <span style={{ color:k.text }}>{p.name}</span>
      </div>
      {/* Split layout */}
      <div style={{ display:'flex', flexWrap:'wrap' }}>
        {/* Image — 55% */}
        <div style={{ flex:'0 0 55%', minWidth:260, minHeight:420, background:k.sectionBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:120, borderBottom:`1px solid ${k.divider}`, position:'relative' }}>
          {p.emoji}
          <div style={{ position:'absolute', top:14, left:14, width:34, height:34, background:'rgba(250,248,245,0.9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:k.subtext, cursor:'pointer' }}>♡</div>
        </div>
        {/* Info panel */}
        <div style={{ flex:1, minWidth:220, padding:'28px 22px', borderRight:`1px solid ${k.divider}` }}>
          <p style={{ fontSize:9, letterSpacing:'0.22em', color:k.muted, textTransform:'uppercase', margin:'0 0 12px', fontFamily:k.font }}>MANTOOG FASHION</p>
          <h1 style={{ fontFamily:k.headingFont, fontWeight:700, fontSize:22, color:k.text, lineHeight:1.2, margin:'0 0 14px' }}>{p.name}</h1>
          {/* Price row */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:18, borderBottom:`1px solid ${k.divider}` }}>
            <span style={{ fontSize:19, fontWeight:600, color:k.text }}>{p.price} SAR</span>
            <span style={{ fontSize:12, color:k.muted, textDecoration:'line-through' }}>{p.compare}</span>
            <span style={{ fontSize:9, color:'#8b1a1a', fontWeight:700, padding:'2px 6px', border:'1px solid #8b1a1a', letterSpacing:'0.05em' }}>-{disc}%</span>
          </div>
          {/* Color swatches */}
          <div style={{ marginBottom:18 }}>
            <p style={{ fontSize:10, letterSpacing:'0.1em', color:k.muted, textTransform:'uppercase', margin:'0 0 10px', fontFamily:k.font }}>اللون: أسود</p>
            <div style={{ display:'flex', gap:8 }}>
              {['#1a1a1a','#c9993a','#faf8f5','#7a3a3a','#2a4a7a'].map((c,i)=>(
                <div key={c} style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border:c==='#faf8f5'?'1px solid #e5ddd6':'none', outline:i===0?'2px solid #1a1a1a':'none', outlineOffset:2 }} />
              ))}
            </div>
          </div>
          {/* Size selector */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <p style={{ fontSize:10, letterSpacing:'0.1em', color:k.muted, textTransform:'uppercase', margin:0, fontFamily:k.font }}>المقاس</p>
              <p style={{ fontSize:10, color:k.text, cursor:'pointer', textDecoration:'underline', margin:0 }}>دليل المقاسات</p>
            </div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {['XS','S','M','L','XL','XXL'].map(s=>(
                <div key={s} style={{ width:40, height:40, border:`1px solid ${s==='M'?k.text:k.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:s==='M'?k.text:k.muted, fontWeight:s==='M'?700:400, cursor:'pointer', letterSpacing:'0.04em', fontFamily:k.font }}>{s}</div>
              ))}
            </div>
          </div>
          {/* CTAs */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
            <button style={{ width:'100%', padding:'13px', background:k.text, color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:k.font }}>أضف إلى السلة</button>
            <button style={{ width:'100%', padding:'12px', background:'transparent', color:k.text, border:`1px solid ${k.border}`, fontSize:11, cursor:'pointer', letterSpacing:'0.07em', fontFamily:k.font }}>♡ أضف للمفضلة</button>
          </div>
          {/* Direct order form */}
          <div style={{ background:k.sectionBg, padding:14, borderTop:`1px solid ${k.divider}`, marginBottom:14 }}>
            <p style={{ fontSize:10, letterSpacing:'0.1em', color:k.muted, textTransform:'uppercase', margin:'0 0 10px', fontFamily:k.font }}>أو اطلب مباشرة</p>
            {['الاسم الكامل','رقم الهاتف','العنوان'].map(label=>(
              <div key={label} style={{ background:'#fff', border:`1px solid ${k.inputBorder}`, padding:'9px 12px', fontSize:11, color:k.muted, marginBottom:7 }}>{label}</div>
            ))}
            <button style={{ width:'100%', marginTop:4, padding:'11px', background:'#8b1a1a', color:'#fff', border:'none', fontSize:10, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.09em', fontFamily:k.font }}>تأكيد الطلب — {p.price} SAR</button>
          </div>
          {/* Shipping info */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {['🚚 توصيل مجاني للطلبات فوق 200 SAR','↩️ إرجاع مجاني خلال 30 يوم','✅ منتج أصلي مضمون'].map(info=>(
              <p key={info} style={{ fontSize:11, color:k.subtext, margin:0 }}>{info}</p>
            ))}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div style={{ background:'#1a1a1a', padding:'22px', textAlign:'center' }}>
        <p style={{ fontFamily:k.headingFont, fontSize:14, fontWeight:700, color:'#faf8f5', margin:'0 0 4px' }}>{STORE.name} 👗</p>
        <p style={{ fontSize:10, color:'#6b7280', margin:0 }}>مدعوم بـ <span style={{ color:'#c9993a' }}>منتوج</span></p>
      </div>
    </div>
  )
}

function ProductPagePreview({ k, onBack }:{ k:Theme; onBack:()=>void }) {
  if (k.layout === 'editorial') return <EditorialProductPage k={k} onBack={onBack} />
  if (k.layout === 'brutalist') return <BrutalistProductPage k={k} onBack={onBack} />
  if (k.layout === 'gallery')   return <GalleryProductPage k={k} onBack={onBack} />
  if (k.layout === 'fashion')   return <FashionProductPage k={k} onBack={onBack} />
  return <StandardProductPage k={k} onBack={onBack} />
}

/* ── MINI THEME CHIP ──────────────────────────────────────────────── */
function ThemeChip({ theme, selected, onClick }:{ theme:Theme; selected:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{ display:'flex', flexDirection:'column', width:108, flexShrink:0, cursor:'pointer', border:'none', background:'transparent', padding:0 }}>
      <div style={{ width:'100%', height:68, borderRadius:9, overflow:'hidden', border:selected?'2.5px solid #3b82f6':'2px solid #1c1f28', background:theme.pageBg, position:'relative', boxShadow:selected?'0 0 0 4px rgba(59,130,246,0.2)':'0 2px 8px rgba(0,0,0,0.4)', transition:'all 0.15s' }}>
        <div style={{ height:12, background:theme.dark?'#000':'#fff', borderBottom:`1px solid ${theme.divider}`, display:'flex', alignItems:'center', padding:'0 5px', gap:3 }}>
          <div style={{ width:18, height:4, borderRadius:2, background:theme.accent }} />
          <div style={{ flex:1 }} />
          <div style={{ width:10, height:4, borderRadius:2, background:theme.muted, opacity:0.4 }} />
        </div>
        <div style={{ padding:'5px', background:theme.heroGradient, height:28, display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:13 }}>{theme.emoji}</span>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
            <div style={{ width:'60%', height:3, borderRadius:2, background:theme.heroTextColor, opacity:0.7 }} />
            <div style={{ width:'36%', height:2, borderRadius:2, background:theme.muted, opacity:0.5 }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:3, padding:'4px 5px' }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ flex:1, height:12, borderRadius:3, background:theme.cardBg, border:`1px solid ${theme.cardBorder}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:'60%', height:2, background:theme.accent, borderRadius:1 }} />
            </div>
          ))}
        </div>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2.5, background:theme.accent }} />
      </div>
      <p style={{ fontSize:11, fontWeight:700, color:selected?'#3b82f6':'#d1d5db', margin:'5px 0 0', textAlign:'center' }}>{theme.nameAr}</p>
      <p style={{ fontSize:9, color:'#4b5563', margin:0, textAlign:'center' }}>{theme.nicheAr.split(' · ')[0]}</p>
    </button>
  )
}

/* ── PAGE ─────────────────────────────────────────────────────────── */
export default function ThemesDemoPage() {
  const [selectedId, setSelectedId] = useState('classic')
  const [view, setView] = useState<'store'|'product'>('store')
  const theme = T.find(t=>t.id===selectedId)!

  return (
    <div dir="rtl" style={{ height:'100vh', background:'#0a0c10', color:'#fff', fontFamily:'system-ui,sans-serif', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#111318', borderBottom:'1px solid #1c1f28', padding:'9px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,#3b82f6,#7c5cff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>م</div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, margin:0 }}>معاينة قوالب المتجر</p>
            <p style={{ fontSize:10, color:'#6b7280', margin:0 }}>11 قالب — كل قالب تصميم ومنطق مختلف كلياً</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:3, background:'#0d0f14', padding:3, borderRadius:8, border:'1px solid #1c1f28' }}>
          {(['store','product'] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 13px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s', background:view===v?'#1c1f28':'transparent', color:view===v?'#fff':'#525669' }}>
              {v==='store'?'🏪 الصفحة الرئيسية':'🛍️ صفحة المنتج'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:'#0d0f14', borderBottom:'1px solid #1c1f28', padding:'10px 14px', overflowX:'auto', flexShrink:0 }}>
        <div style={{ display:'flex', gap:10, width:'max-content' }}>
          {T.map(t=><ThemeChip key={t.id} theme={t} selected={selectedId===t.id} onClick={()=>setSelectedId(t.id)} />)}
        </div>
      </div>

      <div style={{ background:'#090b0f', borderBottom:'1px solid #1c1f28', padding:'5px 18px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:theme.accent, boxShadow:`0 0 6px ${theme.accent}`, flexShrink:0 }} />
        <span style={{ fontSize:12, fontWeight:700, color:'#e5e7eb' }}>{theme.nameAr}</span>
        <span style={{ fontSize:11, color:'#4b5563' }}>—</span>
        <span style={{ fontSize:11, color:'#6b7280' }}>{theme.nicheAr}</span>
        <span style={{ fontSize:10, color:'#374151', marginRight:'auto', padding:'2px 7px', background:'#111318', border:'1px solid #1c1f28', borderRadius:4 }}>theme: {theme.id}</span>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {view==='store'
          ? <StoreHomePreview k={theme} onProductClick={()=>setView('product')} />
          : <ProductPagePreview k={theme} onBack={()=>setView('store')} />
        }
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@400;600;700&family=Nunito:wght@400;700;800&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;700;900&family=Lora:wght@400;700&family=Outfit:wght@400;700;800&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#0d0f14}
        ::-webkit-scrollbar-thumb{background:#1c1f28;border-radius:3px}
      `}</style>
    </div>
  )
}
