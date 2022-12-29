import React, { FC, useEffect } from "react"
import { useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import {
  AppBar,
  Card,
  Typography,
  CardContent,
  Container,
  Toolbar,
  Box,
  IconButton,
  useTheme,
} from "@mui/material"
import { Home, Settings } from "@mui/icons-material"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"

import { GraphParallelCoordinate } from "./GraphParallelCoordinate"
import { GraphHyperparameterImportances } from "./GraphHyperparameterImportances"
import { Edf } from "./GraphEdf"
import { Contour } from "./GraphContour"
import { GraphIntermediateValues } from "./GraphIntermediateValues"
import { GraphSlice } from "./GraphSlice"
import { GraphHistory } from "./GraphHistory"
import { GraphParetoFront } from "./GraphParetoFront"
import { Note } from "./Note"
import { actionCreator } from "../action"
import {
  graphVisibilityState,
  reloadIntervalState,
  studyDetailsState,
  studySummariesState,
} from "../state"
import { usePreferenceDialog } from "./PreferenceDialog"
import { ReloadIntervalSelect } from "./ReloadIntervalSelect"
import { TrialTable } from "./TrialTable"

interface ParamTypes {
  studyId: string
}

const useStudyDetailValue = (studyId: number): StudyDetail | null => {
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)
  return studyDetails[studyId] || null
}

const useStudySummaryValue = (studyId: number): StudySummary | null => {
  const studySummaries = useRecoilValue<StudySummary[]>(studySummariesState)
  return studySummaries.find((s) => s.study_id == studyId) || null
}

export const StudyDetailBeta: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()
  const action = actionCreator()
  const { studyId } = useParams<ParamTypes>()
  const studyIdNumber = parseInt(studyId, 10)
  const studyDetail = useStudyDetailValue(studyIdNumber)
  const studySummary = useStudySummaryValue(studyIdNumber)
  const directions = studyDetail?.directions || studySummary?.directions || null
  const graphVisibility = useRecoilValue<GraphVisibility>(graphVisibilityState)
  const reloadInterval = useRecoilValue<number>(reloadIntervalState)

  useEffect(() => {
    action.updateStudyDetail(studyIdNumber)
  }, [])

  useEffect(() => {
    if (reloadInterval < 0) {
      return
    }
    const intervalId = setInterval(function () {
      action.updateStudyDetail(studyIdNumber)
    }, reloadInterval * 1000)
    return () => clearInterval(intervalId)
  }, [reloadInterval, studyDetail])

  // TODO(chenghuzi): Reduce the number of calls to setInterval and clearInterval.
  const title = studyDetail !== null ? studyDetail.name : `Study #${studyId}`
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  return (
    <div>
      <AppBar position="static">
        <Container
          sx={{
            ["@media (min-width: 1280px)"]: {
              maxWidth: "100%",
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6">{APP_BAR_TITLE}</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <ReloadIntervalSelect />
            <IconButton
              onClick={() => {
                toggleColorMode()
              }}
              color="inherit"
              title={
                theme.palette.mode === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {theme.palette.mode === "dark" ? (
                <Brightness7Icon />
              ) : (
                <Brightness4Icon />
              )}
            </IconButton>
            <IconButton
              color="inherit"
              onClick={() => {
                openPreferenceDialog(true)
              }}
              title="Open preference panel"
            >
              <Settings />
            </IconButton>
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              component={Link}
              to={URL_PREFIX + "/"}
              color="inherit"
              title="Go to the top"
            >
              <Home />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Container
        sx={{
          ["@media (min-width: 1280px)"]: {
            maxWidth: "100%",
          },
        }}
      >
        <div>
          <Typography
            variant="h4"
            sx={{
              margin: `${theme.spacing(4)} ${theme.spacing(2)}`,
              fontWeight: 700,
              fontSize: "1.8rem",
              ...(theme.palette.mode === "dark" && {
                color: theme.palette.primary.light,
              }),
            }}
          >
            {title}
          </Typography>
            <Card
                sx={{
                    margin: theme.spacing(2),
                }}
            >
                <CardContent>
                    <GraphHistory study={studyDetail} />
                </CardContent>
            </Card>
          <Card sx={{ margin: theme.spacing(2) }}>
            <TrialTable studyDetail={studyDetail} />
          </Card>
          {studyDetail !== null ? (
            <Note studyId={studyIdNumber} latestNote={studyDetail.note} />
          ) : null}
        </div>
      </Container>
    </div>
  )
}
