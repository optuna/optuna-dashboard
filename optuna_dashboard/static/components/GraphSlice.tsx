import * as plotly from "plotly.js-basic-dist"
import React, { FC, useEffect } from "react"


const plotDomId = "graph-slice"


export const GraphSlice: FC<{
  trials: Trial[]
}> = ({ trials = [] }) => {
  useEffect(() => {
    plotSlice(trials, 0)
  }, [trials])
  return <div id={plotDomId} />
}

  const plotSlice = (trials: Trial[], objectiveId: number) => {
    if (document.getElementById(plotDomId) === null) {
      return
    }

    const layout: Partial<plotly.Layout> = {
        title: "Slice",
        margin: {
          l: 50,
          r: 50,
          b: 0,
        },
    }

    if (trials.length === 0) {
        plotly.react(plotDomId, [], layout)
        return
    }

    let filteredTrials = trials.filter(
        (t) => t.state === "Complete" || t.state === "Pruned"
      )
        
    let paramNames = new Set<string>(trials[0].params.map((p) => p.name))
     filteredTrials.forEach((t) => {
       paramNames = new Set<string>(
        t.params.filter((p) => paramNames.has(p.name)).map((p) => p.name)
       )
    })

    const objectiveValues: number[] = filteredTrials.map(
      (t) => t.values![objectiveId]
   )

    if (paramNames.size === 0) {        
        plotly.react(plotDomId, [])
        return 
    }
    else{
      let  trace: Partial<plotly.PlotData> =  {
        type: "scatter",
        x:[],
        y:[],
        mode :"markers",
        xaxis : "x",
        marker:{
          color: "#185799"
        }
      }
      let updatelayout: Partial<plotly.Layout> = {
        title: "Slice",
        margin: {
          l: 50,
          r: 50,
          b: 0,
        },
        grid: {
          rows: 1,
          columns: paramNames.size,
          pattern:'coupled'
        },
        xaxis : {
          title: "x",
          zerolinecolor: "white",
          zerolinewidth: 1.5,
          linecolor: "#f2f5fa",
          linewidth: 5,
          gridcolor: "#f2f5fa",
          gridwidth:1,
        },
        yaxis:{
          title:"Objective Values",
          zerolinecolor: "#f2f5fa",
          zerolinewidth: 2,
          linecolor: "#f2f5fa",
          linewidth: 5,
          gridcolor: "#f2f5fa",
          gridwidth:1
        },
        plot_bgcolor: "#E5ecf6",
        showlegend: false
      } 
      let traces: Partial<plotly.PlotData>[]= []
      let i=1
      paramNames.forEach((paramName) => {
        const valueStrings = filteredTrials.map((t) => {
          const param = t.params.find((p) => p.name == paramName)
          return param!.value
        })
        const values: number[] = valueStrings.map((v) => parseFloat(v))
          
        const axisx: string = `x${i}`
        if(i==1){
          trace = {
            type: "scatter",
            x: values,
            y: objectiveValues,
            mode :"markers",
            xaxis : "x",
            marker:{
              color:"#185799"
            }
          }
        }
        else{
          trace  = {
            type: "scatter",
            x: values,
            y: objectiveValues, 
            mode :"markers",
            xaxis : axisx,
            marker: {
              color: "#185799"
            }
          }
          
          type foo = keyof plotly.Layout
          //@ts-ignore
          const axisname:foo = `xaxis${i}`
          //@ts-ignore
          updatelayout[axisname] = {
          title: paramName,
          zerolinecolor: "#f2f5fa",
          zerolinewidth: 2,
          linecolor: "#f2f5fa",
          linewidth: 5,
          gridcolor: "#f2f5fa",
          gridwidth:1
          }
          
        }
        traces.push(trace)
        i++
      })       
      
      const plotData: Partial<plotly.PlotData>[] = traces
      plotly.react(plotDomId, plotData, updatelayout)

    } 

  }
  
    