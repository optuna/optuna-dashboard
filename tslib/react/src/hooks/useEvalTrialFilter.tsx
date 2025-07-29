import { Trial } from "@optuna/types"
import { ReactNode, useCallback, useEffect, useRef } from "react"

type MessageRequest<T> = {
  type: "filter"
  trials: T[]
  filterFuncStr: string
}

type MessageResponse<T> = {
  type: "result"
  filteredTrials: T[]
  error?: Error
}

type TrialFilter<T extends Trial> = (
  trials: T[],
  filterFuncStr: string
) => Promise<T[]>

export const useEvalTrialFilter = <T extends Trial>(): [
  TrialFilter<T>,
  () => ReactNode,
] => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const pendingPromiseRef = useRef<{
    resolve: (value: T[]) => void
    reject: (reason?: Error) => void
  } | null>(null)

  const filterFunc = useCallback(
    (trials: T[], filterFuncStr: string): Promise<T[]> => {
      return new Promise((resolve, reject) => {
        // TODO(c-bata): Support concurrent evaluations
        if (!iframeRef.current || !iframeRef.current.contentWindow) {
          return reject(new Error("Sandbox iframe is not ready"))
        }

        if (pendingPromiseRef.current) {
          reject(new Error("Previous evaluation still running"))
        }

        pendingPromiseRef.current = { resolve, reject }

        const message: MessageRequest<T> = {
          type: "filter",
          trials,
          filterFuncStr,
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

      const response = data as MessageResponse<T>

      if (pendingPromiseRef.current) {
        if (response.error) {
          pendingPromiseRef.current.reject(response.error)
        } else {
          pendingPromiseRef.current.resolve(response.filteredTrials)
        }
        pendingPromiseRef.current = null
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
            if (typeof data !== 'object' || data.type !== 'filter') return;
  
            const { trials, filterFuncStr } = data;
            try {
              const filterFunc = eval('(' + filterFuncStr + ')');
              const result = trials.filter(filterFunc);
              parent.postMessage({ type: 'result', filteredTrials: result }, '*');
            } catch (e) {
              parent.postMessage({ type: 'result', filteredTrials: [], error: String(e) }, '*');
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

  return [filterFunc, renderIframeSandbox]
}
