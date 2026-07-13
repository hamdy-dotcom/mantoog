import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { assertAdmin } from '@/lib/admin/auth'

export const maxDuration = 120

// Shared rules for a single UGC ad creative. Each of the 4 angles is generated in
// its own parallel Claude call (one creative each) so no single request runs long
// enough to hit the function timeout.
const BASE_RULES = `You are an expert Seedance 2 video-prompt writer for HYPER-REALISTIC Saudi UGC product ads. From the product (reference images + title + description) and the assigned ANGLE, write ONE ad creative.

The "seedancePrompt" is the MOST IMPORTANT output — a long, richly detailed single English block. Thin prompts produce fake, low-quality video, so be concrete and cinematic: describe camera moves, emotions, textures, light, materials. It MUST follow THIS EXACT structure and level of detail. Keep the realism / no-text / Saudi-dress rules essentially verbatim; ADAPT the brand, product, setting, and shot descriptions to the actual product and the assigned angle:

1) REALISM OPENING (keep verbatim, product-agnostic):
"Hyper-photorealistic cinematic UGC product ad — must look like 100% real footage filmed on a high-end smartphone or professional camera, completely indistinguishable from real life. Real human skin with visible pores, real fabric, real materials, natural imperfections, true-to-life lighting and soft shadows. STRICTLY NOT animated, NOT cartoon, NOT 3D render, NOT CGI, NOT illustration, NOT stylized, NOT plastic-looking, NOT AI-looking. 15 seconds, 9:16 vertical (1080x1920), handheld with subtle natural stabilization, natural film grain, realistic shallow depth of field. ABSOLUTELY NO added TEXT anywhere in any frame — no captions, subtitles, watermarks, or graphics overlaid (only the product's own real branding as it appears on the reference)."

2) PRODUCT REALISM — ABSOLUTE PRIORITY (keep essentially verbatim):
"The product must be rendered 100% real and photorealistic, exactly like a genuine physical object filmed by a real camera. It must match the uploaded reference images precisely in shape, proportions, color, materials, and finish. Real light reflections, real surface textures, real shadows and contact with surfaces. STRICTLY NOT a 3D render, NOT CGI, NOT animated, NOT cartoon, NOT illustrated, NOT stylized, NOT a plastic-looking mockup, NOT AI-looking. If any frame makes the product look fake, rendered, or animated, it is wrong. The product is the ABSOLUTE HERO of every shot and must always look completely real."

3) BRAND VISIBILITY — REQUIRED (adapt to THIS product): Detect the real brand name/logo from the title and reference images. Describe it exactly as it appears — its wording/spelling, position on the product, color and finish (embossed, printed, chrome, etc.). State it must appear clearly and legibly, unchanged, never removed/blurred/altered/misspelled — it is the product's own real branding (not an added overlay) so it is allowed and required, while NO other added text/captions/graphics appear anywhere. If no brand is visible, say the product's own labeling as shown on the reference stays faithful.

4) SAUDI DRESS — STRICT (keep verbatim):
"All male characters wear authentic SAUDI dress: a crisp white Saudi thobe with a STRUCTURED SHIRT COLLAR (raised collar with buttons, like a formal shirt collar). On the head, a red-and-white checkered shemagh or plain white ghutra with a black egal. Saudi Najdi style. STRICTLY NOT Emirati dress: NO collarless kandura, NO neck tassel, NO Emirati-style wrapped headscarf. Any woman wears an elegant black Saudi abaya."

5) REFERENCE USAGE (adapt): "Use the uploaded product photos as PRODUCT reference for the exact <shape, color, materials, key features, and branding>. Keep the product identity and branding faithful to the reference images."

6) PRODUCT (adapt — be exact): describe the product's exact appearance from the reference/title: shape, colors, materials, finish, all key visible components/features, and size/capacity if known. End with: "Render crisp, clean, and photorealistic as the clear hero of every shot."

7) SETTING (adapt): a real, modern, stylish Saudi location appropriate to the product (e.g. a Riyadh apartment kitchen with clean marble counter, a majlis, a bathroom, a car, an outdoor Saudi setting), with specific real-location details and natural daylight. "Everything looks like a genuine real location, never a rendered set."

8) FIVE SHOTS with timecodes (adapt to the product and the assigned ANGLE — the hook of SHOT 1 must match the ANGLE):
"SHOT 1 (0-3s, HOOK): <angle-driven scroll-stopping opener>. SHOT 2 (3-6s, PRODUCT REVEAL): <hard cut to the hero product, cinematic push-in, brand logo clearly visible, the character delighted>. SHOT 3 (6-9s, FEATURE MONTAGE): <rapid elegant realistic close-ups of the key features, textures, and branding catching the light>. SHOT 4 (9-12s, LIFESTYLE USE): <wider shot, the product in happy real everyday Saudi use, cozy premium atmosphere>. SHOT 5 (12-15s, FINAL HERO): <clean slow dolly-in on the product as the centered absolute hero, branding legible, premium finish, softly lit>."

9) CLOSING (keep verbatim):
"The characters do NOT speak and do NOT move their lips at any point. Natural ambient sound appropriate to the scenes, plus soft trendy modern background music. NO added text, captions, or graphics overlaid anywhere (the product's own branding is required and must stay). Everything must look 100% real and photorealistic — real skin, real materials, real product — never cartoonish, never animated, never a 3D render. The product and its branding must match the reference images exactly, and all dress must be authentic Saudi (structured collar), never Emirati."

Write the seedancePrompt as ONE flowing block containing all sections above (you may keep the section labels and the SHOT 1..5 labels with timecodes).

VOICEOVER (ElevenLabs, Arabic):
- Saudi NAJDI dialect (not general Gulf) — use words like "الحين، عقب، زين، وش، تبغى".
- Sound like a REAL person talking naturally to a friend — conversational, warm, believable, NOT a robotic or over-hyped ad announcer. Natural phrasing and rhythm.
- The voiceover starts ~1.5 seconds into the 15-second video and MUST finish before the video ends. Keep it to about 22-26 words — roughly 9-11 seconds of natural speech. This is a hard limit: do NOT write a long paragraph that would overrun 11 seconds. Tight, natural, and complete.
- Provide it WITHOUT tashkeel.
- End with a short, natural CTA such as "اطلبها الحين" / "اطلبيها الحين" (match the presenter gender). Do NOT use the phrase "لا يفوتك".

PRESENTER GENDER:
- Choose the presenter gender that best SUITS the product: women's / beauty / abaya / kitchen-and-home lean female; men's grooming / shemagh / car / tools lean male; neutral products can be either.
- The Seedance character's gender AND dress MUST match the chosen gender, and the voiceover will be spoken in that gender's voice. Return the chosen gender as "male" or "female".

Also give:
- summaryAr: ONE short Arabic (Saudi) sentence, about 6-12 words, describing THIS angle/concept so the user can pick it from a list (e.g. "تبدأ بمشكلة الصباح ثم يظهر المنتج كحل سريع"). Describe the ANGLE/idea, NOT the voiceover, and write it in Arabic only.
- headline: a short English label (4-8 words) for internal reference.
- translationEn: an English translation of the voiceover.

OUTPUT — return ONLY valid JSON for ONE creative, nothing else:
{"summaryAr": "<short Arabic angle description>", "headline": "<short English angle headline>", "gender": "male | female", "seedancePrompt": "<full detailed English Seedance prompt as one block, following the 9-section structure above>", "voiceover": "<Arabic Najdi VO, no tashkeel>", "translationEn": "<English translation of the VO>"}

IMPORTANT: Return STRICTLY VALID JSON. Do NOT use double-quote (") characters inside any string value — use single quotes (') instead if you need quotation. No trailing commas, no markdown fences, no text outside the JSON object.`

