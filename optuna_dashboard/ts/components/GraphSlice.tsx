import * as plotly from "plotly.js-dist"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  InputLabel,
  MenuItem,
  Switch,
  Select,
  Typography,
  SelectChangeEvent,
  useTheme,
  Box,
} from "@mui/material"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"

const plotDomId = "graph-slice"

// TODO(c-bata): Check `log` field of IntDistribution and FloatDistribution.
const logDistributions = ["LogUniformDistribution", "IntLogUniformDistribution"]

export const GraphSlice: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const trials: Trial[] = study !== null ? study.trials : []
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [logXScale, setLogXScale] = useState<boolean>(false)
  const [logYScale, setLogYScale] = useState<boolean>(false)
  const paramNames = study?.union_search_space.map((s) => s.name)
  const distributions = new Map(
    study?.union_search_space.map((s) => [s.name, s.distribution])
  )
  if (selected === null && paramNames && paramNames.length > 0) {
    const distribution = distributions.get(paramNames[0]) || ""
    setSelected(paramNames[0])
    setLogXScale(logDistributions.includes(distribution))
  }

  useEffect(() => {
    plotSlice(
      trials,
      objectiveId,
      selected,
      logXScale,
      logYScale,
      theme.palette.mode
    )
  }, [trials, objectiveId, selected, logXScale, logYScale, theme.palette.mode])

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setObjectiveId(event.target.value as number)
  }

  const handleSelectedParam = (e: SelectChangeEvent<string>) => {
    const paramName = e.target.value
    const distribution = distributions.get(paramName) || ""
    setSelected(paramName)
    setLogXScale(logDistributions.includes(distribution))
  }

  const handleLogYScaleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setLogYScale(!logYScale)
  }

  return (
    <Grid container direction="row">
      <Grid item xs={3}>
        <Grid container direction="column">
          <Typography variant="h6" sx={{ margin: "1em 0", fontWeight: 600 }}>
            Slice
          </Typography>
          {study !== null && study.directions.length !== 1 ? (
            <FormControl
              component="fieldset"
              sx={{
                marginBottom: theme.spacing(2),
                marginRight: theme.spacing(5),
              }}
            >
              <FormLabel component="legend">Objective ID:</FormLabel>
              <Select value={objectiveId} onChange={handleObjectiveChange}>
                {study.directions.map((d, i) => (
                  <MenuItem value={i} key={i}>
                    {i}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          <FormControl
            component="fieldset"
            sx={{
              marginBottom: theme.spacing(2),
              marginRight: theme.spacing(5),
            }}
          >
            <InputLabel id="parameter">Parameter</InputLabel>
            <Select value={selected || ""} onChange={handleSelectedParam}>
              {paramNames?.map((p, i) => (
                <MenuItem value={p} key={i}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            component="fieldset"
            sx={{
              marginBottom: theme.spacing(2),
              marginRight: theme.spacing(5),
            }}
          >
            <FormLabel component="legend">Log y scale:</FormLabel>
            <Switch
              checked={logYScale}
              onChange={handleLogYScaleChange}
              value="enable"
            />
          </FormControl>
        </Grid>
      </Grid>
      <Grid item xs={9}>
        <Box
          id={plotDomId}
          sx={{
            height: "450px",
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(256, 256, 256, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
            borderRadius: "5px",
          }}
        />
      </Grid>
    </Grid>
  )
}

const filterFunc = (
  trial: Trial,
  objectiveId: number,
  selected: string | null
): boolean => {
  if (trial.state !== "Complete" && trial.state !== "Pruned") {
    return false
  }
  if (trial.params.find((p) => p.name == selected) === undefined) {
    return false
  }
  if (trial.values === undefined) {
    return false
  }
  return (
    trial.values.length > objectiveId && trial.values[objectiveId] !== "inf"
  )
}

const plotSlice = (
  trials: Trial[],
  objectiveId: number,
  selected: string | null,
  logXScale: boolean,
  logYScale: boolean,
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
    xaxis: {
      title: selected || "",
      type: logXScale ? "log" : "linear",
      gridwidth: 1,
      automargin: true,
    },
    yaxis: {
      title: "Objective Values",
      type: logYScale ? "log" : "linear",
      gridwidth: 1,
      automargin: true,
    },
    showlegend: false,
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  const filteredTrials = trials.filter((t) =>
    filterFunc(t, objectiveId, selected)
  )

  if (filteredTrials.length === 0 || selected === null) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const objectiveValues: number[] = filteredTrials.map(
    (t) => t.values![objectiveId] as number
  )
  const valueStrings = filteredTrials.map((t) => {
    return t.params.find((p) => p.name == selected)!.value
  })

  const isnum = valueStrings.every((v) => {
    return !isNaN(parseFloat(v))
  })
  if (isnum) {
    const valuesNum: number[] = valueStrings.map((v) => parseFloat(v))
    const trace: plotly.Data[] = [
      {
        type: "scatter",
        x: valuesNum,
        y: objectiveValues,
        mode: "markers",
      },
    ]
    layout["xaxis"] = {
      title: selected,
      type: logXScale ? "log" : "linear",
      gridwidth: 1,
      automargin: true, // Otherwise the label is outside of the plot
    }
    plotly.react(plotDomId, trace, layout)
  } else {
    const vocabSet = new Set<string>(valueStrings)
    const vocabArr = Array.from<string>(vocabSet)
    const valuesCategorical: number[] = valueStrings.map((v) =>
      vocabArr.findIndex((vocab) => v === vocab)
    )
    const tickvals: number[] = vocabArr.map((v, i) => i)
    const trace: plotly.Data[] = [
      {
        type: "scatter",
        x: valuesCategorical,
        y: objectiveValues,
        mode: "markers",
      },
    ]
    layout["xaxis"] = {
      title: selected,
      type: logXScale ? "log" : "linear",
      gridwidth: 1,
      tickvals: tickvals,
      ticktext: vocabArr,
      automargin: true, // Otherwise the label is outside of the plot
    }
    plotly.react(plotDomId, trace, layout)
  }
}
