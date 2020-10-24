import * as plotly from "plotly.js-dist"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  Switch,
  Radio,
  RadioGroup,
} from "@material-ui/core"

const plotDomId = "graph-history"

export const GraphHistory: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const [xAxis, setXAxis] = useState<string>("number")
  const [logScale, setLogScale] = useState<boolean>(false)
  const [filterCompleteTrial, setFilterCompleteTrial] = useState<boolean>(false)
  const [filterPrunedTrial, setFilterPrunedTrial] = useState<boolean>(false)

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
        xAxis,
        logScale,
        filterCompleteTrial,
        filterPrunedTrial
      )
    }
  }, [study, logScale, xAxis, filterPrunedTrial, filterCompleteTrial])

  return (
    <Grid container direction="row">
      <Grid item xs={3}>
        <Grid container direction="column">
          <FormControl component="fieldset">
            <FormLabel component="legend">Log scale:</FormLabel>
            <Switch
              checked={logScale}
              onChange={handleLogScaleChange}
              value="enable"
            />
          </FormControl>
          <FormControl component="fieldset">
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
          <FormControl component="fieldset">
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
  xAxis: string,
  logScale: boolean,
  filterCompleteTrial: boolean,
  filterPrunedTrial: boolean
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
  }

  let filteredTrials = study.trials.filter(
    (t) => t.state === "Complete" || t.state === "Pruned"
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
  let trialsForLinePlot: Trial[] = []
  let currentBest: number | null = null
  filteredTrials.forEach((item) => {
    if (currentBest === null) {
      currentBest = item.value!
      trialsForLinePlot.push(item)
    } else if (study.direction === "maximize" && item.value! > currentBest) {
      currentBest = item.value!
      trialsForLinePlot.push(item)
    } else if (study.direction === "minimize" && item.value! < currentBest) {
      currentBest = item.value!
      trialsForLinePlot.push(item)
    }
  })

  const getAxisX = (trial: Trial): number | Date => {
    return xAxis === "number"
      ? trial.number
      : xAxis === "datetime_start"
      ? trial.datetime_start
      : trial.datetime_complete!
  }

  let xForLinePlot = trialsForLinePlot.map(getAxisX)
  xForLinePlot.push(getAxisX(filteredTrials[filteredTrials.length - 1]))
  let yForLinePlot = trialsForLinePlot.map((t: Trial): number => t.value!)
  yForLinePlot.push(yForLinePlot[yForLinePlot.length - 1])

  const plotData: Partial<plotly.PlotData>[] = [
    {
      x: filteredTrials.map(getAxisX),
      y: filteredTrials.map((t: Trial): number => t.value!),
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
