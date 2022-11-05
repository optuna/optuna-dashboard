import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  Typography,
  SelectChangeEvent,
  useTheme,
  Box,
} from "@mui/material"

import { getParamImportances } from "../apiClient"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"
import { useSnackbar } from "notistack"
const plotDomId = "graph-hyperparameter-importances"

export const GraphHyperparameterImportances: FC<{
  study: StudyDetail | null
  studyId: number
}> = ({ study = null, studyId }) => {
  const theme = useTheme()
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const [importances, setImportances] = useState<ParamImportances | null>(null)
  const { enqueueSnackbar } = useSnackbar()

  const handleObjectiveChange = (event: SelectChangeEvent<number>) => {
    setObjectiveId(event.target.value as number)
  }

  useEffect(() => {
    if (numCompletedTrials > 0) {
      getParamImportances(studyId, objectiveId)
        .then((p) => {
          setImportances(p)
        })
        .catch((err) => {
          const reason = err.response?.data.reason
          enqueueSnackbar(
            `Failed to load hyperparameter importance (reason=${reason})`,
            {
              variant: "error",
            }
          )
        })
    }
  }, [numCompletedTrials, objectiveId, theme.palette.mode])

  useEffect(() => {
    if (importances !== null) {
      plotParamImportances(importances, theme.palette.mode)
    }
  }, [importances, theme.palette.mode])

  return (
    <Grid container direction="row">
      <Grid
        item
        xs={3}
        container
        direction="column"
        sx={{ paddingRight: theme.spacing(2) }}
      >
        <Typography variant="h6" sx={{ margin: "1em 0", fontWeight: 600 }}>
          Hyperparameter importance
        </Typography>
        {study !== null && study.directions.length !== 1 ? (
          <FormControl component="fieldset">
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
      <Grid item xs={9}>
        <Box id={plotDomId} sx={{ height: "450px" }} />
      </Grid>
    </Grid>
  )
}

const plotParamImportances = (
  paramsImportanceData: ParamImportances,
  mode: string
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }
  const param_importances = [
    ...paramsImportanceData.param_importances,
  ].reverse()
  const importance_values = param_importances.map((p) => p.importance)
  const param_names = param_importances.map((p) => p.name)
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
    template: mode === "dark" ? plotlyDarkTemplate : {},
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
        color: "rgb(66,146,198)",
      },
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
