import * as plotly from "plotly.js-dist"
import React, {FC, useEffect} from "react"

const plotDomId = "graph-contour"

export const GraphContour: FC <{
    trials: Trial[]
}> = ({ trials = [] }) => {
    useEffect(() => {
        plotContour(trials, 0)
    }, [trials])
    return <div id= {plotDomId} />
}

const plotContour = (trials: Trial[], objectiveId: number) => {
  if (document.getElementById(plotDomId) === null){
    return
  }

  const layout: Partial<plotly.Layout> = {
    title: "Contour",
    margin: {
      l:50, 
      r:50,
    },
  }

  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
  }

  const filteredTrials = trials.filter(
      (t) => t.state === "Complete" || t.state === "Pruned"
  )

  let paramNames = new Set<string>(trials[0]. params.map((p) => p.name))
  filteredTrials.forEach((t) => {
      paramNames = new Set<string>(
          t.params.filter((p) => paramNames.has(p.name)).map((p) => p.name)
      )
  })

  if (paramNames.size === 0 || paramNames.size === 1){
      plotly.react(plotDomId, [])
      return
  }
  const objectiveValues: number[] = filteredTrials.map(
      (t) => t.values![objectiveId]
  )
  let paramValues: {[key:number]:number[]} = []
  
  let i=0
  if(paramNames.size === 2){
  paramNames.forEach((paramName) => {
      const valueStrings = filteredTrials.map((t) => {
          const param = t.params.find((p) => p.name == paramName)
          return param!.value
      })
      const values: number[] = valueStrings.map((v) => parseFloat(v))
      paramValues[i] = values
      i++
  })

  let x_indice: number[] = paramValues[0].sort()
  let y_indice: number[] = paramValues[1].sort()
  console.log(x_indice)
  console.log(y_indice)

    let data: Partial<plotly.PlotData>[] = [
      {
          type: "contour",
        //   z: [objectiveValues],
        //   x: [0,1,2,3,4,5,6,7,8,9],
        //   y: [0,1,2,3,4,5,6,7,8,9],
        z: [[null, 6555.432866248336, 6398.264431306621, null, null, null, 940.4341819980103, 1010.8139523862947, null, null, 7181.640254856135, null], [null, null, null, 5045.796883055694, null, 409.8829237095467, null, null, null, 2422.8488853595736, null, null], [null, null, null, null, 428.6133223375032, null, null, null, 1051.2032089247634, null, null, null]],

         x:[-89.25791599036862, -80.97180290847139, -79.99540256356374, -71.03377283416455, -20.67881336869945, -20.245565531976297, 30.68279944851855, 31.809023128450434, 32.4068389221282, 49.22244290320802, 84.75045872947317, 93.0365718113704],
         y:['-1', '0', '1'],
          mode: "markers",
          marker:{
              color: "#000"
          },
          line:{
              color: "#000"
          }, 
          //@ts-ignore
          colorbar:{
              title: "Objective Value"
          },
          colorscale: "Blues",
          connectgaps: true,
          contours_coloring: "heatmap",
          hoverinfo: "none",
          line_smoothing: 1.3,


      }
   ]
   let updateLayout: Partial<plotly.Layout> = {
       title: "Contour",
       margin: {
           l:50,
           r:50
       }, 
   }
   
   console.log(data)
   console.log(paramValues[0])
   console.log(paramValues[1])
   console.log([[objectiveValues],[objectiveValues]])

   plotly.react(plotDomId, data, updateLayout)
}
else {
    plotly.react(plotDomId, [])
    return
}
}