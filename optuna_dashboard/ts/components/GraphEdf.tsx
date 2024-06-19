import {
  GraphContainer,
  PlotEdf,
  getPlotEdfDomId,
  useGraphComponentState,
} from "@optuna/react"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { StudyDetail } from "ts/types/optuna"
import { CompareStudiesPlotType } from "../apiClient"
import { useAPIClient } from "../apiClientProvider"
import { useBackendRender } from "../state"

export const GraphEdf: FC<{
  studies: StudyDetail[]
  objectiveId: number
}> = ({ studies, objectiveId }) => {
  if (useBackendRender()) {
    return <GraphEdfBackend studies={studies} />
  } else {
    return <PlotEdf studies={studies} objectiveId={objectiveId} />
  }
}

const GraphEdfBackend: FC<{
  studies: StudyDetail[]
}> = ({ studies }) => {
  const { apiClient } = useAPIClient()
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const studyIds = studies.map((s) => s.id)
  const domId = getPlotEdfDomId(-1)
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
