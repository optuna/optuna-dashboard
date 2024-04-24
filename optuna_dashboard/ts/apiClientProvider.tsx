import React, { createContext, useContext } from "react"
import { APIClient } from "./apiClient"

type APIClientContextType = {
  apiClient: APIClient
}

export const APIClientContext = createContext<APIClientContextType | undefined>(
  undefined
)

export const useAPIClient = (): APIClientContextType => {
  const context = useContext(APIClientContext)
  if (context === undefined) {
    throw new Error("useAPIClient must be used within a APIClientProvider.")
  }
  return context
}

export function APIClientProvider({
  apiClient,
  children,
}: {
  apiClient: APIClient
  children: React.ReactNode
}) {
  return (
    <APIClientContext.Provider value={{ apiClient }}>
      {children}
    </APIClientContext.Provider>
  )
}
