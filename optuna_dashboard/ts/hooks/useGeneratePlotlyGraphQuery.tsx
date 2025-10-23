import { useEvalFunctionInSandbox } from "@optuna/react"
import * as Optuna from "@optuna/types"
import { isAxiosError } from "axios"
import { atom, useAtom } from "jotai"
import { useSnackbar } from "notistack"
import * as plotly from "plotly.js-dist-min"
import { useAPIClient } from "../apiClientProvider"
import { StudyDetail } from "../types/optuna"
import { useEvalConfirmationDialog } from "./useEvalConfirmationDialog"

import React, { useCallback, useState } from "react"
import { useLLMIsAvailable } from "./useAPIMeta"

// Cache atom for API responses: userQuery -> { funcStr, graphTitle }
const generatePlotlyGraphCacheAtom = atom(
  new Map<string, { funcStr: string; graphTitle: string }>()
)
// Cache atom for failed queries: userQuery -> true (to prevent repeated attempts)
const failedGeneratePlotlyGraphQueryCacheAtom = atom(new Set<string>())

function buildReGeneratePlotlyGraphCacheKey(
  previousFunction: string,
  modificationRequestQuery: string
): string {
  return JSON.stringify({ previousFunction, modificationRequestQuery })
}

// Cache atom for re-generate plotly graph API responses: cacheKey -> { funcStr }
const reGeneratePlotlyGraphCacheAtom = atom(
  new Map<string, { funcStr: string }>()
)

// Cache atom for failed re-generate plotly graph queries: cacheKey -> true (to prevent repeated attempts)
const failedReGeneratePlotlyGraphQueryCacheAtom = atom(new Set<string>())

