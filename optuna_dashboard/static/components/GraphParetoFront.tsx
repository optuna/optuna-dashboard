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

const plotDomId = "graph-pareto-front"

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

export const GraphParetoFront: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const classes = useStyles()
  const [objectiveXId, setObjectiveXId] = useState<number>(0)
  const [objectiveYId, setObjectiveYId] = useState<number>(1)

  const handleObjectiveXChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setObjectiveXId(event.target.value as number)
  }

  const handleObjectiveYChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setObjectiveYId(event.target.value as number)
  }

  useEffect(() => {
    if (study != null) {
      plotParetoFront(study, objectiveXId, objectiveYId)
    }
  }, [study, objectiveXId, objectiveYId])

  return (
    <Grid container direction="row">
      {study !== null && study.directions.length !== 1 ? (
        <Grid item xs={3}>
          <Grid container direction="column">
            <Typography variant="h6" className={classes.title}>
              Pareto Front
            </Typography>
            <FormControl component="fieldset" className={classes.formControl}>
              <FormLabel component="legend">Objective X ID:</FormLabel>
              <Select value={objectiveXId} onChange={handleObjectiveXChange}>
                {study.directions.map((d, i) => (
                  <MenuItem value={i} key={i}>
                    {i}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl component="fieldset" className={classes.formControl}>
              <FormLabel component="legend">Objective Y ID:</FormLabel>
              <Select value={objectiveYId} onChange={handleObjectiveYChange}>
                {study.directions.map((d, i) => (
                  <MenuItem value={i} key={i}>
                    {i}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      ) : null}
      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

const plotParetoFront = (
  study: StudyDetail,
  objectiveXId: number,
  objectiveYId: number
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
  }

  const trials: Trial[] = study ? study.trials : []
  const completedTrials = trials.filter((t) => t.state === "Complete")

  if (completedTrials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const normalizedValues: number[][] = []
  completedTrials.forEach((t) => {
    if (t.values && t.values.length === study.directions.length) {
      const trialValues = t.values.map((v: number, i: number) => {
        return study.directions[i] === "minimize" ? v : -v
      })
      normalizedValues.push(trialValues)
    }
  })

  const pointColors: string[] = []
  normalizedValues.forEach((values0: number[], i: number) => {
    const dominated = normalizedValues.some((values1: number[], j: number) => {
      if (i === j) {
        return false
      }
      return values0.every((value0: number, k: number) => {
        return values1[k] <= value0
      })
    })

    if (dominated) {
      pointColors.push("blue")
    } else {
      pointColors.push("red")
    }
  })

  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "scatter",
      x: completedTrials.map((t: Trial): number => {
        return t && t.values && t.values[objectiveXId]
      }),
      y: completedTrials.map((t: Trial): number => {
        return t && t.values && t.values[objectiveYId]
      }),
      mode: "markers",
      xaxis: "Objective X",
      yaxis: "Objective Y",
      marker: {
        color: pointColors,
      },
      text: completedTrials.map(
        (t: Trial): string => `Trial (number=${t.number})`
      ),
      hovertemplate: "%{text}<extra></extra>",
    },
  ]

  plotly.react(plotDomId, plotData, layout)
}
