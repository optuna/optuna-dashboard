import {
  Box,
  FormControl,
  FormLabel,
  Grid,
  Link,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
  useTheme,
} from "@mui/material"
import blue from "@mui/material/colors/blue"
import {
  GraphContainer,
  getAxisInfo,
  useGraphComponentState,
  useMergedUnionSearchSpace,
} from "@optuna/react"
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useMemo, useState } from "react"
import { StudyDetail, Trial } from "ts/types/optuna"
import { PlotType } from "../apiClient"
import { usePlot } from "../hooks/usePlot"
import { usePlotlyColorTheme } from "../state"
import { useBackendRender } from "../state"

const plotDomId = "graph-contour"
const CONTOUR_DISABLED_THRESHOLD = 100

export const Contour: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const isBackendRender = useBackendRender()
  const [loadAnyway, setLoadAnyway] = useState(false)
  const shouldContourDisabled = useMemo(
    () => (study?.trials.length ?? 0) > CONTOUR_DISABLED_THRESHOLD,
    [study]
  )

  if (shouldContourDisabled && !loadAnyway) {
    return <DisabledContour onLoadAnywayClicked={() => setLoadAnyway(true)} />
  }
  if (isBackendRender) {
    return <ContourBackend study={study} />
  }
  return <ContourFrontend study={study} />
}

const DisabledContour: FC<{
  onLoadAnywayClicked: () => void
}> = ({ onLoadAnywayClicked }) => {
  const theme = useTheme()
  return (
    <Box component="div" id={plotDomId}>
      <Typography
        variant="h6"
        sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
      >
        Contour
      </Typography>

      <Stack
        direction="column"
        spacing={1}
        alignItems="center"
        sx={{
          margin: "1em 0",
        }}
      >
        <Typography variant="body1" color={theme.palette.grey[700]}>
          High number of trials makes processing this plot slow; disabled by
          default.
        </Typography>
        <Link
          component="button"
          sx={{ fontWeight: theme.typography.fontWeightBold }}
          onClick={onLoadAnywayClicked}
        >
          Load plot anyway
        </Link>
      </Stack>
    </Box>
  )
}

const ContourBackend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const studyId = study?.id
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const { data, layout, error } = usePlot({
    numCompletedTrials,
    studyId,
    plotType: PlotType.Contour,
  })

  useEffect(() => {
    if (data && layout && graphComponentState !== "componentWillMount") {
      plotly.react(plotDomId, data, layout).then(notifyGraphDidRender)
    }
  }, [data, layout, graphComponentState])
  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  return (
    <GraphContainer
      plotDomId={plotDomId}
      graphComponentState={graphComponentState}
    />
  )
}

const ContourFrontend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

  const [objectiveId, setObjectiveId] = useState<number>(0)
  const searchSpace = useMergedUnionSearchSpace(study?.union_search_space)
  const [xParam, setXParam] = useState<Optuna.SearchSpaceItem | null>(null)
  const [yParam, setYParam] = useState<Optuna.SearchSpaceItem | null>(null)
  const metricNames: string[] = study?.metric_names || []

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
    if (study != null && graphComponentState !== "componentWillMount") {
      plotContour(study, objectiveId, xParam, yParam, colorTheme)?.then(
        notifyGraphDidRender
      )
    }
  }, [study, objectiveId, xParam, yParam, colorTheme, graphComponentState])

  const space: Optuna.SearchSpaceItem[] = study ? study.union_search_space : []

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
                  {metricNames.length === study?.directions.length
                    ? metricNames[i]
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
        <GraphContainer
          plotDomId={plotDomId}
          graphComponentState={graphComponentState}
        />
      </Grid>
    </Grid>
  )
}

const filterFunc = (trial: Trial): boolean => {
  return trial.state === "Complete" && trial.values !== undefined
}

const plotContour = (
  study: StudyDetail,
  objectiveId: number,
  xParam: Optuna.SearchSpaceItem | null,
  yParam: Optuna.SearchSpaceItem | null,
  colorTheme: Partial<Plotly.Template>
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const trials: Trial[] = study ? study.trials : []
  const filteredTrials = trials.filter((t) => filterFunc(t))
  if (filteredTrials.length < 2 || xParam === null || yParam === null) {
    return plotly.react(plotDomId, [], {
      template: colorTheme,
    })
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
    return plotly.react(plotDomId, [], layout)
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
    return plotly.react(plotDomId, plotData, layout)
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
  return plotly.react(plotDomId, plotData, layout)
}
