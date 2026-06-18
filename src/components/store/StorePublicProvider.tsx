'use client'

import { createContext, useContext } from 'react'

type StorePublicContextValue = {
  /** Show "Powered by Mantoog" on customer-facing store pages. */
  showPoweredBy: boolean
}

const StorePublicContext = createContext<StorePublicContextValue>({ showPoweredBy: true })

export function StorePublicProvider({
  showPoweredBy,
  children,
}: {
  showPoweredBy: boolean
  children: React.ReactNode
}) {
  return (
    <StorePublicContext.Provider value={{ showPoweredBy }}>
      {children}
    </StorePublicContext.Provider>
  )
}

export function useStorePublic() {
  return useContext(StorePublicContext)
}
