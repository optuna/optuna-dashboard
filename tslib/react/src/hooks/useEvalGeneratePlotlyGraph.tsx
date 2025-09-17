import { Study } from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { ReactNode, useCallback, useEffect, useRef } from "react"

type MessageRequest<T> = {
  type: "user_query"
  study: T
  queryFuncStr: string
}

type MessageResponse = {
  type: "result"
  plotlyData: plotly.PlotData[]
  error?: Error
}

type GeneratePlotlyGraph<T extends Study> = (
  study: T,
  queryFuncStr: string
) => Promise<plotly.PlotData[]>

export const useEvalGeneratePlotlyGraph = <T extends Study>(): [
  GeneratePlotlyGraph<T>,
  () => ReactNode,
] => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const pendingPromiseRef = useRef<{
    resolve: (value: plotly.PlotData[]) => void
    reject: (reason?: Error) => void
  } | null>(null)

  const generatePlotlyGraphFunc = useCallback(
    (study: T, queryFuncStr: string): Promise<plotly.PlotData[]> => {
      return new Promise((resolve, reject) => {
        // TODO(porink0424): Support concurrent evaluations
        if (!iframeRef.current || !iframeRef.current.contentWindow) {
          return reject(new Error("Sandbox iframe is not ready"))
        }

        if (pendingPromiseRef.current) {
          reject(new Error("Previous evaluation still running"))
        }

        pendingPromiseRef.current = { resolve, reject }

        const message: MessageRequest<T> = {
          type: "user_query",
          study,
          queryFuncStr,
        }

        iframeRef.current.contentWindow.postMessage(message, "*")
      })
    },
    []
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { data } = event
      if (typeof data !== "object" || data.type !== "result") return

      const response = data as MessageResponse

      if (pendingPromiseRef.current) {
        if (response.error) {
          pendingPromiseRef.current.reject(response.error)
        } else {
          pendingPromiseRef.current.resolve(response.plotlyData)
        }
        pendingPromiseRef.current = null
      }
    }

    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [])

  const renderIframeSandbox = () => {
    const iframeSrcDoc = `
      <script>
        // Disable network acecss in the iframe for security reasons
        window.fetch = () => { throw new Error("Unexpected") }
        window.XMLHttpRequest = () => { throw new Error("Unexpected") }

        window.addEventListener("message", (event) => {
          const { data } = event;
          if (typeof data !== "object" || data.type !== "user_query") return;

          const { study, queryFuncStr } = data;
          try {
            const queryFunc = eval("(" + queryFuncStr + ")");
            const plotlyData = queryFunc(study);
            const message = {
              type: "result",
              plotlyData,
            };
            parent.postMessage(message, "*");
          } catch (e) {
            parent.postMessage({ type: "result",  plotlyData: [], error: String(e) }, "*");
          }
        });
      </script>
    `

    return (
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ display: "none" }}
        srcDoc={iframeSrcDoc}
        title="JavaScript function evaluation sandbox"
      />
    )
  }

  return [generatePlotlyGraphFunc, renderIframeSandbox]
}
