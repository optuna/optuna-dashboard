import * as plotly from "plotly.js-dist"
import React, { FC, useEffect } from "react"
import { getParamImportances } from "../apiClient"
const plotDomId = "graph-hyperparameter-importances"

// To match colors used by plot_param_importances in optuna.
const plotlyColorsSequentialBlues = [
  "rgb(247,251,255)",
  "rgb(222,235,247)",
  "rgb(198,219,239)",
  "rgb(158,202,225)",
  "rgb(107,174,214)",
  "rgb(66,146,198)",
  "rgb(33,113,181)",
  "rgb(8,81,156)",
  "rgb(8,48,107)",
]

const distributionColors = {
  UniformDistribution: plotlyColorsSequentialBlues.slice(-1)[0],
  LogUniformDistribution: plotlyColorsSequentialBlues.slice(-1)[0],
  DiscreteUniformDistribution: plotlyColorsSequentialBlues.slice(-1)[0],
  IntUniformDistribution: plotlyColorsSequentialBlues.slice(-2)[0],
  IntLogUniformDistribution: plotlyColorsSequentialBlues.slice(-2)[0],
  CategoricalDistribution: plotlyColorsSequentialBlues.slice(-4)[0],
}

export const HyperparameterImportances: FC<{
  studyId: number
  numOfTrials: number
}> = ({ studyId, numOfTrials = 0 }) => {
  useEffect(() => {
    async function fetchAndPlotParamImportances(studyId: number) {
      const paramsImportanceData = await getParamImportances(studyId)
      plotParamImportances(paramsImportanceData)
    }
    fetchAndPlotParamImportances(studyId)
  }, [numOfTrials])
  return <div id={plotDomId} />
}

const plotParamImportances = (paramsImportanceData: ParamImportances) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }
  const param_importances = paramsImportanceData.param_importances.reverse()
  const importance_values = param_importances.map((p) => p.importance)
  const param_names = param_importances.map((p) => p.name)
  const param_colors = param_importances.map(
    (p) => distributionColors[p.distribution]
  )
  const param_hover_templates = param_importances.map(
    (p) => `${p.name} (${p.distribution}): ${p.importance} <extra></extra>`
  )

  const layout: Partial<plotly.Layout> = {
    title: "Hyperparameter Importance",
    xaxis: {
      title: `Importance for ${paramsImportanceData.target_name}`,
    },
    yaxis: {
      title: "Hyperparameter",
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
    },
    showlegend: false,
  }

  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "bar",
      orientation: "h",
      x: importance_values,
      y: param_names,
      text: importance_values.map((v) => String(v.toFixed(2))),
      textposition: "outside",
      hovertemplate: param_hover_templates,
      marker: {
        color: param_colors,
      },
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
