import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { useSnackbar } from "notistack"
import { useEffect } from "react"
import { TrialFilterQueryRequest, TrialFilterQueryResponse } from "../apiClient"
import { useAPIClient } from "../apiClientProvider"

export const useTrialFilterQuery = (request: TrialFilterQueryRequest) => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()

  const { data, isLoading, error } = useQuery<
    TrialFilterQueryResponse,
    AxiosError<{ reason: string }>
  >({
    queryKey: ["trialFilterQuery", request],
    queryFn: () => apiClient.callTrialFilterQuery(request),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  useEffect(() => {
    if (error) {
      const reason = error.response?.data.reason
      enqueueSnackbar(`Failed to filter trials with query (reason=${reason})`, {
        variant: "error",
      })
    }
  }, [error])

  return {
    data: data,
    isLoading,
    error,
  }
}
