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
import blue from "@mui/material/colors/blue"
import { useMergedUnionSearchSpace } from "../searchSpace"
import { usePlotlyColorTheme } from "../state"
import { getAxisInfo } from "../graphUtil"
import { PlotType } from "../apiClient"
import { useBackendRender } from "../state"
import { usePlot } from "../hooks/usePlot"

const plotDomId = "graph-contour"

export const Contour: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  if (useBackendRender()) {
    return <ContourBackend study={study} />
  } else {
    return <ContourFrontend study={study} />
  }
}

const ContourBackend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const studyId = study?.id
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const { data, layout, error } = usePlot({
    numCompletedTrials,
    studyId,
    plotType: PlotType.Contour,
  })

  useEffect(() => {
    if (data && layout) {
      plotly.react(plotDomId, data, layout)
    }
  }, [data, layout])
  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  return <Box id={plotDomId} sx={{ height: "450px" }} />
}

const ContourFrontend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

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
      plotContour(study, objectiveId, xParam, yParam, colorTheme)
    }
  }, [study, objectiveId, xParam, yParam, colorTheme])

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
          Contour
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
  colorTheme: Partial<Plotly.Template>
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const trials: Trial[] = study ? study.trials : []
  const filteredTrials = trials.filter((t) => filterFunc(t, objectiveId))
  if (filteredTrials.length < 2 || xParam === null || yParam === null) {
    plotly.react(plotDomId, [], {
      template: colorTheme,
    })
    return
  }

  const xAxis = getAxisInfo(trials, xParam)
  const yAxis = getAxisInfo(trials, yParam)
  const xIndices = xAxis.indices
  const yIndices = yAxis.indices

  const layout: Partial<plotly.Layout> = {
    xaxis: {
      title: xParam.name,
      type: xAxis.isCat ? "category" : xAxis.isLog ? "log" : "linear",
    },
    yaxis: {
      title: yParam.name,
      type: yAxis.isCat ? "category" : yAxis.isLog ? "log" : "linear",
    },
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 50,
    },
    uirevision: "true",
    template: colorTheme,
  }

  // TODO(c-bata): Support parameters that only have the single value
  if (xIndices.length <= 1 || yIndices.length <= 1) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const xValues: plotly.Datum[] = []
  const yValues: plotly.Datum[] = []
  const zValues: plotly.Datum[][] = new Array(yIndices.length)
  const feasibleXY = new Set<number>()
  for (let j = 0; j < yIndices.length; j++) {
    zValues[j] = new Array(xIndices.length).fill(null)
  }

  filteredTrials.forEach((trial, i) => {
    if (xAxis.values[i] && yAxis.values[i] && trial.values) {
      if (trial.constraints.every((c) => c <= 0)) {
        feasibleXY.add(xValues.length)
      }
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

  if (!study.is_preferential) {
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
        x: xValues.filter((_, i) => feasibleXY.has(i)),
        y: yValues.filter((_, i) => feasibleXY.has(i)),
        marker: { line: { width: 2.0, color: "Grey" }, color: "black" },
        mode: "markers",
        showlegend: false,
      },
      {
        type: "scatter",
        x: xValues.filter((_, i) => !feasibleXY.has(i)),
        y: yValues.filter((_, i) => !feasibleXY.has(i)),
        marker: { line: { width: 2.0, color: "Grey" }, color: "#cccccc" },
        mode: "markers",
        showlegend: false,
      },
    ]
    plotly.react(plotDomId, plotData, layout)
    return
  }

  layout.legend = {
    y: 0.8,
  }
  const bestTrialIndices = study.best_trials.map((trial) => trial.number)
  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "scatter",
      x: xValues.filter((_, i) => bestTrialIndices.includes(i)),
      y: yValues.filter((_, i) => bestTrialIndices.includes(i)),
      marker: {
        line: { width: 2.0, color: "Grey" },
        color: blue[200],
      },
      name: "best trials",
      mode: "markers",
    },
    {
      type: "scatter",
      x: xValues.filter((_, i) => !bestTrialIndices.includes(i)),
      y: yValues.filter((_, i) => !bestTrialIndices.includes(i)),
      marker: { line: { width: 2.0, color: "Grey" }, color: "black" },
      name: "others",
      mode: "markers",
    },
  ]
  plotly.react(plotDomId, plotData, layout)
}
