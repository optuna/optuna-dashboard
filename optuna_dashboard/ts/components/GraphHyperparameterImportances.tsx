import { Box, Card, CardContent, FormControl, FormLabel, MenuItem, Select, useTheme } from "@mui/material"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useState } from "react"

import { PlotImportance } from "@optuna/react"
import { StudyDetail } from "ts/types/optuna"
import { ParamImportanceEvaluator, PlotType } from "../apiClient"
import { useParamImportance } from "../hooks/useParamImportance"
import { usePlot } from "../hooks/usePlot"
import { useBackendRender, usePlotlyColorTheme } from "../state"

const plotDomId = "graph-hyperparameter-importances"

export const GraphHyperparameterImportance: FC<{
  studyId: number
  study: StudyDetail | null
  graphHeight: string
}> = ({ studyId, study = null, graphHeight }) => {
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const [evaluator, setEvaluator] = useState<ParamImportanceEvaluator>(ParamImportanceEvaluator.PedAnova);
  const { importances } = useParamImportance({
    numCompletedTrials,
    studyId,
    evaluator,
  })

  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

  if (useBackendRender()) {
    return (
      <GraphHyperparameterImportanceBackend
        studyId={studyId}
        study={study}
        graphHeight={graphHeight}
      />
    )
  } else {
    return (
      <Card>
        <CardContent>
          <PlotImportance
            study={study}
            importance={importances}
            graphHeight={graphHeight}
            colorTheme={colorTheme}
          />
          <FormControl component="fieldset">
            <FormLabel component="legend">
              Evaluator:
            </FormLabel>
            <Select value={evaluator} onChange={(e) => setEvaluator(e.target.value as ParamImportanceEvaluator)}>
              {
                Object.values(ParamImportanceEvaluator).map((evaluator) => (
                  <MenuItem key={evaluator} value={evaluator}>{evaluator}</MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    )
  }
}

const GraphHyperparameterImportanceBackend: FC<{
  studyId: number
  study: StudyDetail | null
  graphHeight: string
}> = ({ studyId, study = null, graphHeight }) => {
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const { data, layout, error } = usePlot({
    numCompletedTrials,
    studyId,
    plotType: PlotType.ParamImportances,
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

  return <Box component="div" id={plotDomId} sx={{ height: graphHeight }} />
}
