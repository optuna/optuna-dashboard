import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useMemo } from "react"
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
import { Target, useFilteredTrials, useObjectiveTargets } from "../trialFilter"

const plotDomId = "graph-edf"
const getPlotDomId = (objectiveId: number) => `graph-edf-${objectiveId}`

export const GraphEdfBeta: FC<{
  study: StudyDetail | null
  objectiveId: number
}> = ({ study, objectiveId }) => {
  const theme = useTheme()
  const domId = getPlotDomId(objectiveId)
  const target = useMemo<Target>(
    () => new Target("objective", objectiveId),
    [objectiveId]
  )
  const trials = useFilteredTrials(study, [target], false, false)

  useEffect(() => {
    if (study !== null) {
      plotEdf(trials, target, domId, theme.palette.mode)
    }
  }, [trials, target, domId, theme.palette.mode])
  return (
    <Box>
      <Typography variant="h6" sx={{ margin: "1em 0", fontWeight: 600 }}>
        {`EDF for ${target.toLabel(study?.objective_names)}`}
      </Typography>
      <Box id={domId} sx={{ height: "450px" }} />
    </Box>
  )
}

export const GraphEdf: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [targets, selected, setTarget] = useObjectiveTargets(study)
  const trials = useFilteredTrials(study, [selected], false, false)

  const handleObjectiveChange = (event: SelectChangeEvent<string>) => {
    setTarget(event.target.value)
  }

  useEffect(() => {
    if (study != null) {
      plotEdf(trials, selected, plotDomId, theme.palette.mode)
    }
  }, [trials, selected, theme.palette.mode])
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
            <FormLabel component="legend">Objective:</FormLabel>
            <Select
              value={selected.identifier()}
              onChange={handleObjectiveChange}
            >
              {targets.map((target, i) => (
                <MenuItem value={target.identifier()} key={i}>
                  {target.toLabel(study?.objective_names)}
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

const plotEdf = (
  trials: Trial[],
  target: Target,
  domId: string,
  mode: string
) => {
  if (document.getElementById(domId) === null) {
    return
  }
  if (trials.length === 0) {
    plotly.react(domId, [], {
      template: mode === "dark" ? plotlyDarkTemplate : {},
    })
    return
  }

  const target_name = "Objective Value"
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

  const values = trials.map((t) => target.getTargetValue(t) as number)
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
  plotly.react(domId, plotData, layout)
}
