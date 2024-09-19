import { useTheme } from "@mui/material"
import {
  GraphContainer,
  PlotSlice,
  useGraphComponentState,
} from "@optuna/react"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { StudyDetail } from "ts/types/optuna"
import { PlotType } from "../apiClient"
import { usePlot } from "../hooks/usePlot"
import { useBackendRender, usePlotlyColorTheme } from "../state"

export const GraphSlice: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

  if (useBackendRender()) {
    return <GraphSliceBackend study={study} />
  } else {
    return <PlotSlice study={study} colorTheme={colorTheme} />
  }
}

const domId = "graph-slice"

const GraphSliceBackend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const studyId = study?.id
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0

  const { data, layout, error } = usePlot({
    numCompletedTrials,
    studyId,
    plotType: PlotType.Slice,
  })

  useEffect(() => {
    if (data && layout && graphComponentState !== "componentWillMount") {
      plotly.react(domId, data, layout).then(notifyGraphDidRender)
    }
  }, [data, layout, graphComponentState])
  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  return (
    <GraphContainer
      plotDomId={domId}
      graphComponentState={graphComponentState}
    />
  )
}
