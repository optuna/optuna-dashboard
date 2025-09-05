import { useEvalTrialFilter } from "@optuna/react"
import { isAxiosError } from "axios"
import { atom, useAtom } from "jotai"
import { useSnackbar } from "notistack"
import React, { ReactNode, useCallback } from "react"
import { useAPIClient } from "../apiClientProvider"
import { Trial } from "../types/optuna"
import { useEvalConfirmationDialog } from "./useEvalConfirmationDialog"

// Cache atom for API responses: userQuery -> trial_filtering_func_str
const trialFilterCacheAtom = atom<Map<string, string>>(new Map())
// Cache atom for failed queries: userQuery -> true (to prevent repeated attempts)
const failedQueryCacheAtom = atom<Set<string>>(new Set<string>())

export const useTrialFilterQuery = ({
  nRetry,
  onDenied,
  onFailed,
}: {
  nRetry: number
  onDenied?: () => void
  onFailed?: (errorMsg: string) => void
}): [
  (trials: Trial[], filterQueryStr: string) => Promise<Trial[]>,
  () => ReactNode,
] => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()
  const [filterByJSFuncStr, renderIframe] = useEvalTrialFilter<Trial>()
  const [cache, setCache] = useAtom(trialFilterCacheAtom)
  const [failedCache, setFailedCache] = useAtom(failedQueryCacheAtom)
  const [showConfirmationDialog, renderDialog] =
    useEvalConfirmationDialog(onDenied)

  const filterByUserQuery = useCallback(
    async (trials: Trial[], userQuery: string): Promise<Trial[]> => {
      // Check if this query has already failed nRetry times
      if (failedCache.has(userQuery)) {
        enqueueSnackbar("Error: This query has already failed multiple times, please change your query.", {
          variant: "error",
        })
        return trials // Return unfiltered trials
      }

      const cached = cache.get(userQuery)
      if (cached) {
        // Show confirmation dialog even for cached functions
        const userConfirmed = await showConfirmationDialog(cached)
        if (!userConfirmed) {
          return trials // Return unfiltered trials if user denies
        }

        try {
          return await filterByJSFuncStr(trials, cached)
        } catch (evalError: unknown) {
          // If cached function fails, remove from cache and proceed with API call
          const message =
            evalError instanceof Error ? evalError.message : String(evalError)
          console.warn(
            `Cached filter function failed, removing from cache: ${message}`
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
        let filterFuncStr: string

        try {
          const response = await apiClient.callTrialFilterQuery({
            user_query: userQuery,
            last_response: lastResponse,
          })
          filterFuncStr = response.trial_filtering_func_str
        } catch (apiError) {
          const reason = isAxiosError<{ reason: string }>(apiError)
            ? apiError.response?.data?.reason
            : String(apiError)
          enqueueSnackbar(`API error: (error=${reason})`, {
            variant: "error",
          })
          if (onFailed) {
            onFailed(`API error: ${reason}`)
          }
          throw apiError
        }

        const userConfirmed = await showConfirmationDialog(filterFuncStr)
        if (!userConfirmed) {
          throw new Error("User rejected the execution")
        }

        try {
          const result = await filterByJSFuncStr(trials, filterFuncStr)
          // Cache the successful function string
          const newCache = new Map(cache)
          newCache.set(userQuery, filterFuncStr)
          setCache(newCache)
          return result
        } catch (evalError: unknown) {
          const errMsg =
            evalError instanceof Error ? evalError.message : String(evalError)
          console.error(
            `Failed to filter trials (func=${filterFuncStr}, error=${errMsg})`
          )
          if (attempt >= nRetry - 1) {
            const newFailedCache = new Set(failedCache)
            newFailedCache.add(userQuery)
            setFailedCache(newFailedCache)

            const errorMessage = `Failed to evaluate trial filtering function after ${nRetry} attempts (error=${errMsg})`
            enqueueSnackbar(errorMessage, { variant: "error" })

            if (onFailed) {
              onFailed(errorMessage)
            }
            throw evalError
          }

          lastResponse = {
            func_str: filterFuncStr,
            error_message: errMsg,
          }
        }
      }
      throw new Error("Must not reach here.")
    },
    [
      apiClient,
      enqueueSnackbar,
      filterByJSFuncStr,
      nRetry,
      cache,
      setCache,
      failedCache,
      setFailedCache,
      showConfirmationDialog,
      onFailed,
    ]
  )

  const render = () => {
    return (
      <>
        {renderDialog()}
        {renderIframe()}
      </>
    )
  }
  return [filterByUserQuery, render]
}
