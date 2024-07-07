import { Box, Typography, useTheme } from "@mui/material"
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { FC, useEffect } from "react"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"

const plotDomId = "graph-hyperparameter-importances"

export const PlotImportance: FC<{
  study: Optuna.Study | null
  importance?: Optuna.ParamImportance[][]
  graphHeight?: string
}> = ({ study = null, importance, graphHeight = "450px" }) => {
  const theme = useTheme()
  const objectiveNames: string[] = study
    ? study.directions.map((_d, i) => `Objective ${i}`)
    : []

  useEffect(() => {
    if (study !== null && importance !== undefined && importance.length > 0) {
      plotParamImportancesBeta(importance, objectiveNames, theme.palette.mode)
    }
  }, [study, objectiveNames, importance, theme.palette.mode])

  return (
    <>
      <Typography
        variant="h6"
        sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
      >
        Hyperparameter Importance
      </Typography>
      <Box id={plotDomId} sx={{ height: graphHeight }} />
    </>
  )
}

const plotParamImportancesBeta = (
  importances: Optuna.ParamImportance[][],
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
        (p) => `${p.name}): ${p.importance} <extra></extra>`
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
