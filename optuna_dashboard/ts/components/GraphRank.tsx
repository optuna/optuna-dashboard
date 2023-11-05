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
  isLog: boolean
  isCat: boolean
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

  if (xParam === null && searchSpace.length > 0) {
    setXParam(searchSpace[0])
  }
  if (yParam === null && searchSpace.length > 1) {
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

  useEffect(() => {
    if (study != null) {
      const rankPlotInfo = getRankPlotInfo(study, objectiveId, xParam, yParam)
      plotRank(rankPlotInfo, theme.palette.mode)
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
  const filteredTrials = trials.filter(filterFunc)
  if (filteredTrials.length < 2 || xParam === null || yParam === null) {
    return null
  }

  const xAxis = getAxisInfo(filteredTrials, xParam)
  const yAxis = getAxisInfo(filteredTrials, yParam)

  const xValues: (string | number)[] = []
  const yValues: (string | number)[] = []
  const zValues: number[] = []
  const hovertext: string[] = []
  filteredTrials.forEach((trial) => {
    const xValue =
      trial.params.find((p) => p.name === xAxis.name)?.param_external_value ||
      null
    const yValue =
      trial.params.find((p) => p.name === yAxis.name)?.param_external_value ||
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
    isLog: false,
    isCat: true,
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
  const nonNullValues: number[] = []
  values.forEach((value) => {
    if (value !== null) {
      nonNullValues.push(value)
    }
  })
  let min = Math.min(...nonNullValues)
  let max = Math.max(...nonNullValues)
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
    isLog: distribution.log,
    isCat: false,
  }
}

const getColors = (values: number[]): number[] => {
  const rawRanks = getOrderWithSameOrderAveraging(values)
  let colorIdxs: number[] = []
  if (values.length > 2) {
    colorIdxs = rawRanks.map((rank) => rank / (values.length - 1))
  } else {
    colorIdxs = [0.5]
  }
  return colorIdxs
}

const getOrderWithSameOrderAveraging = (values: number[]): number[] => {
  const sortedValues = values.slice().sort()
  const ranks: number[] = []
  values.forEach((value) => {
    const firstIndex = sortedValues.indexOf(value)
    const lastIndex = sortedValues.lastIndexOf(value)
    const sumOfTheValue =
      ((firstIndex + lastIndex) * (lastIndex - firstIndex + 1)) / 2
    const rank = sumOfTheValue / (lastIndex - firstIndex + 1)
    ranks.push(rank)
  })
  return ranks
}

const plotRank = (rankPlotInfo: RankPlotInfo | null, mode: string) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  if (rankPlotInfo === null) {
    plotly.react(plotDomId, [], {
      template: mode === "dark" ? plotlyDarkTemplate : {},
    })
    return
  }

  const xAxis = rankPlotInfo.xaxis
  const yAxis = rankPlotInfo.yaxis
  const layout: Partial<plotly.Layout> = {
    xaxis: {
      title: xAxis.name,
      type: xAxis.isCat ? "category" : xAxis.isLog ? "log" : "linear",
    },
    yaxis: {
      title: yAxis.name,
      type: yAxis.isCat ? "category" : yAxis.isLog ? "log" : "linear",
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

  let xValues = rankPlotInfo.xvalues
  let yValues = rankPlotInfo.yvalues
  if (xAxis.isCat && !yAxis.isCat) {
    const xIndices: number[] = Array.from(Array(xValues.length).keys()).sort(
      (a, b) =>
        xValues[a]
          .toString()
          .toLowerCase()
          .localeCompare(xValues[b].toString().toLowerCase())
    )
    xValues = xIndices.map((i) => xValues[i])
    yValues = xIndices.map((i) => yValues[i])
  }
  if (!xAxis.isCat && yAxis.isCat) {
    const yIndices: number[] = Array.from(Array(yValues.length).keys()).sort(
      (a, b) =>
        yValues[a]
          .toString()
          .toLowerCase()
          .localeCompare(yValues[b].toString().toLowerCase())
    )
    xValues = yIndices.map((i) => xValues[i])
    yValues = yIndices.map((i) => yValues[i])
  }
  if (xAxis.isCat && yAxis.isCat) {
    const indices: number[] = Array.from(Array(xValues.length).keys()).sort(
      (a, b) => {
        const xComp = xValues[a]
          .toString()
          .toLowerCase()
          .localeCompare(xValues[b].toString().toLowerCase())
        if (xComp !== 0) {
          return xComp
        }
        return yValues[a]
          .toString()
          .toLowerCase()
          .localeCompare(yValues[b].toString().toLowerCase())
      }
    )
    xValues = indices.map((i) => xValues[i])
    yValues = indices.map((i) => yValues[i])
  }

  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "scatter",
      x: xValues,
      y: yValues,
      marker: {
        color: rankPlotInfo.colors,
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
      hovertext: rankPlotInfo.hovertext,
    },
  ]
  plotly.react(plotDomId, plotData, layout)
}
