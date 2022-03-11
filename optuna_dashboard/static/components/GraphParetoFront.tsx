import * as plotly from "plotly.js-dist"
import React, { FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  Typography,
  SelectChangeEvent,
  useTheme,
} from "@mui/material"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"

const plotDomId = "graph-pareto-front"

export const GraphParetoFront: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [objectiveXId, setObjectiveXId] = useState<number>(0)
  const [objectiveYId, setObjectiveYId] = useState<number>(1)

  const handleObjectiveXChange = (event: SelectChangeEvent<number>) => {
    setObjectiveXId(event.target.value as number)
  }

  const handleObjectiveYChange = (event: SelectChangeEvent<number>) => {
    setObjectiveYId(event.target.value as number)
  }

  useEffect(() => {
    if (study != null) {
      plotParetoFront(study, objectiveXId, objectiveYId, theme.palette.mode)
    }
  }, [study, objectiveXId, objectiveYId, theme.palette.mode])

  return (
    <Grid container direction="row">
      {study !== null && study.directions.length !== 1 ? (
        <Grid item xs={3}>
          <Grid container direction="column">
            <Typography variant="h6" sx={{ margin: "1em 0" }}>
              Pareto Front
            </Typography>
            <FormControl
              component="fieldset"
              sx={{
                marginBottom: theme.spacing(2),
                marginRight: theme.spacing(5),
              }}
            >
              <FormLabel component="legend">Objective X ID:</FormLabel>
              <Select value={objectiveXId} onChange={handleObjectiveXChange}>
                {study.directions.map((d, i) => (
                  <MenuItem value={i} key={i}>
                    {i}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              component="fieldset"
              sx={{
                marginBottom: theme.spacing(2),
                marginRight: theme.spacing(5),
              }}
            >
              <FormLabel component="legend">Objective Y ID:</FormLabel>
              <Select value={objectiveYId} onChange={handleObjectiveYChange}>
                {study.directions.map((d, i) => (
                  <MenuItem value={i} key={i}>
                    {i}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      ) : null}
      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

const filterFunc = (trial: Trial): boolean => {
  return trial.state !== "Complete" || trial.values!.every((v) => v !== "inf")
}

const plotParetoFront = (
  study: StudyDetail,
  objectiveXId: number,
  objectiveYId: number,
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
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  const trials: Trial[] = study ? study.trials : []
  const filteredTrials = trials.filter(filterFunc)

  if (filteredTrials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const normalizedValues: number[][] = []
  filteredTrials.forEach((t) => {
    if (t.values && t.values.length === study.directions.length) {
      const trialValues = t.values.map((v, i) => {
        return study.directions[i] === "minimize"
          ? (v as number)
          : (-v as number)
      })
      normalizedValues.push(trialValues)
    }
  })

  const pointColors: string[] = []
  normalizedValues.forEach((values0: number[], i: number) => {
    const dominated = normalizedValues.some((values1: number[], j: number) => {
      if (i === j) {
        return false
      }
      return values0.every((value0: number, k: number) => {
        return values1[k] <= value0
      })
    })

    if (dominated) {
      pointColors.push("blue")
    } else {
      pointColors.push("red")
    }
  })

  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "scatter",
      x: filteredTrials.map((t: Trial): number => {
        return t.values![objectiveXId] as number
      }),
      y: filteredTrials.map((t: Trial): number => {
        return t.values![objectiveYId] as number
      }),
      mode: "markers",
      xaxis: "Objective X",
      yaxis: "Objective Y",
      marker: {
        color: pointColors,
      },
      text: filteredTrials.map(
        (t: Trial): string => `Trial (number=${t.number})`
      ),
      hovertemplate: "%{text}<extra></extra>",
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
