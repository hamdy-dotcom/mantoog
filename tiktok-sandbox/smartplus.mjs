#!/usr/bin/env node
// Standalone TikTok Smart+ sandbox tester — fast iterate loop, no app rebuild.
//
//   node tiktok-sandbox/smartplus.mjs check          → verify the sandbox token + advertiser work
//   node tiktok-sandbox/smartplus.mjs conversion     → create a Smart+ Web-conversion campaign
//   node tiktok-sandbox/smartplus.mjs leads          → create a Smart+ Lead-gen campaign
//   node tiktok-sandbox/smartplus.mjs search         → create a Smart+ Search campaign
//   node tiktok-sandbox/smartplus.mjs list           → list Smart+ campaigns in the account
//   node tiktok-sandbox/smartplus.mjs conversion WEB_CONVERSIONS   → override objective_type ad-hoc
//
// Reads credentials from .env.local (kept out of chat / git):
//   TIKTOK_SANDBOX_ADVERTISER_ID=...
//   TIKTOK_SANDBOX_ACCESS_TOKEN=...
import { readFileSync } from 'fs'

// ── load .env.local ──────────────────────────────────────────────────────────
const env = {}
try {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* no .env.local */ }

const ADV = process.env.TIKTOK_SANDBOX_ADVERTISER_ID || env.TIKTOK_SANDBOX_ADVERTISER_ID
const TOKEN = process.env.TIKTOK_SANDBOX_ACCESS_TOKEN || env.TIKTOK_SANDBOX_ACCESS_TOKEN
// Sandbox lives on a separate host from production; sandbox tokens only work here.
const BASE = 'https://sandbox-ads.tiktok.com/open_api/v1.3'

if (!ADV || !TOKEN) {
  console.error('\n❌ Missing credentials. Add these two lines to .env.local:\n' +
    '   TIKTOK_SANDBOX_ADVERTISER_ID=<your sandbox advertiser id>\n' +
    '   TIKTOK_SANDBOX_ACCESS_TOKEN=<your sandbox access token>\n' +
    '(Get both from the TikTok developer portal → your app → "Sandbox Ad Account".)\n')
  process.exit(1)
}

// TikTok requires request_id to be a numeric integer string.
const rid = () => String(Date.now()) + String(Math.floor(Math.random() * 100000))

function show(label, j, httpStatus) {
  console.log('\n── ' + label + ' ──')
  if (httpStatus != null) console.log('HTTP', httpStatus)
  console.log('code:', j.code, '| message:', j.message)
  if (j.request_id) console.log('request_id:', j.request_id)
  if (j.data && Object.keys(j.data).length) console.log('data:', JSON.stringify(j.data, null, 2))
  if (j.code === 0) console.log('✅ success')
  else console.log('⚠️  TikTok rejected it — the message above says which field to fix.')
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json().catch(() => ({ message: 'non-JSON response' }))
  show('POST ' + path, j, res.status)
  return j
}

async function get(path, params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(BASE + path + '?' + qs, { headers: { 'Access-Token': TOKEN } })
  const j = await res.json().catch(() => ({ message: 'non-JSON response' }))
  show('GET ' + path, j, res.status)
  return j
}

// ── campaign templates ──
// Learned live against sandbox: /campaign/create/ needs a numeric request_id,
// budget >= 50 (SAR floor), budget_mode, and app QPS is 1 (run one at a time).
// is_smart_performance_campaign is the Smart+ switch, but TikTok IGNORES it unless
// the ad account is ALLOWLISTED for Upgraded Smart+ (Allowlist Management tab) —
// until then every create returns campaign_automation_type: MANUAL.
const base = (name, objective) => ({
  advertiser_id: ADV,
  campaign_name: `[TEST] ${name} ${new Date().toISOString().slice(0, 16)}`,
  objective_type: objective,
  request_id: rid(),
  operation_status: 'DISABLE', // create paused
  budget_mode: 'BUDGET_MODE_DAY',
  budget: 50, // currency floor (SAR)
})

const templates = {
  // Website conversions (COD products) — optimize on the TikTok pixel.
  conversion: () => ({ ...base('Smart+ Conversion', 'WEB_CONVERSIONS'), is_smart_performance_campaign: true }),
  // Lead generation (instant forms).
  leads: () => ({ ...base('Smart+ Leads', 'LEAD_GENERATION'), is_smart_performance_campaign: true }),
  // Search campaigns use is_search_campaign (separate from Smart+).
  search: () => ({ ...base('Search', 'TRAFFIC'), is_search_campaign: true }),
}

async function report(j) {
  const c = j?.data
  if (j.code === 0 && c) {
    console.log(`   → campaign_id: ${c.campaign_id}`)
    console.log(`   → automation_type: ${c.campaign_automation_type}  (SMART_PLUS = Smart+, MANUAL = regular)`)
    console.log(`   → is_smart_performance_campaign: ${c.is_smart_performance_campaign}  | is_search_campaign: ${c.is_search_campaign}`)
    if (c.campaign_automation_type === 'MANUAL') console.log('   ⚠️  Created as MANUAL — account is NOT allowlisted for Upgraded Smart+ yet.')
  }
}

const cmd = process.argv[2]
const override = process.argv[3] // optional objective_type override

;(async () => {
  try {
    if (cmd === 'check') {
      await get('/advertiser/info/', { advertiser_ids: JSON.stringify([ADV]) })
      return
    }
    if (cmd === 'list') {
      await get('/campaign/get/', { advertiser_id: ADV, page_size: 20 })
      return
    }
    const build = templates[cmd]
    if (!build) {
      console.log('usage: node tiktok-sandbox/smartplus.mjs [check|list|conversion|leads|search] [objective_override]')
      return
    }
    const body = build()
    if (override) body.objective_type = override
    console.log('\n➡️  Creating with body:\n' + JSON.stringify(body, null, 2))
    const j = await post('/campaign/create/', body)
    await report(j)
  } catch (e) {
    console.error('\n💥 request failed:', e.message)
  }
})()
