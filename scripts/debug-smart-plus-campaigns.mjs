/**
 * One-off: list campaign Smart+ flags for active TikTok connection.
 * Usage: node scripts/debug-smart-plus-campaigns.mjs [nameFilter]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    console.error('Could not read .env.local')
  }
}

loadEnv()

const TIKTOK = 'https://business-api.tiktok.com/open_api/v1.3'
const SMART = new Set(['UPGRADED_SMART_PLUS', 'SMART_PLUS'])

function detectSmartPlus(c) {
  const flag = c.is_smart_performance_campaign
  if (flag === true || flag === 'true' || flag === 1 || flag === '1') return true
  const automation = String(c.campaign_automation_type ?? '').toUpperCase()
  return SMART.has(automation)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const nameFilter = process.argv[2] || 'Copy 1 of 20'

const { data: conn } = await supabase
  .from('tiktok_connections')
  .select('advertiser_id, access_token, store_id')
  .eq('is_active', true)
  .limit(1)
  .single()

if (!conn?.access_token) {
  console.error('No active tiktok connection')
  process.exit(1)
}

const params = new URLSearchParams({
  advertiser_id: conn.advertiser_id,
  page_size: '200',
  fields: JSON.stringify([
    'campaign_id', 'campaign_name', 'campaign_type', 'campaign_automation_type',
    'is_smart_performance_campaign', 'objective_type', 'budget_optimize_on',
  ]),
})
const res = await fetch(`${TIKTOK}/campaign/get/?${params}`, {
  headers: { 'Access-Token': conn.access_token },
})
const json = await res.json()
if (json.code !== 0) {
  console.error('TikTok error:', json.code, json.message)
  process.exit(1)
}

const list = json.data?.list || []
let smart = 0
let regular = 0
const matches = []

for (const c of list) {
  const isSp = detectSmartPlus(c)
  if (isSp) smart++
  else regular++
  if (String(c.campaign_name || '').includes(nameFilter)) {
    matches.push(c)
  }
}

console.log('advertiser_id:', conn.advertiser_id)
console.log('total campaigns:', list.length)
console.log('smart_plus:', smart, '| regular:', regular)
console.log('')

if (matches.length) {
  console.log(`=== Matches for "${nameFilter}" ===`)
  for (const c of matches) {
    const isSp = detectSmartPlus(c)
    console.log({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      is_smart_plus: isSp,
      campaign_automation_type: c.campaign_automation_type,
      campaign_type: c.campaign_type,
      is_smart_performance_campaign: c.is_smart_performance_campaign,
    })
  }
} else {
  console.log(`No campaigns matching "${nameFilter}"`)
  console.log('Sample names:', list.slice(0, 5).map(c => c.campaign_name))
}

console.log('\n=== Regular (non-Smart+) campaigns (up to 10) ===')
for (const c of list.filter(x => !detectSmartPlus(x)).slice(0, 10)) {
  console.log(`- ${c.campaign_id} | ${c.campaign_name}`)
}
