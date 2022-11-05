import * as plotly from "plotly.js-dist-min"
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
  Box,
} from "@mui/material"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"

const plotDomId = "graph-edf"

export const Edf: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [objectiveId, setObjectiveId] = useState<number>(0)

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setObjectiveId(event.target.value as number)
  }

  useEffect(() => {
    if (study != null) {
      plotEdf(study, objectiveId, theme.palette.mode)
    }
  }, [study, objectiveId, theme.palette.mode])
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
          EDF
        </Typography>
        {study !== null && study.directions.length !== 1 ? (
          <FormControl component="fieldset">
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
      </Grid>
      <Grid item xs={9}>
        <Box id={plotDomId} sx={{ height: "450px" }} />
      </Grid>
    </Grid>
  )
}

const filterFunc = (trial: Trial, objectiveId: number): boolean => {
  return (
    trial.state === "Complete" &&
    trial.values !== undefined &&
    trial.values[objectiveId] !== "inf" &&
    trial.values[objectiveId] !== "-inf"
  )
}

const plotEdf = (study: StudyDetail, objectiveId: number, mode: string) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const trials: Trial[] = study ? study.trials : []
  const filteredTrials = trials.filter((t) => filterFunc(t, objectiveId))

  if (filteredTrials.length === 0) {
    plotly.react(plotDomId, [])
    return
  }

  const target_name = "Objective Value"

  const target = (t: Trial): number => {
    return t.values![objectiveId] as number
  }

  const layout: Partial<plotly.Layout> = {
    xaxis: {
      title: target_name,
    },
    yaxis: {
      title: "Cumulative Probability",
    },
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 50,
    },
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  const values = filteredTrials.map((t) => target(t))
  const numValues = values.length
  const minX = Math.min(...values)
  const maxX = Math.max(...values)
  const numStep = 100
  const _step = (maxX - minX) / (numStep - 1)

  const xValues = []
  const yValues = []
  for (let i = 0; i < numStep; i++) {
    const boundary_right = minX + _step * i
    xValues.push(boundary_right)
    yValues.push(values.filter((v) => v <= boundary_right).length / numValues)
  }

  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "scatter",
      x: xValues,
      y: yValues,
    },
  ]
  console.log(plotData)
  plotly.react(plotDomId, plotData, layout)
}
