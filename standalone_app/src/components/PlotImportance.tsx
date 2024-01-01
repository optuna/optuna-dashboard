import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useState } from "react"
import { Typography, useTheme, Box, Card, CardContent } from "@mui/material"
import init, { wasm_fanova_calculate } from "optuna"

import { plotlyDarkTemplate } from "../PlotlyDarkMode"
const plotDomId = "graph-hyperparameter-importances"

export const PlotImportance: FC<{ study: Study }> = ({ study }) => {
  const theme = useTheme()
  const nObjectives = study.directions.length
  const objectiveNames: string[] = study.directions.map(
    (d, i) => `Objective ${i}`
  )
  const [importance, setImportance] = useState<ParamImportance[][]>([])

  useEffect(() => {
    async function run_wasm() {
      await init()

      const x: ParamImportance[][] = study.directions.map((d, objectiveId) => {
        const filteredTrials = study.trials.filter((t) =>
          filterFunc(t, objectiveId)
        )
        if (filteredTrials.length === 0) {
          return study.union_search_space.map((s) => {
            return {
              name: s.name,
              importance: 0.5,
            }
          })
        }

        const features = study.intersection_search_space.map((s) =>
          filteredTrials
            .map((t) => t.params.find((p) => p.name === s.name) as TrialParam)
            .map((p) => p.param_internal_value)
        )
        const values = filteredTrials.map(
          (t) => t.values?.[objectiveId] as number
        )
        // TODO: handle errors thrown by wasm_fanova_calculate
        const importance = wasm_fanova_calculate(features, values)
        return study.intersection_search_space.map((s, i) => ({
          name: s.name,
          importance: importance[i],
        }))
      })
      setImportance(x)
    }

    run_wasm()
  }, [])

  useEffect(() => {
    if (importance.length > 0) {
      plotParamImportancesBeta(importance, objectiveNames, theme.palette.mode)
    }
  }, [nObjectives, importance, theme.palette.mode])

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
      >
        Hyperparameter Importance
      </Typography>
      <Box id={plotDomId} sx={{ height: "450px" }} />
    </Box>
  )
}

const filterFunc = (trial: Trial, objectiveId: number): boolean => {
  if (trial.state !== "Complete" && trial.state !== "Pruned") {
    return false
  }
  if (trial.values === undefined) {
    return false
  }
  return (
    trial.values.length > objectiveId &&
    trial.values[objectiveId] !== "inf" &&
    trial.values[objectiveId] !== "-inf"
  )
}

const plotParamImportancesBeta = (
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
