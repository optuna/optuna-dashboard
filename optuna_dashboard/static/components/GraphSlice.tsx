import * as plotly from "plotly.js-dist"
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
    

    if (paramNames.size === 0) {
        plotly.react(plotDomId, [])
        return 
    }
    
    const objectiveValues: number[] = filteredTrials.map(
       (t) => t.values![objectiveId]
    )
    
    let dimensions = [
      {
        label: "Objective value",
        values: objectiveValues,
        range: [Math.min(...objectiveValues), Math.max(...objectiveValues)]
      }
    ]
    if(paramNames.size ===1){
      dimensions = [{
        label: "objective values",
        values: objectiveValues,
        range: [Math.min(...objectiveValues), Math.max(...objectiveValues)],
      }]
      const plotData: Partial<plotly.PlotData>[] = [
        {
          type: "scatter",
          //@ts-ignore
          dimensions: dimensions,
          mode: "markers",
          // xpad: 40
        },
      ]
      return plotly.react(plotDomId, plotData, layout)
    }
    else{
      let i=0
      let  trace =  {
        type: "scatter",
        dimensions :dimensions, 
        mode :"markers",
        xaxis : "x"
      }

       let traces :{type: string, dimensions: { label: string; values: number[]; range: number[]; }[], mode: string, xaxis: string} [] = undefined
      
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
          dimensions = [{
            label: paramName,
            values: values,
            range: [Math.min(...values), Math.max(...values)],
          }]
        } 
        trace = {
          type: "scatter",
          dimensions: dimensions,
          mode:"markers",
          xaxis: `x ${i}`
        }

        traces.push(trace)           

      })
      const plotData: Partial<plotly.PlotData>[] = traces
    
      plotly.react(plotDomId, plotData, layout)
    }

  }


    
    