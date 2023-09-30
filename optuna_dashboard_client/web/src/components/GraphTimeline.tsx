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

  const lastTrials = trials.slice(-maxBars) // To only show last elements
  const minDatetime = new Date(
    Math.min(
      ...lastTrials.map(
        (t) => t.datetime_start?.getTime() ?? new Date().getTime()
      )
    )
  )
  const maxDatetime = new Date(
    Math.max(
      ...lastTrials.map(
        (t) => t.datetime_start?.getTime() ?? minDatetime.getTime()
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

  const traces: Partial<plotly.PlotData>[] = []
  for (const s of Object.keys(cm) as TrialState[]) {
    const bars = trials.filter((t) => t.state === s)
    if (bars.length === 0) {
      continue
    }
    const starts = bars.map((b) => b.datetime_start ?? new Date())
    const completes = bars.map((b, i) => b.datetime_complete ?? starts[i])
    const trace: Partial<plotly.PlotData> = {
      type: "bar",
      x: starts.map((s, i) => completes[i].getTime() - s.getTime()),
      y: bars.map((b) => b.number),
      // @ts-ignore: To suppress ts(2322)
      base: starts.map((s) => s.toISOString()),
      name: s,
      text: bars.map((b) => makeHovertext(b)),
      hovertemplate: "%{text}<extra>" + s + "</extra>",
      orientation: "h",
      marker: { color: cm[s] },
      textposition: "none", // Avoid drawing hovertext in a bar.
    }
    traces.push(trace)
  }
  plotly.react(plotDomId, traces, layout)
}
