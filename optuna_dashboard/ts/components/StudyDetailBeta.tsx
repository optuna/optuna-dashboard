import React, { FC, useEffect } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import MuiDrawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"
import {
  Card,
  CardContent,
  Box,
  useTheme,
  Switch,
  Theme,
  CSSObject,
  styled,
  Typography,
  Toolbar,
} from "@mui/material"

import { GraphHistory } from "./GraphHistory"
import { Note } from "./Note"
import { actionCreator } from "../action"
import { reloadIntervalState, studyDetailsState } from "../state"
import { TrialTable } from "./TrialTable"
import { StudyDetailDrawer } from "./StudyDetailDrawer"

interface ParamTypes {
  studyId: string
}

type PageId = "top" | "trials" | "note"

const useStudyDetailValue = (studyId: number): StudyDetail | null => {
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)
  return studyDetails[studyId] || null
}

export const StudyDetailBeta: FC<{
  toggleColorMode: () => void
  page: PageId
}> = ({ toggleColorMode, page }) => {
  const theme = useTheme()
  const action = actionCreator()
  const { studyId } = useParams<ParamTypes>()
  const studyIdNumber = parseInt(studyId, 10)
  const studyDetail = useStudyDetailValue(studyIdNumber)
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

  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  const trialListWidth = 240

  let content = null
  if (page === "top") {
    content = (
      <Box sx={{ display: "flex", width: "100%" }}>
        <Box sx={{ height: "100vh", width: trialListWidth, overflow: "auto" }}>
          <List dense={true}>
            <ListSubheader>{`Trials (${
              studyDetail?.trials.length || 0
            })`}</ListSubheader>
            {trials.map((trial, i) => {
              return (
                <ListItem key={trial.trial_id} disablePadding>
                  <ListItemButton>
                    <ListItemText
                      primary={`Trial ${trial.trial_id}`}
                      secondary={`State=${trial.state}`}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box
          component="main"
          sx={{ flexGrow: 1, bgcolor: "background.default", p: 3 }}
        >
          <Card
            sx={{
              margin: theme.spacing(2),
            }}
          >
            <CardContent>
              <GraphHistory study={studyDetail} />
            </CardContent>
          </Card>
        </Box>
      </Box>
    )
  } else if (page === "trials") {
    content = <TrialTable studyDetail={studyDetail} />
  } else {
    content =
      studyDetail !== null ? (
        <Note studyId={studyIdNumber} latestNote={studyDetail.note} />
      ) : null
  }

  return (
    <Box sx={{ display: "flex" }}>
      <StudyDetailDrawer
        studyId={studyIdNumber}
        page={page}
        toggleColorMode={toggleColorMode}
      >
        {content}
      </StudyDetailDrawer>
    </Box>
  )
}
