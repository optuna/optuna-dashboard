import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./components/App.tsx"

ReactDOM.createRoot(document.getElementById("dashboard")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
