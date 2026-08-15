'use client'

import { useState } from 'react'
import type { GatewayId } from '@/lib/payment-gateways/types'

type Props = {
  id: GatewayId
  label: string
  /** Rendered if no logo file is present — keeps the row intact either way. */
  emoji: string
}

/** Brand logo for a gateway, from `public/gateways/<id>.svg`. These are
 *  trademarked marks: drop in the official asset from the provider's brand kit
 *  rather than redrawing it. Falls back to the definition's emoji when the file
 *  is missing. */

/** Dark-ink marks on a transparent background, which would vanish against the
 *  dashboard's dark tile — these get a light plate. Tabby is absent on purpose:
 *  it ships its own mint background. */
const NEEDS_LIGHT_PLATE: GatewayId[] = ['tamara']

export default function GatewayLogo({ id, label, emoji }: Props) {
  const [failed, setFailed] = useState(false)

  const plate = NEEDS_LIGHT_PLATE.includes(id)
    ? 'bg-white border-[#2a2d35]'
    : 'bg-[#0f1117] border-[#2a2d35]'

  // Providers ship wordmarks, not square icons, with differing aspect ratios
  // (Tabby 2.5:1, Tamara 1.8:1) — hence fixed height, flexible width.
  return (
    <div
      className={`h-10 w-24 border rounded-xl flex items-center justify-center overflow-hidden shrink-0 px-2 ${plate}`}
    >
      {failed ? (
        <span className="text-lg" aria-hidden>
          {emoji}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/gateways/${id}.svg`}
          alt={label}
          className="max-h-6 max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
