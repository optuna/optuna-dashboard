import * as plotly from "plotly.js-dist"
import React, { FC, useEffect } from "react"

const plotDomId = "graph-edf"

export const Edf: FC<{
  trials: Trial[]
}> = ({ trials = [] }) => {
  useEffect(() => {
    plotEdf(trials) // TODO(chenghuzi): Support multi-objective studies.
  }, [trials])
  return <div id={plotDomId} />
}

const plotEdf = (trials: Trial[]) => {
  // Notice that this implementation is only for single study case
  // as it's designed for single study details.
  if (document.getElementById(plotDomId) === null) {
    return
  }
  if (trials.length === 0) {
    plotly.react(plotDomId, [])
    return
  }

  const target_name = "Objective Value"

  const _target = (t: Trial): number => {
    return t && t.values && t.values[0]
  }

  const target = _target

  const layout: Partial<plotly.Layout> = {
    title: "Empirical Distribution Function Plot",
    xaxis: {
      title: target_name,
    },
    yaxis: {
      title: "Cumulative Probability",
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
    },
  }

  const completedTrials = trials.filter((t) => t.state === "Complete")

  if (completedTrials.length === 0) {
    plotly.react(plotDomId, [])
    return
  }

  const values = completedTrials.map((t) => target(t))
  const numValues = values.length
  const minX = Math.min(...values)
  const maxX = Math.max(...values)
  const numStep = 100
  const _step = (maxX - minX) / (numStep - 1)

  const xValues = []
  const yValues = []
  for (let i = 0; i < numStep; i++) {
    const boundary_right = minX + _step * i
    xValues.push(boundary_right)
    yValues.push(values.filter((v) => v <= boundary_right).length / numValues)
  }

  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "scatter",
      x: xValues,
      y: yValues,
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
