import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { Grid, Typography, useTheme } from "@mui/material"
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
          Timeline
        </Typography>
      </Grid>
      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

const plotTimeline = (trials: Trial[], mode: string) => {
  const lastTrials = trials.slice(-maxBars) // Only show last elements
  const cm: Record<TrialState, string> = {
    Complete: "blue",
    Fail: "red",
    Pruned: "orange",
    Running: "green",
    Waiting: "gray",
  }

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
      title: "Datetime",
      type: "date",
    },
    yaxis: {
      title: "Trial",
    },
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }

  plotly.react(plotDomId, [], layout)
  for (const s of Object.keys(cm) as TrialState[]) {
    const bars = lastTrials.filter((t) => t.state === s)
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
    plotly.addTraces(plotDomId, trace)
  }
}
