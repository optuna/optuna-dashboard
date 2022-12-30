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
} from "@mui/material"
import AutoGraphIcon from "@mui/icons-material/AutoGraph"
import SyncIcon from "@mui/icons-material/Sync"
import SyncDisabledIcon from "@mui/icons-material/SyncDisabled"
import HomeIcon from "@mui/icons-material/Home"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import TableViewIcon from "@mui/icons-material/TableView"
import RateReviewIcon from "@mui/icons-material/RateReview"

import { GraphHistory } from "./GraphHistory"
import { Note } from "./Note"
import { actionCreator } from "../action"
import { reloadIntervalState, studyDetailsState } from "../state"
import { TrialTable } from "./TrialTable"

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
        toggleColorMode={toggleColorMode}
        page={page}
      />
      {content}
    </Box>
  )
}

const StudyDetailDrawer: FC<{
  studyId: number
  toggleColorMode: () => void
  page: PageId
}> = ({ studyId, toggleColorMode, page }) => {
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

  const styleListItem = {
    display: "block",
  }
  const styleListItemButton = {
    minHeight: 48,
    justifyContent: open ? "initial" : "center",
    px: 2.5,
  }
  const styleListItemIcon = {
    minWidth: 0,
    mr: open ? 3 : "auto",
    justifyContent: "center",
  }
  const styleListItemText = {
    opacity: open ? 1 : 0,
  }
  const styleSwitch = {
    display: open ? "inherit" : "none",
  }

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
        <ListItem key="Top" disablePadding sx={styleListItem}>
          <ListItemButton
            component={Link}
            to={`${URL_PREFIX}/studies/${studyId}/beta`}
            sx={styleListItemButton}
            selected={page === "top"}
          >
            <ListItemIcon sx={styleListItemIcon}>
              <AutoGraphIcon />
            </ListItemIcon>
            <ListItemText primary="History" sx={styleListItemText} />
          </ListItemButton>
        </ListItem>
        <ListItem key="Table" disablePadding sx={styleListItem}>
          <ListItemButton
            component={Link}
            to={`${URL_PREFIX}/studies/${studyId}/trials`}
            sx={styleListItemButton}
            selected={page === "trials"}
          >
            <ListItemIcon sx={styleListItemIcon}>
              <TableViewIcon />
            </ListItemIcon>
            <ListItemText primary="Trials" sx={styleListItemText} />
          </ListItemButton>
        </ListItem>
        <ListItem key="Note" disablePadding sx={styleListItem}>
          <ListItemButton
            component={Link}
            to={`${URL_PREFIX}/studies/${studyId}/note`}
            sx={styleListItemButton}
            selected={page === "note"}
          >
            <ListItemIcon sx={styleListItemIcon}>
              <RateReviewIcon />
            </ListItemIcon>
            <ListItemText primary="Note" sx={styleListItemText} />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem key="Home" disablePadding sx={styleListItem}>
          <ListItemButton
            component={Link}
            to={URL_PREFIX + "/"}
            sx={styleListItemButton}
          >
            <ListItemIcon sx={styleListItemIcon}>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Return to Home" sx={styleListItemText} />
          </ListItemButton>
        </ListItem>
        <Divider />
        <ListItem key="LiveUpdate" disablePadding sx={styleListItem}>
          <ListItemButton
            sx={styleListItemButton}
            onClick={() => {
              updateReloadInterval(reloadInterval === -1 ? 10 : -1)
            }}
          >
            <ListItemIcon sx={styleListItemIcon}>
              {reloadInterval === -1 ? <SyncDisabledIcon /> : <SyncIcon />}
            </ListItemIcon>
            <ListItemText primary="Live Update" sx={styleListItemText} />
            <Switch
              edge="end"
              checked={reloadInterval !== -1}
              sx={styleSwitch}
              inputProps={{
                "aria-labelledby": "switch-list-label-live-update",
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem key="DarkMode" disablePadding sx={styleListItem}>
          <ListItemButton
            sx={styleListItemButton}
            onClick={() => {
              toggleColorMode()
            }}
          >
            <ListItemIcon sx={styleListItemIcon}>
              {theme.palette.mode === "dark" ? (
                <Brightness4Icon />
              ) : (
                <Brightness7Icon />
              )}
            </ListItemIcon>
            <ListItemText primary="Dark Mode" sx={styleListItemText} />
            <Switch
              edge="end"
              checked={theme.palette.mode === "dark"}
              sx={styleSwitch}
              inputProps={{
                "aria-labelledby": "switch-list-label-dark-mode",
              }}
            />
          </ListItemButton>
        </ListItem>
        <Divider />
        <ListItem key="BetaUI" disablePadding sx={styleListItem}>
          <ListItemButton
            component={Link}
            to={`${URL_PREFIX}/studies/${studyId}`}
            sx={styleListItemButton}
          >
            <ListItemIcon sx={styleListItemIcon}>
              <ClearIcon />
            </ListItemIcon>
            <ListItemText primary="Quit Beta UI" sx={styleListItemText} />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  )
}
