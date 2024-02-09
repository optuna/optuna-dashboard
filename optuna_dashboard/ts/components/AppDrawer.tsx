import React, { FC } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import { styled, useTheme, Theme, CSSObject } from "@mui/material/styles"
import Modal from "@mui/material/Modal"
import { Settings } from "./Settings"
import Box from "@mui/material/Box"
import MuiDrawer from "@mui/material/Drawer"
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import List from "@mui/material/List"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import {
  drawerOpenState,
  reloadIntervalState,
  useStudyIsPreferential,
} from "../state"
import { Link } from "react-router-dom"
import AutoGraphIcon from "@mui/icons-material/AutoGraph"
import ViewListIcon from "@mui/icons-material/ViewList"
import SyncIcon from "@mui/icons-material/Sync"
import SyncDisabledIcon from "@mui/icons-material/SyncDisabled"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import TableViewIcon from "@mui/icons-material/TableView"
import RateReviewIcon from "@mui/icons-material/RateReview"
import SettingsIcon from "@mui/icons-material/Settings"

import MenuIcon from "@mui/icons-material/Menu"
import GitHubIcon from "@mui/icons-material/GitHub"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import QueryStatsIcon from "@mui/icons-material/QueryStats"
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt"
import HistoryIcon from "@mui/icons-material/History"
import LanIcon from "@mui/icons-material/Lan"
import { Switch } from "@mui/material"
import { actionCreator } from "../action"

const drawerWidth = 240

export type PageId =
  | "top"
  | "analytics"
  | "trialTable"
  | "trialList"
  | "note"
  | "preferenceHistory"
  | "graph"

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

interface AppBarProps extends MuiAppBarProps {
  open?: boolean
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
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

export const AppDrawer: FC<{
  studyId?: number
  toggleColorMode: () => void
  page?: PageId
  toolbar: React.ReactNode
  children?: React.ReactNode
}> = ({ studyId, toggleColorMode, page, toolbar, children }) => {
  const theme = useTheme()
  const action = actionCreator()
  const [open, setOpen] = useRecoilState<boolean>(drawerOpenState)
  const reloadInterval = useRecoilValue<number>(reloadIntervalState)
  const isPreferential =
    studyId !== undefined ? useStudyIsPreferential(studyId) : null

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

  const handleDrawerOpen = () => {
    setOpen(true)
  }

  const handleDrawerClose = () => {
    setOpen(false)
  }

  const [settingOpen, setSettingOpen] = React.useState(false)

  const handleSettingOpen = () => {
    setSettingOpen(true)
  }

  const handleSettingClose = () => {
    setSettingOpen(false)
  }

  return (
    <Box sx={{ display: "flex", width: "100%" }}>
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: "none" }),
            }}
          >
            <MenuIcon />
          </IconButton>
          {toolbar}
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === "rtl" ? (
              <ChevronRightIcon />
            ) : (
              <ChevronLeftIcon />
            )}
          </IconButton>
        </DrawerHeader>
        <Divider />
        {studyId !== undefined && page && (
          <List>
            <ListItem key="Top" disablePadding sx={styleListItem}>
              <ListItemButton
                component={Link}
                to={`${URL_PREFIX}/studies/${studyId}`}
                sx={styleListItemButton}
                selected={page === "top"}
              >
                <ListItemIcon sx={styleListItemIcon}>
                  {isPreferential ? <ThumbUpAltIcon /> : <AutoGraphIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={isPreferential ? "Feedback Preference" : "History"}
                  sx={styleListItemText}
                />
              </ListItemButton>
            </ListItem>
            {isPreferential && (
              <ListItem
                key="PreferenceHistory"
                disablePadding
                sx={styleListItem}
              >
                <ListItemButton
                  component={Link}
                  to={`${URL_PREFIX}/studies/${studyId}/preference-history`}
                  sx={styleListItemButton}
                  selected={page === "preferenceHistory"}
                >
                  <ListItemIcon sx={styleListItemIcon}>
                    <HistoryIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Preferences (History)"
                    sx={styleListItemText}
                  />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem key="Analytics" disablePadding sx={styleListItem}>
              <ListItemButton
                component={Link}
                to={`${URL_PREFIX}/studies/${studyId}/analytics`}
                sx={styleListItemButton}
                selected={page === "analytics"}
              >
                <ListItemIcon sx={styleListItemIcon}>
                  <QueryStatsIcon />
                </ListItemIcon>
                <ListItemText primary="Analytics" sx={styleListItemText} />
              </ListItemButton>
            </ListItem>
            {isPreferential && (
              <ListItem key="PreferenceGraph" disablePadding sx={styleListItem}>
                <ListItemButton
                  component={Link}
                  to={`${URL_PREFIX}/studies/${studyId}/graph`}
                  sx={styleListItemButton}
                  selected={page === "graph"}
                >
                  <ListItemIcon sx={styleListItemIcon}>
                    <LanIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Preferences (Graph)"
                    sx={styleListItemText}
                  />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem key="TableList" disablePadding sx={styleListItem}>
              <ListItemButton
                component={Link}
                to={`${URL_PREFIX}/studies/${studyId}/trials`}
                sx={styleListItemButton}
                selected={page === "trialList"}
              >
                <ListItemIcon sx={styleListItemIcon}>
                  <ViewListIcon />
                </ListItemIcon>
                <ListItemText primary="Trials (List)" sx={styleListItemText} />
              </ListItemButton>
            </ListItem>
            <ListItem key="TrialTable" disablePadding sx={styleListItem}>
              <ListItemButton
                component={Link}
                to={`${URL_PREFIX}/studies/${studyId}/trialTable`}
                sx={styleListItemButton}
                selected={page === "trialTable"}
              >
                <ListItemIcon sx={styleListItemIcon}>
                  <TableViewIcon />
                </ListItemIcon>
                <ListItemText primary="Trials (Table)" sx={styleListItemText} />
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
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <List>
          {studyId !== undefined && (
            <ListItem key="LiveUpdate" disablePadding sx={styleListItem}>
              <ListItemButton
                sx={styleListItemButton}
                onClick={() => {
                  action.saveReloadInterval(reloadInterval === -1 ? 10 : -1)
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
          )}
          <ListItem key="Settings" disablePadding sx={styleListItem}>
            <ListItemButton
              sx={styleListItemButton}
              onClick={handleSettingOpen}
            >
              <ListItemIcon sx={styleListItemIcon}>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" sx={styleListItemText} />
            </ListItemButton>
            <Modal
              open={settingOpen}
              onClose={handleSettingClose}
              aria-labelledby="modal-modal-title"
              aria-describedby="modal-modal-description"
            >
              <Box
                sx={{
                  position: "absolute",
                  top: "10%",
                  left: "10%",
                  overflow: "auto",
                  width: "80%",
                  height: "80%",
                  bgcolor: "background.paper",
                }}
              >
                <Settings />
              </Box>
            </Modal>
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
          <ListItem key="Feedback" disablePadding sx={styleListItem}>
            <ListItemButton
              target="_blank"
              href="https://github.com/optuna/optuna-dashboard/discussions/new/choose"
              sx={styleListItemButton}
            >
              <ListItemIcon sx={styleListItemIcon}>
                <GitHubIcon />
              </ListItemIcon>
              <ListItemText primary="Send Feedback" sx={styleListItemText} />
              <OpenInNewIcon sx={styleSwitch} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <DrawerHeader />
        {children || null}
      </Box>
    </Box>
  )
}
