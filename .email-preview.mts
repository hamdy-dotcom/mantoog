import { buildDailyReportHtml, buildGuardianAlertHtml } from './src/lib/agents/notify'
import { writeFileSync } from 'fs'
const SP = '/private/tmp/claude-501/-Users-mac-Documents-mantoog/d2bdd6aa-7487-4670-b048-fdbd37786e18/scratchpad'
const report = buildDailyReportHtml({
  date: '2026-07-25', currency: 'EGP', totalSpend: 1240, totalConversions: 18, realOrders: 14,
  campaigns: [
    { name: 'جهاز بخار محمول - Orders', spend: 740, conversions: 12, cpa: 62 },
    { name: 'مكنسة لاسلكية 150W - Orders', spend: 500, conversions: 6, cpa: 83 },
  ],
  actions: [
    { agent: 'guardian', action: 'pause', reason: 'تكلفة الطلب 210 EGP تجاوزت 1.5× الهدف (100)', time: '' },
    { agent: 'guardian', action: 'would_pause', reason: 'صرفت الحملة 320 EGP اليوم دون أي طلب (الحد: 300)', time: '' },
  ],
  adsManagerUrl: '#',
})
const alert = buildGuardianAlertHtml({
  campaignName: 'جهاز بخار محمول - Orders', observing: true,
  reason: 'صرفت الحملة 320 EGP اليوم دون أي طلب (الحد: 300)',
  stats: { spend: 320, conversions: 0, cpa: null }, currency: 'EGP', adsManagerUrl: '#',
})
writeFileSync(SP + '/email-report.html', report)
writeFileSync(SP + '/email-alert.html', alert)
console.log('rendered', report.length, alert.length)
