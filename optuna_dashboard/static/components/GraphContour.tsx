import * as plotly from "plotly.js-dist"
import React, { FC, useEffect } from "react"

const plotDomId = "graph-contour"

export const GraphContour: FC<{
  trials: Trial[]
}> = ({ trials = [] }) => {
  useEffect(() => {
    plotContour(trials, 0)
  }, [trials])
  return <div id={plotDomId} />
}

const plotContour = (trials: Trial[], objectiveId: number) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    title: "Contour",
    margin: {
      l: 50,
      r: 50,
    },
  }

  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
  }

  const filteredTrials = trials.filter(
    (t) => t.state === "Complete" || t.state === "Pruned"
  )

  let paramNames = new Set<string>(trials[0].params.map((p) => p.name))
  filteredTrials.forEach((t) => {
    paramNames = new Set<string>(
      t.params.filter((p) => paramNames.has(p.name)).map((p) => p.name)
    )
  })

  if (paramNames.size === 0 || paramNames.size === 1) {
    plotly.react(plotDomId, [])
    return
  }
  const objectiveValues: number[] = filteredTrials.map(
    (t) => t.values![objectiveId]
  )

  let paramValuesNumeric: { [key: number]: number[] } = []
  let paramValues: { [key: number]: string[]} = []

  let i = 0
  if (paramNames.size === 2) {
    paramNames.forEach((paramName) => {
      const valueStrings = filteredTrials.map((t) => {
        const param = t.params.find((p) => p.name == paramName)
        return param!.value
      })
      const values: number[] = valueStrings.map((v) => parseFloat(v))
      paramValuesNumeric[i] = values
      paramValues[i] = valueStrings
      i++
    })
    
    let x_indice = paramValuesNumeric[0].sort((a,b) => a>b ? 1: -1).map(String)
    let y_indice = paramValuesNumeric[1].sort((a,b) => a>b ? 1: -1).map(String)


    let x_indices : string[] =[]
    let y_indices : string[] =[]
    x_indice.forEach(element => {
        if(!x_indices.includes(element)){
            x_indices.push(element)
        }
    })
    y_indice.forEach(element => {
        if(!y_indices.includes(element)){
            y_indices.push(element)
        }
    })
    let z: number[][] = []
    for(let j=0; j<y_indices.length; j++){
      z[j] = []
    }
    for(let j=0; j<filteredTrials.length ;j++){
       let x_i = x_indices.indexOf(paramValues[0][j])
       let y_i = y_indices.indexOf(paramValues[1][j])
       z[y_i][x_i] = objectiveValues[j]
    }
       
    let data: Partial<plotly.PlotData>[] = [
      {
        type: "contour",
        z: z,
        x: x_indices,
        y: y_indices,
        mode: "markers",
        marker: {
          color: "#000",
        },
        line: {
          color: "#000",
        },
        //@ts-ignore
        colorbar: {
          title: "Objective Value",
        },
        colorscale: "Blues",
        connectgaps: true,
        contours_coloring: "heatmap",
        hoverinfo: "none",
        line_smoothing: 1.3,
      },
      {
        type: "scatter",
        x: paramValues[0],
        y: paramValues[1],
        mode: "markers",
        marker: {
          color: "#000"
        }
      }
    ]
    let updateLayout: Partial<plotly.Layout> = {
      title: "Contour",
      margin: {
        l: 50,
        r: 50,
      },
    }

    plotly.react(plotDomId, data, updateLayout)
  } else {
    plotly.react(plotDomId, [])
    return
  }
}
