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

const plotDomId = "graph-pareto-front"

export const GraphParetoFront: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [objectiveXId, setObjectiveXId] = useState<number>(0)
  const [objectiveYId, setObjectiveYId] = useState<number>(1)
  const objectiveNames: string[] = study?.objective_names || []

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
          Pareto Front
        </Typography>
        {study !== null && study.directions.length !== 1 ? (
          <>
            <FormControl component="fieldset">
              <FormLabel component="legend">Objective X:</FormLabel>
              <Select value={objectiveXId} onChange={handleObjectiveXChange}>
                {study.directions.map((d, i) => (
                  <MenuItem value={i} key={i}>
                    {objectiveNames.length === study?.directions.length
                      ? objectiveNames[i]
                      : `${i}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl component="fieldset">
              <FormLabel component="legend">Objective Y:</FormLabel>
              <Select value={objectiveYId} onChange={handleObjectiveYChange}>
                {study.directions.map((d, i) => (
                  <MenuItem value={i} key={i}>
                    {objectiveNames.length === study?.directions.length
                      ? objectiveNames[i]
                      : `${i}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        ) : null}
      </Grid>
      <Grid item xs={9}>
        <Box
          id={plotDomId}
          sx={{
            height: "450px",
          }}
        />
      </Grid>
    </Grid>
  )
}

const filterFunc = (trial: Trial, directions: StudyDirection[]): boolean => {
  return (
    trial.state === "Complete" &&
    trial.values !== undefined &&
    trial.values.length === directions.length &&
    trial.values.every((v) => v !== "inf" && v !== "-inf")
  )
}

const makeHovertext = (trial: Trial): string => {
  return JSON.stringify(
    {
      number: trial.number,
      values: trial.values,
      params: trial.params
        .map((p) => [p.name, p.param_external_value])
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
    },
    undefined,
    "  "
  ).replace(/\n/g, "<br>")
}

const makeScatterObject = (
  trials: Trial[],
  objectiveXId: number,
  objectiveYId: number,
  hovertemplate: string,
  dominated: boolean
): Partial<plotly.PlotData> => {
  const marker = makeMarker(trials, dominated)
  return {
    x: trials.map((t) => t.values![objectiveXId] as number),
    y: trials.map((t) => t.values![objectiveYId] as number),
    text: trials.map((t) => makeHovertext(t)),
    mode: "markers",
    hovertemplate: hovertemplate,
    marker: marker,
    showlegend: false,
  }
}

const makeMarker = (
  trials: Trial[],
  dominated: boolean
): Partial<plotly.PlotData> => {
  if (dominated) {
    return {
      line: { width: 0.5, color: "Grey" },
      // @ts-ignore
      color: trials.map((t) => t.number),
      colorscale: "Blues",
      reversescale: true,
      colorbar: {
        title: "Trial",
      },
    }
  } else {
    return {
      line: { width: 0.5, color: "Grey" },
      // @ts-ignore
      color: trials.map((t) => t.number),
      colorscale: "Reds",
      colorbar: {
        title: "Best Trial",
        x: 1.1,
        xpad: 80,
      },
    }
  }
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
    uirevision: 'true',
  }

  const trials: Trial[] = study ? study.trials : []
  const filteredTrials = trials.filter((t: Trial) =>
    filterFunc(t, study.directions)
  )

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

  const dominatedTrials: boolean[] = []
  normalizedValues.forEach((values0: number[], i: number) => {
    const dominated = normalizedValues.some((values1: number[], j: number) => {
      if (i === j) {
        return false
      }
      return values0.every((value0: number, k: number) => {
        return values1[k] <= value0
      })
    })
    dominatedTrials.push(dominated)
  })

  const plotData: Partial<plotly.PlotData>[] = [
    makeScatterObject(
      filteredTrials.filter((t, i) => dominatedTrials[i]),
      objectiveXId,
      objectiveYId,
      "%{text}<extra>Trial</extra>",
      true
    ),
    makeScatterObject(
      filteredTrials.filter((t, i) => !dominatedTrials[i]),
      objectiveXId,
      objectiveYId,
      "%{text}<extra>Best Trial</extra>",
      false
    ),
  ]

  plotly.react(plotDomId, plotData, layout)
}
