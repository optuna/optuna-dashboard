import React, { FC, useEffect, useContext } from "react"
import ReactDOM from "react-dom/client"
import { App } from "./components/App"
import {
  StorageContext,
  StorageProvider,
  getStorage,
} from "./components/StorageProvider"
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
