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
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { StudyDetail, Trial } from "ts/types/optuna"
import { useConstants } from "../constantsProvider"
import { makeHovertext } from "../graphUtil"
import { usePlotlyColorTheme } from "../state"

const plotDomId = "graph-pareto-front"

export const GraphTCParetoFront: FC<{
  study: StudyDetail | null
  selectedTrials: number[]
}> = ({ study = null, selectedTrials }) => {
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
        selectedTrials,
        objectiveXId,
        objectiveYId,
        theme.palette.mode,
        colorTheme
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
  directions: Optuna.StudyDirection[]
): boolean => {
  return (
    selectedTrials.includes(trial.number) &&
    trial.state === "Complete" &&
    trial.values !== undefined &&
    trial.values.length === directions.length
  )
}

const makeScatterObject = (
  trials: Trial[],
  objectiveXId: number,
  objectiveYId: number,
  hovertemplate: string,
  dominated: boolean,
  feasible: boolean,
  mode: string
): Partial<plotly.PlotData> => {
  const marker = makeMarker(trials, dominated, feasible, mode)
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
  } else {
    return {
      // @ts-ignore
      color: mode === "dark" ? "#666666" : "#cccccc",
    }
  }
}

const getIsDominatedND = (normalizedValues: number[][]) => {
  // Fallback for straight-forward pareto front algorithm (O(N^2) complexity).
  const isDominated: boolean[] = []
  normalizedValues.forEach((values0: number[]) => {
    const dominated = normalizedValues.some((values1: number[]) => {
      if (values0.every((value0: number, k: number) => values1[k] === value0)) {
        return false
      }
      return values0.every((value0: number, k: number) => values1[k] <= value0)
    })
    isDominated.push(dominated)
  })
  return isDominated
}

const getIsDominated2D = (normalizedValues: number[][]) => {
  // Fast pareto front algorithm (O(N log N) complexity).
  const sorted = normalizedValues
    .map((values, i) => [values[0], values[1], i])
    .sort((a, b) =>
      a[0] > b[0]
        ? 1
        : a[0] < b[0]
          ? -1
          : a[1] > b[1]
            ? 1
            : a[1] < b[1]
              ? -1
              : 0
    )
  let maxValueSeen0 = sorted[0][0]
  let minValueSeen1 = sorted[0][1]

  const isDominated: boolean[] = new Array(normalizedValues.length).fill(false)
  sorted.forEach((values) => {
    if (
      values[1] > minValueSeen1 ||
      (values[1] === minValueSeen1 && values[0] > maxValueSeen0)
    ) {
      isDominated[values[2]] = true
    } else {
      minValueSeen1 = values[1]
    }
    maxValueSeen0 = values[0]
  })
  return isDominated
}

const getIsDominated1D = (normalizedValues: number[][]) => {
  const best_value = Math.min(...normalizedValues.map((values) => values[0]))
  return normalizedValues.map((values) => values[0] !== best_value)
}

const getIsDominated = (normalizedValues: number[][]) => {
  if (normalizedValues.length === 0) {
    return []
  }
  if (normalizedValues[0].length === 1) {
    return getIsDominated1D(normalizedValues)
  } else if (normalizedValues[0].length === 2) {
    return getIsDominated2D(normalizedValues)
  } else {
    return getIsDominatedND(normalizedValues)
  }
}

const plotParetoFront = (
  study: StudyDetail,
  selectedTrials: number[],
  objectiveXId: number,
  objectiveYId: number,
  mode: string,
  colorTheme: Partial<Plotly.Template>
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const xmin = Math.min(
    ...study.trials.map((t) => t.values?.[objectiveXId] as number)
  )
  const xmax = Math.max(
    ...study.trials.map((t) => t.values?.[objectiveXId] as number)
  )
  const ymin = Math.min(
    ...study.trials.map((t) => t.values?.[objectiveYId] as number)
  )
  const ymax = Math.max(
    ...study.trials.map((t) => t.values?.[objectiveYId] as number)
  )

  const layout: Partial<plotly.Layout> = {
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 0,
    },
    template: colorTheme,
    uirevision: "true",
    xaxis: {
      range: [xmin - (xmax - xmin) * 0.1, xmax + (xmax - xmin) * 0.1],
    },
    yaxis: {
      range: [ymin - (ymax - ymin) * 0.1, ymax + (ymax - ymin) * 0.1],
    },
  }

  const trials: Trial[] = study ? study.trials : []
  if (selectedTrials === null || selectedTrials.length === 0) {
    selectedTrials = trials.map((t) => t.number)
  }
  const filteredTrials = trials.filter((t: Trial) =>
    filterFunc(t, selectedTrials, study.directions)
  )

  if (filteredTrials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const feasibleTrials: Trial[] = []
  const infeasibleTrials: Trial[] = []
  filteredTrials.forEach((t) => {
    if (t.constraints.every((c) => c <= 0)) {
      feasibleTrials.push(t)
    } else {
      infeasibleTrials.push(t)
    }
  })

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
      feasibleTrials.filter((t, i) => isDominated[i]),
      objectiveXId,
      objectiveYId,
      infeasibleTrials.length === 0
        ? "%{text}<extra>Trial</extra>"
        : "%{text}<extra>Feasible Trial</extra>",
      true,
      true,
      mode
    ),
    makeScatterObject(
      feasibleTrials.filter((t, i) => !isDominated[i]),
      objectiveXId,
      objectiveYId,
      "%{text}<extra>Best Trial</extra>",
      false,
      true,
      mode
    ),
    makeScatterObject(
      infeasibleTrials,
      objectiveXId,
      objectiveYId,
      "%{text}<extra>Infeasible Trial</extra>",
      false,
      false,
      mode
    ),
  ]

  plotly.react(plotDomId, plotData, layout)
}
