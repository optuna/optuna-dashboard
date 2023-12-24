import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { Card, CardContent, Grid, Typography, useTheme } from "@mui/material"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"
import { makeHovertext } from "../graphUtil"

const plotDomId = "graph-timeline"
const maxBars = 100

export const GraphTimeline: FC<{
  study: StudyDetail | null
}> = ({ study }) => {
  const theme = useTheme()

  const trials = study?.trials ?? []

  useEffect(() => {
    if (study !== null) {
      plotTimeline(trials, theme.palette.mode)
    }
  }, [trials, theme.palette.mode])

  return (
    <Card>
      <CardContent>
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          Timeline
        </Typography>
        <Grid item xs={9}>
          <div id={plotDomId} />
        </Grid>
      </CardContent>
    </Card>
  )
}

const plotTimeline = (trials: Trial[], mode: string) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  if (trials.length === 0) {
    plotly.react(plotDomId, [], {
      template: mode === "dark" ? plotlyDarkTemplate : {},
    })
    return
  }

  const cm: Record<TrialState, string> = {
    Complete: "blue",
    Fail: "red",
    Pruned: "orange",
    Running: "green",
    Waiting: "gray",
  }
  const runningKey = "Running"

  const lastTrials = trials.slice(-maxBars) // To only show last elements
  const minDatetime = new Date(
    Math.min(
      ...lastTrials.map(
        (t) => t.datetime_start?.getTime() ?? new Date().getTime()
      )
    )
  )
  const maxRunDuration = Math.max(
    ...trials.map((t) => {
      return t.datetime_start === undefined || t.datetime_complete === undefined
        ? -Infinity
        : t.datetime_complete.getTime() - t.datetime_start.getTime()
    })
  )
  const hasRunning =
    (maxRunDuration === -Infinity &&
      trials.some((t) => t.state === runningKey)) ||
    trials.some((t) => {
      if (t.state !== runningKey) {
        return false
      }
      const start = t.datetime_start?.getTime() ?? new Date().getTime()
      const now = new Date().getTime()
      // This is an ad-hoc handling to check if the trial is running.
      // We do not check via `trialState` because some trials may have state=RUNNING,
      // even if they are not running because of unexpected job kills.
      // In this case, we would like to ensure that these trials will not squash the timeline plot
      // for the other trials.
      return now - start < maxRunDuration * 5
    })
  const maxDatetime = hasRunning
    ? new Date()
    : new Date(
        Math.max(
          ...lastTrials.map(
            (t) => t.datetime_complete?.getTime() ?? minDatetime.getTime()
          )
        )
      )
  const layout: Partial<plotly.Layout> = {
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 0,
    },
    xaxis: {
      title: "Datetime",
      type: "date",
      range: [minDatetime.toISOString(), maxDatetime.toISOString()],
    },
    yaxis: {
      title: "Trial",
      range: [lastTrials[0].number, lastTrials[0].number + lastTrials.length],
    },
    uirevision: "true",
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  const makeTrace = (bars: Trial[], state: string, color: string) => {
    const isRunning = state === runningKey
    const starts = bars.map((b) => b.datetime_start ?? new Date())
    const runDurations = bars.map((b, i) => {
      const startTime = starts[i].getTime()
      const completeTime = isRunning
        ? maxDatetime.getTime()
        : b.datetime_complete?.getTime() ?? startTime
      // By using 1 as the min value, we can recognize these bars at least when zooming in.
      return Math.max(1, completeTime - startTime)
    })
    const trace: Partial<plotly.PlotData> = {
      type: "bar",
      x: runDurations,
      y: bars.map((b) => b.number),
      // @ts-ignore: To suppress ts(2322)
      base: starts.map((s) => s.toISOString()),
      name: state,
      text: bars.map((b) => makeHovertext(b)),
      hovertemplate: "%{text}<extra>" + state + "</extra>",
      orientation: "h",
      marker: { color: color },
      textposition: "none", // Avoid drawing hovertext in a bar.
    }
    return trace
  }

  const traces: Partial<plotly.PlotData>[] = []
  for (const [state, color] of Object.entries(cm)) {
    const bars = trials.filter((t) => t.state === state)
    if (bars.length === 0) {
      continue
    }
    if (state === "Complete") {
      const feasibleTrials = bars.filter((t) =>
        t.constraints.every((c) => c <= 0)
      )
      const infeasibleTrials = bars.filter((t) =>
        t.constraints.some((c) => c > 0)
      )
      if (feasibleTrials.length > 0) {
        traces.push(makeTrace(feasibleTrials, "Complete", color))
      }
      if (infeasibleTrials.length > 0) {
        traces.push(makeTrace(infeasibleTrials, "Infeasible", "#cccccc"))
      }
    } else {
      traces.push(makeTrace(bars, state, color))
    }
  }
  plotly.react(plotDomId, traces, layout)
}