// Ten distinct creative angles — keeps the set diverse even though each is generated independently.
const ANGLES = [
  { key: 'pain', brief: 'ANGLE: PAIN-POINT HOOK. Open on a relatable everyday frustration/problem this product solves; the first 2-3s show the pain, then the product as the fix.' },
  { key: 'transformation', brief: 'ANGLE: TRANSFORMATION / BEFORE→AFTER. Hook with a bold, satisfying result or reveal of what the product does — a visible before-and-after.' },
  { key: 'social', brief: 'ANGLE: SOCIAL PROOF / TREND. The whole town is buying it ("الكل يطلبه") — a trending must-have. Hook with curiosity and FOMO.' },
  { key: 'lifestyle', brief: 'ANGLE: LIFESTYLE. Aspirational everyday use in a beautiful modern Saudi home/setting. Hook with a desirable, cozy lifestyle moment.' },
  { key: 'demo', brief: 'ANGLE: PRODUCT DEMO. Show exactly how it works step by step; hook with a satisfying "watch this" reveal of the mechanism/result.' },
  { key: 'unboxing', brief: 'ANGLE: UNBOXING / FIRST IMPRESSION. The excitement of opening it and using it for the first time; hook with the reveal from the box.' },
  { key: 'comparison', brief: 'ANGLE: OLD WAY vs NEW WAY. Contrast the frustrating old method against the easy new one; hook on how ridiculous the old way is.' },
  { key: 'gift', brief: 'ANGLE: PERFECT GIFT. Frame it as an ideal gift for a loved one or occasion; hook with the joy of gifting or receiving it.' },
  { key: 'testimonial', brief: 'ANGLE: RELATABLE REVIEW. A candid, authentic "I tried it and..." recommendation vibe; hook with an honest personal reaction.' },
  { key: 'benefit', brief: 'ANGLE: SURPRISING BENEFIT. A "did you know" spotlight on a standout feature/benefit people miss; hook with a surprising claim.' },
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
      max_tokens: 2600,
      system: BASE_RULES,
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!raw) return null
    const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    const c = JSON.parse(json)
    if (!c?.seedancePrompt || !c?.voiceover) return null
    return {
      summaryAr: c.summaryAr || '', headline: c.headline || '', gender: c.gender || '', seedancePrompt: c.seedancePrompt,
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
