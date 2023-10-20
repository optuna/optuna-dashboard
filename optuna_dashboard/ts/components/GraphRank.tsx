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
import { makeHovertext } from "../graphUtil"
import { useMergedUnionSearchSpace } from "../searchSpace"

const PADDING_RATIO = 0.05
const plotDomId = "graph-rank"

interface AxisInfo {
  name: string
  range: [number, number]
  is_log: boolean
  is_cat: boolean
}

interface RankPlotInfo {
  xaxis: AxisInfo
  yaxis: AxisInfo
  xvalues: (string | number)[]
  yvalues: (string | number)[]
  zvalues: number[]
  colors: number[]
  hovertext: string[]
}

export const GraphRank: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [objectiveId, setobjectiveId] = useState<number>(0)
  const searchSpace = useMergedUnionSearchSpace(study?.union_search_space)
  const [xParam, setXParam] = useState<SearchSpaceItem | null>(null)
  const [yParam, setYParam] = useState<SearchSpaceItem | null>(null)
  const objectiveNames: string[] = study?.objective_names || []

  if (xParam == null && searchSpace.length > 0) {
    setXParam(searchSpace[0])
  }
  if (yParam == null && searchSpace.length > 1) {
    setYParam(searchSpace[1])
  }

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setobjectiveId(Number(event.target.value))
  }
  const handleXParamChange = (event: SelectChangeEvent<string>) => {
    const param = searchSpace.find((item) => item.name === event.target.value)
    setXParam(param || null)
  }
  const handleYParamChange = (event: SelectChangeEvent<string>) => {
    const param = searchSpace.find((item) => item.name === event.target.value)
    setYParam(param || null)
  }

  const rankPlotInfo = getRankPlotInfo(study, objectiveId, xParam, yParam)

  useEffect(() => {
    if (study != null) {
      plotRank(rankPlotInfo, theme.palette.mode)
    }
  }, [study, theme.palette.mode])

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
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          Rank
        </Typography>
        {study !== null && study.directions.length !== 1 ? (
          <FormControl component="fieldset">
            <FormLabel component="legend">Objective:</FormLabel>
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
                {space.map((d) => (
                  <MenuItem value={d.name} key={d.name}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">y:</FormLabel>
              <Select value={yParam?.name || ""} onChange={handleYParamChange}>
                {space.map((d) => (
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

const getRankPlotInfo = (
  study: StudyDetail | null,
  objectiveId: number,
  xParam: SearchSpaceItem | null,
  yParam: SearchSpaceItem | null
): RankPlotInfo | null => {
  if (study === null) {
    return null
  }

  const trials = study.trials
  const filtered_trials = trials.filter(filterFunc)
  if (filtered_trials.length < 2 || xParam == null || yParam == null) {
    return null
  }

  const xAxis = getAxisInfo(filtered_trials, xParam)
  const yAxis = getAxisInfo(filtered_trials, yParam)

  const xValues: number[] = []
  const yValues: number[] = []
  const zValues: number[] = []
  const hovertext: string[] = []
  filtered_trials.forEach((trial) => {
    const xValue =
      trial.params.find((p) => p.name === xAxis.name)?.param_internal_value ||
      null
    const yValue =
      trial.params.find((p) => p.name === yAxis.name)?.param_internal_value ||
      null
    if (trial.values === undefined || xValue === null || yValue === null) {
      return
    }
    const zValue = Number(trial.values[objectiveId])
    xValues.push(xValue)
    yValues.push(yValue)
    zValues.push(zValue)
    hovertext.push(makeHovertext(trial))
  })

  const colors = getColors(zValues)

  return {
    xaxis: xAxis,
    yaxis: yAxis,
    xvalues: xValues,
    yvalues: yValues,
    zvalues: zValues,
    colors,
    hovertext,
  }
}

const filterFunc = (trial: Trial): boolean => {
  return trial.state === "Complete" && trial.values !== undefined
}

const getAxisInfo = (trials: Trial[], param: SearchSpaceItem): AxisInfo => {
  if (param.distribution.type === "CategoricalDistribution") {
    return getAxisInfoForCategorical(trials, param.name, param.distribution)
  } else {
    return getAxisInfoForNumerical(trials, param.name, param.distribution)
  }
}

const getAxisInfoForCategorical = (
  trials: Trial[],
  param: string,
  distribution: CategoricalDistribution
): AxisInfo => {
  const values = trials.map(
    (trial) =>
      trial.params.find((p) => p.name === param)?.param_internal_value || null
  )
  const isDynamic = values.some((v) => v === null)
  const span = distribution.choices.length - (isDynamic ? 2 : 1)
  const padding = span * PADDING_RATIO
  const min = -padding
  const max = span + padding

  return {
    name: param,
    range: [min, max],
    is_log: false,
    is_cat: true,
  }
}

const getAxisInfoForNumerical = (
  trials: Trial[],
  param: string,
  distribution: FloatDistribution | IntDistribution
): AxisInfo => {
  const values = trials.map(
    (trial) =>
      trial.params.find((p) => p.name === param)?.param_internal_value || null
  )
  const non_null_values: number[] = []
  values.forEach((value) => {
    if (value !== null) {
      non_null_values.push(value)
    }
  })
  let min = Math.min(...non_null_values)
  let max = Math.max(...non_null_values)
  if (distribution.log) {
    const padding = (Math.log10(max) - Math.log10(min)) * PADDING_RATIO
    min = Math.pow(10, Math.log10(min) - padding)
    max = Math.pow(10, Math.log10(max) + padding)
  } else {
    const padding = (max - min) * PADDING_RATIO
    min = min - padding
    max = max + padding
  }

  return {
    name: param,
    range: [min, max],
    is_log: distribution.log,
    is_cat: false,
  }
}

const getColors = (values: number[]): number[] => {
  const raw_ranks = getOrderWithSameOrderAveraging(values)
  let color_idxs: number[] = []
  if (values.length > 2) {
    color_idxs = raw_ranks.map((rank) => rank / (values.length - 1))
  } else {
    color_idxs = [0.5]
  }
  return color_idxs
}

const getOrderWithSameOrderAveraging = (values: number[]): number[] => {
  const sorted_values = values.slice().sort()
  const ranks: number[] = []
  values.forEach((value) => {
    const first_index = sorted_values.indexOf(value)
    const last_index = sorted_values.lastIndexOf(value)
    const sum_of_the_value =
      ((first_index + last_index) * (last_index - first_index + 1)) / 2
    const rank = sum_of_the_value / (last_index - first_index + 1)
    ranks.push(rank)
  })
  return ranks
}

const plotRank = (rank_plot_info: RankPlotInfo | null, mode: string) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  if (rank_plot_info === null) {
    plotly.react(plotDomId, [], {
      template: mode === "dark" ? plotlyDarkTemplate : {},
    })
    return
  }

  const xAxis = rank_plot_info.xaxis
  const yAxis = rank_plot_info.yaxis
  const layout: Partial<plotly.Layout> = {
    xaxis: {
      title: xAxis.name,
      type: xAxis.is_cat ? "category" : xAxis.is_log ? "log" : "linear",
    },
    yaxis: {
      title: yAxis.name,
      type: yAxis.is_cat ? "category" : yAxis.is_log ? "log" : "linear",
    },
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 50,
    },
    uirevision: "true",
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }
  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "scatter",
      x: rank_plot_info.xvalues,
      y: rank_plot_info.yvalues,
      marker: {
        color: rank_plot_info.colors,
        colorscale: "Portland",
        colorbar: {
          title: "Rank",
        },
        size: 10,
        line: {
          color: "Grey",
          width: 0.5,
        },
      },
      mode: "markers",
      showlegend: false,
      hovertemplate: "%{hovertext}<extra></extra>",
      hovertext: rank_plot_info.hovertext,
    },
  ]
  plotly.react(plotDomId, plotData, layout)
}
