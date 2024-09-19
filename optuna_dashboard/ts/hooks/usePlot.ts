import { useTheme } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import * as plotly from "plotly.js-dist-min"
import { PlotType } from "../apiClient"
import { useAPIClient } from "../apiClientProvider"
import { usePlotlyColorTheme } from "../state"

export const usePlot = ({
  numCompletedTrials,
  studyId,
  plotType,
}: {
  numCompletedTrials: number
  studyId: number | undefined
  plotType: PlotType
}) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

  const { apiClient } = useAPIClient()
  const { data, isLoading, error } = useQuery<
    { data: plotly.Data[]; layout: plotly.Layout },
    AxiosError
  >({
    enabled: studyId !== undefined,
    queryKey: ["plot", studyId, numCompletedTrials, plotType],
    queryFn: () => {
      if (studyId === undefined) {
        return Promise.reject(new Error("Invalid studyId"))
      }
      return apiClient.getPlot(studyId, plotType)
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  return {
    data: data?.data,
    layout: { ...data?.layout, template: colorTheme },
    isLoading,
    error,
  }
}
