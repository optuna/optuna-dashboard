import { isAxiosError } from "axios"
import { useSnackbar } from "notistack"
import { useAPIClient } from "../apiClientProvider"
import { useEvalTrialFilter } from "@optuna/react"
import { Trial } from "../types/optuna"
import { ReactNode, useCallback, useRef } from "react"

export const useTrialFilterQuery = (nRetry: number): [
  (trials: Trial[], filterQueryStr: string) => Promise<Trial[]>,
  () => ReactNode
] => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()
  const [filterByJSFuncStr, renderIframe] = useEvalTrialFilter<Trial>();
  
  // Cache for API responses: userQuery -> trial_filtering_func_str
  const cacheRef = useRef<Map<string, string>>(new Map())

  const filterByUserQuery = useCallback(async (trials: Trial[], userQuery: string): Promise<Trial[]> => {
    // Check cache first
    const cached = cacheRef.current.get(userQuery)
    if (cached) {
      console.log(`Using cached filter function for query: ${userQuery}`)
      try {
        return await filterByJSFuncStr(trials, cached)
      } catch (evalError: any) {
        // If cached function fails, remove from cache and proceed with API call
        console.warn(`Cached filter function failed, removing from cache: ${evalError.message}`)
        cacheRef.current.delete(userQuery)
      }
    }

    let lastResponse: { func_str: string; error_message: string } | undefined = undefined;
    for (let attempt = 0; attempt < nRetry; attempt++) {
      let filterFuncStr: string;

      try {
        const response = await apiClient.callTrialFilterQuery({
          user_query: userQuery,
          last_response: lastResponse,
        });
        filterFuncStr = response.trial_filtering_func_str;
      } catch (apiError) {
        const reason = isAxiosError<{reason: string}>(apiError) ? apiError.response?.data?.reason : String(apiError);
        enqueueSnackbar(`API error: (error=${reason})`, {
          variant: "error",
        });
        throw apiError;
      }

      // TODO(c-bata): Show the confirmation dialog here.
      try {
        const result = await filterByJSFuncStr(trials, filterFuncStr);
        // Cache the successful function string
        cacheRef.current.set(userQuery, filterFuncStr);
        console.log(`Cached filter function for query: ${userQuery}`)
        return result;
      } catch (evalError: any) {
        const errMsg = evalError.message;
        console.error(`Failed to filter trials (func=${filterFuncStr}, error=${errMsg})`);
        if (attempt === 4) {
          enqueueSnackbar(
            `Failed to evaluate trial filtering function after 5 attempts (error=${errMsg})`,
            { variant: "error" }
          );
          throw evalError;
        }

        lastResponse = {
          func_str: filterFuncStr,
          error_message: errMsg,
        };
      }
    }
    throw new Error("Must not reach here.");
  }, [apiClient, enqueueSnackbar, filterByJSFuncStr, nRetry])
  return [filterByUserQuery, renderIframe];
}
