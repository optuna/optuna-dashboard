import * as plotly from "plotly.js-dist-min"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  FormControlLabel,
  MenuItem,
  Typography,
  SelectChangeEvent,
  Select,
  Radio,
  RadioGroup,
  useTheme,
} from "@mui/material"

import { plotlyDarkTemplate } from "./PlotlyDarkMode"
import {
  getFilteredTrials,
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
  const theme = useTheme()
  const [xAxis, setXAxis] = useState<
    "number" | "datetime_start" | "datetime_complete"
  >("number")
  const [targets, selected, setTarget] = useObjectiveAndUserAttrTargets(
    studies[0]
  )

  const historyPlotInfos = studies.map((study) => {
    const trials = getFilteredTrials(study, [selected], false, !includePruned)
    const h: HistoryPlotInfo = {
      study_name: study.name,
      trials: trials,
      directions: study.directions,
    }
    return h
  })

  useEffect(() => {
    if (studies !== null) {
      plotHistories(
        historyPlotInfos,
        studies[0].directions,
        selected,
        xAxis,
        logScale,
        theme.palette.mode
      )
    }
  }, [studies, selected, logScale, xAxis, theme.palette.mode])

  const handleObjectiveChange = (event: SelectChangeEvent<string>) => {
    setTarget(event.target.value)
  }

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
        {targets.length >= 2 ? (
          <FormControl
            component="fieldset"
            sx={{ marginBottom: theme.spacing(2) }}
          >
            <FormLabel component="legend">y Axis</FormLabel>
            <Select
              value={selected.identifier()}
              onChange={handleObjectiveChange}
            >
              {targets.map((t, i) => (
                <MenuItem value={t.identifier()} key={i}>
                  {t.toLabel(studies[0].objective_names)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
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
  directions: StudyDirection[],
  target: Target,
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

  const getAxisX = (trial: Trial): number | Date => {
    return xAxis === "number"
      ? trial.number
      : xAxis === "datetime_start"
      ? trial.datetime_start!
      : trial.datetime_complete!
  }

  const plotData: Partial<plotly.PlotData>[] = []
  historyPlotInfos.forEach((h) => {
    const x = h.trials.map(getAxisX)
    const y = h.trials.map(
      (t: Trial): number => target.getTargetValue(t) as number
    )
    plotData.push({
      x: x,
      y: y,
      name: `Objective Value of ${h.study_name}`,
      mode: "markers",
      type: "scatter",
    })

    const objectiveId = target.getObjectiveId()
    if (objectiveId !== null) {
      const xForLinePlot: (number | Date)[] = []
      const yForLinePlot: number[] = []
      let currentBest: number | null = null
      for (let i = 0; i < h.trials.length; i++) {
        const t = h.trials[i]
        const value = target.getTargetValue(t) as number
        if (value === null) {
          continue
        } else if (currentBest === null) {
          currentBest = value
          xForLinePlot.push(getAxisX(t))
          yForLinePlot.push(value)
        } else if (
          directions[objectiveId] === "maximize" &&
          value > currentBest
        ) {
          const p = h.trials[i - 1]
          if (!xForLinePlot.includes(getAxisX(p))) {
            xForLinePlot.push(getAxisX(p))
            yForLinePlot.push(currentBest)
          }
          currentBest = value
          xForLinePlot.push(getAxisX(t))
          yForLinePlot.push(value)
        } else if (
          directions[objectiveId] === "minimize" &&
          value < currentBest
        ) {
          const p = h.trials[i - 1]
          if (!xForLinePlot.includes(getAxisX(p))) {
            xForLinePlot.push(getAxisX(p))
            yForLinePlot.push(currentBest)
          }
          currentBest = value
          xForLinePlot.push(getAxisX(t))
          yForLinePlot.push(value)
        }
      }
      if (h.trials.length !== 0) {
        xForLinePlot.push(getAxisX(h.trials[h.trials.length - 1]))
        yForLinePlot.push(yForLinePlot[yForLinePlot.length - 1])
      }
      plotData.push({
        x: xForLinePlot,
        y: yForLinePlot,
        name: `Best Value of ${h.study_name}`,
        mode: "lines",
        type: "scatter",
      })
    }
  })

  plotly.react(plotDomId, plotData, layout)
}
