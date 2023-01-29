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
import {
  studySummariesState,
  useStudyDetailValue,
  studyDetailsState,
} from "../state"
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
  study: StudyDetail
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
        Study {study.name} (study_id={study.id})
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
          {showDetailStudies.length === 0 ? null : (
            <StudyHistories
              studyIds={showDetailStudies.map((s) => s.study_id)}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}

const StudyHistories: FC<{ studyIds: number[] }> = ({ studyIds }) => {
  const theme = useTheme()
  const action = actionCreator()
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)

  useEffect(() => {
    studyIds.forEach((study_id) => {
      action.updateStudyDetail(study_id)
    })
  }, [studyIds.join(",")])

  return (
    <Box sx={{ display: "flex", width: "100%", flexDirection: "column" }}>
      <Card
        sx={{
          margin: theme.spacing(2),
        }}
      >
        <CardContent>
          <GraphHistories studies={studyIds.map((id) => studyDetails[id])} />
        </CardContent>
      </Card>
    </Box>
  )
}

interface HistoryPlotInfo {
  study_name: string
  trials: Trial[]
  directions: StudyDirection[]
}

const getFilteredTrials = (
  study: StudyDetail | null,
  filterComplete: boolean,
  filterPruned: boolean
): Trial[] => {
  if (study === null) {
    return []
  }
  return study.trials.filter((t) => {
    if (t.state !== "Complete" && t.state !== "Pruned") {
      return false
    }
    if (t.state === "Complete" && filterComplete) {
      return false
    }
    if (t.state === "Pruned" && filterPruned) {
      return false
    }
    return true
  })
}

const GraphHistories: FC<{
  studies: StudyDetail[] | null
}> = ({ studies }) => {
  console.log(studies)
  if (!studies.every((s) => s)) {
    return null
  }

  const theme = useTheme()
  const [xAxis, setXAxis] = useState<
    "number" | "datetime_start" | "datetime_complete"
  >("number")
  const [logScale, setLogScale] = useState<boolean>(false)
  const [filterCompleteTrial, setFilterCompleteTrial] = useState<boolean>(false)
  const [filterPrunedTrial, setFilterPrunedTrial] = useState<boolean>(false)

  const historyPlotInfos = studies.map((study) => {
    const trials = getFilteredTrials(
      study,
      filterCompleteTrial,
      filterPrunedTrial
    )
    const h: HistoryPlotInfo = {
      study_name: study.name,
      trials: trials,
      directions: study.directions,
    }
    return h
  })

  useEffect(() => {
    if (studies !== null) {
      plotHistories(historyPlotInfos, xAxis, logScale, theme.palette.mode)
    }
  }, [historyPlotInfos, logScale, xAxis, theme.palette.mode])

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
      </Grid>
      <Grid item xs={9}>
        {/* <div id={`${plotDomId}-${study.id}`} /> */}
        <div id={`${plotDomId}s`} />
      </Grid>
    </Grid>
  )
}

const plotHistories = (
  historyPlotInfos: HistoryPlotInfo[],
  xAxis: "number" | "datetime_start" | "datetime_complete",
  logScale: boolean,
  mode: string
) => {
  if (document.getElementById(`${plotDomId}s`) === null) {
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

  const getAxisX = (trial: Trial): number => {
    return trial.number
  }

  const getTargetValue = (trial: Trial): number | null => {
    if (trial.values === undefined) {
      return null
    }
    const value = trial.values[0]
    if (value === "inf" || value === "-inf") {
      return null
    }
    return value
  }

  const plotData: Partial<plotly.PlotData>[] = historyPlotInfos.map((h) => {
    return {
      x: h.trials.map(getAxisX),
      y: h.trials.map(getTargetValue),
      name: `Objective Value ${h.study_name}`,
      mode: "markers",
      type: "scatter",
    }
  })

  plotly.react(`${plotDomId}s`, plotData, layout)
}
