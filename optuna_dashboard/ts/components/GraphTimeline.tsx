import { Grid, useTheme } from "@mui/material"
import { PlotTimeline } from "@optuna/react"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { StudyDetail } from "ts/types/optuna"
import { PlotType } from "../apiClient"
import { studyDetailToStudy } from "../graphUtil"
import { usePlot } from "../hooks/usePlot"
import { usePlotlyColorTheme } from "../state"
import { useBackendRender } from "../state"

const plotDomId = "graph-timeline"

export const GraphTimeline: FC<{
  study: StudyDetail | null
}> = ({ study }) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

  if (useBackendRender()) {
    return <GraphTimelineBackend study={study} />
  } else {
    return <PlotTimeline study={studyDetailToStudy(study)} colorTheme={colorTheme} />
  }
}

const GraphTimelineBackend: FC<{
  study: StudyDetail | null
}> = ({ study }) => {
  const studyId = study?.id
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const { data, layout, error } = usePlot({
    numCompletedTrials,
    studyId,
    plotType: PlotType.Timeline,
  })

  useEffect(() => {
    if (data && layout) {
      plotly.react(plotDomId, data, layout)
    }
  }, [data, layout])
  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  return (
    <Grid item xs={9}>
      <div id={plotDomId} />
    </Grid>
  )
}
