import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import sanitizeHtml from 'sanitize-html'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { url, price, originalPrice, currency, language, productName, description, scrapedImages } = await request.json()

    const isRTL = language === 'ar'
    const isManual = !url && productName

    const prompt = isRTL
      ? `أنت خبير تسويق إلكتروني متخصص في السوق العربي.

${isManual
  ? `اسم المنتج: ${productName}
الوصف: ${description || 'غير محدد'}`
  : `${productName ? `اسم المنتج: ${productName}` : `رابط المنتج: ${url}`}`}
السعر: ${price} ${currency}
${originalPrice ? `السعر قبل الخصم: ${originalPrice} ${currency}` : ''}

المطلوب:
1. ${isManual ? 'اكتب محتوى تسويقي عربي عالي التحويل للمنتج' : 'تخيل المنتج من الرابط واكتب محتوى تسويقي عربي عالي التحويل'}
2. اكتب بالعامية المصرية أو الخليجية حسب العملة (SAR/AED = خليجي، EGP = مصري)
3. أرجع JSON فقط بدون أي نص آخر

JSON المطلوب بالضبط:
{
  "product_name": "اسم المنتج",
  "headline": "عنوان رئيسي جذاب ومختصر",
  "subheadline": "جملة فائدة رئيسية واحدة",
  "cta_text": "نص زر الشراء",
  "benefits": ["فائدة 1", "فائدة 2", "فائدة 3", "فائدة 4"],
  "urgency_text": "جملة إلحاح قصيرة",
  "trust_text": "جملة ثقة قصيرة",
  "description_long": "وصف تفصيلي من 3 جمل فقط"
}

قواعد مهمة:
- لا تستخدم علامات اقتباس مزدوجة داخل النصوص العربية
- اكتب نصوص قصيرة ومباشرة
- ركز على الفائدة للمشتري`
      : `You are an e-commerce marketing expert.

${isManual
  ? `Product name: ${productName}
Description: ${description || 'Not provided'}`
  : `${productName ? `Product name: ${productName}` : `Product URL: ${url}`}`}
Price: ${price} ${currency}
${originalPrice ? `Original price: ${originalPrice} ${currency}` : ''}

Task:
1. ${isManual ? 'Write high-converting marketing copy for this product' : 'Imagine the product from the URL and write high-converting marketing copy'}
2. Return JSON only with absolutely no other text

Required JSON exactly:
{
  "product_name": "product name",
  "headline": "short catchy headline",
  "subheadline": "one main benefit sentence",
  "cta_text": "buy button text",
  "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4"],
  "urgency_text": "short urgency sentence",
  "trust_text": "short trust sentence",
  "description_long": "detailed description in 3 sentences only"
}

Rules:
- No double quotes inside text values
- Keep all texts short and direct
- Focus on buyer benefits`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Clean the response aggressively
    let clean = raw.trim()
    clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim()

    // Extract JSON object
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON found in response')
    clean = clean.slice(start, end + 1)

    // Fix common JSON issues
    clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // remove control chars
    clean = clean.replace(/,(\s*[}\]])/g, '$1') // remove trailing commas

    const parsed = JSON.parse(clean)
    if (typeof parsed.description_long === 'string') {
      parsed.description_long = sanitizeHtml(parsed.description_long)
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    console.error('AI error:', error?.message)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
