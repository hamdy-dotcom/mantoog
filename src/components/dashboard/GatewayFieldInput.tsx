'use client'

import type { GatewayField, SecretState } from '@/lib/payment-gateways/types'

const inputCls =
  'w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4e60] focus:outline-none focus:border-[#3b82f6] transition-colors'

type Props = {
  field: GatewayField
  lang: string
  /** Draft value for non-secret fields, or the replacement text for secrets. */
  value: unknown
  /** Stored-secret state — present only for `field.secret`. */
  secret?: SecretState
  /** True while the merchant is typing a replacement for a stored secret. */
  replacing?: boolean
  onChange: (value: unknown) => void
  onReplace?: () => void
  onCancelReplace?: () => void
  onRemove?: () => void
}

/** Renders one field from a gateway definition. One renderer per `type` keeps
 *  every gateway's form identical in behaviour — no per-gateway JSX. */
export default function GatewayFieldInput({
  field,
  lang,
  value,
  secret,
  replacing,
  onChange,
  onReplace,
  onCancelReplace,
  onRemove,
}: Props) {
  const ar = lang === 'ar'
  const label = ar ? field.labelAr : field.labelEn
  const help = ar ? field.helpAr : field.helpEn

  // Stored secret, not being replaced: a "saved" state rather than an empty
  // box, so saving never looks like it wiped the key.
  const showStoredSecret = field.secret && secret?.set && !replacing

  return (
    <div>
      <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wider mb-1.5 block">
        {label}
        {field.required && <span className="text-[#f87171] ms-1">*</span>}
      </label>

      {showStoredSecret ? (
        <div className="flex items-center gap-2 bg-[#0f1117] border border-[#4ade80]/30 rounded-lg px-3 py-2.5">
          <span className="text-[#4ade80] text-sm">✓</span>
          <span className="flex-1 text-sm text-white font-mono tracking-wider">
            {'•'.repeat(16)}
            {secret?.tail ?? ''}
          </span>
          <span className="text-xs text-[#4ade80]">{ar ? 'محفوظ' : 'Saved'}</span>
          <button
            type="button"
            onClick={onReplace}
            className="text-xs text-[#8b8fa8] hover:text-white underline underline-offset-2 cursor-pointer"
          >
            {ar ? 'تغيير' : 'Replace'}
          </button>
          {!field.required && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-[#f87171] hover:text-red-400 underline underline-offset-2 cursor-pointer"
            >
              {ar ? 'حذف' : 'Remove'}
            </button>
          )}
        </div>
      ) : field.type === 'select' ? (
        <select
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">{ar ? '— اختر —' : '— Select —'}</option>
          {field.options?.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'multiselect' ? (
        <div className="flex flex-wrap gap-2">
          {field.options?.map(o => {
            const list = Array.isArray(value) ? (value as string[]) : []
            const on = list.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  onChange(on ? list.filter(v => v !== o.value) : [...list, o.value])
                }
                className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  on
                    ? 'border-[#3b82f6] bg-[#1a3a5c] text-white'
                    : 'border-[#2a2d35] text-[#8b8fa8] hover:border-[#3b82f6] hover:text-white'
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      ) : field.type === 'toggle' ? (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`w-11 h-6 rounded-full relative transition-colors ${
            value ? 'bg-[#3b82f6]' : 'bg-[#2a2d35]'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
              value ? 'start-[22px]' : 'start-0.5'
            }`}
          />
        </button>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={e =>
            onChange(field.type === 'number' ? e.target.value : e.target.value)
          }
          placeholder={field.placeholder}
          dir={field.type === 'number' ? undefined : 'ltr'}
          className={inputCls}
        />
      )}

      {replacing && field.secret && (
        <button
          type="button"
          onClick={onCancelReplace}
          className="text-[11px] text-[#8b8fa8] hover:text-white mt-1.5 underline underline-offset-2 cursor-pointer"
        >
          {ar ? 'إلغاء التغيير' : 'Cancel replace'}
        </button>
      )}

      {help && <p className="text-[11px] text-[#4a4e60] mt-1.5 leading-relaxed">{help}</p>}
    </div>
  )
}
