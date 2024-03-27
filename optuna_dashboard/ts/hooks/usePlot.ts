import * as plotly from "plotly.js-dist-min"
import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { PlotType, getPlotAPI } from "../apiClient"

export const usePlot = ({
  numCompletedTrials,
  studyId,
  plotType,
}: {
  numCompletedTrials: number
  studyId: number | undefined
  plotType: PlotType
}) => {
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
      return getPlotAPI(studyId, plotType)
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  return {
    data: data?.data,
    layout: data?.layout,
    isLoading,
    error,
  }
}
