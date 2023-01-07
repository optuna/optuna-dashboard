import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useMemo } from "react"
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
import {
  Target,
  useFilteredTrials,
  useObjectiveAndSystemAttrTargets,
} from "../trialFilter"

const plotDomId = "graph-parallel-coordinate"

export const GraphParallelCoordinate: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const theme = useTheme()
  const [targets, selected, setTarget] = useObjectiveAndSystemAttrTargets(study)
  const filterTargets = useMemo<Target[]>(
    () => [
      ...(study !== null
        ? study.intersection_search_space.map(
            (s) => new Target("params", s.name)
          )
        : []),
      ...(selected !== null ? [selected] : []),
    ],
    [study?.intersection_search_space, selected]
  )
  const trials = useFilteredTrials(study, filterTargets, false, false)

  const handleObjectiveChange = (event: SelectChangeEvent<string>) => {
    setTarget(event.target.value)
  }

  useEffect(() => {
    if (study !== null) {
      plotCoordinate(study, trials, selected, theme.palette.mode)
    }
  }, [study, trials, selected, theme.palette.mode])

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
          Parallel Coordinate
        </Typography>
        {study !== null && targets.length >= 2 ? (
          <FormControl component="fieldset">
            <FormLabel component="legend">Objective:</FormLabel>
            <Select
              value={selected.identifier()}
              onChange={handleObjectiveChange}
            >
              {targets.map((t, i) => (
                <MenuItem value={t.identifier()} key={i}>
                  {t.toLabel(study.objective_names)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Grid>
      <Grid item xs={9}>
        <Box id={plotDomId} sx={{ height: "450px" }} />
      </Grid>
    </Grid>
  )
}

const plotCoordinate = (
  study: StudyDetail,
  trials: Trial[],
  target: Target | null,
  mode: string
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    margin: {
      l: 70,
      t: 50,
      r: 50,
      b: 100,
    },
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }
  if (trials.length === 0 || target === null) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const maxLabelLength = 40
  const breakLength = maxLabelLength / 2
  const ellipsis = "…"
  const truncateLabelIfTooLong = (originalLabel: string): string => {
    return originalLabel.length > maxLabelLength
      ? originalLabel.substring(0, maxLabelLength - ellipsis.length) + ellipsis
      : originalLabel
  }
  const breakLabelIfTooLong = (originalLabel: string): string => {
    const truncated = truncateLabelIfTooLong(originalLabel)
    return truncated
      .split("")
      .map((c, i) => {
        return (i + 1) % breakLength == 0 ? c + "<br>" : c
      })
      .join("")
  }

  // Intersection param names
  const objectiveValues: number[] = trials.map(
    (t) => target.getTargetValue(t) as number
  )
  const dimensions = [
    {
      label: target.toLabel(study.objective_names),
      values: objectiveValues,
      range: [Math.min(...objectiveValues), Math.max(...objectiveValues)],
    },
  ]
  study.intersection_search_space.forEach((s) => {
    const values: number[] = trials.map(
      (t) => t.params.find((p) => p.name === s.name)!.param_internal_value
    )
    if (s.distribution.type !== "CategoricalDistribution") {
      dimensions.push({
        label: breakLabelIfTooLong(s.name),
        values: values,
        range: [s.distribution.low, s.distribution.high],
      })
    } else {
      // categorical
      const vocabArr: string[] = s.distribution.choices.map((c) => c.value)
      const tickvals: number[] = vocabArr.map((v, i) => i)
      dimensions.push({
        label: breakLabelIfTooLong(s.name),
        values: values,
        range: [0, s.distribution.choices.length - 1],
        // @ts-ignore
        tickvals: tickvals,
        ticktext: vocabArr,
      })
    }
  })
  const objectiveId = target.getObjectiveId()
  const reversescale =
    objectiveId !== null && study.directions.length > objectiveId
      ? study.directions[objectiveId] === "maximize"
      : "minimize"
  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "parcoords",
      dimensions: dimensions,
      labelangle: 30,
      labelside: "bottom",
      line: {
        color: dimensions[0]["values"],
        // @ts-ignore
        colorscale: "Blues",
        colorbar: {
          title: target.toLabel(study.objective_names),
        },
        showscale: true,
        reversescale: reversescale,
      },
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
