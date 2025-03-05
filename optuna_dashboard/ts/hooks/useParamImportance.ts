import * as Optuna from "@optuna/types"
import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { useSnackbar } from "notistack"
import { useEffect } from "react"
import { useAPIClient } from "../apiClientProvider"
import { ParamImportanceEvaluator } from "../apiClient"

export const useParamImportance = ({
  numCompletedTrials,
  studyId,
  evaluator,
}: { numCompletedTrials: number; studyId: number, evaluator: ParamImportanceEvaluator }) => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()

  const { data, isLoading, error } = useQuery<
    Optuna.ParamImportance[][],
    AxiosError<{ reason: string }>
  >({
    queryKey: ["paramImportance", studyId, numCompletedTrials, evaluator],
    queryFn: () => apiClient.getParamImportances(studyId, evaluator),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  useEffect(() => {
    if (error) {
      const reason = error.response?.data.reason
      enqueueSnackbar(
        `Failed to load hyperparameter importance (reason=${reason})`,
        {
          variant: "error",
        }
      )
    }
  }, [error])

  return {
    importances: data,
    isLoading,
    error,
  }
}
