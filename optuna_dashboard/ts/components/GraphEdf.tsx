import { Box, Typography, useTheme } from "@mui/material"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useMemo, useState } from "react"
import { GraphComponentState, StudyDetail, Trial } from "ts/types/optuna"
import { CompareStudiesPlotType, getCompareStudiesPlotAPI } from "../apiClient"
import { useBackendRender, usePlotlyColorTheme } from "../state"
import { Target, useFilteredTrialsFromStudies } from "../trialFilter"
import GraphContainer from "./GraphContainer"

const getPlotDomId = (objectiveId: number) => `graph-edf-${objectiveId}`

interface EdfPlotInfo {
  study_name: string
  trials: Trial[]
}

export const GraphEdf: FC<{
  studies: StudyDetail[]
  objectiveId: number
}> = ({ studies, objectiveId }) => {
  if (useBackendRender()) {
    return <GraphEdfBackend studies={studies} />
  } else {
    return <GraphEdfFrontend studies={studies} objectiveId={objectiveId} />
  }
}

const GraphEdfBackend: FC<{
  studies: StudyDetail[]
}> = ({ studies }) => {
  const [graphComponentState, setGraphComponentState] =
    useState<GraphComponentState>("componentWillMount")
  useEffect(() => {
    setGraphComponentState("componentDidMount")
  }, [])

  const studyIds = studies.map((s) => s.id)
  const domId = getPlotDomId(-1)
  const numCompletedTrials = studies.reduce(
    (acc, study) =>
      acc + study?.trials.filter((t) => t.state === "Complete").length,
    0
  )
  useEffect(() => {
    if (studyIds.length === 0) {
      return
    }
    if (graphComponentState !== "componentWillMount") {
      getCompareStudiesPlotAPI(studyIds, CompareStudiesPlotType.EDF)
        .then(({ data, layout }) => {
          plotly.react(domId, data, layout).then(() => {
            setGraphComponentState("graphDidRender")
          })
        })
        .catch((err) => {
          console.error(err)
        })
    }
  }, [studyIds, numCompletedTrials, graphComponentState])
  return (
    <GraphContainer
      plotDomId={domId}
      graphComponentState={graphComponentState}
    />
  )
}

const GraphEdfFrontend: FC<{
  studies: StudyDetail[]
  objectiveId: number
}> = ({ studies, objectiveId }) => {
  const [graphComponentState, setGraphComponentState] =
    useState<GraphComponentState>("componentWillMount")
  useEffect(() => {
    setGraphComponentState("componentDidMount")
  }, [])

  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

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

  useEffect(() => {
    if (graphComponentState !== "componentWillMount") {
      plotEdf(edfPlotInfos, target, domId, colorTheme)?.then(() => {
        setGraphComponentState("graphDidRender")
      })
    }
  }, [studies, target, colorTheme, graphComponentState])

  return (
    <Box component="div">
      <Typography
        variant="h6"
        sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
      >
        {`EDF for ${target.toLabel(studies[0].objective_names)}`}
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
