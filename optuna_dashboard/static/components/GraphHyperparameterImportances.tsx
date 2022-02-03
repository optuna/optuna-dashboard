import * as plotly from "plotly.js-dist"
import React, { FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  Typography,
} from "@material-ui/core"
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles"

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      margin: "1em 0",
    },
    formControl: {
      marginBottom: theme.spacing(2),
      marginRight: theme.spacing(5),
    },
  })
)

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
  FloatDistribution: plotlyColorsSequentialBlues.slice(-1)[0],
  UniformDistribution: plotlyColorsSequentialBlues.slice(-1)[0],
  LogUniformDistribution: plotlyColorsSequentialBlues.slice(-1)[0],
  DiscreteUniformDistribution: plotlyColorsSequentialBlues.slice(-1)[0],
  IntDistribution: plotlyColorsSequentialBlues.slice(-2)[0],
  IntUniformDistribution: plotlyColorsSequentialBlues.slice(-2)[0],
  IntLogUniformDistribution: plotlyColorsSequentialBlues.slice(-2)[0],
  CategoricalDistribution: plotlyColorsSequentialBlues.slice(-4)[0],
}

export const GraphHyperparameterImportances: FC<{
  study: StudyDetail | null
  studyId: number
}> = ({ study = null, studyId }) => {
  const classes = useStyles()
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const numOfTrials = study?.trials.length || 0

  const handleObjectiveChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setObjectiveId(event.target.value as number)
  }

  useEffect(() => {
    async function fetchAndPlotParamImportances(
      studyId: number,
      objectiveId: number
    ) {
      const paramsImportanceData = await getParamImportances(
        studyId,
        objectiveId
      )
      plotParamImportances(paramsImportanceData)
    }

    if (numOfTrials > 0) {
      fetchAndPlotParamImportances(studyId, objectiveId)
    }
  }, [numOfTrials, objectiveId])

  return (
    <Grid container direction="row">
      <Grid item xs={3}>
        <Grid container direction="column">
          <Typography variant="h6" className={classes.title}>
            Hyperparameter importance
          </Typography>
          {study !== null && study.directions.length !== 1 ? (
            <FormControl component="fieldset" className={classes.formControl}>
              <FormLabel component="legend">Objective ID:</FormLabel>
              <Select value={objectiveId} onChange={handleObjectiveChange}>
                {study.directions.map((d, i) => (
                  <MenuItem value={i} key={i}>
                    {i}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
        </Grid>
      </Grid>

      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
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
    xaxis: {
      title: `Importance for ${paramsImportanceData.target_name}`,
    },
    yaxis: {
      title: "Hyperparameter",
      automargin: true,
    },
    margin: {
      l: 50,
      t: 0,
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
