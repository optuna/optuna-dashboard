import type { StorageWorkerFactory } from "@optuna/storage/worker-client"
import React, { FC, useContext, useEffect } from "react"
import ReactDOM from "react-dom/client"
import { App } from "./components/App"
import { StorageContext, StorageProvider } from "./components/StorageProvider"
import "./index.css"

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void
}

// acquireVsCodeApi() may only be called once per Webview, so memoize it outside
// of the component: StrictMode mounts the effect below twice. It throws when
// something else acquired the API first, which a stale extension build can do,
// and an effect that throws unmounts the React root, so report it instead.
let vscodeApi: ReturnType<typeof acquireVsCodeApi> | null = null
const getVsCodeApi = (): ReturnType<typeof acquireVsCodeApi> | null => {
  if (vscodeApi === null) {
    try {
      vscodeApi = acquireVsCodeApi()
    } catch (error) {
      console.error("Failed to acquire the VS Code API", error)
      return null
    }
  }
  return vscodeApi
}

type WebviewMessage = {
  type: "optunaStorage"
  content: unknown
  workerUri: string
  sqliteWasmUri: string
}

export const AppWrapper: FC = () => {
  const { loadStorage, reportError } = useContext(StorageContext)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as WebviewMessage

      switch (message.type) {
        case "optunaStorage": {
          const buffer = toArrayBuffer(message.content)
          void (async () => {
            try {
              await loadStorage(buffer, {
                workerFactory: createWebviewWorkerFactory(message.workerUri),
                sqliteWasm: {
                  buffer: await fetchAsset(
                    message.sqliteWasmUri,
                    "SQLite wasm"
                  ),
                },
              })
            } catch (error) {
              reportError(error)
            }
          })()
          break
        }
      }
    }
    window.addEventListener("message", handleMessage)
    // Ask for the storage only once the listener is in place. The extension
    // answers immediately, and a message posted before this point is dropped.
    getVsCodeApi()?.postMessage({ type: "webviewDidLoad" })
    return () => window.removeEventListener("message", handleMessage)
  }, [loadStorage, reportError])
  return <App />
}

// Extension assets are served by the Webview's service worker, which does not
// answer a request coming from a Worker that was started from a blob: URL: those
// come back with an error status. Everything the storage Worker needs is
// therefore fetched here, in the document, and handed over as bytes.
const fetchAsset = async (uri: string, label: string): Promise<ArrayBuffer> => {
  const response = await fetch(uri)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label}: ${response.status}`)
  }
  return response.arrayBuffer()
}

// A Webview cannot point a Worker at an extension asset, so the Worker bundle is
// fetched and started from a blob: URL. Revoking that URL is the factory's
// business, which is what the disposer is for.
const createWebviewWorkerFactory = (
  workerUri: string
): StorageWorkerFactory => {
  return async () => {
    const response = await fetch(workerUri)
    if (!response.ok) {
      throw new Error(`Failed to fetch storage worker: ${response.status}`)
    }
    const blobUrl = URL.createObjectURL(await response.blob())
    try {
      // A module Worker: the bundle is one file with no import, so nothing has
      // to be resolved relative to the blob: URL it is started from.
      const worker = new Worker(blobUrl, { type: "module" })
      return {
        worker,
        dispose: () => URL.revokeObjectURL(blobUrl),
      }
    } catch (error) {
      URL.revokeObjectURL(blobUrl)
      throw error
    }
  }
}

// The extension sends an ArrayBuffer. A typed array is accepted as well, since
// that is what the Webview message serializer produces for one, but anything
// else is named rather than left to fail as a missing method on an object of an
// unexpected shape.
const toArrayBuffer = (content: unknown): ArrayBuffer => {
  if (content instanceof ArrayBuffer) {
    return content
  }
  if (ArrayBuffer.isView(content)) {
    const buffer = content.buffer as ArrayBuffer
    if (content.byteOffset === 0 && content.byteLength === buffer.byteLength) {
      return buffer
    }
    return buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength
    )
  }
  const received =
    content === null || typeof content !== "object"
      ? typeof content
      : content.constructor?.name ?? "object"
  throw new TypeError(
    `Storage content arrived as ${received}, expected an ArrayBuffer`
  )
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StorageProvider>
      <AppWrapper />
    </StorageProvider>
  </React.StrictMode>
)
