import * as plotly from "plotly.js-dist-min"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Box,
  Checkbox,
  FormControl,
  FormLabel,
  FormControlLabel,
  Grid,
  Typography,
  useTheme,
  CardContent,
  Card,
} from "@mui/material"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"

const plotDomId = "graph-intermediate-values"

export const GraphIntermediateValuesBeta: FC<{
  trials: Trial[]
  includePruned: boolean
  logScale: boolean
}> = ({ trials, includePruned, logScale }) => {
  const theme = useTheme()

  useEffect(() => {
    plotIntermediateValue(
      trials,
      theme.palette.mode,
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

export const GraphIntermediateValues: FC<{
  trials: Trial[]
}> = ({ trials = [] }) => {
  const theme = useTheme()
  const [filterCompleteTrial, setFilterCompleteTrial] = useState<boolean>(false)
  const [filterPrunedTrial, setFilterPrunedTrial] = useState<boolean>(false)

  useEffect(() => {
    plotIntermediateValue(
      trials,
      theme.palette.mode,
      filterCompleteTrial,
      filterPrunedTrial,
      false
    )
  }, [trials, theme.palette.mode, filterCompleteTrial, filterPrunedTrial])

  const handleFilterCompleteChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setFilterCompleteTrial(!filterCompleteTrial)
  }
  const handleFilterPrunedChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setFilterPrunedTrial(!filterPrunedTrial)
  }
  return (
    <Grid container direction="row">
      <Grid
        item
        xs={3}
        container
        direction="column"
        sx={{ paddingRight: theme.spacing(2) }}
      >
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          Intermediate values
        </Typography>
        <FormControl
          component="fieldset"
          sx={{ marginBottom: theme.spacing(2) }}
        >
          <FormLabel component="legend">Filter state:</FormLabel>
          <FormControlLabel
            control={
              <Checkbox
                checked={!filterCompleteTrial}
                onChange={handleFilterCompleteChange}
              />
            }
            label="Complete"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!filterPrunedTrial}
                onChange={handleFilterPrunedChange}
              />
            }
            label="Pruned"
          />
        </FormControl>
      </Grid>
      <Grid item xs={9}>
        <Box id={plotDomId} sx={{ height: "450px" }} />
      </Grid>
    </Grid>
  )
}

const plotIntermediateValue = (
  trials: Trial[],
  mode: string,
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
    uirevision: 'true',
    template: mode === "dark" ? plotlyDarkTemplate : {},
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
      t.state == "Running"
  )
  const plotData: Partial<plotly.PlotData>[] = filteredTrials.map((trial) => {
    const values = trial.intermediate_values.filter(
      (iv) => iv.value !== "inf" && iv.value !== "-inf" && iv.value !== "nan"
    )
    return {
      x: values.map((iv) => iv.step),
      y: values.map((iv) => iv.value),
      marker: { maxdisplayed: 10 },
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
