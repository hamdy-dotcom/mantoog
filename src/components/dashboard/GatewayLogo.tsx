'use client'

import { useState } from 'react'
import type { GatewayId } from '@/lib/payment-gateways/types'

type Props = {
  id: GatewayId
  label: string
  /** Rendered if no logo file is present — keeps the row intact either way. */
  emoji: string
}

/** Brand logo for a gateway.
 *
 *  Files live in `public/gateways/<id>.svg` and are NOT checked in: they are
 *  trademarked marks, so drop the official asset from each provider's brand kit
 *  in there rather than redrawing it. Until a file exists the component falls
 *  back to the definition's emoji, so the tab never renders a broken image.
 */
/** Marks drawn in a dark ink on a transparent background, which would disappear
 *  against the dashboard's own dark tile. These get a light plate instead.
 *  Tabby is absent on purpose: it ships its own mint background. */
const NEEDS_LIGHT_PLATE: GatewayId[] = ['tamara']

export default function GatewayLogo({ id, label, emoji }: Props) {
  const [failed, setFailed] = useState(false)

  const plate = NEEDS_LIGHT_PLATE.includes(id)
    ? 'bg-white border-[#2a2d35]'
    : 'bg-[#0f1117] border-[#2a2d35]'

  // Providers ship wordmarks, not square icons, and their aspect ratios differ
  // (Tabby is 2.5:1, Tamara 1.8:1). A fixed-height / flexible-width tile with
  // object-contain keeps each one legible instead of squashing it into a square.
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
