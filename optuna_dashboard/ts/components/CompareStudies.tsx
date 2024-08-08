import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import HomeIcon from "@mui/icons-material/Home"
import {
  Box,
  Card,
  CardContent,
  FormControl,
  IconButton,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import FormControlLabel from "@mui/material/FormControlLabel"
import Grid from "@mui/material/Grid"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"
import * as Optuna from "@optuna/types"
import { useSnackbar } from "notistack"
import React, { FC, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useRecoilValue } from "recoil"

import { useNavigate } from "react-router-dom"
import { StudyDetails, StudySummary } from "ts/types/optuna"
import { actionCreator } from "../action"
import { useConstants } from "../constantsProvider"
import { studyDetailsState, studySummariesState } from "../state"
import { useQuery } from "../urlQuery"
import { AppDrawer } from "./AppDrawer"
import { GraphEdf } from "./GraphEdf"
import { GraphHistory } from "./GraphHistory"

const useQueriedStudies = (
  studies: StudySummary[],
  query: URLSearchParams
): StudySummary[] => {
  return useMemo(() => {
    const queried = query.get("ids")
    if (queried === null) {
      return []
    }
    const ids = queried
      .split(",")
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n))
    return studies.filter((t) => ids.findIndex((n) => n === t.study_id) !== -1)
  }, [studies, query])
}

const getStudyListLink = (ids: number[], url_prefix: string): string => {
  const base = url_prefix + "/compare-studies"
  if (ids.length > 0) {
    return base + "?ids=" + ids.map((n) => n.toString()).join(",")
  }
  return base
}

const isEqualDirections = (
  array1: Optuna.StudyDirection[],
  array2: Optuna.StudyDirection[]
): boolean => {
  let i = array1.length
  if (i !== array2.length) return false

  while (i--) {
    if (array1[i] !== array2[i]) return false
  }
  return true
}

export const CompareStudies: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const { url_prefix } = useConstants()

  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const query = useQuery()
  const navigate = useNavigate()

  const action = actionCreator()
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)
  const queried = useQueriedStudies(studies, query)
  const selected = useMemo(() => {
    return queried.length > 0 ? queried : studies.length > 0 ? [studies[0]] : []
  }, [studies, query])

  const studyListWidth = 200
  const title = "Compare Studies (Experimental)"

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  const toolbar = (
    <>
      <IconButton
        component={Link}
        to={url_prefix + "/"}
        sx={{ marginRight: theme.spacing(1) }}
        color="inherit"
        title="Return to the top page"
      >
        <HomeIcon />
      </IconButton>
      <ChevronRightIcon sx={{ marginRight: theme.spacing(1) }} />
      <Typography
        noWrap
        component="div"
        sx={{ fontWeight: theme.typography.fontWeightBold }}
      >
        {title}
      </Typography>
    </>
  )

  return (
    <Box component="div" sx={{ display: "flex" }}>
      <AppDrawer toggleColorMode={toggleColorMode} toolbar={toolbar}>
        <Box
          component="div"
          sx={{ display: "flex", flexDirection: "row", width: "100%" }}
        >
          <Box
            component="div"
            sx={{
              minWidth: studyListWidth,
              overflow: "auto",
              height: `calc(100vh - ${theme.spacing(8)})`,
            }}
          >
            <List>
              <ListSubheader sx={{ display: "flex", flexDirection: "row" }}>
                <Typography sx={{ p: theme.spacing(1, 0) }}>
                  Compare studies with Shift+Click
                </Typography>
                <Box component="div" sx={{ flexGrow: 1 }} />
              </ListSubheader>
              <Divider />
              {studies.map((study) => {
                return (
                  <ListItem key={study.study_id} disablePadding>
                    <ListItemButton
                      onClick={(e) => {
                        if (e.shiftKey) {
                          let next: number[]
                          const selectedIds = selected.map((s) => s.study_id)
                          const alreadySelected =
                            selectedIds.findIndex(
                              (n) => n === study.study_id
                            ) >= 0
                          if (alreadySelected) {
                            next = selectedIds.filter(
                              (n) => n !== study.study_id
                            )
                          } else {
                            if (
                              selected.length > 0 &&
                              selected[0].directions.length !==
                                study.directions.length
                            ) {
                              enqueueSnackbar(
                                "You can only compare studies that has the same number of objectives.",
                                {
                                  variant: "info",
                                }
                              )
                              next = selectedIds
                            } else if (
                              selected.length > 0 &&
                              !isEqualDirections(
                                selected[0].directions,
                                study.directions
                              )
                            ) {
                              enqueueSnackbar(
                                "You can only compare studies that has the same directions.",
                                {
                                  variant: "info",
                                }
                              )
                              next = selectedIds
                            } else {
                              next = [...selectedIds, study.study_id]
                            }
                          }
                          navigate(getStudyListLink(next, url_prefix))
                        } else {
                          navigate(
                            getStudyListLink([study.study_id], url_prefix)
                          )
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
                      <ListItemText
                        primary={`${study.study_id}. ${study.study_name}`}
                      />
                      <Box
                        component="div"
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          width: "100%",
                        }}
                      >
                        <Chip
                          color="primary"
                          label={
                            study.directions.length === 1
                              ? `${study.directions.length} objective`
                              : `${study.directions.length} objectives`
                          }
                          size="small"
                          variant="outlined"
                        />
                        <span style={{ margin: theme.spacing(0.5) }} />
                        <Chip
                          color="secondary"
                          label={study.directions
                            .map((d) => (d === "maximize" ? "max" : "min"))
                            .join(", ")}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box
            component="div"
            sx={{
              flexGrow: 1,
              overflow: "auto",
              height: `calc(100vh - ${theme.spacing(8)})`,
            }}
          >
            <Box
              component="div"
              sx={{ display: "flex", flexDirection: "row", width: "100%" }}
            >
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

  const handleLogScaleChange = () => {
    setLogScale(!logScale)
  }

  const handleIncludePrunedChange = () => {
    setIncludePruned(!includePruned)
  }

  useEffect(() => {
    studies.forEach((study) => {
      action.updateStudyDetail(study.study_id)
    })
  }, [studies])

  const showStudyDetails = studies.map((study) => studyDetails[study.study_id])

  return (
    <Box
      component="div"
      sx={{ display: "flex", width: "100%", flexDirection: "column" }}
    >
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
      {showStudyDetails !== null &&
      showStudyDetails.length > 0 &&
      showStudyDetails.every((s) => s) ? (
        <Card
          sx={{
            margin: theme.spacing(2),
          }}
        >
          <CardContent>
            <GraphHistory
              studies={showStudyDetails}
              includePruned={includePruned}
              logScale={logScale}
            />
          </CardContent>
        </Card>
      ) : null}
      <Grid container spacing={2} sx={{ padding: theme.spacing(0, 2) }}>
        {showStudyDetails !== null &&
        showStudyDetails.length > 0 &&
        showStudyDetails.every((s) => s)
          ? showStudyDetails[0].directions.map((d, i) => (
              <Grid item xs={6} key={i}>
                <Card>
                  <CardContent>
                    <GraphEdf studies={showStudyDetails} objectiveId={i} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : null}
      </Grid>
    </Box>
  )
}
