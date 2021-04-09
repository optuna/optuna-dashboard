import * as plotly from "plotly.js-dist"
import React, { FC, useEffect } from "react"

const plotDomId = "graph-parallel-coordinate"

export const GraphParallelCoordinate: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  useEffect(() => {
    if (study !== null) {
      plotCoordinate(study, 0) // TODO(c-bata): Support multi-objective studies.
    }
  }, [study])
  return <div id={plotDomId} />
}

const plotCoordinate = (study: StudyDetail, objectiveId: number) => {
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

  if (study.trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const filteredTrials = study.trials.filter(
    (t) =>
      t.state === "Complete" ||
      (t.state === "Pruned" && t.values && t.values.length > 0)
  )

  // Intersection param names
  const objectiveValues: number[] = filteredTrials.map(
    (t) => t.values![objectiveId]
  )
  const dimensions = [
    {
      label: "Objective value",
      values: objectiveValues,
      range: [Math.min(...objectiveValues), Math.max(...objectiveValues)],
    },
  ]
  study.intersection_search_space.forEach((s) => {
    const valueStrings = filteredTrials.map((t) => {
      const param = t.params.find((p) => p.name === s.name)
      return param!.value
    })
    const isnum = valueStrings.every((v) => {
      return !isNaN(parseFloat(v))
    })
    if (isnum) {
      const values: number[] = valueStrings.map((v) => parseFloat(v))
      dimensions.push({
        label: s.name,
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
        label: s.name,
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
