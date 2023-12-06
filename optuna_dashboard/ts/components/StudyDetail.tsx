import React, { FC, useEffect, useMemo } from "react"
import { useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  IconButton,
} from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import HomeIcon from "@mui/icons-material/Home"
import DownloadIcon from "@mui/icons-material/Download"

import { StudyNote } from "./Note"
import { actionCreator } from "../action"
import {
  reloadIntervalState,
  useStudyDetailValue,
  useStudyIsPreferential,
  useStudyName,
} from "../state"
import { TrialTable } from "./TrialTable"
import { AppDrawer, PageId } from "./AppDrawer"
import { GraphParallelCoordinate } from "./GraphParallelCoordinate"
import { Contour } from "./GraphContour"
import { GraphSlice } from "./GraphSlice"
import { GraphEdf } from "./GraphEdf"
import { GraphRank } from "./GraphRank"
import { TrialList } from "./TrialList"
import { StudyHistory } from "./StudyHistory"
import { PreferentialTrials } from "./PreferentialTrials"
import { PreferenceHistory } from "./PreferenceHistory"
import { PreferentialAnalytics } from "./PreferentialAnalytics"
import { PreferentialGraph } from "./PreferentialGraph"

interface ParamTypes {
  studyId: string
}

export const useURLVars = (): number => {
  const { studyId } = useParams<ParamTypes>()

  return useMemo(() => parseInt(studyId, 10), [studyId])
}

export const StudyDetail: FC<{
  toggleColorMode: () => void
  page: PageId
}> = ({ toggleColorMode, page }) => {
  const theme = useTheme()
  const action = actionCreator()
  const studyId = useURLVars()
  const studyDetail = useStudyDetailValue(studyId)
  const reloadInterval = useRecoilValue<number>(reloadIntervalState)
  const studyName = useStudyName(studyId)
  const isPreferential = useStudyIsPreferential(studyId)

  const title =
    studyName !== null ? `${studyName} (id=${studyId})` : `Study #${studyId}`

  useEffect(() => {
    action.loadReloadInterval()
    action.updateStudyDetail(studyId)
    action.updateAPIMeta()
  }, [])

  useEffect(() => {
    if (reloadInterval < 0) {
      return
    }
    const nTrials = studyDetail ? studyDetail.trials.length : 0
    let interval = reloadInterval * 1000

    // For Human-in-the-loop Optimization, the interval is set to 2 seconds
    // when the number of trials is small, and the page is "trialList" or top page of preferential.
    if (
      (!isPreferential && page === "trialList") ||
      (isPreferential && page === "top")
    ) {
      if (nTrials < 100) {
        interval = 2000
      } else if (nTrials < 500) {
        interval = 5000
      }
    }

    const intervalId = setInterval(function () {
      action.updateStudyDetail(studyId)
    }, interval)
    return () => clearInterval(intervalId)
  }, [reloadInterval, studyDetail, page])

  let content = null
  if (page === "top") {
    content = isPreferential ? (
      <PreferentialTrials studyDetail={studyDetail} />
    ) : (
      <StudyHistory studyId={studyId} />
    )
  } else if (page === "analytics") {
    content = isPreferential ? (
      <PreferentialAnalytics studyId={studyId} />
    ) : (
      <Box sx={{ display: "flex", width: "100%", flexDirection: "column" }}>
        <Typography variant="h5" sx={{ margin: theme.spacing(2) }}>
          Hyperparameter Relationships
        </Typography>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphSlice study={studyDetail} />
          </CardContent>
        </Card>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphParallelCoordinate study={studyDetail} />
          </CardContent>
        </Card>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <Contour study={studyDetail} />
          </CardContent>
        </Card>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphRank study={studyDetail} />
          </CardContent>
        </Card>
        <Typography variant="h5" sx={{ margin: theme.spacing(2) }}>
          Empirical Distribution of the Objective Value
        </Typography>
        <Grid2 container spacing={2} sx={{ padding: theme.spacing(0, 2) }}>
          {studyDetail !== null
            ? studyDetail.directions.map((d, i) => (
                <Grid2 xs={6} key={i}>
                  <Card>
                    <CardContent>
                      <GraphEdf studies={[studyDetail]} objectiveId={i} />
                    </CardContent>
                  </Card>
                </Grid2>
              ))
            : null}
        </Grid2>
      </Box>
    )
  } else if (page === "trialList") {
    content = <TrialList studyDetail={studyDetail} />
  } else if (page === "trialTable") {
    content = (
      <Box sx={{ display: "flex", width: "100%", flexDirection: "column" }}>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <TrialTable studyDetail={studyDetail} initialRowsPerPage={50} />
          </CardContent>
        </Card>
        <Typography variant="h5" sx={{ margin: theme.spacing(2) }}>
          Download CSV File
        </Typography>{" "}
        <Card
          sx={{
            margin: theme.spacing(2),
            width: 80,
            height: 80,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CardContent>
            <IconButton
              aria-label="download csv"
              size="small"
              color="inherit"
              download={`trials_${studyDetail?.id}.csv`}
              sx={{ margin: "auto 0" }}
              href={`/csv/${studyDetail?.id}`}
            >
              <DownloadIcon />
            </IconButton>
          </CardContent>
        </Card>
      </Box>
    )
  } else if (page === "note" && studyDetail !== null) {
    content = (
      <Box
        sx={{
          height: `calc(100vh - ${theme.spacing(8)})`,
          display: "flex",
          flexDirection: "column",
          padding: theme.spacing(2),
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: theme.typography.fontWeightBold,
            margin: theme.spacing(2, 0),
          }}
        >
          Note
        </Typography>
        <StudyNote
          studyId={studyId}
          latestNote={studyDetail.note}
          cardSx={{ flexGrow: 1 }}
        />
      </Box>
    )
  } else if (page === "graph") {
    content = (
      <Box
        sx={{
          height: `calc(100vh - ${theme.spacing(8)})`,
          padding: theme.spacing(2),
        }}
      >
        <PreferentialGraph studyDetail={studyDetail} />
      </Box>
    )
  } else if (page === "preferenceHistory") {
    content = <PreferenceHistory studyDetail={studyDetail} />
  }

  const toolbar = (
    <>
      <IconButton
        component={Link}
        to={URL_PREFIX + "/"}
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
      <AppDrawer
        studyId={studyId}
        page={page}
        toggleColorMode={toggleColorMode}
        toolbar={toolbar}
      >
        {content}
      </AppDrawer>
    </Box>
  )
}
