import sqliteWasmUrl from "@optuna/storage/sqlite-wasm"
import type { StorageWorkerFactory } from "@optuna/storage/worker-client"
import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./components/App"
import { StorageProvider } from "./components/StorageProvider"
import "./index.css"

const workerFactory: StorageWorkerFactory = async () => {
  const worker = new Worker(
    new URL("../../tslib/storage/src/storage_worker.ts", import.meta.url),
    { type: "module" }
  )
  return {
    worker,
    dispose: () => {},
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StorageProvider
      workerFactory={workerFactory}
      sqliteWasm={{ url: sqliteWasmUrl }}
    >
      <App />
    </StorageProvider>
  </React.StrictMode>
)
