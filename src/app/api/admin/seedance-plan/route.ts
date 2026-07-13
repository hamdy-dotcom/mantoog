import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 120

// Shared rules for a single UGC ad creative. Each of the 4 angles is generated in
// its own parallel Claude call (one creative each) so no single request runs long
// enough to hit the function timeout.
const BASE_RULES = `You create ONE UGC product ad creative for the Saudi market, from the product provided (images + title + description).

Follow these EXACT rules:

VIDEO (Seedance 2 prompt, written in English as one block):
- Length: 15 seconds, format 9:16 vertical (1080x1920).
- Style: ultra-realistic, cinematic product-hero UGC, handheld with subtle stabilization; the PRODUCT is always the hero.
- 5 shots: (1) creative hook, (2) product reveal, (3) feature montage, (4) lifestyle use, (5) final hero shot.
- NO text, captions, watermarks, logos or on-screen graphics anywhere.
- The character must NOT speak or move their lips (the voiceover is added later) — only natural ambient sounds + soft trendy background music.
- HOOK (most important): the first 2-3 seconds must STOP the scroll.
- CULTURE: characters must wear clearly SAUDI dress (men: white Saudi thobe with structured collar + red-and-white shemagh OR plain white ghutra with black egal; women: Saudi black abaya). NEVER Emirati dress (no kandura, no wrapped Emirati headscarf). Saudi environments/settings.

VOICEOVER (ElevenLabs, Arabic):
- Saudi NAJDI dialect (not general Gulf) — use words like "الحين، عقب، زين، وش، تبغى، لا يفوتك".
- The voiceover starts ~1.5 seconds into the 15-second video and must comfortably FILL the rest of it: about 30-36 words (~11-12 seconds of natural speech at speed ~1.05). Not a rushed one-liner — pace it to cover the clip, and make sure it finishes before the video ends.
- Provide it WITHOUT tashkeel.
- End with a strong CTA (usually "اطلبها الحين لا يفوتك!").

PRESENTER GENDER:
- Choose the presenter gender that best SUITS the product: women's / beauty / abaya / kitchen-and-home lean female; men's grooming / shemagh / car / tools lean male; neutral products can be either.
- The Seedance character's gender AND dress MUST match the chosen gender, and the voiceover will be spoken in that gender's voice — keep them consistent. Return the chosen gender as "male" or "female".

Also give a short punchy HEADLINE (4-8 words, English) that summarizes the angle/hook.
Also give an English translation of the voiceover.

OUTPUT — return ONLY valid JSON for ONE creative, nothing else:
{"headline": "<short English angle headline>", "gender": "male | female", "seedancePrompt": "<full English Seedance prompt as one block>", "voiceover": "<Arabic Najdi VO, no tashkeel>", "translationEn": "<English translation of the VO>"}`

// Four distinct creative angles — keeps the set diverse even though each is generated independently.
const ANGLES = [
  { key: 'pain', brief: 'ANGLE: PAIN-POINT HOOK. Open on a relatable everyday frustration/problem this product solves; the first 2-3s show the pain, then the product as the fix.' },
  { key: 'transformation', brief: 'ANGLE: TRANSFORMATION / BEFORE→AFTER. Hook with a bold, satisfying result or reveal of what the product does — a visible before-and-after.' },
  { key: 'social', brief: 'ANGLE: SOCIAL PROOF / TREND. The whole town is buying it ("الكل يطلبه") — a trending must-have. Hook with curiosity and FOMO.' },
  { key: 'lifestyle', brief: 'ANGLE: LIFESTYLE. Aspirational everyday use in a beautiful modern Saudi home/setting. Hook with a desirable, cozy lifestyle moment.' },
]

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { title, description, imageUrls = [] } = await req.json().catch(() => ({}))
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const client = new Anthropic({ apiKey: anthropicKey })
  // Two images are plenty for Claude to understand the product and keep each call fast.
  const imageBlocks = (imageUrls as string[]).filter(Boolean).slice(0, 2).map(url => ({
    type: 'image' as const, source: { type: 'url' as const, url },
  }))

  async function genOne(angle: typeof ANGLES[number]) {
    const textBlock = {
      type: 'text' as const,
      text: `Product: ${title}\n${description ? `Description: ${String(description).slice(0, 500)}` : ''}\n\n${angle.brief}\n\nProduce ONE creative for this angle. Return only the JSON object.`,
    }
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: BASE_RULES,
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!raw) return null
    const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    const c = JSON.parse(json)
    if (!c?.seedancePrompt || !c?.voiceover) return null
    return {
      headline: c.headline || '', gender: c.gender || '', seedancePrompt: c.seedancePrompt,
      voiceover: c.voiceover, translationEn: c.translationEn || '',
    }
  }

  try {
    // Four angles in parallel — each is a small, fast request.
    const settled = await Promise.allSettled(ANGLES.map(a => genOne(a)))
    const creatives = settled
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value)
      .map(r => r.value)
    if (!creatives.length) {
      const firstErr = settled.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
      throw new Error(firstErr ? String(firstErr.reason?.message || firstErr.reason) : 'No creatives returned')
    }
    return NextResponse.json({ creatives })
  } catch (e: any) {
    return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 })
  }
}
