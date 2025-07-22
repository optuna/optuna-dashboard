import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { TrialFilterQueryLastResponse, TrialFilterQueryResponse } from "../apiClient"
import { useSnackbar } from "notistack"
import { useEffect } from "react"
import { useAPIClient } from "../apiClientProvider"

export const useTrialFilterQuery = (
  user_query: string,
  last_response?: TrialFilterQueryLastResponse
) => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()

  const { data, isLoading, error } = useQuery<
    TrialFilterQueryResponse,
    AxiosError<{ reason: string }>
  >({
    queryKey: ["trialFilterQuery", user_query, last_response],
    queryFn: () => apiClient.callTrialFilterQuery(user_query, last_response),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  useEffect(() => {
    if (error) {
      const reason = error.response?.data.reason
      enqueueSnackbar(
        `Failed to filter trials with query (reason=${reason})`,
        {
          variant: "error",
        }
      )
    }
  }, [error])

  return {
    data: data,
    isLoading,
    error,
  }
}
