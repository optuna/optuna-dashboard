import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import FormControlLabel from "@mui/material/FormControlLabel"
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { FC, useEffect, useMemo, useState } from "react"
import { DarkColorTemplates } from "./PlotlyColorTemplates"

const plotDomId = "graph-intermediate-values"

export const PlotIntermediateValues: FC<{
  trials: Optuna.Trial[]
  includePruned: boolean
  logScale: boolean
  colorTheme?: Partial<Plotly.Template>
  directions?: Optuna.StudyDirection[]
}> = ({ trials, includePruned, logScale, colorTheme, directions }) => {
  const theme = useTheme()
  const colorThemeUsed =
    colorTheme ??
    (theme.palette.mode === "dark" ? DarkColorTemplates.default : {})

  const [topKEnabled, setTopKEnabled] = useState<boolean>(false)
  const [topK, setTopK] = useState<number>(5)

  // Count trials that have final objective values (completed trials)
  const completedTrialsCount = useMemo(() => {
    return trials.filter(
      (t) => t.state === "Complete" && t.values && t.values.length > 0
    ).length
  }, [trials])

  // Calculate top K trial numbers based on their final objective values
  const topKTrialNumbers = useMemo(() => {
    if (!topKEnabled || !directions || directions.length === 0) {
      return null
    }

    // Get completed trials with values
    const completedTrials = trials.filter(
      (t) => t.state === "Complete" && t.values && t.values.length > 0
    )

    if (completedTrials.length === 0) {
      return null
    }

    // Sort by the first objective value
    const direction = directions[0]
    const sortedTrials = [...completedTrials].sort((a, b) => {
      const valA = a.values?.[0] ?? (direction === "minimize" ? Infinity : -Infinity)
      const valB = b.values?.[0] ?? (direction === "minimize" ? Infinity : -Infinity)
      return direction === "minimize" ? valA - valB : valB - valA
    })

    // Get the top K trial numbers
    return new Set(sortedTrials.slice(0, topK).map((t) => t.number))
  }, [trials, topKEnabled, topK, directions])

  useEffect(() => {
    plotIntermediateValue(
      trials,
      colorThemeUsed,
      false,
      !includePruned,
      logScale,
      topKTrialNumbers
    )
  }, [trials, colorThemeUsed, includePruned, logScale, topKTrialNumbers])

  // Available K options
  const kOptions = [1, 3, 5]

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "1em 0",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: theme.typography.fontWeightBold }}
        >
          Intermediate values
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={topKEnabled}
                onChange={(e) => setTopKEnabled(e.target.checked)}
                size="small"
              />
            }
            label="Show Top K only"
          />
          {topKEnabled && (
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel id="top-k-select-label">K</InputLabel>
              <Select
                labelId="top-k-select-label"
                value={topK}
                label="K"
                onChange={(e) => setTopK(Number(e.target.value))}
              >
                {kOptions.map((k) => (
                  <MenuItem key={k} value={k} disabled={k > completedTrialsCount}>
                    {k}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>
      <Box id={plotDomId} sx={{ height: "450px" }} />
    </>
  )
}

const plotIntermediateValue = (
  trials: Optuna.Trial[],
  colorTheme: Partial<Plotly.Template>,
  filterCompleteTrial: boolean,
  filterPrunedTrial: boolean,
  logScale: boolean,
  topKTrialNumbers: Set<number> | null
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
    yaxis: {
      title: "Objective Value",
      type: logScale ? "log" : "linear",
    },
    xaxis: {
      title: "Step",
      type: "linear",
    },
    uirevision: "true",
    template: colorTheme,
    legend: {
      x: 1.0,
      y: 0.95,
    },
  }
  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const filteredTrials = trials.filter(
    (t) =>
      (!filterCompleteTrial && t.state === "Complete") ||
      (!filterPrunedTrial &&
        t.state === "Pruned" &&
        t.values &&
        t.values.length > 0) ||
      t.state === "Running"
  )

  const plotData: Partial<plotly.PlotData>[] = filteredTrials.map((trial) => {
    const isFeasible = trial.constraints.every((c) => c <= 0)
    const isTopK = topKTrialNumbers === null || topKTrialNumbers.has(trial.number)
    const isVisible = topKTrialNumbers === null || isTopK || trial.state === "Running"

    return {
      x: trial.intermediate_values.map((iv) => iv.step),
      y: trial.intermediate_values.map((iv) => iv.value),
      marker: { maxdisplayed: 10 },
      mode: "lines+markers",
      type: "scatter",
      name: `trial #${trial.number} ${
        trial.state === "Running"
          ? "(running)"
          : !isFeasible
            ? "(infeasible)"
            : ""
      }`,
      visible: isVisible ? true : "legendonly",
      ...(!isFeasible && { line: { color: "#CCCCCC" } }),
    }
  })
  plotly.react(plotDomId, plotData, layout)
}
