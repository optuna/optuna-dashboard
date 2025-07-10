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
import { makeHovertext } from "../utils/graph"
import {
  Target,
  useFilteredTrialsFromStudies,
  useObjectiveAndUserAttrTargetsFromStudies,
} from "../utils/trialFilter"
import { DarkColorTemplates } from "./PlotlyColorTemplates"

const plotDomId = "plot-history"

interface HistoryPlotInfo {
  study_name: string
  trials: Optuna.Trial[]
  directions: Optuna.StudyDirection[]
  metric_names?: string[]
  selectedTrials?: number[]
}

export const PlotHistory: FC<{
  studies: Optuna.Study[]
  logScale?: boolean
  includePruned?: boolean
  colorTheme?: Partial<Plotly.Template>
  linkURL?: (studyId: number, trialNumber: number) => string
  // biome-ignore lint/suspicious/noExplicitAny: It will accept any routers of each library.
  router?: any
  selectedTrials?: number[]
}> = ({
  studies,
  logScale,
  includePruned,
  colorTheme,
  linkURL,
  router,
  selectedTrials,
}) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const theme = useTheme()
  const colorThemeUsed =
    colorTheme ??
    (theme.palette.mode === "dark" ? DarkColorTemplates.default : {})

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
      selectedTrials: selectedTrials,
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

      const element = document.getElementById(plotDomId)
      if (
        element !== null &&
        studies.length >= 1 &&
        linkURL !== undefined &&
        router !== undefined
      ) {
        // @ts-ignore
        element.on("plotly_click", (data) => {
          if (data.points[0].data.mode !== "lines") {
            let studyId = 1
            if (data.points[0].data.name.includes("Infeasible Trial of")) {
              const studyInfo: { id: number; name: string }[] = []
              for (const study of studies) {
                studyInfo.push({ id: study.id, name: study.name })
              }
              const dataPointStudyName = data.points[0].data.name.replace(
                "Infeasible Trial of ",
                ""
              )
              const targetId = studyInfo.find(
                (s) => s.name === dataPointStudyName
              )?.id
              if (targetId !== undefined) {
                studyId = targetId
              }
            } else {
              studyId = studies[Math.floor(data.points[0].curveNumber / 2)].id
            }
            const trialNumber = data.points[0].x
            router(linkURL(studyId, trialNumber))
          }
        })
        return () => {
          // @ts-ignore
          element.removeAllListeners("plotly_click")
        }
      }
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
  const feasiblePlotData: Partial<plotly.PlotData>[] = []
  const bestValuePlotData: Partial<plotly.PlotData>[] = []
  const infeasiblePlotData: Partial<plotly.PlotData>[] = []
  const unselectedPlotData: Partial<plotly.PlotData>[] = []
  for (const h of historyPlotInfos) {
    const selectedTrials: Optuna.Trial[] = []
    const unselectedTrials: Optuna.Trial[] = []
    if (h.selectedTrials !== undefined && h.selectedTrials.length !== 0) {
      for (const t of h.trials) {
        if (h.selectedTrials.includes(t.number)) {
          selectedTrials.push(t)
        } else {
          unselectedTrials.push(t)
        }
      }
    } else {
      selectedTrials.push(...h.trials)
    }
    const feasibleTrials: Optuna.Trial[] = []
    const infeasibleTrials: Optuna.Trial[] = []
    for (const t of selectedTrials) {
      if (t.constraints.every((c) => c <= 0)) {
        feasibleTrials.push(t)
      } else {
        infeasibleTrials.push(t)
      }
    }
    const hovertemplate =
      infeasibleTrials.length === 0
        ? "%{text}<extra>Trial</extra>"
        : "%{text}<extra>Feasible Trial</extra>"
    feasiblePlotData.push({
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
      text: feasibleTrials.map((t) => makeHovertext(t)),
      hovertemplate: hovertemplate,
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
      bestValuePlotData.push({
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
        color:
          colorTheme === DarkColorTemplates.default ? "#666666" : "#cccccc",
      },
      mode: "markers",
      type: "scatter",
      text: infeasibleTrials.map((t) => makeHovertext(t)),
      hovertemplate: "%{text}<extra>Infeasible Trial</extra>",
      showlegend: false,
    })
    unselectedPlotData.push({
      x: unselectedTrials.map(getAxisX),
      y: unselectedTrials.map(
        (t: Optuna.Trial): number => target.getTargetValue(t) as number
      ),
      name: `Unselected Trial of ${h.study_name}`,
      marker: {
        line:
          colorTheme === DarkColorTemplates.default
            ? { width: 0.25, color: "#666666" }
            : { width: 0.5, color: "#cccccc" },
        size: markerSize,
        color: "#ffffff00",
      },
      mode: "markers",
      type: "scatter",
      text: unselectedTrials.map((t) => makeHovertext(t)),
      hovertemplate: "%{text}<extra>Unselected Trial</extra>",
      showlegend: false,
    })
  }

  plotData.push(...unselectedPlotData)
  plotData.push(...infeasiblePlotData)
  plotData.push(...feasiblePlotData)
  plotData.push(...bestValuePlotData)
  return plotly.react(plotDomId, plotData, layout)
}
