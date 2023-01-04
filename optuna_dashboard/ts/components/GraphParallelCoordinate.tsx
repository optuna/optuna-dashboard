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

const plotDomId = "graph-parallel-coordinate"

export const GraphParallelCoordinate: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const objectiveNames: string[] = study?.objective_names || []

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setObjectiveId(event.target.value as number)
  }

  useEffect(() => {
    if (study !== null) {
      plotCoordinate(study, objectiveId, theme.palette.mode)
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
          Parallel Coordinate
        </Typography>
        {study !== null && study.directions.length !== 1 ? (
          <FormControl component="fieldset">
            <FormLabel component="legend">Objective ID:</FormLabel>
            <Select value={objectiveId} onChange={handleObjectiveChange}>
              {study.directions.map((d, i) => (
                <MenuItem value={i} key={i}>
                  {objectiveNames.length === study?.directions.length
                    ? objectiveNames[i]
                    : `${i}`}
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
  if (trial.state !== "Complete" && trial.state !== "Pruned") {
    return false
  }
  if (trial.values === undefined) {
    return false
  }
  return (
    trial.values.length > objectiveId &&
    trial.values[objectiveId] !== "inf" &&
    trial.values[objectiveId] !== "-inf"
  )
}

const plotCoordinate = (
  study: StudyDetail,
  objectiveId: number,
  mode: string
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    margin: {
      l: 70,
      t: 50,
      r: 50,
      b: 100,
    },
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  if (study.trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const filteredTrials = study.trials.filter((t) => filterFunc(t, objectiveId))

  const maxLabelLength = 40
  const breakLength = maxLabelLength / 2
  const ellipsis = "…"
  const truncateLabelIfTooLong = (originalLabel: string): string => {
    return originalLabel.length > maxLabelLength
      ? originalLabel.substring(0, maxLabelLength - ellipsis.length) + ellipsis
      : originalLabel
  }
  const breakLabelIfTooLong = (originalLabel: string): string => {
    const truncated = truncateLabelIfTooLong(originalLabel)
    return truncated
      .split("")
      .map((c, i) => {
        return (i + 1) % breakLength == 0 ? c + "<br>" : c
      })
      .join("")
  }

  // Intersection param names
  const objectiveValues: number[] = filteredTrials.map(
    (t) => t.values![objectiveId] as number
  )
  const dimensions = [
    {
      label: "Objective value",
      values: objectiveValues,
      range: [Math.min(...objectiveValues), Math.max(...objectiveValues)],
    },
  ]
  study.intersection_search_space.forEach((s) => {
    const valueStrings = filteredTrials.map((t) => {
      const param = t.params.find((p) => p.name === s.name)
      return param!.value
    })
    const isnum = valueStrings.every((v) => {
      return !isNaN(Number(v))
    })
    if (isnum) {
      const values: number[] = valueStrings.map((v) => parseFloat(v))
      dimensions.push({
        label: breakLabelIfTooLong(s.name),
        values: values,
        range: [Math.min(...values), Math.max(...values)],
      })
    } else {
      // categorical
      const vocabSet = new Set<string>(valueStrings)
      const vocabArr = Array.from<string>(vocabSet)
      const values: number[] = valueStrings.map((v) =>
        vocabArr.findIndex((vocab) => v === vocab)
      )
      const tickvals: number[] = vocabArr.map((v, i) => i)
      dimensions.push({
        label: breakLabelIfTooLong(s.name),
        values: values,
        range: [Math.min(...values), Math.max(...values)],
        // @ts-ignore
        tickvals: tickvals,
        ticktext: vocabArr,
      })
    }
  })
  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "parcoords",
      dimensions: dimensions,
      labelangle: 30,
      labelside: "bottom",
      line: {
        color: dimensions[0]["values"],
        // @ts-ignore
        colorscale: "Blues",
        colorbar: {
          title: "Objective value",
        },
        showscale: true,
        reversescale: study.directions[objectiveId] === "maximize",
      },
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
