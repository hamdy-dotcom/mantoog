import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const COUNTRY_NAMES: Record<string, string> = {
  EG: 'Egypt', SA: 'Saudi Arabia', AE: 'UAE', MA: 'Morocco', DZ: 'Algeria'
}

const CATEGORY_NAMES: Record<string, string> = {
  all: 'all categories', electronics: 'electronics', beauty: 'beauty',
  home: 'home & kitchen', health: 'health & fitness', kids: 'kids',
  sports: 'sports', fashion: 'fashion'
}

// Static winning products per market - updated manually or by cron
const STATIC_PRODUCTS: Record<string, any[]> = {
  SA: [
    { title: 'مضخة مياه كهربائية', titleEn: 'Electric Water Pump Dispenser', description: 'منتج ضروري في كل منزل سعودي. طلب مستمر طوال العام.', category: 'home', trend: 'proven', adCount: 45, maxDaysRunning: 120, codScore: 9, margin: 72, sellRange: '150-220 SAR', sourceQuery: 'electric water pump dispenser' },
    { title: 'سماعات بلوتوث لاسلكية', titleEn: 'Wireless Bluetooth Earbuds', description: 'طلب ضخم في السوق السعودي. جميع الأعمار يشترونها.', category: 'electronics', trend: 'hot', adCount: 60, maxDaysRunning: 90, codScore: 8, margin: 68, sellRange: '100-200 SAR', sourceQuery: 'wireless bluetooth earbuds' },
    { title: 'فرشاة تمليس الشعر الكهربائية', titleEn: 'Electric Hair Straightener Brush', description: 'النساء في السعودية يشترونها باستمرار. تحويل ممتاز على COD.', category: 'beauty', trend: 'proven', adCount: 38, maxDaysRunning: 150, codScore: 9, margin: 70, sellRange: '200-350 SAR', sourceQuery: 'hair straightener brush electric' },
    { title: 'ساعة ذكية رياضية', titleEn: 'Smart Sports Watch', description: 'موضة متصاعدة في الخليج. مناسب لكل الأعمار.', category: 'electronics', trend: 'rising', adCount: 30, maxDaysRunning: 45, codScore: 7, margin: 62, sellRange: '150-280 SAR', sourceQuery: 'smart sports watch fitness' },
    { title: 'مدلك الرقبة والكتفين', titleEn: 'Neck Shoulder Massager', description: 'فئة الصحة الأكثر مبيعاً. يناسب جميع أفراد الأسرة.', category: 'health', trend: 'proven', adCount: 42, maxDaysRunning: 100, codScore: 9, margin: 65, sellRange: '180-300 SAR', sourceQuery: 'neck shoulder massager electric' },
    { title: 'موزع صابون أوتوماتيكي', titleEn: 'Automatic Soap Dispenser', description: 'منخفض التكلفة عالي الهامش. يناسب كل منزل.', category: 'home', trend: 'proven', adCount: 25, maxDaysRunning: 180, codScore: 9, margin: 75, sellRange: '70-120 SAR', sourceQuery: 'automatic soap dispenser touchless' },
    { title: 'حزام تصحيح الوضعية', titleEn: 'Posture Corrector Belt', description: 'طلب متزايد بسبب العمل من المنزل. يحل ألماً حقيقياً.', category: 'health', trend: 'rising', adCount: 28, maxDaysRunning: 60, codScore: 8, margin: 74, sellRange: '100-180 SAR', sourceQuery: 'posture corrector back support' },
    { title: 'لوح رسم إلكتروني للأطفال', titleEn: 'Kids LCD Drawing Tablet', description: 'هدية مثالية. ارتفاع في رمضان والعيد.', category: 'kids', trend: 'proven', adCount: 33, maxDaysRunning: 80, codScore: 9, margin: 68, sellRange: '80-140 SAR', sourceQuery: 'kids lcd writing drawing tablet' },
    { title: 'خلاط محمول USB', titleEn: 'Portable USB Blender', description: 'اتجاه الصحة واللياقة. سهل العرض على فيديو.', category: 'home', trend: 'rising', adCount: 22, maxDaysRunning: 40, codScore: 8, margin: 67, sellRange: '120-200 SAR', sourceQuery: 'portable usb blender bottle' },
    { title: 'حامل هاتف مغناطيسي للسيارة', titleEn: 'Magnetic Car Phone Holder', description: 'كل سائق يحتاجه. تكلفة منخفضة ربح عالٍ.', category: 'electronics', trend: 'proven', adCount: 20, maxDaysRunning: 200, codScore: 9, margin: 72, sellRange: '50-90 SAR', sourceQuery: 'magnetic car phone holder mount' },
    { title: 'سيروم تبييض البشرة', titleEn: 'Skin Whitening Serum', description: 'فئة التجميل الأكثر طلباً في الخليج.', category: 'beauty', trend: 'hot', adCount: 55, maxDaysRunning: 90, codScore: 8, margin: 73, sellRange: '100-200 SAR', sourceQuery: 'skin whitening brightening serum' },
    { title: 'أربطة مقاومة للتمرين', titleEn: 'Resistance Bands Set', description: 'الصالة المنزلية تنمو بسرعة في السعودية.', category: 'sports', trend: 'rising', adCount: 18, maxDaysRunning: 50, codScore: 8, margin: 70, sellRange: '80-150 SAR', sourceQuery: 'resistance bands exercise set' },
    { title: 'مكواة بخار محمولة', titleEn: 'Handheld Garment Steamer', description: 'يستبدل المكواة التقليدية. عرض فيديو سهل ومقنع.', category: 'home', trend: 'rising', adCount: 24, maxDaysRunning: 55, codScore: 8, margin: 66, sellRange: '120-200 SAR', sourceQuery: 'handheld garment steamer portable' },
    { title: 'كاميرا مراقبة واي فاي', titleEn: 'WiFi Security Camera', description: 'الأمن المنزلي أولوية في السعودية.', category: 'electronics', trend: 'proven', adCount: 35, maxDaysRunning: 110, codScore: 7, margin: 60, sellRange: '150-280 SAR', sourceQuery: 'wifi security camera indoor' },
    { title: 'رول مدلك الوجه', titleEn: 'Face Massager Roller', description: 'تجميل منخفض التكلفة عالي الهامش.', category: 'beauty', trend: 'rising', adCount: 20, maxDaysRunning: 35, codScore: 9, margin: 76, sellRange: '60-120 SAR', sourceQuery: 'face massager roller jade' },
    { title: 'جهاز إزالة الشعر بالليزر', titleEn: 'Laser Hair Removal Device', description: 'منتج فاخر بهامش ربح ممتاز.', category: 'beauty', trend: 'rising', adCount: 26, maxDaysRunning: 40, codScore: 7, margin: 70, sellRange: '200-400 SAR', sourceQuery: 'laser hair removal device home' },
    { title: 'حصيرة يوغا مضادة للانزلاق', titleEn: 'Non-slip Yoga Mat', description: 'لياقة بدنية ويوغا تنمو في السعودية.', category: 'sports', trend: 'proven', adCount: 15, maxDaysRunning: 90, codScore: 8, margin: 68, sellRange: '80-150 SAR', sourceQuery: 'yoga mat non slip thick' },
    { title: 'فيشة منزل ذكي واي فاي', titleEn: 'Smart WiFi Plug', description: 'المنزل الذكي اتجاه متنامٍ في الخليج.', category: 'electronics', trend: 'rising', adCount: 18, maxDaysRunning: 45, codScore: 7, margin: 65, sellRange: '70-130 SAR', sourceQuery: 'smart wifi plug socket' },
    { title: 'مجموعة قناع الوجه بالكولاجين', titleEn: 'Collagen Face Mask Set', description: 'شراء متكرر. النساء مخلصات لمنتجات العناية.', category: 'beauty', trend: 'proven', adCount: 30, maxDaysRunning: 120, codScore: 9, margin: 75, sellRange: '60-120 SAR', sourceQuery: 'collagen face mask sheet set' },
    { title: 'منقي هواء للسيارة', titleEn: 'Car Air Purifier', description: 'الصحة والنظافة أولوية بعد كوفيد.', category: 'electronics', trend: 'proven', adCount: 22, maxDaysRunning: 80, codScore: 8, margin: 64, sellRange: '80-150 SAR', sourceQuery: 'car air purifier freshener' },
    { title: 'طقم تبييض الأسنان', titleEn: 'Teeth Whitening Kit', description: 'محتوى قبل/بعد قوي. هامش ربح ممتاز.', category: 'beauty', trend: 'proven', adCount: 28, maxDaysRunning: 100, codScore: 8, margin: 72, sellRange: '90-170 SAR', sourceQuery: 'teeth whitening kit led' },
  ],
  EG: [
    { title: 'مضخة مياه كهربائية', titleEn: 'Electric Water Pump Dispenser', description: 'الأكثر مبيعاً في مصر. ضروري في كل منزل.', category: 'home', trend: 'hot', adCount: 80, maxDaysRunning: 180, codScore: 10, margin: 72, sellRange: '150-250 EGP', sourceQuery: 'electric water pump dispenser' },
    { title: 'جهاز تدليك الرقبة', titleEn: 'Neck Massager', description: 'الأعلى تحويلاً في مصر. كل الأعمار.', category: 'health', trend: 'hot', adCount: 70, maxDaysRunning: 150, codScore: 10, margin: 65, sellRange: '180-300 EGP', sourceQuery: 'neck massager electric' },
    { title: 'فرشاة تمليس الشعر', titleEn: 'Hair Straightener Brush', description: 'النساء المصريات يشترونها باستمرار.', category: 'beauty', trend: 'proven', adCount: 60, maxDaysRunning: 120, codScore: 9, margin: 70, sellRange: '200-380 EGP', sourceQuery: 'hair straightener brush electric' },
    { title: 'سماعات بلوتوث', titleEn: 'Bluetooth Earbuds', description: 'الأكثر بحثاً في مصر على فيسبوك.', category: 'electronics', trend: 'hot', adCount: 75, maxDaysRunning: 100, codScore: 9, margin: 66, sellRange: '120-250 EGP', sourceQuery: 'wireless bluetooth earbuds' },
    { title: 'ساعة ذكية', titleEn: 'Smart Watch', description: 'شباب مصر يحبون الساعات الذكية.', category: 'electronics', trend: 'proven', adCount: 65, maxDaysRunning: 90, codScore: 8, margin: 62, sellRange: '150-300 EGP', sourceQuery: 'smart watch fitness tracker' },
    { title: 'موزع صابون أوتوماتيكي', titleEn: 'Automatic Soap Dispenser', description: 'منخفض التكلفة جداً. ربح عالٍ.', category: 'home', trend: 'proven', adCount: 45, maxDaysRunning: 200, codScore: 10, margin: 78, sellRange: '60-120 EGP', sourceQuery: 'automatic soap dispenser touchless' },
    { title: 'حزام ظهر طبي', titleEn: 'Medical Back Belt', description: 'مشكلة ألم الظهر شائعة في مصر.', category: 'health', trend: 'proven', adCount: 50, maxDaysRunning: 130, codScore: 9, margin: 68, sellRange: '100-200 EGP', sourceQuery: 'back pain relief belt posture' },
    { title: 'شريط LED ملون', titleEn: 'RGB LED Strip Lights', description: 'الشباب والطلاب يعشقونه. فيروسي على تيك توك.', category: 'home', trend: 'rising', adCount: 40, maxDaysRunning: 60, codScore: 9, margin: 75, sellRange: '60-120 EGP', sourceQuery: 'rgb led strip lights smart' },
    { title: 'جهاز تنظيف الوجه الكهربائي', titleEn: 'Electric Face Cleanser', description: 'تجميل وعناية بشرة رائج جداً في مصر.', category: 'beauty', trend: 'rising', adCount: 35, maxDaysRunning: 50, codScore: 9, margin: 72, sellRange: '80-160 EGP', sourceQuery: 'electric face cleanser brush' },
    { title: 'لوح رسم أطفال', titleEn: 'Kids Drawing Tablet', description: 'هدية ممتازة. ارتفاع في المواسم.', category: 'kids', trend: 'proven', adCount: 42, maxDaysRunning: 90, codScore: 10, margin: 70, sellRange: '70-140 EGP', sourceQuery: 'kids lcd drawing tablet' },
    { title: 'خلاط محمول', titleEn: 'Portable Blender', description: 'اتجاه الصحة واللياقة ينمو في مصر.', category: 'home', trend: 'rising', adCount: 30, maxDaysRunning: 45, codScore: 9, margin: 67, sellRange: '120-220 EGP', sourceQuery: 'portable usb blender' },
    { title: 'كريم تبييض وترطيب', titleEn: 'Whitening Moisturizer Cream', description: 'الأكثر مبيعاً في تجميل مصر.', category: 'beauty', trend: 'hot', adCount: 85, maxDaysRunning: 160, codScore: 10, margin: 74, sellRange: '80-180 EGP', sourceQuery: 'whitening moisturizer face cream' },
    { title: 'مكنسة كهربائية محمولة', titleEn: 'Portable Vacuum Cleaner', description: 'منزل نظيف اهتمام مصري. طلب مستمر.', category: 'home', trend: 'proven', adCount: 38, maxDaysRunning: 100, codScore: 9, margin: 65, sellRange: '150-280 EGP', sourceQuery: 'portable handheld vacuum cleaner' },
    { title: 'حامل هاتف للسيارة', titleEn: 'Car Phone Holder', description: 'كل سيارة تحتاجه. سعر منخفض.', category: 'electronics', trend: 'proven', adCount: 35, maxDaysRunning: 180, codScore: 10, margin: 74, sellRange: '50-100 EGP', sourceQuery: 'car phone holder mount' },
    { title: 'طقم سكاكين مطبخ', titleEn: 'Kitchen Knife Set', description: 'أدوات المطبخ دائماً تبيع في مصر.', category: 'home', trend: 'proven', adCount: 28, maxDaysRunning: 120, codScore: 9, margin: 66, sellRange: '120-250 EGP', sourceQuery: 'kitchen knife set stainless' },
    { title: 'جهاز قياس ضغط الدم', titleEn: 'Blood Pressure Monitor', description: 'صحة القلب اهتمام متزايد. ثقة عالية.', category: 'health', trend: 'proven', adCount: 32, maxDaysRunning: 140, codScore: 8, margin: 62, sellRange: '200-400 EGP', sourceQuery: 'digital blood pressure monitor' },
    { title: 'مروحة محمولة شحن USB', titleEn: 'USB Rechargeable Fan', description: 'ضرورة في صيف مصر الحار.', category: 'electronics', trend: 'rising', adCount: 45, maxDaysRunning: 60, codScore: 9, margin: 68, sellRange: '80-160 EGP', sourceQuery: 'usb rechargeable portable fan' },
    { title: 'أدوات مكياج احترافية', titleEn: 'Professional Makeup Brush Set', description: 'المرأة المصرية تهتم بمكياجها جداً.', category: 'beauty', trend: 'proven', adCount: 40, maxDaysRunning: 110, codScore: 9, margin: 73, sellRange: '80-180 EGP', sourceQuery: 'professional makeup brush set' },
    { title: 'شاحن سريع لاسلكي', titleEn: 'Fast Wireless Charger', description: 'مع انتشار الهواتف الذكية الطلب يرتفع.', category: 'electronics', trend: 'rising', adCount: 25, maxDaysRunning: 40, codScore: 8, margin: 68, sellRange: '80-160 EGP', sourceQuery: 'wireless fast charger pad' },
    { title: 'مطهر يدين جيل', titleEn: 'Hand Sanitizer Gel', description: 'طلب مستمر بعد كوفيد.', category: 'health', trend: 'proven', adCount: 20, maxDaysRunning: 90, codScore: 10, margin: 70, sellRange: '40-80 EGP', sourceQuery: 'hand sanitizer gel antibacterial' },
  ],
  AE: [
    { title: 'جهاز تدليك القدمين', titleEn: 'Foot Massager Device', description: 'الإماراتيون يقدرون الرفاهية والراحة.', category: 'health', trend: 'proven', adCount: 30, maxDaysRunning: 100, codScore: 8, margin: 65, sellRange: '150-300 AED', sourceQuery: 'foot massager electric' },
    { title: 'سماعات نويز كانسلينج', titleEn: 'Noise Cancelling Earbuds', description: 'جمهور الإمارات يحب التقنية العالية.', category: 'electronics', trend: 'rising', adCount: 25, maxDaysRunning: 45, codScore: 7, margin: 60, sellRange: '150-350 AED', sourceQuery: 'noise cancelling wireless earbuds' },
    { title: 'كريم مرطب فاخر', titleEn: 'Luxury Moisturizing Cream', description: 'سوق التجميل الفاخر في الإمارات ضخم.', category: 'beauty', trend: 'proven', adCount: 35, maxDaysRunning: 120, codScore: 8, margin: 72, sellRange: '100-250 AED', sourceQuery: 'luxury moisturizing face cream' },
    { title: 'منقي هواء ذكي', titleEn: 'Smart Air Purifier', description: 'جودة الهواء اهتمام متزايد في الإمارات.', category: 'home', trend: 'rising', adCount: 20, maxDaysRunning: 55, codScore: 7, margin: 62, sellRange: '200-500 AED', sourceQuery: 'smart air purifier home' },
    { title: 'حصيرة يوغا فاخرة', titleEn: 'Premium Yoga Mat', description: 'ثقافة اللياقة قوية جداً في دبي.', category: 'sports', trend: 'proven', adCount: 18, maxDaysRunning: 80, codScore: 8, margin: 65, sellRange: '100-200 AED', sourceQuery: 'premium yoga mat thick non-slip' },
    { title: 'أدوات طبخ ذكية', titleEn: 'Smart Kitchen Tools', description: 'ربات المنازل في الإمارات تحب الجديد.', category: 'home', trend: 'rising', adCount: 22, maxDaysRunning: 40, codScore: 8, margin: 63, sellRange: '150-300 AED', sourceQuery: 'smart kitchen gadgets tools' },
    { title: 'نظارات شمسية فاشن', titleEn: 'Fashion Sunglasses', description: 'الموضة والأناقة في الإمارات أولوية.', category: 'fashion', trend: 'proven', adCount: 28, maxDaysRunning: 90, codScore: 8, margin: 70, sellRange: '80-200 AED', sourceQuery: 'fashion sunglasses polarized' },
    { title: 'جهاز تتبع اللياقة', titleEn: 'Fitness Tracker Band', description: 'مجتمع اللياقة الكبير في الإمارات.', category: 'sports', trend: 'rising', adCount: 20, maxDaysRunning: 50, codScore: 7, margin: 62, sellRange: '100-200 AED', sourceQuery: 'fitness tracker smart band' },
    { title: 'معطر سيارة فاخر', titleEn: 'Luxury Car Perfume', description: 'السيارات والروائح فاخرة في الإمارات.', category: 'fashion', trend: 'proven', adCount: 25, maxDaysRunning: 100, codScore: 9, margin: 75, sellRange: '60-150 AED', sourceQuery: 'luxury car perfume air freshener' },
    { title: 'جهاز تبييض الأسنان', titleEn: 'Teeth Whitening Device', description: 'المظهر الأنيق اهتمام في الإمارات.', category: 'beauty', trend: 'rising', adCount: 18, maxDaysRunning: 40, codScore: 7, margin: 68, sellRange: '150-300 AED', sourceQuery: 'teeth whitening kit led device' },
  ],
}

// Fill missing countries from SA data
const getProducts = (country: string, category: string) => {
  const excluded = ['beauty', 'health', 'kids']
  const countryProducts = (STATIC_PRODUCTS[country] || STATIC_PRODUCTS['SA'] || [])
    .filter((p: any) => !excluded.includes(p.category))
  const filtered = category === 'all'
    ? countryProducts
    : countryProducts.filter((p: any) => p.category === category)
  return filtered.map((p: any) => ({
    ...p,
    winningScore: Math.round((p.adCount * 20) + (p.maxDaysRunning * 1.5) + ((p.codScore || 6) * 8)),
    sourceUrl: `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(p.sourceQuery || p.titleEn || '')}`,
    snapshotUrl: null,
  })).sort((a: any, b: any) => b.winningScore - a.winningScore)
}

export async function POST(request: NextRequest) {
  try {
    const { country, category } = await request.json()
    const products = getProducts(country, category)
    return NextResponse.json({ success: true, products, total: products.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, products: [], error: error.message })
  }
}
