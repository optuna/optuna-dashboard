import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { ChangeEvent, FC, useEffect, useState, useMemo } from "react"

import { useGraphComponentState } from "../hooks/useGraphComponentState"
import { Target, useFilteredTrialsFromStudies } from "../utils/trialFilter"

const plotDomId = "plot-history"

interface HistoryPlotInfo {
  study_name: string
  trials: Optuna.Trial[]
  directions: Optuna.StudyDirection[]
  metric_names?: string[]
}

export const PlotHistory: FC<{
  studies: Optuna.Study[]
}> = ({ studies }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const theme = useTheme()

  const [xAxis, setXAxis] = useState<
    "number" | "datetime_start" | "datetime_complete"
  >("number")
  
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const [logScale, setLogScale] = useState<boolean>(false)
  const [filterPrunedTrial, setFilterPrunedTrial] = useState<boolean>(false)
  const [markerSize, setMarkerSize] = useState<number>(5)

  const target = useMemo<Target>(
    () => new Target("objective", objectiveId),
    [objectiveId]
  )
  const trials = useFilteredTrialsFromStudies(
    studies,
    [target],
    filterPrunedTrial,
  )
  const historyPlotInfos = studies.map((study, index) => {
    const h: HistoryPlotInfo = {
      study_name: study.name,
      trials: trials[index],
      directions: study.directions,
      metric_names: study.metric_names,
    }
    return h
  })

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setObjectiveId(event.target.value as number)
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

  const handleLogScaleChange = () => {
    setLogScale(!logScale)
  }

  const handleFilterPrunedChange = () => {
    setFilterPrunedTrial(!filterPrunedTrial)
  }

  useEffect(() => {
    if (graphComponentState !== "componentWillMount") {
      plotHistory(
        historyPlotInfos,
        target,
        xAxis,
        logScale,
        theme.palette.mode,
        colorTheme,

      )
    }
  }, [
    studies,
    target,
    logScale,
    xAxis,
    theme.palette.mode,
  ])

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
          History
        </Typography>
        {study !== null && study.directions.length !== 1 ? (
          <FormControl
            component="fieldset"
            sx={{ marginBottom: theme.spacing(2) }}
          >
            <FormLabel component="legend">Objective ID:</FormLabel>
            <Select value={objectiveId} onChange={handleObjectiveChange}>
              {study.directions.map((_d, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
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
  )
}

const plotHistory = (
  historyPlotInfos: HistoryPlotInfo[],
  target: Target,
  xAxis: "number" | "datetime_start" | "datetime_complete",
  logScale: boolean,
  mode: string,
  colorTheme: Partial<Plotly.Template>,
  markerSize: number
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }
  if (historyPlotInfos.length === 0) {
    plotly.react(plotDomId, [], {
      template: colorTheme,
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
    showlegend: historyPlotInfos.length === 1 ? false : true,
    template: colorTheme,
    legend: {
      x: 1.0,
      y: 0.95,
    },
  }

  const getAxisX = (trial: Optuna.Trial): number | Date => {
    return xAxis === "number"
      ? trial.number
      : xAxis === "datetime_start"
        ? trial.datetime_start ?? new Date()
        : trial.datetime_complete ?? new Date()
  }

  const plotData: Partial<plotly.PlotData>[] = []
  const infeasiblePlotData: Partial<plotly.PlotData>[] = []
  historyPlotInfos.forEach((h) => {
    const feasibleTrials: Optuna.Trial[] = []
    const infeasibleTrials: Optuna.Trial[] = []
    h.trials.forEach((t) => {
      if (t.constraints.every((c) => c <= 0)) {
        feasibleTrials.push(t)
      } else {
        infeasibleTrials.push(t)
      }
    })
    plotData.push({
      x: feasibleTrials.map(getAxisX),
      y: feasibleTrials.map(
        (t: Optuna.Trial): number => target.getTargetValue(t) as number
      ),
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
      for (let i = 0; i < feasibleTrials.length; i++) {
        const t = feasibleTrials[i]
        const value = target.getTargetValue(t) as number
        if (t.state !== "Complete") {
          continue
        } else if (currentBest === null) {
          currentBest = value
          xForLinePlot.push(getAxisX(t))
          yForLinePlot.push(value)
        } else if (
          h.directions[objectiveId] === "maximize" &&
          value > currentBest
        ) {
          const p = feasibleTrials[i - 1]
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
          const p = feasibleTrials[i - 1]
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
    infeasiblePlotData.push({
      x: infeasibleTrials.map(getAxisX),
      y: infeasibleTrials.map(
        (t: Optuna.Trial): number => target.getTargetValue(t) as number
      ),
      name: `Infeasible Trial of ${h.study_name}`,
      marker: {
        size: markerSize,
        color: mode === "dark" ? "#666666" : "#cccccc",
      },
      mode: "markers",
      type: "scatter",
      showlegend: false,
    })
  })
  plotData.push(...infeasiblePlotData)
  plotly.react(plotDomId, plotData, layout)
}
