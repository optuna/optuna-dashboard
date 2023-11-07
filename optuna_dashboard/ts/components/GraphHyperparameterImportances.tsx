import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { Typography, useTheme, Box, Card, CardContent } from "@mui/material"

import { plotlyDarkTemplate } from "./PlotlyDarkMode"
import { actionCreator } from "../action"
import { useParamImportanceValue, useStudyDirections } from "../state"
const plotDomId = "graph-hyperparameter-importances"
const plotBackendDomId = "graph-hyperparameter-importances-backend"

export const GraphHyperparameterImportance: FC<{
  studyId: number
  study: StudyDetail | null
  graphHeight: string
}> = ({ studyId, study = null, graphHeight }) => {
  const theme = useTheme()
  const action = actionCreator()
  const importances = useParamImportanceValue(studyId)
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const nObjectives = useStudyDirections(studyId)?.length
  const objectiveNames: string[] =
    study?.objective_names ||
    study?.directions.map((d, i) => `Objective ${i}`) ||
    []

  useEffect(() => {
    action.updateParamImportance(studyId)
  }, [numCompletedTrials])

  useEffect(() => {
    fetch(`/api/studies/${studyId}/param_importances_plot`, {mode: 'cors'})
    .then((response) => response.json())
    .then((figure) => {
      plotly.react(plotBackendDomId, figure.data, figure.layout)
    }).catch((err) => {
      console.error(err);
    })
  }, [numCompletedTrials])

  useEffect(() => {
    if (importances !== null && nObjectives === importances.length) {
      plotParamImportance(importances, objectiveNames, theme.palette.mode)
    }
  }, [nObjectives, importances, theme.palette.mode])

  return (
    <Card>
      <CardContent>
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          Hyperparameter Importance
        </Typography>
        <Box id={plotDomId} sx={{ height: graphHeight }} />
        <Box id={plotBackendDomId} sx={{ height: graphHeight }} />
      </CardContent>
    </Card>
  )
}

const plotParamImportance = (
  importances: ParamImportance[][],
  objectiveNames: string[],
  mode: string
) => {
  const layout: Partial<plotly.Layout> = {
    xaxis: {
      title: "Hyperparameter Importance",
    },
    yaxis: {
      title: "Hyperparameter",
      automargin: true,
    },
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 50,
    },
    barmode: "group",
    bargap: 0.15,
    bargroupgap: 0.1,
    uirevision: "true",
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  if (document.getElementById(plotDomId) === null) {
    return
  }
  const traces: Partial<plotly.PlotData>[] = importances.map(
    (importance, i) => {
      const reversed = [...importance].reverse()
      const importance_values = reversed.map((p) => p.importance)
      const param_names = reversed.map((p) => p.name)
      const param_hover_templates = reversed.map(
        (p) => `${p.name} (${p.distribution}): ${p.importance} <extra></extra>`
      )
      return {
        type: "bar",
        orientation: "h",
        name: objectiveNames[i],
        x: importance_values,
        y: param_names,
        text: importance_values.map((v) => String(v.toFixed(2))),
        textposition: "outside",
        hovertemplate: param_hover_templates,
      }
    }
  )
  plotly.react(plotDomId, traces, layout)
}
