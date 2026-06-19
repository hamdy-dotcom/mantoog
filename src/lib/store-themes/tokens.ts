export type CardStyle = 'standard'|'editorial'|'wellness'|'tech'|'playful'|'brutalist'|'gallery'|'clinical'|'artisan'|'hype'|'fashion'
export type LayoutKey  = 'centered'|'editorial'|'wellness'|'dark_tech'|'playful'|'brutalist'|'gallery'|'trust'|'artisan'|'neon'|'fashion'

export type StoreTheme = {
  id: string; nameAr: string; nicheAr: string; emoji: string; dark: boolean
  cardStyle: CardStyle; layout: LayoutKey
  pageBg: string; sectionBg: string; cardBg: string; navBg: string; footerBg: string
  formBg: string; inputBg: string; border: string; inputBorder: string; cardBorder: string
  text: string; subtext: string; muted: string
  accent: string; accentDark: string; accentText: string; accentGlow: string
  badgeBg: string; badgeText: string; discountBg: string
  timerBg: string; timerText: string
  font: string; headingFont: string; headingWeight: number
  radius: string; radiusSm: string; radiusBtn: string
  heroGradient: string; heroTextColor: string; starColor: string; divider: string; urgencyBg: string
}

export const STORE_THEMES: StoreTheme[] = [
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

export function getStoreTheme(id: string | null | undefined): StoreTheme {
  return STORE_THEMES.find(t => t.id === id) ?? STORE_THEMES[0]
}
