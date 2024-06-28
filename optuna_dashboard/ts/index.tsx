import React from "react"
import ReactDOM from "react-dom/client"
import { APIClientProvider } from "./apiClientProvider"
import { AxiosClient } from "./axiosClient"
import { App } from "./components/App"

const axiosAPIClient = new AxiosClient()

ReactDOM.createRoot(document.getElementById("dashboard") as HTMLElement).render(
  <React.StrictMode>
    <APIClientProvider apiClient={axiosAPIClient}>
      <App />
    </APIClientProvider>
  </React.StrictMode>
)
