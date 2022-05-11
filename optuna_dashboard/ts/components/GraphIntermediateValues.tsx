import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { Box, Grid, Typography, useTheme } from "@mui/material"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"

const plotDomId = "graph-intermediate-values"

export const GraphIntermediateValues: FC<{
  trials: Trial[]
}> = ({ trials = [] }) => {
  const theme = useTheme()
  useEffect(() => {
    plotIntermediateValue(trials, theme.palette.mode)
  }, [trials, theme.palette.mode])
  return (
    <Grid container direction="row">
      <Grid
        item
        xs={3}
        container
        direction="column"
        sx={{ paddingRight: theme.spacing(2) }}
      >
        <Typography variant="h6" sx={{ margin: "1em 0", fontWeight: 600 }}>
          Intermediate values
        </Typography>
      </Grid>
      <Grid item xs={9}>
        <Box id={plotDomId} sx={{ height: "450px" }} />
      </Grid>
    </Grid>
  )
}

const plotIntermediateValue = (trials: Trial[], mode: string) => {
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
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }
  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const filteredTrials = trials.filter(
    (t) =>
      t.state === "Complete" ||
      (t.state === "Pruned" && t.values && t.values.length > 0) ||
      t.state == "Running"
  )
  const plotData: Partial<plotly.PlotData>[] = filteredTrials.map((trial) => {
    const values = trial.intermediate_values.filter((iv) => iv.value !== "inf")
    return {
      x: values.map((iv) => iv.step),
      y: values.map((iv) => iv.value),
      mode: "lines+markers",
      type: "scatter",
      name:
        trial.state !== "Running"
          ? `trial #${trial.number}`
          : `trial #${trial.number} (running)`,
    }
  })
  plotly.react(plotDomId, plotData, layout)
}
