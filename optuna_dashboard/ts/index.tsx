import React, { FC, ReactNode } from "react"
import ReactDOM from "react-dom/client"
import { APIClientProvider } from "./apiClientProvider"
import { AxiosClient } from "./axiosClient"
import { App } from "./components/App"
import { ConstantsContext } from "./constantsProvider"

declare const API_ENDPOINT: string
declare const URL_PREFIX: string

const axiosAPIClient = new AxiosClient(API_ENDPOINT)

const ConstantsProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <ConstantsContext.Provider
    value={{
      environment: "optuna-dashboard",
      url_prefix: URL_PREFIX,
    }}
  >
    {children}
  </ConstantsContext.Provider>
)

ReactDOM.createRoot(document.getElementById("dashboard") as HTMLElement).render(
  <React.StrictMode>
    <APIClientProvider apiClient={axiosAPIClient}>
      <ConstantsProvider>
        <App />
      </ConstantsProvider>
    </APIClientProvider>
  </React.StrictMode>
)
