import * as plotly from "plotly.js-dist-min"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  FormControlLabel,
  Typography,
  Radio,
  RadioGroup,
  useTheme,
} from "@mui/material"

import { plotlyDarkTemplate } from "./PlotlyDarkMode"
import {
  useFilteredTrials,
  Target,
  useObjectiveAndUserAttrTargets,
} from "../trialFilter"

const plotDomId = "graph-histories"

interface HistoryPlotInfo {
  study_name: string
  trials: Trial[]
  directions: StudyDirection[]
}

export const GraphHistories: FC<{
  studies: StudyDetail[]
  logScale: boolean
  includePruned: boolean
}> = ({ studies, logScale, includePruned }) => {
  if (studies.length == 0 || !studies.every((s) => s)) {
    return null
  }

  const theme = useTheme()
  const [xAxis, setXAxis] = useState<
    "number" | "datetime_start" | "datetime_complete"
  >("number")
  const [targets, selected, setTarget] = useObjectiveAndUserAttrTargets(
    studies[0]
  )

  const historyPlotInfos = studies.map((study) => {
    const trials = useFilteredTrials(study, [selected], false, !includePruned)
    const h: HistoryPlotInfo = {
      study_name: study.name,
      trials: trials,
      directions: study.directions,
    }
    return h
  })

  useEffect(() => {
    if (studies !== null) {
      plotHistories(historyPlotInfos, xAxis, logScale, theme.palette.mode)
    }
  }, [historyPlotInfos, selected, logScale, xAxis, theme.palette.mode])

  const handleXAxisChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "number") {
      setXAxis("number")
    } else if (e.target.value === "datetime_start") {
      setXAxis("datetime_start")
    } else if (e.target.value === "datetime_complete") {
      setXAxis("datetime_complete")
    }
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
          History
        </Typography>
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
  )
}

const plotHistories = (
  historyPlotInfos: HistoryPlotInfo[],
  xAxis: "number" | "datetime_start" | "datetime_complete",
  logScale: boolean,
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

  const getAxisX = (trial: Trial): number => {
    return trial.number
  }

  const getTargetValue = (trial: Trial): number | null => {
    if (trial.values === undefined) {
      return null
    }
    const value = trial.values[0]
    if (value === "inf" || value === "-inf") {
      return null
    }
    return value
  }

  const minimum = (arr) => {
    const r: number[] = []
    let t = Number.MAX_VALUE
    arr.forEach((v) => {
      t = Math.min(t, v)
      r.push(t)
    })
    return r
  }

  const maximum = (arr) => {
    const r: number[] = []
    let t = Number.MIN_VALUE
    arr.forEach((v) => {
      t = Math.max(t, v)
      r.push(t)
    })
    return r
  }

  const plotData: Partial<plotly.PlotData>[] = []
  historyPlotInfos.forEach((h) => {
    const x = h.trials.map(getAxisX)
    const y = h.trials.map(getTargetValue)
    plotData.push({
      x: x,
      y: y,
      name: `Objective Value of ${h.study_name}`,
      mode: "markers",
      type: "scatter",
    })

    plotData.push({
      x: x,
      y: h.directions[0] === "minimize" ? minimum(y) : maximum(y),
      name: `Best Value of ${h.study_name}`,
      mode: "lines",
      type: "scatter",
    })
  })

  plotly.react(plotDomId, plotData, layout)
}
