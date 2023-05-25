import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import { App } from "./components/App"
import { RecoilRoot } from "recoil"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RecoilRoot>
      <App />
    </RecoilRoot>
  </React.StrictMode>
)
