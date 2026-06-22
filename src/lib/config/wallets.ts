/** Mantoog wallet numbers merchants transfer to.
 *  Override via env vars in Vercel / .env.local.
 */
export const MANTOOG_WALLETS = [
  {
    id: 'vodafone',
    label: 'Vodafone Cash',
    number: process.env.NEXT_PUBLIC_WALLET_VODAFONE ?? '01000000000',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
  },
  {
    id: 'instapay',
    label: 'InstaPay',
    number: process.env.NEXT_PUBLIC_WALLET_INSTAPAY ?? 'mantoog@instapay',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.3)',
  },
  {
    id: 'fawry',
    label: 'Fawry',
    number: process.env.NEXT_PUBLIC_WALLET_FAWRY ?? '01000000000',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.3)',
  },
] as const

export type WalletId = typeof MANTOOG_WALLETS[number]['id']
