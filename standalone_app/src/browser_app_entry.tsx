import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./components/App"
import { StorageProvider } from "./components/StorageProvider"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StorageProvider>
      <App />
    </StorageProvider>
  </React.StrictMode>
)
