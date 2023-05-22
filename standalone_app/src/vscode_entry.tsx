import React, { FC, useEffect } from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import { App } from "./components/App"
import { RecoilRoot, useSetRecoilState, SetterOrUpdater } from "recoil"
import { studiesState } from "./state"
import { loadStorage } from "./sqlite3"

export const AppWrapper: FC = () => {
  const setStudies = useSetRecoilState<Study[]>(studiesState)

  const onceSetStudies: SetterOrUpdater<Study[]> = (
    setter: (currVal: Study[]) => Study[]
  ): void => {
    const studies = setter([])
    setStudies(studies)
  }

  useEffect(() => {
    window.addEventListener("message", (event) => {
      const message = event.data
      let fileContentBase64: string
      let binaryString: string
      let len: number
      let bytes: Uint8Array
      let arrayBuffer: ArrayBuffer

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
          loadStorage(arrayBuffer, onceSetStudies)
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
