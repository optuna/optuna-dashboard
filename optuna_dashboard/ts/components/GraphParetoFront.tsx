import {
  Box,
  FormControl,
  FormLabel,
  Grid,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  useTheme,
} from "@mui/material"
import { getFeasibleTrials, getIsDominated, makeHovertext } from "@optuna/react"
import { StudyDirection, Trial } from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { StudyDetail } from "ts/types/optuna"
import { PlotType } from "../apiClient"
import { useConstants } from "../constantsProvider"
import { usePlot } from "../hooks/usePlot"
import { usePlotlyColorTheme } from "../state"
import { useBackendRender } from "../state"

const plotDomId = "graph-pareto-front"

export const GraphParetoFront: FC<{
  study: StudyDetail | null
  selectedTrials?: number[]
}> = ({ study = null, selectedTrials = null }) => {
  if (useBackendRender() && !selectedTrials) {
    return <GraphParetoFrontBackend study={study} />
  } else {
    return (
      <GraphParetoFrontFrontend study={study} selectedTrials={selectedTrials} />
    )
  }
}

const GraphParetoFrontBackend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const studyId = study?.id
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const { data, layout, error } = usePlot({
    numCompletedTrials,
    studyId,
    plotType: PlotType.ParetoFront,
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

  return <Box component="div" id={plotDomId} sx={{ height: "450px" }} />
}

const GraphParetoFrontFrontend: FC<{
  study: StudyDetail | null
  selectedTrials: number[] | null
}> = ({ study = null, selectedTrials = null }) => {
  const { url_prefix } = useConstants()

  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)
  const navigate = useNavigate()
  const [objectiveXId, setObjectiveXId] = useState<number>(0)
  const [objectiveYId, setObjectiveYId] = useState<number>(1)
  const metricNames: string[] = study?.metric_names || []

  const handleObjectiveXChange = (event: SelectChangeEvent<number>) => {
    setObjectiveXId(event.target.value as number)
  }

  const handleObjectiveYChange = (event: SelectChangeEvent<number>) => {
    setObjectiveYId(event.target.value as number)
  }

  useEffect(() => {
    if (study != null) {
      plotParetoFront(
        study,
        objectiveXId,
        objectiveYId,
        theme.palette.mode,
        colorTheme,
        selectedTrials
      )
      const element = document.getElementById(plotDomId)
      if (element != null) {
        // @ts-ignore
        element.on("plotly_click", (data) => {
          const plotTextInfo = JSON.parse(
            data.points[0].text.replace(/<br>/g, "")
          )
          navigate(
            url_prefix +
              `/studies/${study.id}/trials?numbers=${plotTextInfo.number}`
          )
        })
        return () => {
          // @ts-ignore
          element.removeAllListeners("plotly_click")
        }
      }
    }
  }, [
    study,
    selectedTrials,
    objectiveXId,
    objectiveYId,
    theme.palette.mode,
    colorTheme,
  ])

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
                    {metricNames.length === study?.directions.length
                      ? metricNames[i]
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
                    {metricNames.length === study?.directions.length
                      ? metricNames[i]
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
          component="div"
          id={plotDomId}
          sx={{
            height: "450px",
          }}
        />
      </Grid>
    </Grid>
  )
}

const filterFunc = (
  trial: Trial,
  selectedTrials: number[],
  directions: StudyDirection[],
  selected = true
): boolean => {
  if (selected) {
    return (
      selectedTrials.includes(trial.number) &&
      trial.state === "Complete" &&
      trial.values !== undefined &&
      trial.values.length === directions.length
    )
  } else {
    return (
      !selectedTrials.includes(trial.number) ||
      trial.state !== "Complete" ||
      trial.values === undefined ||
      trial.values.length !== directions.length
    )
  }
}

const makeScatterObject = (
  trials: Trial[],
  objectiveXId: number,
  objectiveYId: number,
  hovertemplate: string,
  dominated: boolean,
  feasible: boolean,
  unselected: boolean,
  mode: string
): Partial<plotly.PlotData> => {
  const marker = makeMarker(trials, dominated, feasible, unselected, mode)
  return {
    x: trials.map((t) =>
      t.values ? (t.values[objectiveXId] as number) : null
    ),
    y: trials.map((t) =>
      t.values ? (t.values[objectiveYId] as number) : null
    ),
    text: trials.map((t) => makeHovertext(t)),
    mode: "markers",
    hovertemplate: hovertemplate,
    marker: marker,
    showlegend: false,
  }
}

const makeMarker = (
  trials: Trial[],
  dominated: boolean,
  feasible: boolean,
  unselected: boolean,
  mode: string
): Partial<plotly.PlotData> => {
  if (feasible && dominated) {
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
  } else if (feasible && !dominated) {
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
  } else if (unselected) {
    return {
      line:
        mode === "dark"
          ? { width: 0.25, color: "#666666" }
          : { width: 0.5, color: "#cccccc" },
      // @ts-ignore
      color: "#ffffff00",
    }
  } else {
    return {
      // @ts-ignore
      color: mode === "dark" ? "#666666" : "#cccccc",
    }
  }
}

const plotParetoFront = (
  study: StudyDetail,
  objectiveXId: number,
  objectiveYId: number,
  mode: string,
  colorTheme: Partial<Plotly.Template>,
  selectedTrials: number[] | null
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
    template: colorTheme,
    uirevision: "true",
  }

  const trials: Trial[] = study ? study.trials : []
  if (selectedTrials === null || selectedTrials.length === 0) {
    selectedTrials = trials.map((t) => t.number)
  }
  const filteredTrials = trials.filter((t: Trial) =>
    filterFunc(t, selectedTrials, study.directions)
  )
  const unselectedTrials = trials.filter((t: Trial) =>
    filterFunc(t, selectedTrials, study.directions, false)
  )

  if (filteredTrials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const { feasibleTrials, infeasibleTrials } = getFeasibleTrials(
    filteredTrials,
    study
  )

  const normalizedValues: number[][] = []
  feasibleTrials.forEach((t) => {
    if (t.values && t.values.length === study.directions.length) {
      const trialValues = t.values.map((v, i) => {
        return study.directions[i] === "minimize"
          ? (v as number)
          : (-v as number)
      })
      normalizedValues.push(trialValues)
    }
  })

  const isDominated: boolean[] = getIsDominated(normalizedValues)

  const plotData: Partial<plotly.PlotData>[] = [
    makeScatterObject(
      unselectedTrials,
      objectiveXId,
      objectiveYId,
      "%{text}<extra>Unselected Trial</extra>",
      false,
      false,
      true,
      mode
    ),
    makeScatterObject(
      feasibleTrials.filter((t, i) => isDominated[i]),
      objectiveXId,
      objectiveYId,
      infeasibleTrials.length === 0
        ? "%{text}<extra>Trial</extra>"
        : "%{text}<extra>Feasible Trial</extra>",
      true,
      true,
      false,
      mode
    ),
    makeScatterObject(
      feasibleTrials.filter((t, i) => !isDominated[i]),
      objectiveXId,
      objectiveYId,
      "%{text}<extra>Best Trial</extra>",
      false,
      true,
      false,
      mode
    ),
    makeScatterObject(
      infeasibleTrials,
      objectiveXId,
      objectiveYId,
      "%{text}<extra>Infeasible Trial</extra>",
      false,
      false,
      false,
      mode
    ),
  ]

  plotly.react(plotDomId, plotData, layout)
}
