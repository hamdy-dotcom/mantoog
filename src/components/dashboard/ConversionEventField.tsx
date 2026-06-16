'use client'

import type {
  ConversionEventPreference,
  ConversionEventUiOption,
} from '@/lib/tiktok/create-ad/optimization-events'

type Props = {
  lang: string
  options: ConversionEventUiOption[]
  value: ConversionEventPreference
  onChange: (value: ConversionEventPreference) => void
  inputClassName: string
}

export default function ConversionEventField({
  lang,
  options,
  value,
  onChange,
  inputClassName,
}: Props) {
  if (!options.length) return null

  const selected = options.find(option => option.id === value) ?? options[0]
  const hint = selected?.hintEn
    ? (lang === 'ar' ? selected.hintAr : selected.hintEn)
    : null

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] text-[#4a4e60] uppercase tracking-wider font-medium">
        {lang === 'ar' ? 'حدث التحويل' : 'Conversion event'}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as ConversionEventPreference)}
        className={inputClassName}
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {lang === 'ar' ? option.labelAr : option.labelEn}
            {option.recommended ? (lang === 'ar' ? ' (موصى به)' : ' (recommended)') : ''}
            {' '}
            ({option.event})
          </option>
        ))}
      </select>
      {hint && (
        <p className="text-[10px] text-[#4ade80]/90">{hint}</p>
      )}
      <p className="text-[10px] text-[#4a4e60]">
        {lang === 'ar'
          ? 'يُعرض فقط الأحداث المفعّلة على البكسل في TikTok.'
          : 'Only events configured on your TikTok pixel are shown.'}
      </p>
    </label>
  )
}
