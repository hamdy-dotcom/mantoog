import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const { url, country, currency, language } = await request.json()
    const countryNames: Record<string, string> = { EG: 'Egypt', SA: 'Saudi Arabia', AE: 'UAE', MA: 'Morocco', DZ: 'Algeria' }

    const prompt = language === 'ar'
      ? `أنت خبير تسويق في التجارة الإلكترونية وDropshipping في السوق العربي. حلل هذا المنتج للسوق: ${countryNames[country] || country}. رابط المنتج: ${url}. العملة: ${currency}. أرجع JSON فقط:
{"verdict":"strong أو moderate أو risky","verdictLabel":"فرصة ممتازة أو فرصة معقولة أو خطر عالٍ","summary":"جملة واحدة","marketFit":رقم 1-10,"codPotential":رقم 1-10,"competition":رقم 1-10,"points":["نقطة 1","نقطة 2","نقطة 3","نقطة 4"],"suggestedPrice":{"sell":رقم,"margin":رقم}}`
      : `You are an e-commerce and dropshipping expert for the MENA market. Analyze this product for: ${countryNames[country] || country}. URL: ${url}. Currency: ${currency}. Return JSON only:
{"verdict":"strong or moderate or risky","verdictLabel":"Strong Opportunity or Moderate or High Risk","summary":"one sentence","marketFit":1-10,"codPotential":1-10,"competition":1-10,"points":["point 1","point 2","point 3","point 4"],"suggestedPrice":{"sell":number,"margin":number}}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    const parsed = JSON.parse(clean.slice(start, end + 1))
    return NextResponse.json({ success: true, ...parsed })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
