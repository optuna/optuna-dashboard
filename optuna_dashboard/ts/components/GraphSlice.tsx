import * as plotly from "plotly.js-dist-min"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
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
import {
  Target,
  useFilteredTrials,
  useObjectiveAndUserAttrTargets,
  useParamTargets,
} from "../trialFilter"
import { useMergedUnionSearchSpace } from "../searchSpace"

const plotDomId = "graph-slice"

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

  const [objectiveTargets, selectedObjective, setObjectiveTarget] =
    useObjectiveAndUserAttrTargets(study)
  const searchSpace = useMergedUnionSearchSpace(study?.union_search_space)
  const [paramTargets, selectedParamTarget, setParamTarget] =
    useParamTargets(searchSpace)
  const [logYScale, setLogYScale] = useState<boolean>(false)

  const trials = useFilteredTrials(
    study,
    selectedParamTarget !== null
      ? [selectedObjective, selectedParamTarget]
      : [selectedObjective],
    false,
    false
  )

  useEffect(() => {
    plotSlice(
      trials,
      selectedObjective,
      selectedParamTarget,
      searchSpace.find((s) => s.name === selectedParamTarget?.key) || null,
      logYScale,
      theme.palette.mode
    )
  }, [
    trials,
    selectedObjective,
    searchSpace,
    selectedParamTarget,
    logYScale,
    theme.palette.mode,
  ])

  const handleObjectiveChange = (event: SelectChangeEvent<string>) => {
    setObjectiveTarget(event.target.value)
  }

  const handleSelectedParam = (e: SelectChangeEvent<string>) => {
    setParamTarget(e.target.value)
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
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          Slice
        </Typography>
        {objectiveTargets.length !== 1 && (
          <FormControl component="fieldset">
            <FormLabel component="legend">Objective:</FormLabel>
            <Select
              value={selectedObjective.identifier()}
              onChange={handleObjectiveChange}
            >
              {objectiveTargets.map((t, i) => (
                <MenuItem value={t.identifier()} key={i}>
                  {t.toLabel(study?.objective_names)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {paramTargets.length !== 0 && selectedParamTarget !== null && (
          <FormControl component="fieldset">
            <FormLabel component="legend">Parameter:</FormLabel>
            <Select
              value={selectedParamTarget.identifier()}
              onChange={handleSelectedParam}
            >
              {paramTargets.map((t, i) => (
                <MenuItem value={t.identifier()} key={i}>
                  {t.toLabel()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
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
  objectiveTarget: Target,
  selectedParamTarget: Target | null,
  selectedParamSpace: SearchSpaceItem | null,
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
      title: selectedParamTarget?.toLabel() || "",
      type:
        selectedParamSpace !== null && isLogScale(selectedParamSpace)
          ? "log"
          : "linear",
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
    uirevision: "true",
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }
  if (
    selectedParamSpace === null ||
    selectedParamTarget === null ||
    trials.length === 0
  ) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const objectiveValues: number[] = trials.map(
    (t) => objectiveTarget.getTargetValue(t) as number
  )
  const values = trials.map(
    (t) => selectedParamTarget.getTargetValue(t) as number
  )

  const trialNumbers: number[] = trials.map((t) => t.number)
  if (selectedParamSpace.distribution.type !== "CategoricalDistribution") {
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
      title: selectedParamTarget.toLabel(),
      type: isLogScale(selectedParamSpace) ? "log" : "linear",
      gridwidth: 1,
      automargin: true, // Otherwise the label is outside of the plot
    }
    plotly.react(plotDomId, trace, layout)
  } else {
    const vocabArr = selectedParamSpace.distribution.choices.map((c) => c.value)
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
      title: selectedParamTarget.toLabel(),
      type: "linear",
      gridwidth: 1,
      tickvals: tickvals,
      ticktext: vocabArr,
      automargin: true, // Otherwise the label is outside of the plot
    }
    plotly.react(plotDomId, trace, layout)
  }
}
