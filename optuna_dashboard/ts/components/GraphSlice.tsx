import * as plotly from "plotly.js-dist-min"
import React, { ChangeEvent, FC, useEffect, useMemo, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  MenuItem,
  Switch,
  Select,
  Typography,
  SelectChangeEvent,
  useTheme,
  Box,
} from "@mui/material"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"
import { Target, useFilteredTrials, useObjectiveTargets } from "../trialFilter"
import { useSnackbar } from "notistack"

const plotDomId = "graph-slice"

const useSearchSpace = (
  unionSearchSpaces?: SearchSpaceItem[]
): SearchSpaceItem[] =>
  useMemo(
    () =>
      Array.from(unionSearchSpaces || []).sort((a, b) =>
        a.name > b.name ? 1 : a.name < b.name ? -1 : 0
      ),
    [unionSearchSpaces]
  )

const isLogScale = (s: SearchSpaceItem): boolean => {
  if (s.distribution.type === "CategoricalDistribution") {
    return false
  }
  return s.distribution.log
}

export const GraphSlice: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const { enqueueSnackbar } = useSnackbar()

  const [objectiveId, setObjectiveId] = useState<number>(0)
  const [selected, setSelected] = useState<SearchSpaceItem | null>(null)
  const [logYScale, setLogYScale] = useState<boolean>(false)
  const searchSpaces = useSearchSpace(study?.union_search_space)

  const targets = useObjectiveTargets(study)
  const filterTargets: Target[] = [targets[objectiveId]]
  if (selected !== null) filterTargets.push(new Target("params", selected.name))
  const trials = useFilteredTrials(study, filterTargets, false, false)

  const objectiveNames: string[] = study?.objective_names || []
  if (selected === null && searchSpaces.length > 0) {
    setSelected(searchSpaces[0])
  }

  useEffect(() => {
    plotSlice(
      trials,
      targets[objectiveId],
      selected,
      logYScale,
      theme.palette.mode
    )
  }, [trials, targets[objectiveId], selected, logYScale, theme.palette.mode])

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setObjectiveId(event.target.value as number)
  }

  const handleSelectedParam = (e: SelectChangeEvent<string>) => {
    const s = searchSpaces.find((s) => s.name === e.target.value)
    if (s === undefined) {
      enqueueSnackbar(
        `Cannot find ${e.target.value} param in the search space.`,
        {
          variant: "error",
        }
      )
      return
    }
    setSelected(s)
  }

  const handleLogYScaleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogYScale(!logYScale)
  }

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
          Slice
        </Typography>
        {study !== null && study.directions.length !== 1 && (
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
        )}
        <FormControl component="fieldset">
          <FormLabel component="legend">Parameter:</FormLabel>
          <Select value={selected?.name || ""} onChange={handleSelectedParam}>
            {searchSpaces?.map((s, i) => (
              <MenuItem value={s.name} key={i}>
                {objectiveNames.length === study?.directions.length
                  ? objectiveNames[i]
                  : `${i}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl component="fieldset">
          <FormLabel component="legend">Log y scale:</FormLabel>
          <Switch
            checked={logYScale}
            onChange={handleLogYScaleChange}
            value="enable"
          />
        </FormControl>
      </Grid>
      <Grid item xs={9}>
        <Box id={plotDomId} sx={{ height: "450px" }} />
      </Grid>
    </Grid>
  )
}

const plotSlice = (
  trials: Trial[],
  target: Target,
  selected: SearchSpaceItem | null,
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
      title: selected?.name || "",
      type: selected !== null && isLogScale(selected) ? "log" : "linear",
      gridwidth: 1,
      automargin: true,
    },
    yaxis: {
      title: "Objective Value",
      type: logYScale ? "log" : "linear",
      gridwidth: 1,
      automargin: true,
    },
    showlegend: false,
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }
  if (selected === null) {
    plotly.react(plotDomId, [], layout)
    return
  }
  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const objectiveValues: number[] = trials.map(
    (t) => target.getTargetValue(t) as number
  )
  const paramTarget = new Target("params", selected.name)
  const values = trials.map((t) => paramTarget.getTargetValue(t) as number)

  const trialNumbers: number[] = trials.map((t) => t.number)
  if (selected.distribution.type !== "CategoricalDistribution") {
    const trace: plotly.Data[] = [
      {
        type: "scatter",
        x: values,
        y: objectiveValues,
        mode: "markers",
        marker: {
          color: trialNumbers,
          colorscale: "Blues",
          reversescale: true,
          colorbar: {
            title: "Trial",
          },
          line: {
            color: "Grey",
            width: 0.5,
          },
        },
      },
    ]
    layout["xaxis"] = {
      title: selected.name,
      type: selected.distribution.log ? "log" : "linear",
      gridwidth: 1,
      automargin: true, // Otherwise the label is outside of the plot
    }
    plotly.react(plotDomId, trace, layout)
  } else {
    const vocabArr = selected.distribution.choices.map((c) => c.value)
    const tickvals: number[] = vocabArr.map((v, i) => i)
    const trace: plotly.Data[] = [
      {
        type: "scatter",
        x: values,
        y: objectiveValues,
        mode: "markers",
        marker: {
          color: trialNumbers,
          colorscale: "Blues",
          reversescale: true,
          colorbar: {
            title: "Trial",
          },
          line: {
            color: "Grey",
            width: 0.5,
          },
        },
      },
    ]
    layout["xaxis"] = {
      title: selected.name,
      type: "linear",
      gridwidth: 1,
      tickvals: tickvals,
      ticktext: vocabArr,
      automargin: true, // Otherwise the label is outside of the plot
    }
    plotly.react(plotDomId, trace, layout)
  }
}
