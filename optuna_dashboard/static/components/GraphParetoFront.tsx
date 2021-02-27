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

  let normalizedValues: number[][] = []
  completedTrials.forEach((t) => {
    if (t.values && t.values.length == dim) {
      const trialValues = t.values.map(
        (v: number, i: number) => {
          return (study.directions[i] === "minimize") ? v : -v
        }
      )
      normalizedValues.push(trialValues)
    }
  })

  const pointColors: string[] = []
  normalizedValues.forEach((values0: number[], i: number) => {
    let dominated = false

    dominated = normalizedValues.some((values1: number[], j: number) => {
      if (i === j) {
        return false
      }
      return values0.every((value0: number, k: number) => {
        return values1[k] <= value0
      })
    })

    if (dominated) { pointColors.push("blue") } else { pointColors.push("red") }
  })

  const plotData: Partial<plotly.PlotData>[] = [
    {
        type: "scatter",
        x: completedTrials.map((t: Trial): number => { return t.values![0]}),
        y: completedTrials.map((t: Trial): number => { return t.values![1]}),
        mode: "markers",
        xaxis: "Objective 0",
        yaxis: "Objective 1",
        marker: {
          color: pointColors
        },
        text: completedTrials.map((t: Trial): string => {
          return JSON.stringify({
            "number": t.number,
            "values": t.values,
            "params": t.params,
          }, null, 2).replaceAll("\n", "<br>")
	}),
        hovertemplate: "%{text}<extra></extra>",
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
