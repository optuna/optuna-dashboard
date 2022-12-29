import React, { FC, useEffect } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import MuiDrawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ClearIcon from "@mui/icons-material/Clear"
import Divider from "@mui/material/Divider"
import MenuIcon from "@mui/icons-material/Menu"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import {
  Card,
  Typography,
  CardContent,
  Box,
  useTheme,
  Switch,
  Theme,
  CSSObject,
  styled,
} from "@mui/material"
import SyncIcon from "@mui/icons-material/Sync"
import SyncDisabledIcon from "@mui/icons-material/SyncDisabled"
import HomeIcon from "@mui/icons-material/Home"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import TableViewIcon from "@mui/icons-material/TableView"
import VisibilityIcon from "@mui/icons-material/Visibility"

import { GraphHistory } from "./GraphHistory"
import { Note } from "./Note"
import { actionCreator } from "../action"
import {
  reloadIntervalState,
  studyDetailsState,
  studySummariesState,
} from "../state"

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
  const title =
    studyDetail !== null || studySummary !== null
      ? `${studyDetail?.name || studySummary?.study_name} (id=${studyId})`
      : `Study #${studyId}`
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  const trialListWidth = 240

  return (
    <Box sx={{ display: "flex" }}>
      <StudyDetailDrawer
        studyId={studyIdNumber}
        toggleColorMode={toggleColorMode}
      />
      <Box sx={{ maxHeight: 1000, width: trialListWidth, overflow: "auto" }}>
        <List>
          {trials.map((trial, i) => {
            return (
              <ListItem key={trial.trial_id} disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <VisibilityIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Trial ${trial.trial_id}`}
                    secondary={
                      <React.Fragment>
                        <Typography>State={trial.state}</Typography>
                      </React.Fragment>
                    }
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

const StudyDetailDrawer: FC<{
  studyId: number
  toggleColorMode: () => void
}> = ({ studyId, toggleColorMode }) => {
  const theme = useTheme()
  const [open, setOpen] = React.useState(false)
  const drawerWidth = 240
  const [reloadInterval, updateReloadInterval] =
    useRecoilState<number>(reloadIntervalState)

  const openedMixin = (theme: Theme): CSSObject => ({
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: "hidden",
  })
  const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
    width: `calc(${theme.spacing(7)} + 1px)`,
    [theme.breakpoints.up("sm")]: {
      width: `calc(${theme.spacing(8)} + 1px)`,
    },
  })
  const DrawerHeader = styled("div")(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
  }))

  const Drawer = styled(MuiDrawer, {
    shouldForwardProp: (prop) => prop !== "open",
  })(({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    ...(open && {
      ...openedMixin(theme),
      "& .MuiDrawer-paper": openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      "& .MuiDrawer-paper": closedMixin(theme),
    }),
  }))

  return (
    <Drawer variant="permanent" anchor="left" open={open}>
      <DrawerHeader sx={open ? {} : { padding: 0, justifyContent: "center" }}>
        <IconButton
          onClick={() => {
            setOpen(!open)
          }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        <ListItem key="Home" disablePadding>
          <ListItemButton component={Link} to={URL_PREFIX + "/"}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="History" />
          </ListItemButton>
        </ListItem>
        <ListItem key="Table" disablePadding>
          <ListItemButton component={Link} to={URL_PREFIX + "/"}>
            <ListItemIcon>
              <TableViewIcon />
            </ListItemIcon>
            <ListItemText primary="Trials" />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem key="Home" disablePadding sx={{ display: "block" }}>
          <ListItemButton
            component={Link}
            to={URL_PREFIX + "/"}
            sx={{
              minHeight: 48,
              justifyContent: open ? "initial" : "center",
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : "auto",
                justifyContent: "center",
              }}
            >
              <HomeIcon />
            </ListItemIcon>
            <ListItemText
              primary="Return to Home"
              sx={{ opacity: open ? 1 : 0 }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem key="LiveUpdate" disablePadding>
          <ListItemButton
            onClick={() => {
              updateReloadInterval(reloadInterval === -1 ? 10 : -1)
            }}
          >
            <ListItemIcon>
              {reloadInterval === -1 ? <SyncDisabledIcon /> : <SyncIcon />}
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
              {theme.palette.mode === "dark" ? (
                <Brightness4Icon />
              ) : (
                <Brightness7Icon />
              )}
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
        <Divider />
        <ListItem key="BetaUI" disablePadding>
          <ListItemButton
            component={Link}
            to={`${URL_PREFIX}/studies/${studyId}`}
          >
            <ListItemIcon>
              <ClearIcon />
            </ListItemIcon>
            <ListItemText primary="Quit Beta UI" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  )
}
