import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 60

// Encodes the friend's Seedance + ElevenLabs ad workflow. Produces 4 creatives
// (4 angles), each with its own Seedance video prompt + a separate Najdi voiceover.
const SYSTEM_PROMPT = `You create UGC product ad videos for the Saudi market. For the product provided (images + title + description), produce FOUR distinct ad creatives — think of them as 4 different angles/concepts for the same product, each a standalone ad.

For EACH creative, follow these EXACT rules:

VIDEO (Seedance 2 prompt, written in English as one block):
- Length: 15 seconds, format 9:16 vertical (1080x1920).
- Style: ultra-realistic, cinematic product-hero UGC, handheld with subtle stabilization; the PRODUCT is always the hero.
- 5 shots: (1) creative hook, (2) product reveal, (3) feature montage, (4) lifestyle use, (5) final hero shot.
- NO text, captions, watermarks, logos or on-screen graphics anywhere.
- The character must NOT speak or move their lips (the voiceover is added later) — only natural ambient sounds + soft trendy background music.
- HOOK (most important): the first 2-3 seconds must STOP the scroll — a pattern interrupt, a real pain point, an embarrassing/shocking moment, or a bold question.
- CULTURE: characters must wear clearly SAUDI dress (men: white Saudi thobe with structured collar + red-and-white shemagh OR plain white ghutra with black egal; women: Saudi black abaya). NEVER Emirati dress (no kandura, no wrapped Emirati headscarf). Saudi environments/settings.
- Make the 4 creatives genuinely different from each other (different hook, setting, and shot emphasis).

VOICEOVER (ElevenLabs, Arabic):
- Saudi NAJDI dialect (not general Gulf) — use words like "الحين، عقب، زين، وش، تبغى، لا يفوتك".
- The voiceover starts ~1.5 seconds into the 15-second video and must comfortably FILL the rest of it: about 30-36 words (~11-12 seconds of natural speech at speed ~1.05). Not a rushed one-liner — pace it to cover the clip, and make sure it finishes before the video ends.
- Provide it WITHOUT tashkeel.
- End with a strong CTA (usually "اطلبها الحين لا يفوتك!").

PRESENTER GENDER (per creative):
- Choose the presenter gender that best SUITS the product: women's / beauty / abaya / kitchen-and-home products lean female; men's grooming / shemagh / car / tools lean male; neutral household products can be either. For neutral products, vary the gender across the 4 creatives.
- The Seedance character's gender AND dress MUST match the chosen gender (male: Saudi thobe + shemagh/ghutra; female: Saudi black abaya), and the voiceover will be spoken in that gender's voice — keep them consistent.
- Return the chosen gender as "male" or "female".

Also give each creative a short punchy HEADLINE (4-8 words, English) that summarizes its angle/hook so a user can pick it from a list (e.g. "Filthy stovetop cleaned in seconds", "Kills bathroom germs instantly").
Also give an English translation of each voiceover for reference.

OUTPUT — return ONLY valid JSON, nothing else:
{"creatives": [
  {"headline": "<short English angle headline>", "gender": "male | female", "seedancePrompt": "<full English Seedance prompt as one block>", "voiceover": "<Arabic Najdi VO, no tashkeel>", "translationEn": "<English translation of the VO>"},
  ... exactly 4 items ...
]}`

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { title, description, imageUrls = [] } = await req.json().catch(() => ({}))
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const client = new Anthropic({ apiKey: anthropicKey })
  const imageBlocks = (imageUrls as string[]).slice(0, 4).map(url => ({
    type: 'image' as const, source: { type: 'url' as const, url },
  }))
  const textBlock = {
    type: 'text' as const,
    text: `Product: ${title}\n${description ? `Description: ${String(description).slice(0, 600)}` : ''}\n\nProduce the 4 creatives. Return only the JSON.`,
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!raw) throw new Error('Empty response from Claude')
    const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    const parsed = JSON.parse(json)
    const creatives = Array.isArray(parsed.creatives) ? parsed.creatives.slice(0, 4) : []
    if (!creatives.length) throw new Error('No creatives returned')
    return NextResponse.json({ creatives })
  } catch (e: any) {
    return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 })
  }
}
