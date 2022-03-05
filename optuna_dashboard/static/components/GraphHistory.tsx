import * as plotly from "plotly.js-dist"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
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
import {plotlyDarkTemplate} from "./PlotlyDarkMode";

const plotDomId = "graph-history"

export const GraphHistory: FC<{
  study: StudyDetail | null
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

  const handleLogScaleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setLogScale(!logScale)
  }

  const handleFilterCompleteChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setFilterCompleteTrial(!filterCompleteTrial)
  }

  const handleFilterPrunedChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
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
    <Grid container direction="row">
      <Grid item xs={3}>
        <Grid container direction="column">
          <Typography variant="h6" sx={{ margin: "1em 0" }}>
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
      </Grid>
      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

const plotHistory = (
  study: StudyDetail,
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
      type: logScale ? "log" : "linear",
    },
    xaxis: {
      type: xAxis === "number" ? "linear" : "date",
    },
    showlegend: false,
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  let filteredTrials = study.trials.filter(
    (t) =>
      t.state === "Complete" ||
      (t.state === "Pruned" && t.values && t.values.length > 0)
  )
  if (filterCompleteTrial) {
    filteredTrials = filteredTrials.filter((t) => t.state !== "Complete")
  }
  if (filterPrunedTrial) {
    filteredTrials = filteredTrials.filter((t) => t.state !== "Pruned")
  }
  if (filteredTrials.length === 0) {
    plotly.react(plotDomId, [])
    return
  }
  const trialsForLinePlot: Trial[] = []
  let currentBest: number | null = null
  filteredTrials.forEach((item) => {
    if (currentBest === null) {
      currentBest = item.values![objectiveId]
      trialsForLinePlot.push(item)
    } else if (
      study.directions[objectiveId] === "maximize" &&
      item.values![objectiveId] > currentBest
    ) {
      currentBest = item.values![objectiveId]
      trialsForLinePlot.push(item)
    } else if (
      study.directions[objectiveId] === "minimize" &&
      item.values![objectiveId] < currentBest
    ) {
      currentBest = item.values![objectiveId]
      trialsForLinePlot.push(item)
    }
  })

  const getAxisX = (trial: Trial): number | Date => {
    return xAxis === "number"
      ? trial.number
      : xAxis === "datetime_start"
      ? trial.datetime_start!
      : trial.datetime_complete!
  }

  const xForLinePlot = trialsForLinePlot.map(getAxisX)
  xForLinePlot.push(getAxisX(filteredTrials[filteredTrials.length - 1]))
  const yForLinePlot = trialsForLinePlot.map(
    (t: Trial): number => t.values![objectiveId]
  )
  yForLinePlot.push(yForLinePlot[yForLinePlot.length - 1])

  const plotData: Partial<plotly.PlotData>[] = [
    {
      x: filteredTrials.map(getAxisX),
      y: filteredTrials.map((t: Trial): number => t.values![objectiveId]),
      mode: "markers",
      type: "scatter",
    },
    {
      x: xForLinePlot,
      y: yForLinePlot,
      mode: "lines",
      type: "scatter",
    },
  ]
  plotly.react(plotDomId, plotData, layout)
}
