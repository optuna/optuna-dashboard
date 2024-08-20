import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Slider,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { ChangeEvent, FC, useEffect, useState } from "react"

import { useGraphComponentState } from "../hooks/useGraphComponentState"
import {
  Target,
  useFilteredTrialsFromStudies,
  useObjectiveAndUserAttrTargetsFromStudies,
} from "../utils/trialFilter"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"

const plotDomId = "plot-history"

interface HistoryPlotInfo {
  study_name: string
  trials: Optuna.Trial[]
  directions: Optuna.StudyDirection[]
  metric_names?: string[]
}

export const PlotHistory: FC<{
  studies: Optuna.Study[]
  logScale?: boolean
  includePruned?: boolean
  colorTheme?: Partial<Plotly.Template>
}> = ({ studies, logScale, includePruned, colorTheme }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const theme = useTheme()
  const colorThemeUsed =
    colorTheme ?? (theme.palette.mode === "dark" ? plotlyDarkTemplate : {})

  const [xAxis, setXAxis] = useState<
    "number" | "datetime_start" | "datetime_complete"
  >("number")

  const [logScaleInternal, setLogScaleInternal] = useState<boolean>(false)
  const [includePrunedInternal, setIncludePrunedInternal] =
    useState<boolean>(true)

  const [markerSize, setMarkerSize] = useState<number>(5)

  const [targets, selected, setTarget] =
    useObjectiveAndUserAttrTargetsFromStudies(studies)

  const trials = useFilteredTrialsFromStudies(
    studies,
    [selected],
    includePruned === undefined ? !includePrunedInternal : !includePruned
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

  const handleObjectiveChange = (event: SelectChangeEvent<string>) => {
    setTarget(event.target.value)
  }

  const handleLogScaleChange = () => {
    setLogScaleInternal(!logScaleInternal)
  }

  const handleIncludePrunedChange = () => {
    setIncludePrunedInternal(!includePrunedInternal)
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (graphComponentState !== "componentWillMount") {
      plotHistory(
        historyPlotInfos,
        selected,
        xAxis,
        logScale === undefined ? logScaleInternal : logScale,
        colorThemeUsed,
        markerSize
      )?.then(notifyGraphDidRender)
    }
  }, [
    historyPlotInfos,
    selected,
    xAxis,
    logScale,
    logScaleInternal,
    colorThemeUsed,
    markerSize,
    graphComponentState,
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
              {targets.map((t) => (
                <MenuItem value={t.identifier()} key={t.identifier()}>
                  {t.toLabel(studies[0].metric_names)}
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
        {logScale === undefined ? (
          <FormControl
            component="fieldset"
            sx={{ marginBottom: theme.spacing(2) }}
          >
            <FormLabel component="legend">Log y scale:</FormLabel>
            <Switch
              checked={logScaleInternal}
              onChange={handleLogScaleChange}
              value="enable"
            />
          </FormControl>
        ) : null}
        {includePruned === undefined ? (
          <FormControl
            component="fieldset"
            sx={{ marginBottom: theme.spacing(2) }}
          >
            <FormLabel component="legend"> Include PRUNED trials:</FormLabel>
            <Switch
              checked={includePrunedInternal}
              onChange={handleIncludePrunedChange}
              value="enable"
            />
          </FormControl>
        ) : null}
        <FormControl>
          <FormLabel component="legend">Marker size:</FormLabel>
          <Slider
            defaultValue={5}
            marks={true}
            min={1}
            max={10}
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
  historyPlotInfos: HistoryPlotInfo[],
  target: Target,
  xAxis: "number" | "datetime_start" | "datetime_complete",
  logScale: boolean,
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
      title: target.toLabel(historyPlotInfos[0].metric_names),
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
  for (const h of historyPlotInfos) {
    const feasibleTrials: Optuna.Trial[] = []
    const infeasibleTrials: Optuna.Trial[] = []
    for (const t of h.trials) {
      if (t.constraints.every((c) => c <= 0)) {
        feasibleTrials.push(t)
      } else {
        infeasibleTrials.push(t)
      }
    }
    plotData.push({
      x: feasibleTrials.map(getAxisX),
      y: feasibleTrials.map(
        (t: Optuna.Trial): number => target.getTargetValue(t) as number
      ),
      name: `${target.toLabel(h.metric_names)} of ${h.study_name}`,
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
        }

        if (currentBest === null) {
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
        color: colorTheme === plotlyDarkTemplate ? "#666666" : "#cccccc",
      },
      mode: "markers",
      type: "scatter",
      showlegend: false,
    })
  }
  plotData.push(...infeasiblePlotData)
  return plotly.react(plotDomId, plotData, layout)
}
