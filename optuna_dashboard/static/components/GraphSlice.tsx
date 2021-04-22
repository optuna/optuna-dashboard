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

const plotDomId = "graph-slice"

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

export const GraphSlice: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const classes = useStyles()
  const trials: Trial[] = study !== null ? study.trials : []
  const [objectiveId, setObjectiveId] = useState<number>(0)
  const [selected, setSelected] = useState<string | null>(null)
  const paramNames = study?.union_search_space.map((s) => s.name)
  if (selected === null && paramNames && paramNames.length > 0) {
    setSelected(paramNames[0])
  }

  useEffect(() => {
    plotSlice(trials, objectiveId, selected)
  }, [trials, objectiveId, selected])

  const handleObjectiveChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setObjectiveId(event.target.value as number)
  }

  const handleSelectedParam = (e: ChangeEvent<{ value: unknown }>) => {
    setSelected(e.target.value as string)
  }

  return (
    <Grid container direction="row">
      <Grid item xs={3}>
        <Grid container direction="column">
          <Typography variant="h6" className={classes.title}>
            Slice
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
          <FormControl component="fieldset" className={classes.formControl}>
            <InputLabel id="parameter">Parameter</InputLabel>
            <Select value={selected || ""} onChange={handleSelectedParam}>
              {paramNames?.map((p, i) => (
                <MenuItem value={p} key={i}>
                  {p}
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

const plotSlice = (
  trials: Trial[],
  objectiveId: number,
  selected: string | null
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
      title: selected || "",
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

  const filteredTrials = trials.filter(
    (t) =>
      (t.state === "Complete" ||
        (t.state === "Pruned" && t.values && t.values.length > 0)) &&
      t.params.find((p) => p.name == selected) !== undefined
  )

  if (filteredTrials.length === 0 || selected === null) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const objectiveValues: number[] = filteredTrials.map(
    (t) => t.values![objectiveId]
  )
  const valueStrings = filteredTrials.map((t) => {
    return t.params.find((p) => p.name == selected)!.value
  })

  const isnum = valueStrings.every((v) => {
    return !isNaN(parseFloat(v))
  })
  if (isnum) {
    const valuesNum: number[] = valueStrings.map((v) => parseFloat(v))
    const trace: plotly.Data[] = [
      {
        type: "scatter",
        x: valuesNum,
        y: objectiveValues,
        mode: "markers",
        xaxis: selected,
        marker: {
          color: "#185799",
        },
      },
    ]
    layout["xaxis"] = {
      title: selected,
      zerolinecolor: "#f2f5fa",
      zerolinewidth: 1.5,
      linecolor: "#f2f5fa",
      linewidth: 5,
      gridcolor: "#f2f5fa",
      gridwidth: 1,
    }
    plotly.react(plotDomId, trace, layout)
  } else {
    const vocabSet = new Set<string>(valueStrings)
    const vocabArr = Array.from<string>(vocabSet)
    const valuesCategorical: number[] = valueStrings.map((v) =>
      vocabArr.findIndex((vocab) => v === vocab)
    )
    const tickvals: number[] = vocabArr.map((v, i) => i)
    const trace: plotly.Data[] = [
      {
        type: "scatter",
        x: valuesCategorical,
        y: objectiveValues,
        mode: "markers",
        // xaxis: paramName,
        marker: {
          color: "#185799",
        },
      },
    ]
    layout["xaxis"] = {
      title: selected,
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
      automargin: true
    }
    plotly.react(plotDomId, trace, layout)
  }
}
