'use client'

type Props = { order: any | null; onClose: () => void; lang?: 'ar' | 'en' }

// Fields we render with a friendly label and specific ordering; everything else
// that has a value is still shown afterwards so nothing is hidden.
const LABELS: Record<string, { en: string; ar: string }> = {
  order_number: { en: 'Order #', ar: 'رقم الطلب' },
  id: { en: 'Order ID', ar: 'معرّف الطلب' },
  status: { en: 'Status', ar: 'الحالة' },
  created_at: { en: 'Created', ar: 'تاريخ الإنشاء' },
  customer_name: { en: 'Customer', ar: 'العميل' },
  customer_phone: { en: 'Phone', ar: 'الهاتف' },
  customer_address: { en: 'Address', ar: 'العنوان' },
  address_line1: { en: 'Address line', ar: 'العنوان' },
  address_line2: { en: 'Address line 2', ar: 'تفاصيل العنوان' },
  address_governorate: { en: 'Governorate / City', ar: 'المدينة / المنطقة' },
  map_link: { en: 'Map link', ar: 'رابط الخريطة' },
  quantity: { en: 'Quantity', ar: 'الكمية' },
  total_price: { en: 'Total', ar: 'الإجمالي' },
  shipping_price: { en: 'Shipping', ar: 'الشحن' },
  currency: { en: 'Currency', ar: 'العملة' },
  traffic_source: { en: 'Source', ar: 'المصدر' },
  notes: { en: 'Notes', ar: 'ملاحظات' },
  exported_at: { en: 'Exported', ar: 'تم التصدير' },
}

// Keys we never show (internal / redundant)
const HIDDEN = new Set(['products', 'upsell_item', 'stores', 'merchant_id', 'store_id', 'product_id', 'updated_at'])

function humanize(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmt(value: any): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  if (typeof value === 'object') return JSON.stringify(value)
  const s = String(value)
  // ISO date → readable
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toLocaleString()
  }
  return s
}

export default function OrderDetailsModal({ order, onClose, lang = 'ar' }: Props) {
  if (!order) return null
  const label = (k: string) => (LABELS[k] ? LABELS[k][lang] : humanize(k))

  // Ordered known fields first, then any remaining non-empty scalar fields.
  const known = Object.keys(LABELS).filter(k => order[k] != null && order[k] !== '')
  const rest = Object.keys(order).filter(
    k => !HIDDEN.has(k) && !LABELS[k] && order[k] != null && order[k] !== ''
  )
  const rows = [...known, ...rest]

  const product = order.products
  const upsell = order.upsell_item

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div
        className="bg-[#1a1d24] border border-[#2a2d35] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1d24] border-b border-[#2a2d35] px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">
              {lang === 'ar' ? 'تفاصيل الطلب' : 'Order details'}
            </div>
            <div className="text-xs text-[#8b8fa8] mt-0.5">
              {order.order_number || (order.id ? String(order.id).slice(0, 8) : '')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#2a2d35] hover:border-[#6366f1] text-[#8b8fa8] hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Product */}
          {product && (
            <div className="flex items-center gap-3 bg-[#0f1117] border border-[#2a2d35] rounded-xl p-3">
              {product.images?.[0] && (
                <img src={product.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#2a2d35] shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm text-white font-medium truncate">{product.title || '—'}</div>
                {upsell && (
                  <div className="text-xs text-[#a78bfa] mt-0.5">
                    + {upsell.product_title} ({upsell.type === 'bump' ? (lang === 'ar' ? 'عرض' : 'Bump') : (lang === 'ar' ? 'ترقية' : 'Upsell')} · {upsell.sale_price} {order.currency})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All fields */}
          <div className="divide-y divide-[#2a2d35]">
            {rows.map(k => (
              <div key={k} className="flex items-start justify-between gap-4 py-2.5">
                <span className="text-xs text-[#8b8fa8] shrink-0">{label(k)}</span>
                {k === 'map_link' ? (
                  <a href={String(order[k])} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3b82f6] hover:text-white underline break-all text-end">
                    {lang === 'ar' ? 'فتح الخريطة' : 'Open map'}
                  </a>
                ) : (
                  <span className="text-xs text-white font-medium break-all text-end">
                    {fmt(order[k])}{(k === 'total_price' || k === 'shipping_price') && order.currency ? ` ${order.currency}` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
