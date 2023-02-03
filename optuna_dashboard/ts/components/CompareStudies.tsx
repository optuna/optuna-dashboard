import React, { FC, useEffect, useMemo, useState } from "react"
import { useRecoilValue } from "recoil"
import {
  Card,
  CardContent,
  FormControl,
  Switch,
  Typography,
  Box,
  useTheme,
} from "@mui/material"
import FormControlLabel from "@mui/material/FormControlLabel"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"
import HomeIcon from "@mui/icons-material/Home"

import { actionCreator } from "../action"
import { studySummariesState, studyDetailsState } from "../state"
import { AppDrawer } from "./AppDrawer"
import { GraphHistories } from "./GraphHistories"
import { useHistory, useLocation } from "react-router-dom"

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

export const CompareStudies: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()
  const query = useQuery()
  const history = useHistory()

  const action = actionCreator()
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)
  const selected = useSelectedStudies(studies, query)

  const studyListWidth = 200

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  const toolbar = <HomeIcon sx={{ margin: theme.spacing(0, 1) }} />

  return (
    <Box sx={{ display: "flex" }}>
      <AppDrawer toggleColorMode={toggleColorMode} toolbar={toolbar}>
        <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
          <Box
            sx={{
              minWidth: studyListWidth,
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
                          const selectedNumbers = selected.map(
                            (s) => s.study_id
                          )
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
                        selected.findIndex(
                          (s) => s.study_id === study.study_id
                        ) !== -1
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
              <StudiesGraph studies={selected} />
            </Box>
          </Box>
        </Box>
      </AppDrawer>
    </Box>
  )
}

const StudiesGraph: FC<{ studies: StudySummary[] }> = ({ studies }) => {
  const theme = useTheme()
  const action = actionCreator()
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)
  const [logScale, setLogScale] = useState<boolean>(false)
  const [includePruned, setIncludePruned] = useState<boolean>(true)

  const handleLogScaleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogScale(!logScale)
  }

  const handleIncludePrunedChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIncludePruned(!includePruned)
  }

  useEffect(() => {
    studies.forEach((study) => {
      action.updateStudyDetail(study.study_id)
    })
  }, [studies])

  return (
    <Box sx={{ display: "flex", width: "100%", flexDirection: "column" }}>
      <FormControl
        component="fieldset"
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: theme.spacing(2),
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={logScale}
              onChange={handleLogScaleChange}
              value="enable"
            />
          }
          label="Log y scale"
        />
        <FormControlLabel
          control={
            <Switch
              checked={includePruned}
              onChange={handleIncludePrunedChange}
              value="enable"
            />
          }
          label="Include PRUNED trials"
        />
      </FormControl>
      <Card
        sx={{
          margin: theme.spacing(2),
        }}
      >
        <CardContent>
          <GraphHistories
            studies={studies.map((study) => studyDetails[study.study_id])}
            includePruned={includePruned}
            logScale={logScale}
          />
        </CardContent>
      </Card>
    </Box>
  )
}
