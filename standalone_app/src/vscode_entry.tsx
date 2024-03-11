import React, { FC, useEffect } from "react"
import ReactDOM from "react-dom/client"
import { RecoilRoot, SetterOrUpdater, useSetRecoilState } from "recoil"
import { App } from "./components/App"
import "./index.css"
import { loadJournalStorage } from "./journalStorage"
import { loadSQLite3Storage } from "./sqlite3"
import { studiesState } from "./state"

export const AppWrapper: FC = () => {
  const setStudies = useSetRecoilState<Study[]>(studiesState)

  // TODO(c-bata): Fix the type annotation
  const onceSetStudies: SetterOrUpdater<Study[]> = (
    setter: (currVal: Study[]) => Study[]
  ): void => {
    const studies = setter([])
    setStudies(studies)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    window.addEventListener("message", (event) => {
      const message = event.data
      let fileContentBase64: string
      let binaryString: string
      let len: number
      let bytes: Uint8Array
      let arrayBuffer: ArrayBuffer
      let header: Uint8Array
      let headerString: string

      switch (message.type) {
        case "optunaStorage":
          fileContentBase64 = message.content
          binaryString = atob(fileContentBase64)
          len = binaryString.length
          bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          arrayBuffer = bytes.buffer
          header = new Uint8Array(arrayBuffer, 0, 16)
          headerString = new TextDecoder().decode(header)
          if (headerString === "SQLite format 3\u0000") {
            loadSQLite3Storage(arrayBuffer, onceSetStudies)
          } else {
            loadJournalStorage(arrayBuffer, onceSetStudies)
          }
          break
      }
    })
  }, [])
  return <App />
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RecoilRoot>
      <AppWrapper />
    </RecoilRoot>
  </React.StrictMode>
)
