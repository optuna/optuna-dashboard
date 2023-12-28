import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { Box, Typography, useTheme, CardContent, Card } from "@mui/material"
import { getColorTemplate } from "./PlotlyColorTemplates"
import { plotlyColorTheme } from "../state"
import { useRecoilValue } from "recoil"

const plotDomId = "graph-intermediate-values"

export const GraphIntermediateValues: FC<{
  trials: Trial[]
  includePruned: boolean
  logScale: boolean
}> = ({ trials, includePruned, logScale }) => {
  const theme = useTheme()
  const colorTheme = useRecoilValue<PlotlyColorTheme>(plotlyColorTheme)

  useEffect(() => {
    plotIntermediateValue(
      trials,
      theme.palette.mode,
      colorTheme,
      false,
      !includePruned,
      logScale
    )
  }, [trials, theme.palette.mode, false, includePruned, logScale])

  return (
    <Card>
      <CardContent>
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          Intermediate values
        </Typography>
        <Box id={plotDomId} sx={{ height: "450px" }} />
      </CardContent>
    </Card>
  )
}

const plotIntermediateValue = (
  trials: Trial[],
  mode: string,
  colorTheme: PlotlyColorTheme,
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
    template: getColorTemplate(mode, colorTheme),
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
    const values = trial.intermediate_values.filter(
      (iv) => iv.value !== "inf" && iv.value !== "-inf" && iv.value !== "nan"
    )
    const isFeasible = trial.constraints.every((c) => c <= 0)
    return {
      x: values.map((iv) => iv.step),
      y: values.map((iv) => iv.value),
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
