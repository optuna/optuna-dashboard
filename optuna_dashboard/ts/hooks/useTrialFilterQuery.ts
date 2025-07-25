import { isAxiosError } from "axios"
import { useSnackbar } from "notistack"
import { useAPIClient } from "../apiClientProvider"
import { useEvalTrialFilter } from "@optuna/react"
import { Trial } from "../types/optuna"
import { ReactNode, useCallback } from "react"

export const useTrialFilterQuery = (nRetry: number): [
  (trials: Trial[], filterQueryStr: string) => Promise<Trial[]>,
  () => ReactNode
] => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()
  const [filterByJSFuncStr, renderIframe] = useEvalTrialFilter<Trial>();

  const filterByUserQuery = useCallback(async (trials: Trial[], userQuery: string): Promise<Trial[]> => {
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
        return await filterByJSFuncStr(trials, filterFuncStr);;
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
