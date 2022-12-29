import React, { FC, useEffect } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import Drawer from "@mui/material/Drawer"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import {
  Card,
  Typography,
  CardContent,
  Toolbar,
  Box,
  useTheme,
  Switch,
} from "@mui/material"
import Cached from "@mui/icons-material/Cached"
import Home from "@mui/icons-material/Home"
import Settings from "@mui/icons-material/Settings"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import TableViewIcon from "@mui/icons-material/TableView"
import VisibilityIcon from '@mui/icons-material/Visibility';

import { GraphHistory } from "./GraphHistory"
import { Note } from "./Note"
import { actionCreator } from "../action"
import {
  reloadIntervalState,
  studyDetailsState,
  studySummariesState,
} from "../state"
import { usePreferenceDialog } from "./PreferenceDialog"
import {Web} from "@mui/icons-material";

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
  const [openPreferenceDialog, renderPreferenceDialog] =
    usePreferenceDialog(studyDetail)
  const [reloadInterval, updateReloadInterval] =
    useRecoilState<number>(reloadIntervalState)

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
  const title = studyDetail?.name || `Study #${studyId}`
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  const drawerWidth = 240
  const trialListWidth = 240

  return (
    <Box sx={{ display: "flex" }}>
      {renderPreferenceDialog()}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <Divider />
        <List>
          <ListItem key="Home" disablePadding>
            <ListItemButton component={Link} to={URL_PREFIX + "/"}>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Return to Home" />
            </ListItemButton>
          </ListItem>
          <ListItem key="Table" disablePadding>
            <ListItemButton component={Link} to={URL_PREFIX + "/"}>
              <ListItemIcon>
                <TableViewIcon />
              </ListItemIcon>
              <ListItemText primary="Trial Table" />
            </ListItemButton>
          </ListItem>
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <List>
          <ListItem key="LiveUpdate" disablePadding>
            <ListItemButton
              onClick={() => {
                updateReloadInterval(reloadInterval === -1 ? 10 : -1)
              }}
            >
              <ListItemIcon>
                <Cached />
              </ListItemIcon>
              <ListItemText primary="Live Update" />
              <Switch
                edge="end"
                checked={reloadInterval !== -1}
                inputProps={{
                  "aria-labelledby": "switch-list-label-live-update",
                }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem key="DarkMode" disablePadding>
            <ListItemButton
              onClick={() => {
                toggleColorMode()
              }}
            >
              <ListItemIcon>
                <Brightness7Icon />
              </ListItemIcon>
              <ListItemText primary="Dark Mode" />
              <Switch
                edge="end"
                checked={theme.palette.mode === "dark"}
                inputProps={{
                  "aria-labelledby": "switch-list-label-dark-mode",
                }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem key="Preference" disablePadding>
            <ListItemButton
              onClick={() => {
                openPreferenceDialog(true)
              }}
            >
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Preferences" />
            </ListItemButton>
          </ListItem>
          <ListItem key="BetaUI" disablePadding>
            <ListItemButton
                 component={Link} to={`${URL_PREFIX}/studies/${studyId}`}
            >
              <ListItemIcon>
                <Web />
              </ListItemIcon>
              <ListItemText primary="Use Previous UI" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
      <Box sx={{ maxHeight: 1000, width: trialListWidth, overflow: 'auto'}}>
        <List>
          { trials.map((trial, i) => {
            return (
                <ListItem key={trial.trial_id} disablePadding>
                  <ListItemButton>
                    <ListItemIcon>
                      <VisibilityIcon />
                    </ListItemIcon>
                    <ListItemText primary={`Trial ${trial.trial_id}`}
                                  secondary={<React.Fragment>
                                    <Typography>State={trial.state}</Typography>
                                  </React.Fragment>}
                    />
                  </ListItemButton>
                </ListItem>
            )
          })}
        </List>
      </Box>
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
        {studyDetail !== null ? (
          <Note studyId={studyIdNumber} latestNote={studyDetail.note} />
        ) : null}
      </Box>
    </Box>
  )
}
