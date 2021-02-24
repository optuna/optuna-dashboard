import * as plotly from "plotly.js-basic-dist"
import React, { ChangeEvent, FC, useEffect, useState } from "react"
import {
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@material-ui/core"
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles"

const plotDomId = "graph-slice"

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    formControl: {
      marginBottom: theme.spacing(2),
      marginRight: theme.spacing(5),
      marginTop: theme.spacing(10),
    },
  })
)

export const GraphSlice: FC<{
  trials: Trial[]
}> = ({ trials = [] }) => {
  const filteredTrials = trials.filter(
    (t) => t.state === "Complete" || t.state === "Pruned"
  )

  let paramNames = new Set<string>(trials[0].params.map((p) => p.name))
  filteredTrials.forEach((t) => {
    paramNames = new Set<string>(
      t.params.filter((p) => paramNames.has(p.name)).map((p) => p.name)
    )
  })
  const paramnames = Array.from(paramNames)

  const classes = useStyles()
  const [xAxis, setXAxis] = useState<string>(paramnames[0])

  const handleXAxisChange = (e: ChangeEvent<{ value: unknown }>) => {
    setXAxis(e.target.value as string)
  }

  useEffect(() => {
    if (trials != null) {
      plotSlice(trials, 0, xAxis)
    }
  }, [trials, xAxis])

  return (
    <Grid container direction="row">
      <Grid item xs={3}>
        <Grid container direction="column">
          <FormControl component="fieldset" className={classes.formControl}>
            <InputLabel id="parameter">Parameter</InputLabel>
            <Select value={xAxis} onChange={handleXAxisChange}>
              {paramnames.map((x) => (
                <MenuItem value={x} key={x}>
                  {x}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <Grid item xs={6}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

const plotSlice = (trials: Trial[], objectiveId: number, xAxis: string) => {
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

  const filteredTrials = trials.filter(
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
  } else {
    let trace: Partial<plotly.PlotData>[] = [
      {
        type: "scatter",
        x: [],
        y: [],
        mode: "markers",
        xaxis: "x",
        marker: {
          color: "#185799",
        },
      },
    ]
    let updateLayout: Partial<plotly.Layout> = {
      title: "Slice",
      margin: {
        l: 50,
        r: 50,
      },
      xaxis: {
        title: "x",
        zerolinecolor: "#f2f5fa",
        zerolinewidth: 1.5,
        linecolor: "#f2f5fa",
        linewidth: 5,
        gridcolor: "#f2f5fa",
        gridwidth: 1,
      },
      yaxis: {
        title: "Objective Values",
        zerolinecolor: "#f2f5fa",
        zerolinewidth: 2,
        linecolor: "#f2f5fa",
        linewidth: 5,
        gridcolor: "#f2f5fa",
        gridwidth: 1,
      },
      plot_bgcolor: "#E5ecf6",
      showlegend: false,
    }
    paramNames.forEach((paramName) => {
      const valueStrings = filteredTrials.map((t) => {
        const param = t.params.find((p) => p.name == paramName)
        return param!.value
      })
      const isnum = valueStrings.every((v) => {
        return !isNaN(parseFloat(v))
      })
      let values: number[] = []
      if (isnum) {
        values = valueStrings.map((v) => parseFloat(v))
        if (paramName === xAxis) {
          trace = [
            {
              type: "scatter",
              x: values,
              y: objectiveValues,
              mode: "markers",
              xaxis: paramName,
              marker: {
                color: "#185799",
              },
            },
          ]
          updateLayout["xaxis"] = {
            title: paramName,
            zerolinecolor: "#f2f5fa",
            zerolinewidth: 1.5,
            linecolor: "#f2f5fa",
            linewidth: 5,
            gridcolor: "#f2f5fa",
            gridwidth: 1,
          }
          plotly.react(plotDomId, trace, updateLayout)
        }
      } else {
        const vocabSet = new Set<string>(valueStrings)
        const vocabArr = Array.from<string>(vocabSet)
        const values: number[] = valueStrings.map((v) =>
          vocabArr.findIndex((vocab) => v === vocab)
        )
        const tickvals: number[] = vocabArr.map((v, i) => i)
        trace = [
          {
            type: "scatter",
            x: values,
            y: objectiveValues,
            mode: "markers",
            // xaxis: paramName,
            marker: {
              color: "#185799",
            },
          },
        ]
        updateLayout = {
          title: "Slice",
          margin: {
            l: 50,
            r: 50,
          },
          xaxis: {
            title: paramName,
            zerolinecolor: "#f2f5fa",
            zerolinewidth: 1.5,
            linecolor: "#f2f5fa",
            linewidth: 5,
            gridcolor: "#f2f5fa",
            gridwidth: 1,
            tickfont: {
              color: "#000000",
            },
            tickvals: tickvals,
            ticktext: vocabArr,
          },
          yaxis: {
            title: "Objective Values",
            zerolinecolor: "#f2f5fa",
            zerolinewidth: 2,
            linecolor: "#f2f5fa",
            linewidth: 5,
            gridcolor: "#f2f5fa",
            gridwidth: 1,
          },
          plot_bgcolor: "#E5ecf6",
          showlegend: false,
        }
        plotly.react(plotDomId, trace, updateLayout)
      }
    })
  }
}
