import { JournalFileStorage, SQLite3Storage } from "@optuna/storage"
import type { OptunaStorage } from "@optuna/storage"
import React, { FC, useEffect, useContext } from "react"
import ReactDOM from "react-dom/client"
import { App } from "./components/App"
import { StorageContext, StorageProvider } from "./components/StorageProvider"
import "./index.css"

type WebviewMessage = {
  type: "optunaStorage"
  content: Uint8Array
}

export const AppWrapper: FC = () => {
  const { setStorage } = useContext(StorageContext)

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as WebviewMessage

      switch (message.type) {
        case "optunaStorage":
          setStorage(getStorage(toArrayBuffer(message.content)))
          break
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])
  return <App />
}

// Transitional: the Webview parses the storage on the UI thread, as it did
// before the standalone app moved to the storage Worker. Starting the Worker
// here needs the Webview build to emit it as an asset the Webview may load,
// which is the next change.
const getStorage = (arrayBuffer: ArrayBuffer): OptunaStorage => {
  const header = new Uint8Array(arrayBuffer, 0, 16)
  const headerString = new TextDecoder().decode(header)
  if (headerString === "SQLite format 3\u0000") {
    return new SQLite3Storage(arrayBuffer)
  }
  return new JournalFileStorage(arrayBuffer)
}

const toArrayBuffer = (content: Uint8Array): ArrayBuffer => {
  if (
    content.buffer instanceof ArrayBuffer &&
    content.byteOffset === 0 &&
    content.byteLength === content.buffer.byteLength
  ) {
    return content.buffer
  }
  return content.slice().buffer as ArrayBuffer
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StorageProvider>
      <AppWrapper />
    </StorageProvider>
  </React.StrictMode>
)
