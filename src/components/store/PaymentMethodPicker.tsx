'use client'

import { useState } from 'react'

/** One selectable payment option. `id` is 'cod' or a gateway id — the same
 *  string that goes to /api/orders/create as `payment_method`. */
export type PaymentOption = {
  id: string
  label: string
  emoji: string
}

type Props = {
  options: PaymentOption[]
  /** null until the customer picks — selection is required, nothing is
   *  pre-selected, so the choice is always deliberate. */
  value: string | null
  onChange: (id: string) => void
  dir: 'rtl' | 'ltr'
  lang: 'ar' | 'en'
  /** Storefront theme colours. Each theme owns its own palette, so they are
   *  passed in rather than imported — this component never picks a colour. */
  accent: string
  text: string
  subtext: string
  cardBg: string
  cardBorder: string
  font?: string
}

/** Provider wordmark from `public/gateways/<id>.svg`, falling back to the
 *  definition's emoji so a missing asset never leaves an empty row. */
function OptionMark({ id, label, emoji }: PaymentOption) {
  const [failed, setFailed] = useState(false)

  if (id === 'cod' || failed) {
    return (
      <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>
        {emoji}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/gateways/${id}.svg`}
      alt={label}
      style={{ height: 22, maxWidth: 68, objectFit: 'contain' }}
      onError={() => setFailed(true)}
    />
  )
}

export default function PaymentMethodPicker({
  options,
  value,
  onChange,
  dir,
  lang,
  accent,
  text,
  subtext,
  cardBg,
  cardBorder,
  font,
}: Props) {
  // One option means no decision to make — rendering a single radio the customer
  // must still tick is friction for nothing. Auto-selecting it would violate
  // "explicit choice", so the parent selects it and we stay out of the way.
  if (options.length < 2) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, direction: dir, fontFamily: font }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
        {lang === 'ar' ? 'طريقة الدفع' : 'Payment method'}
      </div>

      {options.map(option => {
        const selected = value === option.id

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={selected}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: dir === 'rtl' ? 'right' : 'left',
              background: selected ? `${accent}12` : cardBg,
              border: `2px solid ${selected ? accent : cardBorder}`,
              transition: 'border-color 0.15s, background 0.15s',
              direction: dir,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${selected ? accent : cardBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {selected && (
                <span
                  style={{ width: 10, height: 10, borderRadius: '50%', background: accent }}
                />
              )}
            </span>

            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: selected ? text : subtext }}>
              {option.label}
            </span>

            <OptionMark {...option} />
          </button>
        )
      })}
    </div>
  )
}
