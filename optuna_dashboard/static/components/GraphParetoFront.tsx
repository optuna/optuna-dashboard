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

  const dim: number = study.directions.length
  if (dim != 2) {
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

  const trials: Trial[] = study !== null ? study.trials : []
  const completedTrials = trials.filter(
    (t) => t.state === "Complete"
  )

  if (completedTrials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const normalizedValues: number[][] = []
  completedTrials.forEach((t) => {
    if (t.values && t.values.length == dim) {
      let values: number[] = t.values
      values.forEach((v: number, i: number) => {
        if (study.directions[i] === "maximize") {
          values[i] = -v
        }
      })
      normalizedValues.push(values)
    }
  })

  const pointColors: string[] = []
  normalizedValues.forEach((values0: number[], i: number) => {
    let dominated: boolean = false

    dominated = normalizedValues.some((values1: number[], j: number) => {
      if (i === j) {
        return false
      }
      return values0.every((value0: number, k: number) => {
        return value0 <= values1[k]
      })
    })

    if (dominated) { pointColors.push("blue") } else { pointColors.push("red") }
  })

  const plotData: Partial<plotly.PlotData>[] = [
    {
        type: "scatter",
        x: completedTrials.map((t: Trial): number => t.values![0]),
        y: completedTrials.map((t: Trial): number => t.values![1]),
        mode: "markers",
        marker: {
          color: pointColors,
        },
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
