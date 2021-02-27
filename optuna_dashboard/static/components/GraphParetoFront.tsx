import * as plotly from "plotly.js-dist"
import React, { FC, useEffect } from "react"

const plotDomId = "graph-pareto-front"

export const GraphParetoFront: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {

  useEffect(() => {
    if (study != null) {
      plotParetoFront(study)
    }
  }, [study])

  return <div id={plotDomId} />
}

const plotParetoFront = (study: StudyDetail) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  if (study.directions.length != 2) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    title: "Pareto-front plot",
    margin: {
      l: 50,
      r: 50,
      b: 0,
    },
  }

  const trials: Trial[] = (study !== null) && study.best_trials ? study.best_trials : []
  console.log(study.best_trials)
  console.log('length', trials.length)
  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const pointColors = Array(trials.length).fill("blue")

  const plotData: Partial<plotly.PlotData>[] = [
    {
        type: "scatter",
        x: trials.map((t: Trial): number => t.values![0]),
        y: trials.map((t: Trial): number => t.values![1]),
        mode: "markers",
        marker: {
          color: pointColors,
        },
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
