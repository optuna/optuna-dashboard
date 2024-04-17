import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { Box, Typography, useTheme, CardContent, Card } from "@mui/material"
import { usePlotlyColorTheme } from "../state"
import { Trial } from "ts/types"

const plotDomId = "graph-intermediate-values"

export const GraphIntermediateValues: FC<{
  trials: Trial[]
  includePruned: boolean
  logScale: boolean
}> = ({ trials, includePruned, logScale }) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

  useEffect(() => {
    plotIntermediateValue(trials, colorTheme, false, !includePruned, logScale)
  }, [trials, colorTheme, includePruned, logScale])

  return (
    <Card>
      <CardContent>
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          Intermediate values
        </Typography>
        <Box component="div" id={plotDomId} sx={{ height: "450px" }} />
      </CardContent>
    </Card>
  )
}

const plotIntermediateValue = (
  trials: Trial[],
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
