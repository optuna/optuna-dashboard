import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { Card, CardContent, Grid, Typography, useTheme } from "@mui/material"
import { makeHovertext } from "../graphUtil"
import { getColorTemplate } from "./PlotlyColorTemplates"
import { plotlyColorTheme } from "../state"
import { useRecoilValue } from "recoil"

const plotDomId = "graph-timeline"
const maxBars = 100

export const GraphTimeline: FC<{
  study: StudyDetail | null
}> = ({ study }) => {
  const theme = useTheme()

  const trials = study?.trials ?? []
  const colorTheme = useRecoilValue<PlotlyColorTheme>(plotlyColorTheme)

  useEffect(() => {
    if (study !== null) {
      plotTimeline(trials, theme.palette.mode, colorTheme)
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

const plotTimeline = (
  trials: Trial[],
  mode: string,
  colorTheme: PlotlyColorTheme
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  if (trials.length === 0) {
    plotly.react(plotDomId, [], {
      template: getColorTemplate(mode, colorTheme),
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
    template: getColorTemplate(mode, colorTheme),
  }

  const makeTrace = (bars: Trial[], state: string, color: string) => {
    const starts = bars.map((b) => b.datetime_start ?? new Date())
    const completes = bars.map((b, i) => b.datetime_complete ?? starts[i])
    const trace: Partial<plotly.PlotData> = {
      type: "bar",
      x: starts.map((s, i) => completes[i].getTime() - s.getTime()),
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
