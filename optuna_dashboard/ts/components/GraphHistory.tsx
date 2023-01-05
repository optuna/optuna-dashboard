import * as plotly from "plotly.js-dist-min"
import React, { ChangeEvent, FC, useEffect, useMemo, useState } from "react"
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
import { plotlyDarkTemplate } from "./PlotlyDarkMode"

const plotDomId = "graph-history"

class Target {
  kind: "objective" | "user_attr"
  key: number | string

  constructor(kind: "objective" | "user_attr", key: number | string) {
    this.kind = kind
    this.key = key
  }

  validate(): boolean {
    if (this.kind === "objective") {
      if (typeof this.key !== "number") {
        return false
      }
    } else if (this.kind === "user_attr") {
      if (typeof this.key !== "string") {
        return false
      }
    } else {
      return false
    }
    return true
  }

  toLabel(objectiveNames: string[]): string {
    if (this.kind === "objective") {
      const objectiveId: number = this.key as number
      if (objectiveNames.length > objectiveId) {
        return objectiveNames[objectiveId]
      }
      return `Objective ${objectiveId}`
    } else {
      return `User Attribute ${this.key}`
    }
  }

  getObjectiveId(): number | null {
    return this.key as number
  }

  getTargetValue(trial: Trial): number | null {
    if (!this.validate()) {
      return null
    }
    if (this.kind === "objective") {
      const objectiveId = this.getObjectiveId()
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
    } else if (this.kind === "user_attr") {
      const attr = trial.user_attrs.find((attr) => attr.key === this.key)
      if (attr === undefined) {
        return null
      }
      const value = Number(attr.value)
      if (value === undefined) {
        return null
      }
      return value
    }
    return null
  }
}

export const GraphHistory: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [xAxis, setXAxis] = useState<string>("number")
  const [targetIndex, setTargetIndex] = useState<number>(0)
  const [logScale, setLogScale] = useState<boolean>(false)
  const [filterCompleteTrial, setFilterCompleteTrial] = useState<boolean>(false)
  const [filterPrunedTrial, setFilterPrunedTrial] = useState<boolean>(false)
  const [targetList, setTargetList] = useState<Target[]>([])
  const objectiveNames: string[] = study?.objective_names || []

  useMemo(() => {
    if (study !== null) {
      const targets: Target[] = [
        ...study.directions.map((v, i) => new Target("objective", i)),
        ...study.union_user_attrs
          .filter((attr) => attr.sortable)
          .map((attr) => new Target("user_attr", attr.key)),
      ]
      setTargetList(targets)
    }
  }, [study?.directions, study?.union_user_attrs])

  useEffect(() => {
    if (study !== null) {
      plotHistory(
        study,
        targetList[targetIndex],
        xAxis,
        logScale,
        filterCompleteTrial,
        filterPrunedTrial,
        theme.palette.mode
      )
    }
  }, [
    study,
    targetIndex,
    targetList,
    logScale,
    xAxis,
    filterPrunedTrial,
    filterCompleteTrial,
    theme.palette.mode,
  ])

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setTargetIndex(event.target.value as number)
  }

  const handleXAxisChange = (e: ChangeEvent<HTMLInputElement>) => {
    setXAxis(e.target.value)
  }

  const handleLogScaleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogScale(!logScale)
  }

  const handleFilterCompleteChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilterCompleteTrial(!filterCompleteTrial)
  }

  const handleFilterPrunedChange = (e: ChangeEvent<HTMLInputElement>) => {
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
        <Typography variant="h6" sx={{ margin: "1em 0", fontWeight: 600 }}>
          History
        </Typography>
        {study !== null && targetList.length >= 2 ? (
          <FormControl
            component="fieldset"
            sx={{ marginBottom: theme.spacing(2) }}
          >
            <FormLabel component="legend">y Axis</FormLabel>
            <Select value={targetIndex} onChange={handleObjectiveChange}>
              {targetList.map((t, i) => (
                <MenuItem value={i} key={i}>
                  {t.toLabel(objectiveNames)}
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
                disabled={!study?.has_intermediate_values}
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

const filterFunc = (trial: Trial, target: Target): boolean => {
  if (trial.state !== "Complete" && trial.state !== "Pruned") {
    return false
  }
  const value = target.getTargetValue(trial)
  return value !== null
}

const plotHistory = (
  study: StudyDetail,
  target: Target,
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

  let filteredTrials = study.trials.filter((t) => filterFunc(t, target))
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
      ? trial.datetime_start!
      : trial.datetime_complete!
  }

  const plotData: Partial<plotly.PlotData>[] = [
    {
      x: filteredTrials.map(getAxisX),
      y: filteredTrials.map(
        (t: Trial): number => target.getTargetValue(t) as number
      ),
      name: "Objective Value",
      mode: "markers",
      type: "scatter",
    },
  ]

  const objectiveId = target.getObjectiveId()
  if (objectiveId !== null) {
    const xForLinePlot: (number | Date)[] = []
    const yForLinePlot: number[] = []
    let currentBest: number | null = null
    for (let i = 0; i < filteredTrials.length; i++) {
      const t = filteredTrials[i]
      if (currentBest === null) {
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      } else if (
        study.directions[objectiveId] === "maximize" &&
        t.values![objectiveId] > currentBest
      ) {
        const p = filteredTrials[i - 1]
        if (!xForLinePlot.includes(getAxisX(p))) {
          xForLinePlot.push(getAxisX(p))
          yForLinePlot.push(currentBest)
        }
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      } else if (
        study.directions[objectiveId] === "minimize" &&
        t.values![objectiveId] < currentBest
      ) {
        const p = filteredTrials[i - 1]
        if (!xForLinePlot.includes(getAxisX(p))) {
          xForLinePlot.push(getAxisX(p))
          yForLinePlot.push(currentBest)
        }
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      }
    }
    xForLinePlot.push(getAxisX(filteredTrials[filteredTrials.length - 1]))
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
