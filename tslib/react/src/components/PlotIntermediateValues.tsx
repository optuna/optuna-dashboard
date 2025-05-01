import { Box, Typography, useTheme } from "@mui/material"
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { FC, useEffect } from "react"
import { DarkColorTemplates } from "./PlotlyColorTemplates"

const plotDomId = "graph-intermediate-values"

export const PlotIntermediateValues: FC<{
  trials: Optuna.Trial[]
  includePruned: boolean
  logScale: boolean
  colorTheme?: Partial<Plotly.Template>
}> = ({ trials, includePruned, logScale, colorTheme }) => {
  const theme = useTheme()
  const colorThemeUsed =
    colorTheme ??
    (theme.palette.mode === "dark" ? DarkColorTemplates.default : {})

  useEffect(() => {
    plotIntermediateValue(
      trials,
      colorThemeUsed,
      false,
      !includePruned,
      logScale
    )
  }, [trials, colorThemeUsed, includePruned, logScale])

  return (
    <>
      <Typography
        variant="h6"
        sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
      >
        Intermediate values
      </Typography>
      <Box id={plotDomId} sx={{ height: "450px" }} />
    </>
  )
}

const plotIntermediateValue = (
  trials: Optuna.Trial[],
  colorTheme: Partial<Plotly.Template>,
  filterCompleteTrial: boolean,
  filterPrunedTrial: boolean,
  logScale: boolean
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 0,
    },
    yaxis: {
      title: "Objective Value",
      type: logScale ? "log" : "linear",
    },
    xaxis: {
      title: "Step",
      type: "linear",
    },
    uirevision: "true",
    template: colorTheme,
    legend: {
      x: 1.0,
      y: 0.95,
    },
  }
  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const filteredTrials = trials.filter(
    (t) =>
      (!filterCompleteTrial && t.state === "Complete") ||
      (!filterPrunedTrial &&
        t.state === "Pruned" &&
        t.values &&
        t.values.length > 0) ||
      t.state === "Running"
  )

  const plotData: Partial<plotly.PlotData>[] = filteredTrials.map((trial) => {
    const isFeasible = trial.constraints.every((c) => c <= 0)
    return {
      x: trial.intermediate_values.map((iv) => iv.step),
      y: trial.intermediate_values.map((iv) => iv.value),
      marker: { maxdisplayed: 10 },
      mode: "lines+markers",
      type: "scatter",
      name: `trial #${trial.number} ${
        trial.state === "Running"
          ? "(running)"
          : !isFeasible
            ? "(infeasible)"
            : ""
      }`,
      ...(!isFeasible && { line: { color: "#CCCCCC" } }),
    }
  })
  plotly.react(plotDomId, plotData, layout)
}
