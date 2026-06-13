'use client'

import DateRangeFilter from '@/components/dashboard/DateRangeFilter'
import { defaultLast14Days, rangesEqual } from '@/lib/dashboard/date-range'

export type DashboardFilters = {
  dateStart: string
  dateEnd: string
  productId: string
  region: string
  status: string
}

const defaultRange = defaultLast14Days()

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  dateStart: defaultRange.start,
  dateEnd: defaultRange.end,
  productId: '',
  region: '',
  status: '',
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px] flex-1 sm:flex-none sm:min-w-[160px]">
      <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider font-medium">
        {label}
      </span>
      <div className="relative group">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none w-full bg-[#0f1117] border border-[#2a2d35] hover:border-[#3b82f6]/40 rounded-lg ps-2.5 pe-8 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6] transition-colors cursor-pointer truncate"
        >
          {options.map(o => (
            <option key={o.value || '__all'} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg
          className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#4a4e60] pointer-events-none group-hover:text-[#8b8fa8] transition-colors"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  )
}

export function isDashboardFiltersDefault(filters: DashboardFilters) {
  const def = defaultLast14Days()
  return (
    rangesEqual({ start: filters.dateStart, end: filters.dateEnd }, def)
    && !filters.productId
    && !filters.region
    && !filters.status
  )
}

type Props = {
  lang: string
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
  products: { id: string; title: string }[]
  regions: string[]
}

export default function DashboardFiltersBar({ lang, filters, onChange, products, regions }: Props) {
  const showReset = !isDashboardFiltersDefault(filters)

  const reset = () => onChange({ ...DEFAULT_DASHBOARD_FILTERS })

  const productOptions = [
    { value: '', label: lang === 'ar' ? 'كل المنتجات' : 'All products' },
    ...products.map(p => ({ value: p.id, label: p.title })),
  ]

  const regionOptions = [
    { value: '', label: lang === 'ar' ? 'كل المناطق' : 'All regions' },
    ...regions.map(r => ({ value: r, label: r })),
  ]

  const statusOptions = [
    { value: '', label: lang === 'ar' ? 'كل الحالات' : 'All statuses' },
    { value: 'pending', label: lang === 'ar' ? 'قيد الانتظار' : 'Pending' },
    { value: 'delivered', label: lang === 'ar' ? 'تم التسليم' : 'Delivered' },
    { value: 'cancelled', label: lang === 'ar' ? 'ملغي' : 'Cancelled' },
  ]

  return (
    <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-xl px-3 py-3 md:px-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider font-medium">
            {lang === 'ar' ? 'تصفية البيانات' : 'Filters'}
          </span>
          {showReset && (
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[#3b82f6] hover:underline self-start sm:self-auto"
            >
              {lang === 'ar' ? 'إعادة التعيين' : 'Reset filters'}
            </button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <DateRangeFilter
            lang={lang}
            start={filters.dateStart}
            end={filters.dateEnd}
            onChange={(dateStart, dateEnd) => onChange({ ...filters, dateStart, dateEnd })}
          />

          <div className="flex flex-wrap items-stretch gap-2 flex-1">
            <FilterSelect
              label={lang === 'ar' ? 'المنتج' : 'Product'}
              value={filters.productId}
              onChange={productId => onChange({ ...filters, productId })}
              options={productOptions}
            />
            <FilterSelect
              label={lang === 'ar' ? 'المنطقة' : 'Region'}
              value={filters.region}
              onChange={region => onChange({ ...filters, region })}
              options={regionOptions}
            />
            <FilterSelect
              label={lang === 'ar' ? 'الحالة' : 'Status'}
              value={filters.status}
              onChange={status => onChange({ ...filters, status })}
              options={statusOptions}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
