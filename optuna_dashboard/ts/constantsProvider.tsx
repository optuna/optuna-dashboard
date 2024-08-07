import React from "react"

type ConstantsContextType = {
  APP_BAR_TITLE: string
  API_ENDPOINT?: string
  URL_PREFIX: string
}

export const ConstantsContext = React.createContext<
  ConstantsContextType | undefined
>(undefined)

export const useConstants = (): ConstantsContextType => {
  const context = React.useContext(ConstantsContext)
  if (context === undefined) {
    throw new Error("useConstants must be used within a ConstantsProvider.")
  }
  return context
}

export function ConstantsProvider({
  APP_BAR_TITLE,
  API_ENDPOINT,
  URL_PREFIX,
  children,
}: {
  APP_BAR_TITLE: string
  API_ENDPOINT?: string
  URL_PREFIX: string
  children: React.ReactNode
}) {
  return (
    <ConstantsContext.Provider
      value={{ APP_BAR_TITLE, API_ENDPOINT, URL_PREFIX }}
    >
      {children}
    </ConstantsContext.Provider>
  )
}
