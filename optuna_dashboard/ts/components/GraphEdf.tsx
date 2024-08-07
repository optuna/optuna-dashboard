import { useTheme } from "@mui/material"
import { GraphContainer, PlotEdf, useGraphComponentState } from "@optuna/react"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { StudyDetail } from "ts/types/optuna"
import { CompareStudiesPlotType } from "../apiClient"
import { useAPIClient } from "../apiClientProvider"
import { useBackendRender, usePlotlyColorTheme } from "../state"

export const GraphEdf: FC<{
  studies: StudyDetail[]
  objectiveId: number
}> = ({ studies, objectiveId }) => {
  if (useBackendRender()) {
    return <GraphEdfBackend studies={studies} />
  } else {
    const theme = useTheme()
    const colorTheme = usePlotlyColorTheme(theme.palette.mode)
    return (
      <PlotEdf
        studies={studies}
        objectiveId={objectiveId}
        colorTheme={colorTheme}
      />
    )
  }
}

const domId = "graph-edf"

const GraphEdfBackend: FC<{
  studies: StudyDetail[]
}> = ({ studies }) => {
  const { apiClient } = useAPIClient()
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const studyIds = studies.map((s) => s.id)
  const numCompletedTrials = studies.reduce(
    (acc, study) =>
      acc + study?.trials.filter((t) => t.state === "Complete").length,
    0
  )
  useEffect(() => {
    if (studyIds.length === 0) {
      return
    }
    if (graphComponentState !== "componentWillMount") {
      apiClient
        .getCompareStudiesPlot(studyIds, CompareStudiesPlotType.EDF)
        .then(({ data, layout }) => {
          plotly.react(domId, data, layout).then(notifyGraphDidRender)
        })
        .catch((err) => {
          console.error(err)
        })
    }
  }, [studyIds, numCompletedTrials, graphComponentState])
  return (
    <GraphContainer
      plotDomId={domId}
      graphComponentState={graphComponentState}
    />
  )
}
