import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { APIMeta } from "../apiClient"
import { useAPIClient } from "../apiClientProvider"
import { useSnackbar } from "notistack"
import { useEffect } from "react"

export const useAPIMeta = () => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()
  const { data, isLoading, error } = useQuery<
    APIMeta,
    AxiosError<{ reason: string }>
  >({
    queryKey: ["apiMeta"],
    queryFn: () => apiClient.getMetaInfo(),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  useEffect(() => {
    if (error) {
      const reason = error.response?.data.reason
      enqueueSnackbar(
        `Failed to load API meta (reason=${reason})`,
        {
          variant: "error",
        }
      )
    }
  }, [error])

  return {
    apiMeta: data,
    isLoading,
    error,
  }
}
