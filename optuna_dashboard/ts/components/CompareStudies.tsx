import React, { ChangeEvent, FC, useEffect, useMemo, useState } from "react"
import { useRecoilValue } from "recoil"
import { useSnackbar } from "notistack"
import { Link } from "react-router-dom"
import {
  Card,
  CardContent,
  FormControl,
  Switch,
  Typography,
  Box,
  useTheme,
  IconButton,
} from "@mui/material"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import Chip from "@mui/material/Chip"
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
import { GraphEdf } from "./GraphEdf"
import { GraphHistory } from "./GraphHistory"
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
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const query = useQuery()
  const history = useHistory()

  const action = actionCreator()
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)
  const selected = useSelectedStudies(studies, query)

  const studyListWidth = 200
  const title = "Compare Studies"

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  const toolbar = (
    <>
      <IconButton
        component={Link}
        to={URL_PREFIX + "/beta"}
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
                          const alreadySelected =
                            selectedNumbers.findIndex(
                              (n) => n === study.study_id
                            ) >= 0
                          if (alreadySelected) {
                            next = selectedNumbers.filter(
                              (n) => n !== study.study_id
                            )
                          } else {
                            if (
                              selected.length === 0 ||
                              (selected.length > 0 &&
                                selected[0].directions.length ===
                                  study.directions.length)
                            ) {
                              next = [...selectedNumbers, study.study_id]
                            } else {
                              enqueueSnackbar(
                                "Failed to add this study, because you can add a study that has the same objective number.",
                                {
                                  variant: "error",
                                }
                              )
                            }
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
                      <ListItemText primary={study.study_name} />
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          width: "100%",
                        }}
                      >
                        <Typography
                          color={theme.palette.grey.A400}
                          sx={{ p: theme.spacing(0, 1) }}
                        >
                          {`# ${study.study_id}`}
                        </Typography>
                        <Chip
                          color="primary"
                          label={
                            study.directions.length === 1
                              ? `${study.directions.length} objective`
                              : `${study.directions.length} objectives`
                          }
                          sx={{ margin: theme.spacing(0) }}
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

  const showStudyDetails = studies.map((study) => studyDetails[study.study_id])

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
              betaIncludePruned={includePruned}
              betaLogScale={logScale}
            />
          </CardContent>
        </Card>
      ) : null}
      {showStudyDetails !== null &&
      showStudyDetails.length > 0 &&
      showStudyDetails.every((s) => s) ? (
        <Card
          sx={{
            margin: theme.spacing(2),
          }}
        >
          <CardContent>
            <GraphEdf studies={showStudyDetails} />
          </CardContent>
        </Card>
      ) : null}
    </Box>
  )
}
