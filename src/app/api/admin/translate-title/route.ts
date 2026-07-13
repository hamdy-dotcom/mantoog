import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 30

// Translate a scraped product title into a clean Saudi-Arabic product name.
// Brand names / model codes stay in Latin; specs (L, W, counts) become Arabic.
const SYSTEM = `You translate e-commerce product titles into natural Saudi Arabic for a storefront.
Rules:
- Keep brand names and model numbers in their original Latin form (e.g. BLACK+DECKER, SAF80W-B5).
- Translate the rest to concise, natural Arabic a Saudi shopper would read.
- Use Arabic-Indic numerals (٠-٩) for quantities/specs.
- No marketing fluff, no extra words, no quotes — just the translated title on one line.
Return ONLY the Arabic title, nothing else.`

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { text } = await req.json().catch(() => ({}))
  if (!text || typeof text !== 'string') return NextResponse.json({ error: 'text required' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ titleAr: text }) // graceful: fall back to original

  try {
    const client = new Anthropic({ apiKey: anthropicKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: 'user', content: text.slice(0, 500) }],
    })
    const titleAr = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return NextResponse.json({ titleAr: titleAr || text })
  } catch {
    return NextResponse.json({ titleAr: text }) // never block the flow on translation
  }
}
