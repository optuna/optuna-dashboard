import React from "react"
import ReactDOM from "react-dom/client"
import { APIClientProvider } from "./apiClientProvider"
import { AxiosClient } from "./axiosClient"
import { App } from "./components/App"
import { ConstantsProvider } from "./constantsProvider"

declare const APP_BAR_TITLE: string
declare const API_ENDPOINT: string
declare const URL_PREFIX: string

const axiosAPIClient = new AxiosClient(API_ENDPOINT)

ReactDOM.createRoot(document.getElementById("dashboard") as HTMLElement).render(
  <React.StrictMode>
    <APIClientProvider apiClient={axiosAPIClient}>
      <ConstantsProvider
        APP_BAR_TITLE={APP_BAR_TITLE}
        API_ENDPOINT={API_ENDPOINT}
        URL_PREFIX={URL_PREFIX}
      >
        <App />
      </ConstantsProvider>
    </APIClientProvider>
  </React.StrictMode>
)
