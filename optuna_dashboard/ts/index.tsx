import React, { FC, ReactNode } from "react"
import ReactDOM from "react-dom/client"
import { APIClientProvider } from "./apiClientProvider"
import { App } from "./components/App"
import { ConstantsContext } from "./constantsProvider"
import { FetchAPIClient } from "./fetchAPIClient"

declare const API_ENDPOINT: string
declare const URL_PREFIX: string

const fetchAPIClient = new FetchAPIClient(API_ENDPOINT)

const ConstantsProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <ConstantsContext.Provider
    value={{
      color_mode: undefined,
      environment: "optuna-dashboard",
      url_prefix: URL_PREFIX,
    }}
  >
    {children}
  </ConstantsContext.Provider>
)

ReactDOM.createRoot(document.getElementById("dashboard") as HTMLElement).render(
  <React.StrictMode>
    <APIClientProvider apiClient={fetchAPIClient}>
      <ConstantsProvider>
        <App />
      </ConstantsProvider>
    </APIClientProvider>
  </React.StrictMode>
)
