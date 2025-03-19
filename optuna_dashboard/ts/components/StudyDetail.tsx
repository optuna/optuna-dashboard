import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import DownloadIcon from "@mui/icons-material/Download"
import HomeIcon from "@mui/icons-material/Home"
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material"
import Grid from "@mui/material/Grid"
import { useAtomValue } from "jotai"
import React, { FC, useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"

import { TrialTable } from "@optuna/react"
import { actionCreator } from "../action"
import { useConstants } from "../constantsProvider"
import { studyDetailToStudy } from "../graphUtil"
import {
  reloadIntervalState,
  useStudyDetailValue,
  useStudyIsPreferential,
  useStudyName,
} from "../state"
import { AppDrawer, PageId } from "./AppDrawer"
import { Contour } from "./GraphContour"
import { GraphEdf } from "./GraphEdf"
import { GraphParallelCoordinate } from "./GraphParallelCoordinate"
import { GraphRank } from "./GraphRank"
import { GraphSlice } from "./GraphSlice"
import { StudyNote } from "./Note"
import { PreferentialAnalytics } from "./Preferential/PreferentialAnalytics"
import { PreferentialGraph } from "./Preferential/PreferentialGraph"
import { PreferentialHistory } from "./Preferential/PreferentialHistory"
import { PreferentialTrials } from "./Preferential/PreferentialTrials"
import { StudyHistory } from "./StudyHistory"
import { TrialList } from "./TrialList"
import { TrialSelection } from "./TrialSelection"

export const useURLVars = (): number => {
  const { studyId } = useParams<{ studyId: string }>()

  if (studyId === undefined) {
    throw new Error("studyId is not defined")
  }

  return useMemo(() => parseInt(studyId, 10), [studyId])
}

export const StudyDetail: FC<{
  toggleColorMode: () => void
  page: PageId
}> = ({ toggleColorMode, page }) => {
  const { url_prefix } = useConstants()

  const theme = useTheme()
  const action = actionCreator()
  const studyId = useURLVars()
  const studyDetail = useStudyDetailValue(studyId)
  const reloadInterval = useAtomValue(reloadIntervalState)
  const studyName = useStudyName(studyId)
  const isPreferential = useStudyIsPreferential(studyId)
  const study = studyDetailToStudy(studyDetail)

  const title =
    studyName !== null ? `${studyName} (id=${studyId})` : `Study #${studyId}`

  useEffect(() => {
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

    const intervalId = setInterval(() => {
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
      <Box
        component="div"
        sx={{ display: "flex", width: "100%", flexDirection: "column" }}
      >
        <Typography
          variant="h5"
          sx={{
            margin: theme.spacing(2),
            marginTop: theme.spacing(4),
            fontWeight: theme.typography.fontWeightBold,
          }}
        >
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
        <Typography
          variant="h5"
          sx={{
            margin: theme.spacing(2),
            marginTop: theme.spacing(4),
            fontWeight: theme.typography.fontWeightBold,
          }}
        >
          Empirical Distribution of the Objective Value
        </Typography>
        <Grid container spacing={2} sx={{ padding: theme.spacing(2) }}>
          {studyDetail !== null
            ? studyDetail.directions.map((d, i) => (
                <Grid item xs={6} key={i}>
                  <Card>
                    <CardContent>
                      <GraphEdf studies={[studyDetail]} objectiveId={i} />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            : null}
        </Grid>
      </Box>
    )
  } else if (page === "trialList") {
    content = <TrialList studyDetail={studyDetail} />
  } else if (page === "trialSelection") {
    content = <TrialSelection studyDetail={studyDetail} />
  } else if (page === "trialTable" && study !== null) {
    const linkURL = (studyId: number, trialNumber: number) => {
      return url_prefix + `/studies/${studyId}/trials?numbers=${trialNumber}`
    }
    content = (
      <Box
        component="div"
        sx={{ display: "flex", width: "100%", flexDirection: "column" }}
      >
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <TrialTable study={study} linkComponent={Link} linkURL={linkURL} />
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              download
              href={`/csv/${studyDetail?.id}`}
              sx={{ marginRight: theme.spacing(2), minWidth: "120px" }}
            >
              Download CSV File
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  } else if (page === "note" && studyDetail !== null) {
    content = (
      <Box
        component="div"
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
        component="div"
        sx={{
          height: `calc(100vh - ${theme.spacing(8)})`,
          padding: theme.spacing(2),
        }}
      >
        <PreferentialGraph studyDetail={studyDetail} />
      </Box>
    )
  } else if (page === "preferenceHistory") {
    content = <PreferentialHistory studyDetail={studyDetail} />
  }

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
