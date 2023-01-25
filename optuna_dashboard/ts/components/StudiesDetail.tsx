import * as plotly from "plotly.js-dist-min"
import React, { FC, ChangeEvent, useEffect, useMemo, useState } from "react"
import { useRecoilValue } from "recoil"
import {
  Grid,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Switch,
  Select,
  Radio,
  RadioGroup,
  Card,
  CardContent,
  Typography,
  SelectChangeEvent,
  Box,
  useTheme,
} from "@mui/material"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"

import { actionCreator } from "../action"
import { studySummariesState, useStudyDetailValue } from "../state"
import {
  useFilteredTrials,
  Target,
  useObjectiveAndUserAttrTargets,
} from "../trialFilter"
import { plotlyDarkTemplate } from "./PlotlyDarkMode"
import { useHistory, useLocation } from "react-router-dom"

const plotDomId = "graph-histories"

const useQuery = (): URLSearchParams => {
  const { search } = useLocation()

  return useMemo(() => new URLSearchParams(search), [search])
}

const useSelectedStudies = (
  studies: StudySummary[],
  query: URLSearchParams
): StudySummary[] => {
  return useMemo(() => {
    const selected = query.get("numbers")
    if (selected === null) {
      return []
    }
    const numbers = selected
      .split(",")
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n))
    return studies.filter(
      (t) => numbers.findIndex((n) => n === t.study_id) !== -1
    )
  }, [studies, query])
}

const getStudyListLink = (numbers: number[]): string => {
  const base = URL_PREFIX + "/compare-studies"
  if (numbers.length > 0) {
    return base + "?numbers=" + numbers.map((n) => n.toString()).join(",")
  }
  return base
}

