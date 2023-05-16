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
    setter: ((currVal: Study) => Study) | Study
  ): void => {
    const studies = setter([])
    setStudies(studies)
  }

  useEffect(() => {
    window.addEventListener("message", (event) => {
      const message = event.data
      switch (message.type) {
        case "optunaStorage":
          const fileContentBase64 = message.content
          const binaryString = atob(fileContentBase64)
          const len = binaryString.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const arrayBuffer = bytes.buffer
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
