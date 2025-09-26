import { Study, Trial } from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { useCallback, useEffect, useRef } from "react"

type MessageRequestTrialFilter<T extends Trial> = {
  type: "trial_filter"
  trials: T[]
  funcStr: string
}
type MessageRequestGeneratePlotlyGraph<S extends Study> = {
  type: "generate_plotly_graph"
  study: S
  funcStr: string
}

type MessageResponseTrialFilter<T extends Trial> = {
  type: "trial_filter_result"
  filteredTrials: T[]
  error?: Error
}
type MessageResponseGeneratePlotlyGraph = {
  type: "generate_plotly_graph_result"
  plotlyData: plotly.PlotData[]
  error?: Error
}

export const useEvalFunctionInSandbox = <
  T extends Trial = Trial,
  S extends Study = Study,
>() => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const pendingTrialFilterPromiseRef = useRef<{
    resolve: (value: T[]) => void
    reject: (reason?: Error) => void
  } | null>(null)
  const pendingGeneratePlotlyGraphPromiseRef = useRef<{
    resolve: (value: plotly.PlotData[]) => void
    reject: (reason?: Error) => void
  } | null>(null)

  const evalTrialFilter = useCallback(
    (trials: T[], funcStr: string): Promise<T[]> => {
      return new Promise((resolve, reject) => {
        // TODO(c-bata): Support concurrent evaluations
        if (!iframeRef.current || !iframeRef.current.contentWindow) {
          return reject(new Error("Sandbox iframe is not ready"))
        }
        if (pendingTrialFilterPromiseRef.current) {
          reject(new Error("Previous evaluation still running"))
        }
        pendingTrialFilterPromiseRef.current = { resolve, reject }
        const message: MessageRequestTrialFilter<T> = {
          type: "trial_filter",
          trials,
          funcStr,
        }
        iframeRef.current.contentWindow.postMessage(message, "*")
      })
    },
    []
  )

  const evalGeneratePlotlyGraph = useCallback(
    (study: S, funcStr: string): Promise<plotly.PlotData[]> => {
      return new Promise((resolve, reject) => {
        // TODO(porink0424): Support concurrent evaluations
        if (!iframeRef.current || !iframeRef.current.contentWindow) {
          return reject(new Error("Sandbox iframe is not ready"))
        }
        if (pendingGeneratePlotlyGraphPromiseRef.current) {
          reject(new Error("Previous evaluation still running"))
        }
        pendingGeneratePlotlyGraphPromiseRef.current = { resolve, reject }
        const message: MessageRequestGeneratePlotlyGraph<S> = {
          type: "generate_plotly_graph",
          study,
          funcStr,
        }
        iframeRef.current.contentWindow.postMessage(message, "*")
      })
    },
    []
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { data } = event

      if (typeof data !== "object") return

      switch (data.type) {
        case "trial_filter_result": {
          const response = data as MessageResponseTrialFilter<T>
          if (pendingTrialFilterPromiseRef.current) {
            if (response.error) {
              pendingTrialFilterPromiseRef.current.reject(response.error)
            } else {
              pendingTrialFilterPromiseRef.current.resolve(
                response.filteredTrials
              )
            }
            pendingTrialFilterPromiseRef.current = null
          }
          break
        }
        case "generate_plotly_graph_result": {
          const response = data as MessageResponseGeneratePlotlyGraph
          if (pendingGeneratePlotlyGraphPromiseRef.current) {
            if (response.error) {
              pendingGeneratePlotlyGraphPromiseRef.current.reject(
                response.error
              )
            } else {
              pendingGeneratePlotlyGraphPromiseRef.current.resolve(
                response.plotlyData
              )
            }
            pendingGeneratePlotlyGraphPromiseRef.current = null
          }
          break
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const renderIframeSandbox = () => {
    const iframeSrcDoc = `
        <script>
          // Disable network access in the iframe for security reasons
          window.fetch = () => { throw new Error("Unexpected") }
          window.XMLHttpRequest = () => { throw new Error("Unexpected") }

          window.addEventListener('message', (event) => {
            const { data } = event;
            if (typeof data !== 'object') return;

            switch (data.type) {
              case 'trial_filter': {
                const { trials, funcStr } = data;
                try {
                  const filterFunc = eval('(' + funcStr + ')');
                  const result = trials.filter(filterFunc);
                  parent.postMessage({ type: 'trial_filter_result', filteredTrials: result }, '*');
                } catch (e) {
                  parent.postMessage({ type: 'trial_filter_result', filteredTrials: [], error: String(e) }, '*');
                }
                break;
              }
              case 'generate_plotly_graph': {
                const { study, funcStr } = data;
                try {
                  const plotlyFunc = eval('(' + funcStr + ')');
                  const result = plotlyFunc(study);
                  parent.postMessage({ type: 'generate_plotly_graph_result', plotlyData: result }, '*');
                } catch (e) {
                  parent.postMessage({ type: 'generate_plotly_graph_result', plotlyData: null, error: String(e) }, '*');
                }
                break;
              }
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

  return {
    evalTrialFilter,
    evalGeneratePlotlyGraph,
    renderIframeSandbox,
  }
}
