import {
  GraphContainer,
  PlotParallelCoordinate,
  useGraphComponentState,
} from "@optuna/react"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { StudyDetail } from "ts/types/optuna"
import { PlotType } from "../apiClient"
import { usePlot } from "../hooks/usePlot"
import { useBackendRender } from "../state"

const plotDomId = "graph-parallel-coordinate"

export const GraphParallelCoordinate: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  if (useBackendRender()) {
    return <GraphParallelCoordinateBackend study={study} />
  } else {
    return <PlotParallelCoordinate study={study} />
  }
}

const GraphParallelCoordinateBackend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const studyId = study?.id
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0

  const { data, layout, error } = usePlot({
    numCompletedTrials,
    studyId,
    plotType: PlotType.ParallelCoordinate,
  })

  useEffect(() => {
    if (data && layout && graphComponentState !== "componentWillMount") {
      try {
        plotly.react(plotDomId, data, layout).then(notifyGraphDidRender)
      } catch (err) {
        console.error(err)
      }
    }
  }, [data, layout, graphComponentState])
  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  return (
    <GraphContainer
      plotDomId={plotDomId}
      graphComponentState={graphComponentState}
    />
  )
}