const StudyListDetail: FC<{
  study: StudySummary
}> = ({ study }) => {
  const theme = useTheme()

  return (
    <Box sx={{ width: "100%", padding: theme.spacing(2, 2, 0, 2) }}>
      <Typography
        variant="h4"
        sx={{
          marginBottom: theme.spacing(2),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        Study {study.study_id} (study_id={study.study_id})
      </Typography>
    </Box>
  )
}

export const StudiesDetail: FC<null> = () => {
  const theme = useTheme()
  const query = useQuery()
  const history = useHistory()

  const action = actionCreator()
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)
  const selected = useSelectedStudies(studies, query)

  const trialListWidth = 200

  const showDetailStudies =
    selected.length > 0 ? selected : studies.length > 0 ? [studies[0]] : []

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  return (
    <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
      <Box
        sx={{
          minWidth: trialListWidth,
          overflow: "auto",
          height: `calc(100vh - ${theme.spacing(8)})`,
        }}
      >
        <List>
          <ListSubheader sx={{ display: "flex", flexDirection: "row" }}>
            <Typography sx={{ p: theme.spacing(1, 0) }}>
              {studies.length} Studies
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </ListSubheader>
          <Divider />
          {studies.map((study, i) => {
            return (
              <ListItem key={study.study_id} disablePadding>
                <ListItemButton
                  onClick={(e) => {
                    if (e.shiftKey) {
                      let next: number[]
                      const selectedNumbers = selected.map((s) => s.study_id)
                      if (selectedNumbers.length === 0) {
                        selectedNumbers.push(studies[0].study_id)
                      }
                      const alreadySelected =
                        selectedNumbers.findIndex(
                          (n) => n === study.study_id
                        ) >= 0
                      if (alreadySelected) {
                        next = selectedNumbers.filter(
                          (n) => n !== study.study_id
                        )
                      } else {
                        next = [...selectedNumbers, study.study_id]
                      }
                      history.push(getStudyListLink(next))
                    } else {
                      history.push(getStudyListLink([study.study_id]))
                    }
                  }}
                  selected={
                    selected.findIndex((s) => s.study_id === study.study_id) !==
                    -1
                  }
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <ListItemText primary={`Study ${study.study_id}`} />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>
      <Divider orientation="vertical" flexItem />
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          height: `calc(100vh - ${theme.spacing(8)})`,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
          {showDetailStudies.length === 0
            ? null
            : showDetailStudies.map((s) => {
                return (
                  <Box key={`tmp-list-${s.study_id}`}>
                    <StudyHistories studyId={s.study_id} />
                    <StudyListDetail key={s.study_id} study={s} />
                  </Box>
                )
              })}
        </Box>
      </Box>
    </Box>
  )
}

const StudyHistories: FC<{ studyId: number }> = ({ studyId }) => {
  const theme = useTheme()
  const action = actionCreator()
  const studyDetail = useStudyDetailValue(studyId)

  useEffect(() => {
    action.updateStudyDetail(studyId)
  }, [])

  return (
    <Box sx={{ display: "flex", width: "100%", flexDirection: "column" }}>
      <Card
        sx={{
          margin: theme.spacing(2),
        }}
      >
        <CardContent>
          <GraphHistories study={studyDetail} />
        </CardContent>
      </Card>
    </Box>
  )
}

const GraphHistories: FC<{
  study: StudyDetail | null
  betaLogScale?: boolean
  betaIncludePruned?: boolean
}> = ({ study, betaLogScale, betaIncludePruned }) => {
  const theme = useTheme()
  const [xAxis, setXAxis] = useState<
    "number" | "datetime_start" | "datetime_complete"
  >("number")
  const [logScale, setLogScale] = useState<boolean>(false)
  const [filterCompleteTrial, setFilterCompleteTrial] = useState<boolean>(false)
  const [filterPrunedTrial, setFilterPrunedTrial] = useState<boolean>(false)

  const [targets, selected, setTarget] = useObjectiveAndUserAttrTargets(study)
  const trials = useFilteredTrials(
    study,
    [selected],
    filterCompleteTrial,
    betaIncludePruned === undefined ? filterPrunedTrial : !betaIncludePruned
  )

  useEffect(() => {
    if (study !== null) {
      plotHistory(
        trials,
        study.directions,
        selected,
        xAxis,
        betaLogScale === undefined ? logScale : betaLogScale,
        theme.palette.mode
      )
    }
  }, [
    trials,
    study?.directions,
    selected,
    logScale,
    betaLogScale,
    xAxis,
    theme.palette.mode,
  ])

  const handleObjectiveChange = (event: SelectChangeEvent<string>) => {
    setTarget(event.target.value)
  }

  const handleXAxisChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "number") {
      setXAxis("number")
    } else if (e.target.value === "datetime_start") {
      setXAxis("datetime_start")
    } else if (e.target.value === "datetime_complete") {
      setXAxis("datetime_complete")
    }
  }

  const handleLogScaleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogScale(!logScale)
  }

  const handleFilterCompleteChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilterCompleteTrial(!filterCompleteTrial)
  }

  const handleFilterPrunedChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilterPrunedTrial(!filterPrunedTrial)
  }

  return (
    <Grid container direction="row">
      <Grid
        item
        xs={3}
        container
        direction="column"
        sx={{ paddingRight: theme.spacing(2) }}
      >
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          History
        </Typography>
        {targets.length >= 2 ? (
          <FormControl
            component="fieldset"
            sx={{ marginBottom: theme.spacing(2) }}
          >
            <FormLabel component="legend">y Axis</FormLabel>
            <Select
              value={selected.identifier()}
              onChange={handleObjectiveChange}
            >
              {targets.map((t, i) => (
                <MenuItem value={t.identifier()} key={i}>
                  {t.toLabel(study?.objective_names)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
        {betaLogScale === undefined ? (
          <FormControl
            component="fieldset"
            sx={{ marginBottom: theme.spacing(2) }}
          >
            <FormLabel component="legend">Log y scale:</FormLabel>
            <Switch
              checked={logScale}
              onChange={handleLogScaleChange}
              value="enable"
            />
          </FormControl>
        ) : null}
        {betaIncludePruned === undefined ? (
          <FormControl
            component="fieldset"
            sx={{ marginBottom: theme.spacing(2) }}
          >
            <FormLabel component="legend">Filter state:</FormLabel>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!filterCompleteTrial}
                  onChange={handleFilterCompleteChange}
                />
              }
              label="Complete"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!filterPrunedTrial}
                  disabled={!study?.has_intermediate_values}
                  onChange={handleFilterPrunedChange}
                />
              }
              label="Pruned"
            />
          </FormControl>
        ) : null}
        <FormControl
          component="fieldset"
          sx={{ marginBottom: theme.spacing(2) }}
        >
          <FormLabel component="legend">X-axis:</FormLabel>
          <RadioGroup
            aria-label="gender"
            name="gender1"
            value={xAxis}
            onChange={handleXAxisChange}
          >
            <FormControlLabel
              value="number"
              control={<Radio />}
              label="Number"
            />
            <FormControlLabel
              value="datetime_start"
              control={<Radio />}
              label="Datetime start"
            />
            <FormControlLabel
              value="datetime_complete"
              control={<Radio />}
              label="Datetime complete"
            />
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid item xs={9}>
        <div id={plotDomId} />
      </Grid>
    </Grid>
  )
}

const plotHistory = (
  trials: Trial[],
  directions: StudyDirection[],
  target: Target,
  xAxis: "number" | "datetime_start" | "datetime_complete",
  logScale: boolean,
  mode: string
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
    yaxis: {
      title: "Objective Value",
      type: logScale ? "log" : "linear",
    },
    xaxis: {
      title: xAxis === "number" ? "Trial" : "Time",
      type: xAxis === "number" ? "linear" : "date",
    },
    showlegend: true,
    template: mode === "dark" ? plotlyDarkTemplate : {},
  }
  if (trials.length === 0) {
    plotly.react(plotDomId, [], layout)
    return
  }

  const getAxisX = (trial: Trial): number | Date => {
    return xAxis === "number"
      ? trial.number
      : xAxis === "datetime_start"
      ? trial.datetime_start!
      : trial.datetime_complete!
  }

  const plotData: Partial<plotly.PlotData>[] = [
    {
      x: trials.map(getAxisX),
      y: trials.map((t: Trial): number => target.getTargetValue(t) as number),
      name: "Objective Value",
      mode: "markers",
      type: "scatter",
    },
  ]

  const objectiveId = target.getObjectiveId()
  if (objectiveId !== null) {
    const xForLinePlot: (number | Date)[] = []
    const yForLinePlot: number[] = []
    let currentBest: number | null = null
    for (let i = 0; i < trials.length; i++) {
      const t = trials[i]
      if (currentBest === null) {
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      } else if (
        directions[objectiveId] === "maximize" &&
        t.values![objectiveId] > currentBest
      ) {
        const p = trials[i - 1]
        if (!xForLinePlot.includes(getAxisX(p))) {
          xForLinePlot.push(getAxisX(p))
          yForLinePlot.push(currentBest)
        }
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      } else if (
        directions[objectiveId] === "minimize" &&
        t.values![objectiveId] < currentBest
      ) {
        const p = trials[i - 1]
        if (!xForLinePlot.includes(getAxisX(p))) {
          xForLinePlot.push(getAxisX(p))
          yForLinePlot.push(currentBest)
        }
        currentBest = t.values![objectiveId] as number
        xForLinePlot.push(getAxisX(t))
        yForLinePlot.push(t.values![objectiveId] as number)
      }
    }
    xForLinePlot.push(getAxisX(trials[trials.length - 1]))
    yForLinePlot.push(yForLinePlot[yForLinePlot.length - 1])
    plotData.push({
      x: xForLinePlot,
      y: yForLinePlot,
      name: "Best Value",
      mode: "lines",
      type: "scatter",
    })
  }
  plotly.react(plotDomId, plotData, layout)
}
