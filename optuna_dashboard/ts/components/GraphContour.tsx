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
import { useMergedUnionSearchSpace } from "../searchSpace"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unique = (array: any[]) => {
  const knownElements = new Map()
  array.forEach((elem) => knownElements.set(elem, true))
  return Array.from(knownElements.keys())
}

type AxisInfo = {
  name: string
  min: number
  max: number
  isLog: boolean
  isCat: boolean
  indices: (string | number)[]
  values: (string | number | null)[]
}

const PADDING_RATIO = 0.05
const plotDomId = "graph-contour"

export const Contour: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const searchSpace = useMergedUnionSearchSpace(study?.union_search_space)
  const [xParam, setXParam] = useState<SearchSpaceItem | null>(null)
  const [yParam, setYParam] = useState<SearchSpaceItem | null>(null)
  const objectiveNames: string[] = study?.objective_names || []

  if (xParam === null && searchSpace.length > 0) {
    setXParam(searchSpace[0])
  }
  if (yParam === null && searchSpace.length > 1) {
    setYParam(searchSpace[1])
  }

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setObjectiveId(event.target.value as number)
  }
  const handleXParamChange = (event: SelectChangeEvent<string>) => {
    const param = searchSpace.find((s) => s.name === event.target.value)
    setXParam(param || null)
  }
  const handleYParamChange = (event: SelectChangeEvent<string>) => {
    const param = searchSpace.find((s) => s.name === event.target.value)
    setYParam(param || null)
  }

  useEffect(() => {
    if (study != null) {
      plotContour(study, objectiveId, xParam, yParam, theme.palette.mode)
    }
  }, [study, objectiveId, xParam, yParam, theme.palette.mode])

  const space: SearchSpaceItem[] = study ? study.union_search_space : []

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
          Contour
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
        {study !== null && space.length > 0 ? (
          <Grid container direction="column" gap={1}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">x:</FormLabel>
              <Select value={xParam?.name || ""} onChange={handleXParamChange}>
                {space.map((d, i) => (
                  <MenuItem value={d.name} key={d.name}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">y:</FormLabel>
              <Select value={yParam?.name || ""} onChange={handleYParamChange}>
                {space.map((d, i) => (
                  <MenuItem value={d.name} key={d.name}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
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

const plotContour = (
  study: StudyDetail,
  objectiveId: number,
  xParam: SearchSpaceItem | null,
  yParam: SearchSpaceItem | null,
  mode: string
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const trials: Trial[] = study ? study.trials : []
  const filteredTrials = trials.filter((t) => filterFunc(t, objectiveId))
  if (filteredTrials.length === 0 || xParam === null || yParam === null) {
    plotly.react(plotDomId, [], {
      template: mode === "dark" ? plotlyDarkTemplate : {},
    })
    return
  }

  const xAxis = getAxisInfo(study, trials, xParam)
  const yAxis = getAxisInfo(study, trials, yParam)
  const xIndices = xAxis.indices
  const yIndices = yAxis.indices

  const xValues: plotly.Datum[] = []
  const yValues: plotly.Datum[] = []
  const zValues: plotly.Datum[][] = new Array(yIndices.length)
  for (let j = 0; j < yIndices.length; j++) {
    zValues[j] = new Array(xIndices.length).fill(null)
  }

  filteredTrials.forEach((trial, i) => {
    if (xAxis.values[i] && yAxis.values[i] && trial.values) {
      const xValue = xAxis.values[i] as string | number
      const yValue = yAxis.values[i] as string | number
      xValues.push(xValue)
      yValues.push(yValue)
      const xi = xIndices.indexOf(xValue)
      const yi = yIndices.indexOf(yValue)
      const zValue = trial.values[objectiveId]
      zValues[yi][xi] = zValue
    }
  })

  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "contour",
      x: xIndices,
      y: yIndices,
      z: zValues,
      colorscale: "Blues",
      connectgaps: true,
      hoverinfo: "none",
      line: {
        smoothing: 1.3,
      },
      reversescale: study.directions[objectiveId] !== "minimize",
      // https://github.com/plotly/react-plotly.js/issues/251
      // @ts-ignore
      contours: {
        coloring: "heatmap",
      },
    },
    {
      type: "scatter",
      x: xValues,
      y: yValues,
      marker: { line: { width: 2.0, color: "Grey" }, color: "black" },
      mode: "markers",
      showlegend: false,
    },
  ]

  const layout: Partial<plotly.Layout> = {
    xaxis: {
      title: xParam.name,
      type: xAxis.isCat ? "category" : undefined,
    },
    yaxis: {
      title: yParam.name,
      type: yAxis.isCat ? "category" : undefined,
    },
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 50,
    },
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }
  plotly.react(plotDomId, plotData, layout)
}

const getAxisInfoForNumericalParams = (
  trials: Trial[],
  paramName: string,
  distribution: FloatDistribution | IntDistribution
): AxisInfo => {
  const padding = (distribution.high - distribution.low) * PADDING_RATIO
  const min = distribution.low - padding
  const max = distribution.high + padding

  const values = trials.map(
    (trial) =>
      trial.params.find((p) => p.name === paramName)?.param_internal_value ||
      null
  )
  const indices = unique(values)
    .filter((v) => v !== null)
    .sort((a, b) => a - b)
  if (indices.length >= 2) {
    indices.unshift(min)
    indices.push(max)
  }
  return {
    name: paramName,
    min,
    max,
    isLog: distribution.log,
    isCat: false,
    indices,
    values,
  }
}

const getAxisInfoForCategoricalParams = (
  trials: Trial[],
  paramName: string,
  distribution: CategoricalDistribution
): AxisInfo => {
  const values = trials.map(
    (trial) =>
      trial.params.find((p) => p.name === paramName)?.param_external_value ||
      null
  )
  const isDynamic = values.some((v) => v === null)
  const span = distribution.choices.length - (isDynamic ? 2 : 1)
  const padding = span * PADDING_RATIO
  const min = -padding
  const max = span + padding

  const indices = distribution.choices
    .map((c) => c.value)
    .sort((a, b) =>
      a.toLowerCase() < b.toLowerCase()
        ? -1
        : a.toLowerCase() > b.toLowerCase()
        ? 1
        : 0
    )
  return {
    name: paramName,
    min,
    max,
    isLog: false,
    isCat: true,
    indices,
    values,
  }
}

const getAxisInfo = (
  study: StudyDetail,
  trials: Trial[],
  param: SearchSpaceItem
): AxisInfo => {
  if (param.distribution.type === "CategoricalDistribution") {
    return getAxisInfoForCategoricalParams(
      trials,
      param.name,
      param.distribution
    )
  } else {
    return getAxisInfoForNumericalParams(trials, param.name, param.distribution)
  }
}
