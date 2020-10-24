import * as plotly from "plotly.js-dist"
import React, { FC, useEffect } from "react"

const plotDomId = "graph-parallel-coordinate"

export const GraphParallelCoordinate: FC<{
  trials: Trial[]
}> = ({ trials = [] }) => {
  useEffect(() => {
    plotCoordinate(trials)
  }, [trials])
  return <div id={plotDomId} />
}

const plotCoordinate = (trials: Trial[]) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    title: "Parallel coordinate",
    margin: {
      l: 50,
      r: 50,
      b: 0,
    },
  }

  if (trials.length === 0) {
    plotly.react(plotDomId, [])
    return
  }
  let filteredTrials = trials.filter(
    (t) => t.state === "Complete" || t.state === "Pruned"
  )

  // Intersection param names
  let paramNames = new Set<string>(trials[0].params.map((p) => p.name))
  filteredTrials.forEach((t) => {
    paramNames = new Set<string>(
      t.params.filter((p) => paramNames.has(p.name)).map((p) => p.name)
    )
  })

  if (paramNames.size === 0) {
    plotly.react(plotDomId, [])
    return
  }

  const objectiveValues: number[] = filteredTrials.map((t) => t.value!)
  let dimensions = [
    {
      label: "Objective value",
      values: objectiveValues,
      range: [Math.min(...objectiveValues), Math.max(...objectiveValues)],
    },
  ]
  paramNames.forEach((paramName) => {
    const valueStrings = filteredTrials.map((t) => {
      const param = t.params.find((p) => p.name == paramName)
      return param!.value
    })
    const isnum = valueStrings.every((v) => {
      return /^-?\d+\.\d+$/.test(v)
    })
    if (isnum) {
      const values: number[] = valueStrings.map((v) => parseFloat(v))
      dimensions.push({
        label: paramName,
        values: values,
        range: [Math.min(...values), Math.max(...values)],
      })
    } else {
      // categorical
      const vocabSet = new Set<string>(valueStrings)
      const vocabArr = Array.from<string>(vocabSet)
      const values: number[] = valueStrings.map((v) =>
        vocabArr.findIndex((vocab) => v === vocab)
      )
      const tickvals: number[] = vocabArr.map((v, i) => i)
      dimensions.push({
        label: paramName,
        values: values,
        range: [Math.min(...values), Math.max(...values)],
        // @ts-ignore
        tickvals: tickvals,
        ticktext: vocabArr,
      })
    }
  })
  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "parcoords",
      // @ts-ignore
      dimensions: dimensions,
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
