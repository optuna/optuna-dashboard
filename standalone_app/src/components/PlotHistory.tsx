import * as plotly from "plotly.js-dist-min"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Card,
  CardContent,
  Grid,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Switch,
  Select,
  Radio,
  RadioGroup,
  Typography,
  SelectChangeEvent,
  useTheme,
} from "@mui/material"
import { plotlyDarkTemplate } from "../PlotlyDarkMode"

const plotDomId = "plot-history"

export const PlotHistory: FC<{
  study: Study | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [xAxis, setXAxis] = useState<string>("number")
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const [logScale, setLogScale] = useState<boolean>(false)
  const [filterCompleteTrial, setFilterCompleteTrial] = useState<boolean>(false)
  const [filterPrunedTrial, setFilterPrunedTrial] = useState<boolean>(false)

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setObjectiveId(event.target.value as number)
  }

  const handleXAxisChange = (e: ChangeEvent<HTMLInputElement>) => {
    setXAxis(e.target.value)
  }

  const handleLogScaleChange = () => {
    setLogScale(!logScale)
  }

  const handleFilterCompleteChange = () => {
    setFilterCompleteTrial(!filterCompleteTrial)
  }

  const handleFilterPrunedChange = () => {
    setFilterPrunedTrial(!filterPrunedTrial)
  }

  useEffect(() => {
    if (study !== null) {
      plotHistory(
        study,
        objectiveId,
        xAxis,
        logScale,
        filterCompleteTrial,
        filterPrunedTrial,
        theme.palette.mode
      )
    }
  }, [
    study,
    objectiveId,
    logScale,
    xAxis,
    filterPrunedTrial,
    filterCompleteTrial,
    theme.palette.mode,
  ])

  return (
    <Card>
      <CardContent>
        <Grid container direction="row">
          <Grid
            item
            xs={3}
            container
            direction="column"
            sx={{ paddingRight: theme.spacing(2) }}
          >
            <Typography variant="h6" sx={{ margin: "1em 0", fontWeight: 600 }}>
              History
            </Typography>
            {study !== null && study.directions.length !== 1 ? (
              <FormControl
                component="fieldset"
                sx={{ marginBottom: theme.spacing(2) }}
              >
                <FormLabel component="legend">Objective ID:</FormLabel>
                <Select value={objectiveId} onChange={handleObjectiveChange}>
                  {study.directions.map((d, i) => (
                    <MenuItem value={i} key={i}>
                      {i}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
            <FormControl
              component="fieldset"
              sx={{ marginBottom: theme.spacing(2) }}
            >
              <FormLabel component="legend">Log y scale:</FormLabel>
              <Switch
                checked={logScale}
                onChange={handleLogScaleChange}
                value="enable"
              />
            </FormControl>
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
            <FormControl
              component="fieldset"
              sx={{ marginBottom: theme.spacing(2) }}
            >
              <FormLabel component="legend">X-axis:</FormLabel>
              <RadioGroup
                aria-label="gender"
                name="gender1"
                value={xAxis}
                onChange={handleXAxisChange}
              >
                <FormControlLabel
                  value="number"
                  control={<Radio />}
                  label="Number"
                />
                <FormControlLabel
                  value="datetime_start"
                  control={<Radio />}
                  label="Datetime start"
                />
                <FormControlLabel
                  value="datetime_complete"
                  control={<Radio />}
                  label="Datetime complete"
                />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={9}>
            <div id={plotDomId} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
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

const plotHistory = (
  study: Study,
  objectiveId: number,
  xAxis: string,
  logScale: boolean,
  filterCompleteTrial: boolean,
  filterPrunedTrial: boolean,
  mode: string
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
      title: xAxis === "number" ? "Trial" : "Time",
      type: xAxis === "number" ? "linear" : "date",
    },
    showlegend: true,
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  let filteredTrials = study.trials.filter((t) => filterFunc(t, objectiveId))
  if (filterCompleteTrial) {
    filteredTrials = filteredTrials.filter((t) => t.state !== "Complete")
  }
  if (filterPrunedTrial) {
    filteredTrials = filteredTrials.filter((t) => t.state !== "Pruned")
  }
  if (filteredTrials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const getAxisX = (trial: Trial): number | Date => {
    return xAxis === "number"
      ? trial.number
      : xAxis === "datetime_start"
      ? trial.datetime_start ?? new Date()
      : trial.datetime_complete ?? new Date()
  }

  const getValue = (trial: Trial, objectiveId: number): number | null => {
    if (
      objectiveId === null ||
      trial.values === undefined ||
      trial.values.length <= objectiveId
    ) {
      return null
    }
    const value = trial.values[objectiveId]
    if (value === "inf" || value === "-inf") {
      return null
    }
    return value
  }

  const xForLinePlot: (number | Date)[] = []
  const yForLinePlot: number[] = []
  let currentBest: number | null = null
  for (let i = 0; i < filteredTrials.length; i++) {
    const t = filteredTrials[i]
    const v = getValue(t, objectiveId) as number
    if (currentBest === null) {
      currentBest = v
      xForLinePlot.push(getAxisX(t))
      yForLinePlot.push(v)
    } else if (
      study.directions[objectiveId] === "maximize" &&
      v > currentBest
    ) {
      const p = filteredTrials[i - 1]
      if (!xForLinePlot.includes(getAxisX(p))) {
        xForLinePlot.push(getAxisX(p))
        yForLinePlot.push(currentBest)
      }
      currentBest = v
      xForLinePlot.push(getAxisX(t))
      yForLinePlot.push(v)
    } else if (
      study.directions[objectiveId] === "minimize" &&
      v < currentBest
    ) {
      const p = filteredTrials[i - 1]
      if (!xForLinePlot.includes(getAxisX(p))) {
        xForLinePlot.push(getAxisX(p))
        yForLinePlot.push(currentBest)
      }
      currentBest = v
      xForLinePlot.push(getAxisX(t))
      yForLinePlot.push(v)
    }
  }
  xForLinePlot.push(getAxisX(filteredTrials[filteredTrials.length - 1]))
  yForLinePlot.push(yForLinePlot[yForLinePlot.length - 1])

  const plotData: Partial<plotly.PlotData>[] = [
    {
      x: filteredTrials.map(getAxisX),
      y: filteredTrials.map(
        (t: Trial): number => getValue(t, objectiveId) as number
      ),
      name: "Objective Value",
      mode: "markers",
      type: "scatter",
    },
    {
      x: xForLinePlot,
      y: yForLinePlot,
      name: "Best Value",
      mode: "lines",
      type: "scatter",
    },
  ]
  plotly.react(plotDomId, plotData, layout)
}
