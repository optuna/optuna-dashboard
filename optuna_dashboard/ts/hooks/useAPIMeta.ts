import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { useSnackbar } from "notistack"
import { useEffect } from "react"
import { APIMeta } from "../apiClient"
import { useAPIClient } from "../apiClientProvider"

const useAPIMeta = (): {
  data: APIMeta | undefined
  isLoading: boolean
  error: AxiosError<{ reason: string }> | null
} => {
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

  return { data, isLoading, error }
}

export const useArtifactBaseUrlPath = (): string => {
  const { data } = useAPIMeta()
  return data?.jupyterlab_extension_context?.base_url ?? ""
}

export const useArtifactIsAvailable = (): boolean => {
  const { data } = useAPIMeta()
  return data?.artifact_is_available ?? false
}

export const useLLMIsAvailable = (): boolean => {
  const { data } = useAPIMeta()
  return data?.llm_is_available ?? false
}

export const usePlotlyPyIsAvailable = (): boolean => {
  const { data } = useAPIMeta()
  return data?.plotlypy_is_available ?? false
}
