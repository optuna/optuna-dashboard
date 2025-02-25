import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { useSnackbar } from "notistack"
import { useEffect } from "react"
import { APIMeta } from "../apiClient"
import { useAPIClient } from "../apiClientProvider"

export const useArtifactBaseUrlPath = (): string => {
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
      enqueueSnackbar(`Failed to load API meta (reason=${reason})`, {
        variant: "error",
      })
    }
  }, [error])

  if (isLoading || error !== null) {
    return ""
  }
  return data?.jupyterlab_extension_context?.base_url ?? ""
}