export const useGeneratePlotlyGraphQuery = ({
  nRetry,
  onGeneratePlotlyGraphDenied,
  onGeneratePlotlyGraphFailed,
  onReGeneratePlotlyGraphDenied,
  onReGeneratePlotlyGraphFailed,
}: {
  nRetry: number
  onGeneratePlotlyGraphDenied?: () => void
  onGeneratePlotlyGraphFailed?: (errorMsg: string) => void
  onReGeneratePlotlyGraphDenied?: () => void
  onReGeneratePlotlyGraphFailed?: (errorMsg: string) => void
}) => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()
  const llmEnabled = useLLMIsAvailable()
  const { evalGeneratePlotlyGraph, renderIframeSandbox } =
    useEvalFunctionInSandbox<Optuna.Trial, StudyDetail>()
  const [generatePlotlyGraphCache, setGeneratePlotlyGraphCache] = useAtom(
    generatePlotlyGraphCacheAtom
  )
  const [failedGeneratePlotlyGraphCache, setFailedGeneratePlotlyGraphCache] =
    useAtom(failedGeneratePlotlyGraphQueryCacheAtom)
  const [reGeneratePlotlyGraphCache, setReGeneratePlotlyGraphCache] = useAtom(
    reGeneratePlotlyGraphCacheAtom
  )
  const [
    failedReGeneratePlotlyGraphCache,
    setFailedReGeneratePlotlyGraphCache,
  ] = useAtom(failedReGeneratePlotlyGraphQueryCacheAtom)
  const [showGeneratePlotlyGraphDialog, renderGeneratePlotlyGraphDialog] =
    useEvalConfirmationDialog(onGeneratePlotlyGraphDenied)
  const [showReGeneratePlotlyGraphDialog, renderReGeneratePlotlyGraphDialog] =
    useEvalConfirmationDialog(onReGeneratePlotlyGraphDenied)
  const [isGeneratePlotlyGraphLoading, setIsGeneratePlotlyGraphLoading] =
    useState(false)
  const [isReGeneratePlotlyGraphLoading, setIsReGeneratePlotlyGraphLoading] =
    useState(false)

  const generatePlotlyGraphByUserQuery = useCallback(
    async (
      study: StudyDetail,
      userQuery: string
    ): Promise<{
      plotData: plotly.PlotData[]
      graphTitle: string
      functionStr: string
    }> => {
      setIsGeneratePlotlyGraphLoading(true)
      try {
        // Check if this query has already failed nRetry times
        if (failedGeneratePlotlyGraphCache.has(userQuery)) {
          enqueueSnackbar(
            "Error: This query has already failed multiple times, please change your query.",
            {
              variant: "error",
            }
          )
          return { plotData: [], graphTitle: "", functionStr: "" } // Return empty plot data
        }

        const cached = generatePlotlyGraphCache.get(userQuery)
        if (cached) {
          // Show confirmation dialog even for cached functions
          const userConfirmed = await showGeneratePlotlyGraphDialog(
            cached.funcStr
          )
          if (!userConfirmed) {
            return { plotData: [], graphTitle: "", functionStr: "" } // Return empty plot data if user denies
          }

          try {
            return {
              plotData: await evalGeneratePlotlyGraph(study, cached.funcStr),
              graphTitle: cached.graphTitle,
              functionStr: cached.funcStr,
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            console.warn(
              `Cached plotly graph generation function failed: ${message}`
            )
            const newCache = new Map(generatePlotlyGraphCache)
            newCache.delete(userQuery)
            setGeneratePlotlyGraphCache(newCache)
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
            if (onGeneratePlotlyGraphFailed) {
              onGeneratePlotlyGraphFailed(`API error: (error=${reason})`)
            }
            throw apiError
          }

          const userConfirmed = await showGeneratePlotlyGraphDialog(funcStr)
          if (!userConfirmed) {
            return { plotData: [], graphTitle: "", functionStr: "" } // Return empty plot data if user denies
          }

          try {
            const plotData = await evalGeneratePlotlyGraph(study, funcStr)
            // Cache the successful function string
            const newCache = new Map(generatePlotlyGraphCache)
            newCache.set(userQuery, { funcStr, graphTitle })
            setGeneratePlotlyGraphCache(newCache)
            return { plotData, graphTitle, functionStr: funcStr }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            console.warn(
              `Evaluation of plotly graph generation function failed: ${message}`
            )
            if (attempt >= nRetry - 1) {
              const newFailedCache = new Set(failedGeneratePlotlyGraphCache)
              newFailedCache.add(userQuery)
              setFailedGeneratePlotlyGraphCache(newFailedCache)

              const errorMessage = `Failed to evaluate plotly graph generation function after ${nRetry} attempts (error=${message})`
              enqueueSnackbar(errorMessage, {
                variant: "error",
              })

              if (onGeneratePlotlyGraphFailed) {
                onGeneratePlotlyGraphFailed(errorMessage)
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
        setIsGeneratePlotlyGraphLoading(false)
      }
    },
    [
      apiClient,
      generatePlotlyGraphCache,
      enqueueSnackbar,
      failedGeneratePlotlyGraphCache,
      evalGeneratePlotlyGraph,
      nRetry,
      onGeneratePlotlyGraphFailed,
      setGeneratePlotlyGraphCache,
      setFailedGeneratePlotlyGraphCache,
      showGeneratePlotlyGraphDialog,
    ]
  )

  const reGeneratePlotlyGraphByModificationRequestQuery = useCallback(
    async (
      study: StudyDetail,
      previousFunction: string,
      modificationRequestQuery: string
    ): Promise<{
      plotData: plotly.PlotData[]
      functionStr: string
    }> => {
      setIsReGeneratePlotlyGraphLoading(true)
      try {
        // Check if this query has already failed nRetry times
        const cacheKey = buildReGeneratePlotlyGraphCacheKey(
          previousFunction,
          modificationRequestQuery
        )
        if (failedReGeneratePlotlyGraphCache.has(cacheKey)) {
          enqueueSnackbar(
            "Error: This re-generation request has already failed multiple times, please change your query.",
            {
              variant: "error",
            }
          )
          return { plotData: [], functionStr: "" } // Return empty plot data
        }

        const cached = reGeneratePlotlyGraphCache.get(cacheKey)
        if (cached) {
          // Show confirmation dialog even for cached functions
          const userConfirmed = await showReGeneratePlotlyGraphDialog(
            cached.funcStr
          )
          if (!userConfirmed) {
            return { plotData: [], functionStr: "" } // Return empty plot data if user denies
          }

          try {
            return {
              plotData: await evalGeneratePlotlyGraph(study, cached.funcStr),
              functionStr: cached.funcStr,
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            console.warn(
              `Cached re-generated plotly graph function failed: ${message}`
            )
            const newCache = new Map(reGeneratePlotlyGraphCache)
            newCache.delete(cacheKey)
            setReGeneratePlotlyGraphCache(newCache)
          }
        }

        let lastResponse:
          | { func_str: string; error_message: string }
          | undefined = undefined
        for (let attempt = 0; attempt < nRetry; attempt++) {
          let funcStr: string

          try {
            const response = await apiClient.callReGeneratePlotlyGraphQuery({
              modification_request_query: modificationRequestQuery,
              previous_function: previousFunction,
              last_response: lastResponse,
            })
            funcStr = response.re_generated_plotly_graph_func_str
          } catch (apiError) {
            const reason = isAxiosError<{ reason: string }>(apiError)
              ? apiError.response?.data.reason
              : String(apiError)
            enqueueSnackbar(`API error: (error=${reason})`, {
              variant: "error",
            })
            if (onReGeneratePlotlyGraphFailed) {
              onReGeneratePlotlyGraphFailed(`API error: (error=${reason})`)
            }
            throw apiError
          }

          const userConfirmed = await showReGeneratePlotlyGraphDialog(funcStr)
          if (!userConfirmed) {
            return { plotData: [], functionStr: "" } // Return empty plot data if user denies
          }

          try {
            const plotData = await evalGeneratePlotlyGraph(study, funcStr)
            // Cache the successful function string
            const newCache = new Map(reGeneratePlotlyGraphCache)
            newCache.set(cacheKey, { funcStr })
            setReGeneratePlotlyGraphCache(newCache)
            return { plotData, functionStr: funcStr }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            console.warn(
              `Evaluation of re-generated plotly graph function failed: ${message}`
            )
            if (attempt >= nRetry - 1) {
              const newFailedCache = new Set(failedReGeneratePlotlyGraphCache)
              newFailedCache.add(cacheKey)
              setFailedReGeneratePlotlyGraphCache(newFailedCache)

              const errorMessage = `Failed to evaluate re-generated plotly graph function after ${nRetry} attempts (error=${message})`
              enqueueSnackbar(errorMessage, {
                variant: "error",
              })

              if (onReGeneratePlotlyGraphFailed) {
                onReGeneratePlotlyGraphFailed(errorMessage)
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
        setIsReGeneratePlotlyGraphLoading(false)
      }
    },
    [
      apiClient,
      reGeneratePlotlyGraphCache,
      enqueueSnackbar,
      failedReGeneratePlotlyGraphCache,
      evalGeneratePlotlyGraph,
      nRetry,
      onReGeneratePlotlyGraphFailed,
      setReGeneratePlotlyGraphCache,
      setFailedReGeneratePlotlyGraphCache,
      showReGeneratePlotlyGraphDialog,
    ]
  )

  const render = () => {
    if (!llmEnabled) {
      return null
    }
    return (
      <>
        {renderGeneratePlotlyGraphDialog()}
        {renderReGeneratePlotlyGraphDialog()}
        {renderIframeSandbox()}
      </>
    )
  }

  return {
    render,
    generatePlotlyGraph: generatePlotlyGraphByUserQuery,
    isGeneratePlotlyGraphLoading,
    reGeneratePlotlyGraph: reGeneratePlotlyGraphByModificationRequestQuery,
    isReGeneratePlotlyGraphLoading,
  }
}
