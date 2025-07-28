import { useEvalTrialFilter } from "@optuna/react"
import { isAxiosError } from "axios"
import { atom, useAtom } from "jotai"
import { useSnackbar } from "notistack"
import { ReactNode, useCallback } from "react"
import { useAPIClient } from "../apiClientProvider"
import { Trial } from "../types/optuna"

// Cache atom for API responses: userQuery -> trial_filtering_func_str
const trialFilterCacheAtom = atom<Map<string, string>>(new Map())

export const useTrialFilterQuery = (
  nRetry: number
): [
  (trials: Trial[], filterQueryStr: string) => Promise<Trial[]>,
  () => ReactNode,
] => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()
  const [filterByJSFuncStr, renderIframe] = useEvalTrialFilter<Trial>()
  const [cache, setCache] = useAtom(trialFilterCacheAtom)

  const filterByUserQuery = useCallback(
    async (trials: Trial[], userQuery: string): Promise<Trial[]> => {
      // Check cache first
      const cached = cache.get(userQuery)
      if (cached) {
        console.log(`Using cached filter function for query: ${userQuery}`)
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
          throw apiError
        }

        // TODO(c-bata): Show the confirmation dialog here.
        try {
          const result = await filterByJSFuncStr(trials, filterFuncStr)
          // Cache the successful function string
          const newCache = new Map(cache)
          newCache.set(userQuery, filterFuncStr)
          setCache(newCache)
          console.log(`Cached filter function for query: ${userQuery}`)
          return result
        } catch (evalError: unknown) {
          const errMsg =
            evalError instanceof Error ? evalError.message : String(evalError)
          console.error(
            `Failed to filter trials (func=${filterFuncStr}, error=${errMsg})`
          )
          if (attempt >= nRetry - 1) {
            enqueueSnackbar(
              `Failed to evaluate trial filtering function after 5 attempts (error=${errMsg})`,
              { variant: "error" }
            )
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
    [apiClient, enqueueSnackbar, filterByJSFuncStr, nRetry, cache, setCache]
  )
  return [filterByUserQuery, renderIframe]
}
