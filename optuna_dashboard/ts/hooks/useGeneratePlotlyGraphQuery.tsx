import { useEvalFunctionInSandbox } from "@optuna/react"
import * as Optuna from "@optuna/types"
import { isAxiosError } from "axios"
import { atom, useAtom } from "jotai"
import { useSnackbar } from "notistack"
import * as plotly from "plotly.js-dist-min"
import { useAPIClient } from "../apiClientProvider"
import { StudyDetail } from "../types/optuna"
import { useEvalConfirmationDialog } from "./useEvalConfirmationDialog"

import React, { ReactNode, useCallback, useState } from "react"

// Cache atom for API responses: userQuery -> { funcStr, graphTitle }
const generatePlotlyGraphCacheAtom = atom(
  new Map<string, { funcStr: string; graphTitle: string }>()
)
// Cache atom for failed queries: userQuery -> true (to prevent repeated attempts)
const failedQueryCacheAtom = atom(new Set<string>())

export const useGeneratePlotlyGraphQuery = ({
  nRetry,
  onDenied,
  onFailed,
}: {
  nRetry: number
  onDenied?: () => void
  onFailed?: (errorMsg: string) => void
}): [
  (
    study: StudyDetail,
    generatePlotlyGraphQueryStr: string
  ) => Promise<{
    plotData: plotly.PlotData[]
    graphTitle: string
  }>,
  () => ReactNode,
  boolean,
] => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()
  const { evalGeneratePlotlyGraph, renderIframeSandbox } =
    useEvalFunctionInSandbox<Optuna.Trial, StudyDetail>()
  const [cache, setCache] = useAtom(generatePlotlyGraphCacheAtom)
  const [failedCache, setFailedCache] = useAtom(failedQueryCacheAtom)
  const [showConfirmationDialog, renderDialog] =
    useEvalConfirmationDialog(onDenied)
  const [isLoading, setIsLoading] = useState(false)

  const generatePlotlyGraphByUserQuery = useCallback(
    async (
      study: StudyDetail,
      userQuery: string
    ): Promise<{
      plotData: plotly.PlotData[]
      graphTitle: string
    }> => {
      setIsLoading(true)
      try {
        // Check if this query has already failed nRetry times
        if (failedCache.has(userQuery)) {
          enqueueSnackbar(
            "Error: This query has already failed multiple times, please change your query.",
            {
              variant: "error",
            }
          )
          return { plotData: [], graphTitle: "" } // Return empty plot data
        }

        const cached = cache.get(userQuery)
        if (cached) {
          // Show confirmation dialog even for cached functions
          const userConfirmed = await showConfirmationDialog(cached.funcStr)
          if (!userConfirmed) {
            return { plotData: [], graphTitle: "" } // Return empty plot data if user denies
          }

          try {
            return {
              plotData: await evalGeneratePlotlyGraph(study, cached.funcStr),
              graphTitle: cached.graphTitle,
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            console.warn(
              `Cached plotly graph generation function failed: ${message}`
            )
            const newCache = new Map(cache)
            newCache.delete(userQuery)
            setCache(newCache)
          }
        }

        let lastResponse:
          | { func_str: string; error_message: string }
          | undefined = undefined
        for (let attempt = 0; attempt < nRetry; attempt++) {
          let funcStr: string
          let graphTitle: string

          try {
            const response = await apiClient.callGeneratePlotlyGraphQuery({
              user_query: userQuery,
              last_response: lastResponse,
            })
            funcStr = response.generate_plotly_graph_func_str
            graphTitle = response.generate_plotly_graph_title
          } catch (apiError) {
            const reason = isAxiosError<{ reason: string }>(apiError)
              ? apiError.response?.data.reason
              : String(apiError)
            enqueueSnackbar(`API error: (error=${reason})`, {
              variant: "error",
            })
            if (onFailed) {
              onFailed(`API error: (error=${reason})`)
            }
            throw apiError
          }

          const userConfirmed = await showConfirmationDialog(funcStr)
          if (!userConfirmed) {
            return { plotData: [], graphTitle: "" } // Return empty plot data if user denies
          }

          try {
            const plotData = await evalGeneratePlotlyGraph(study, funcStr)
            // Cache the successful function string
            const newCache = new Map(cache)
            newCache.set(userQuery, { funcStr, graphTitle })
            setCache(newCache)
            return { plotData, graphTitle }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            console.warn(
              `Evaluation of plotly graph generation function failed: ${message}`
            )
            if (attempt >= nRetry - 1) {
              const newFailedCache = new Set(failedCache)
              newFailedCache.add(userQuery)
              setFailedCache(newFailedCache)

              const errorMessage = `Failed to evaluate plotly graph generation function after ${nRetry} attempts (error=${message})`
              enqueueSnackbar(errorMessage, {
                variant: "error",
              })

              if (onFailed) {
                onFailed(errorMessage)
              }
              throw e
            }

            lastResponse = {
              func_str: funcStr,
              error_message: message,
            }
          }
        }
        throw new Error("Must not reach here.")
      } finally {
        setIsLoading(false)
      }
    },
    [
      apiClient,
      cache,
      enqueueSnackbar,
      failedCache,
      evalGeneratePlotlyGraph,
      nRetry,
      onFailed,
      setCache,
      setFailedCache,
      showConfirmationDialog,
    ]
  )

  const render = () => {
    return (
      <>
        {renderDialog()}
        {renderIframeSandbox()}
      </>
    )
  }

  return [generatePlotlyGraphByUserQuery, render, isLoading]
}
