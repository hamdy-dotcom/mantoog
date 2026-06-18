export type TargetLocation = {
  location_id: string
  name: string
  label_ar: string
  region_code: string
  level: string
}

/** Map store currency → ISO country code for default geo targeting. */
export function regionCodeFromStoreCurrency(currency: string | null | undefined): string | null {
  if (!currency) return null
  const map: Record<string, string> = {
    SAR: 'SA',
    EGP: 'EG',
    AED: 'AE',
    KWD: 'KW',
    QAR: 'QA',
    BHD: 'BH',
    OMR: 'OM',
    JOD: 'JO',
    LBP: 'LB',
    IQD: 'IQ',
    MAD: 'MA',
    DZD: 'DZ',
    TND: 'TN',
    LYD: 'LY',
    YER: 'YE',
  }
  return map[currency.toUpperCase()] ?? null
}

export function defaultLocationId(
  items: TargetLocation[],
  opts?: { preferCode?: string; storeCurrency?: string | null }
): string {
  const fromCurrency = opts?.storeCurrency
    ? regionCodeFromStoreCurrency(opts.storeCurrency)
    : null
  const preferCode = opts?.preferCode ?? fromCurrency
  if (preferCode) {
    const preferred = items.find(l => l.region_code === preferCode)
    if (preferred) return preferred.location_id
  }
  return ''
}
