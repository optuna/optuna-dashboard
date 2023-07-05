import * as plotly from "plotly.js-dist-min"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  FormControlLabel,
  MenuItem,
  Select,
  Radio,
  RadioGroup,
  Typography,
  SelectChangeEvent,
  useTheme,
  Slider,
} from "@mui/material"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"
import {
  useFilteredTrials,
  useFilteredTrialsFromStudies,
  Target,
  useObjectiveAndUserAttrTargets,
} from "../trialFilter"

const plotDomId = "graph-history"

interface HistoryPlotInfo {
  study_name: string
  trials: Trial[]
  directions: StudyDirection[]
  objective_names?: string[]
}

export const GraphHistory: FC<{
  study: StudyDetail | null
  logScale: boolean
  includePruned: boolean
}> = ({ study, logScale, includePruned }) => {
  const theme = useTheme()
  const [xAxis, setXAxis] = useState<
    "number" | "datetime_start" | "datetime_complete"
  >("number")
  const [markerSize, setMarkerSize] = useState<number>(5)

  const [targets, selected, setTarget] = useObjectiveAndUserAttrTargets(study)
  const trials = useFilteredTrials(study, [selected], includePruned)

  useEffect(() => {
    if (study !== null) {
      plotHistory(
        trials,
        study.directions,
        selected,
        xAxis,
        logScale,
        theme.palette.mode,
        study?.objective_names,
        markerSize
      )
    }
  }, [
    trials,
    study?.directions,
    selected,
    logScale,
    xAxis,
    theme.palette.mode,
    study?.objective_names,
    markerSize,
  ])

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
                  {t.toLabel(study?.objective_names)}
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
        <FormControl>
          <FormLabel component="legend">Marker size:</FormLabel>
          <Slider
            defaultValue={5}
            marks={true}
            min={1}
            max={20}
            step={1}
            onChange={(e) => {
              // @ts-ignore
              setMarkerSize(e.target.value as number)
            }}
          />
        </FormControl>
      </Grid>
      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

export const GraphHistoryMultiStudies: FC<{
  studies: StudyDetail[]
  logScale: boolean
  includePruned: boolean
}> = ({ studies, logScale, includePruned }) => {
  const theme = useTheme()
  const [xAxis, setXAxis] = useState<
    "number" | "datetime_start" | "datetime_complete"
  >("number")
  const [markerSize, setMarkerSize] = useState<number>(5)

  // TODO(umezawa): Prepare targets with all studies.
  const [targets, selected, setTarget] = useObjectiveAndUserAttrTargets(
    studies.length !== 0 ? studies[0] : null
  )

  const trials = useFilteredTrialsFromStudies(
    studies,
    [selected],
    !includePruned
  )
  const historyPlotInfos = studies.map((study, index) => {
    const h: HistoryPlotInfo = {
      study_name: study?.name,
      trials: trials[index],
      directions: study?.directions,
      objective_names: study?.objective_names,
    }
    return h
  })

  useEffect(() => {
    plotHistoryMultiStudies(
      historyPlotInfos,
      selected,
      xAxis,
      logScale,
      theme.palette.mode,
      markerSize
    )
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
        {studies[0] !== null && targets.length >= 2 ? (
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
        <FormControl>
          <FormLabel component="legend">Marker size:</FormLabel>
          <Slider
            defaultValue={5}
            marks={true}
            min={1}
            max={20}
            step={1}
            onChange={(e) => {
              // @ts-ignore
              setMarkerSize(e.target.value as number)
            }}
          />
        </FormControl>
      </Grid>
      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

const plotHistory = (
  trials: Trial[],
  directions: StudyDirection[],
  target: Target,
  xAxis: "number" | "datetime_start" | "datetime_complete",
  logScale: boolean,
  mode: string,
  objectiveNames?: string[],
  markerSize: number
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
      title: target.toLabel(objectiveNames),
      type: logScale ? "log" : "linear",
    },
    xaxis: {
      title: xAxis === "number" ? "Trial" : "Time",
      type: xAxis === "number" ? "linear" : "date",
    },
    showlegend: true,
    uirevision: "true",
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }
  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const getAxisX = (trial: Trial): number | Date => {
    return xAxis === "number"
      ? trial.number
      : xAxis === "datetime_start"
      ? trial.datetime_start!
      : trial.datetime_complete!
  }

  const plotData: Partial<plotly.PlotData>[] = [
    {
      x: trials.map(getAxisX),
      y: trials.map((t: Trial): number => target.getTargetValue(t) as number),
      name: target.toLabel(objectiveNames),
      marker: {
        size: markerSize,
      },
      mode: "markers",
      type: "scatter",
    },
  ]

  const objectiveId = target.getObjectiveId()
  if (objectiveId !== null) {
    const xForLinePlot: (number | Date)[] = []
    const yForLinePlot: number[] = []
    let currentBest: number | null = null
    for (let i = 0; i < trials.length; i++) {
      const t = trials[i]
      if (currentBest === null) {
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      } else if (
        directions[objectiveId] === "maximize" &&
        t.values![objectiveId] > currentBest
      ) {
        const p = trials[i - 1]
        if (!xForLinePlot.includes(getAxisX(p))) {
          xForLinePlot.push(getAxisX(p))
          yForLinePlot.push(currentBest)
        }
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      } else if (
        directions[objectiveId] === "minimize" &&
        t.values![objectiveId] < currentBest
      ) {
        const p = trials[i - 1]
        if (!xForLinePlot.includes(getAxisX(p))) {
          xForLinePlot.push(getAxisX(p))
          yForLinePlot.push(currentBest)
        }
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      }
    }
    xForLinePlot.push(getAxisX(trials[trials.length - 1]))
    yForLinePlot.push(yForLinePlot[yForLinePlot.length - 1])
    plotData.push({
      x: xForLinePlot,
      y: yForLinePlot,
      name: "Best Value",
      mode: "lines",
      type: "scatter",
    })
  }
  plotly.react(plotDomId, plotData, layout)
}

const plotHistoryMultiStudies = (
  historyPlotInfos: HistoryPlotInfo[],
  target: Target,
  xAxis: "number" | "datetime_start" | "datetime_complete",
  logScale: boolean,
  mode: string,
  markerSize: number
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }
  if (historyPlotInfos.length === 0) {
    plotly.react(plotDomId, [], {
      template: mode === "dark" ? plotlyDarkTemplate : {},
    })
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
      title: target.toLabel(historyPlotInfos[0].objective_names),
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
      name: `${target.toLabel(h.objective_names)} of ${h.study_name}`,
      marker: {
        size: markerSize,
      },
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
          h.directions[objectiveId] === "maximize" &&
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
          h.directions[objectiveId] === "minimize" &&
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
