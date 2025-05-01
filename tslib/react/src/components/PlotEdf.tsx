import { Box, Typography, useTheme } from "@mui/material"
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { FC, useEffect, useMemo } from "react"
import { useGraphComponentState } from "../hooks/useGraphComponentState"
import { Target, useFilteredTrialsFromStudies } from "../utils/trialFilter"
import { GraphContainer } from "./GraphContainer"
import { DarkColorTemplates } from "./PlotlyColorTemplates"

export type EdfPlotInfo = {
  study_name: string
  trials: Optuna.Trial[]
}

const getPlotDomId = (objectiveId: number) => `plot-edf-${objectiveId}`

export const PlotEdf: FC<{
  studies: Optuna.Study[]
  objectiveId: number
  colorTheme?: Partial<Plotly.Template>
}> = ({ studies, objectiveId, colorTheme }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const theme = useTheme()
  const colorThemeUsed =
    colorTheme ??
    (theme.palette.mode === "dark" ? DarkColorTemplates.default : {})

  const domId = getPlotDomId(objectiveId)
  const target = useMemo<Target>(
    () => new Target("objective", objectiveId),
    [objectiveId]
  )
  const trials = useFilteredTrialsFromStudies(studies, [target], false)
  const edfPlotInfos = studies.map((study, index) => {
    const e: EdfPlotInfo = {
      study_name: study?.name,
      trials: trials[index],
    }
    return e
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (graphComponentState !== "componentWillMount") {
      plotEdf(edfPlotInfos, target, domId, colorThemeUsed)?.then(
        notifyGraphDidRender
      )
    }
  }, [studies, target, colorThemeUsed, graphComponentState])

  return (
    <Box component="div">
      <Typography
        variant="h6"
        sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
      >
        {`EDF for ${target.toLabel(studies[0].metric_names)}`}
      </Typography>
      <GraphContainer
        plotDomId={domId}
        graphComponentState={graphComponentState}
      />
    </Box>
  )
}

const plotEdf = (
  edfPlotInfos: EdfPlotInfo[],
  target: Target,
  domId: string,
  colorTheme: Partial<Plotly.Template>
) => {
  if (document.getElementById(domId) === null) {
    return
  }
  if (edfPlotInfos.length === 0) {
    return plotly.react(domId, [], {
      template: colorTheme,
    })
  }

  const target_name = "Objective Value"
  const layout: Partial<plotly.Layout> = {
    xaxis: {
      title: target_name,
    },
    yaxis: {
      title: "Cumulative Probability",
    },
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 50,
    },
    template: colorTheme,
    legend: {
      x: 1.0,
      y: 0.95,
    },
  }

  const plotData: Partial<plotly.PlotData>[] = edfPlotInfos.map((h) => {
    const values = h.trials.map((t) => target.getTargetValue(t) as number)
    const numValues = values.length
    const minX = Math.min(...values)
    const maxX = Math.max(...values)
    const numStep = 100
    const _step = (maxX - minX) / (numStep - 1)

    const xValues = []
    const yValues = []
    for (let i = 0; i < numStep; i++) {
      const boundary_right = minX + _step * i
      xValues.push(boundary_right)
      yValues.push(values.filter((v) => v <= boundary_right).length / numValues)
    }

    return {
      type: "scatter",
      name: `${h.study_name}`,
      x: xValues,
      y: yValues,
    }
  })
  return plotly.react(domId, plotData, layout)
}
