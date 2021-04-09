import * as plotly from "plotly.js-dist"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  FormLabel,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@material-ui/core"
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles"

const plotDomId = "graph-contour"

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      margin: "1em 0",
    },
    formControl: {
      marginBottom: theme.spacing(2),
      marginRight: theme.spacing(2),
    },
  })
)

const getParamNames = (trials: Trial[]): string[] => {
  const paramSet = new Set<string>(
    ...trials.map<string[]>((t) => t.params.map((p) => p.name))
  )
  return Array.from(paramSet)
}

export const GraphContour: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const trials: Trial[] = study !== null ? study.trials : []
  const classes = useStyles()
  const [paramNames, setParamNames] = useState<string[]>([])
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const [xAxis, setXAxis] = useState<string | null>(null)
  const [yAxis, setYAxis] = useState<string | null>(null)

  useEffect(() => {
    if (trials.length === 0 || paramNames.length !== 0) {
      return
    }
    const filteredTrials = trials.filter(
      (t) =>
        t.state === "Complete" ||
        (t.state === "Pruned" && t.values && t.values.length > 0)
    )

    const p = getParamNames(filteredTrials)
    if (p.length === 0 || p.length === paramNames.length) {
      return
    }
    setParamNames(p)
    if (p.length < 2 && xAxis !== null && yAxis !== null) {
      return
    }
    setXAxis(p[0])
    setYAxis(p[1])
  }, [trials])

  const handleObjectiveChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setObjectiveId(event.target.value as number)
  }

  const handleXAxisChange = (e: ChangeEvent<{ value: unknown }>) => {
    setXAxis(e.target.value as string)
  }

  const handleYAxisChange = (e: ChangeEvent<{ value: unknown }>) => {
    setYAxis(e.target.value as string)
  }

  useEffect(() => {
    if (study !== null) {
      plotContour(study, objectiveId, xAxis, yAxis, paramNames)
    }
  }, [study, objectiveId, xAxis, yAxis, paramNames])

  return (
    <Grid container direction="row">
      <Grid item xs={3}>
        <Grid container direction="column">
          <Typography variant="h6" className={classes.title}>Contour</Typography>
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
          <FormControl component="fieldset" className={classes.formControl}>
            <InputLabel id="parameter1">X Axis Parameter</InputLabel>
            <Select value={xAxis || ""} onChange={handleXAxisChange}>
              {paramNames.map((x) => (
                <MenuItem value={x} key={x}>
                  {x}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl component="fieldset" className={classes.formControl}>
            <InputLabel id="parameter2">Y Axis Parameter</InputLabel>
            <Select value={yAxis || ""} onChange={handleYAxisChange}>
              {paramNames.map((x) => (
                <MenuItem value={x} key={x}>
                  {x}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

const plotContour = (
  study: StudyDetail,
  objectiveId: number,
  xAxis: string | null,
  yAxis: string | null,
  paramNames: string[]
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 0,
    },
    xaxis: {
      gridcolor: "#f2f5fa",
      gridwidth: 1,
      zerolinecolor: "#f2f5fa",
      zerolinewidth: 1.5,
    },
    yaxis: {
      gridcolor: "#f2f5fa",
      gridwidth: 1,
      zerolinecolor: "#f2f5fa",
      zerolinewidth: 1.5,
    },
    plot_bgcolor: "#E5ecf6",
  }

  const trials: Trial[] = study !== null ? study.trials : []

  const filteredTrials = trials.filter(
    (t) =>
      t.state === "Complete" ||
      (t.state === "Pruned" && t.values && t.values.length > 0)
  )

  if (filteredTrials.length === 0 || xAxis === null || yAxis === null) {
    plotly.react(plotDomId, [], layout)
  }

  if (paramNames.length === 0 || paramNames.length === 1) {
    plotly.react(plotDomId, [], layout)
    return
  }
  if (xAxis === yAxis) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const objectiveValues: number[] = filteredTrials.map(
    (t) => t.values![objectiveId]
  )

  const paramValues: { [key: number]: string[] } = []
  const paramIndices: Array<string> = []

  if (paramNames.length >= 2) {
    paramNames.forEach((paramName, index) => {
      const valueStrings = filteredTrials.map((t) => {
        const param = t.params.find((p) => p.name == paramName)
        return param!.value
      })
      paramValues[index] = valueStrings
      paramIndices[index] = paramName
    })

    const paramCategorical = { ...paramValues }
    let xIndex = 0
    let yIndex = 0
    if (typeof xAxis === "string" && typeof yAxis === "string") {
      xIndex = paramIndices.indexOf(xAxis)
      yIndex = paramIndices.indexOf(yAxis)
    }

    const xIndice = paramCategorical[xIndex].sort((a, b) => (a > b ? 1 : -1))
    const yIndice = paramCategorical[yIndex].sort((a, b) => (a > b ? 1 : -1))

    const xIndices: string[] = []
    const yIndices: string[] = []

    xIndice.forEach((element) => {
      if (!xIndices.includes(element)) {
        xIndices.push(element)
      }
    })

    yIndice.forEach((element) => {
      if (!yIndices.includes(element)) {
        yIndices.push(element)
      }
    })

    const z: number[][] = []
    for (let j = 0; j < yIndices.length; j++) {
      z[j] = []
    }
    for (let j = 0; j < filteredTrials.length; j++) {
      const xI = xIndices.indexOf(paramValues[xIndex][j])
      const yI = yIndices.indexOf(paramValues[yIndex][j])
      z[yI][xI] = objectiveValues[j]
    }

    const data: Partial<plotly.PlotData>[] = [
      {
        type: "contour",
        z: z,
        x: xIndices,
        y: yIndices,
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
        x: paramValues[xIndex],
        y: paramValues[yIndex],
        mode: "markers",
        marker: {
          color: "#000",
        },
      },
    ]

    plotly.react(plotDomId, data, layout)
  }
}
