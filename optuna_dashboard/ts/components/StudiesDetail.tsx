import React, { FC, ReactNode, useEffect, useMemo } from "react"
import { useRecoilValue } from "recoil"
import {
  Typography,
  Box,
  useTheme,
  IconButton,
  Menu,
} from "@mui/material"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"
import FilterListIcon from "@mui/icons-material/FilterList"

import { actionCreator } from "../action"
import { studySummariesState } from "../state"
import { useLocation } from "react-router-dom"

const StudyListDetail: FC<{
  study: StudySummary
}> = ({ study }) => {
  const theme = useTheme()

  const info: [string, string | null | ReactNode][] = [
    ["Value", study.study_id],
  ]
  const renderInfo = (
    key: string,
    value: string | null | ReactNode
  ): ReactNode => (
    <Box
      key={key}
      sx={{
        display: "flex",
        flexDirection: "row",
        marginBottom: theme.spacing(0.5),
      }}
    >
      <Typography
        sx={{ p: theme.spacing(1) }}
        color="text.secondary"
        minWidth={"200px"}
        fontWeight={theme.typography.fontWeightLight}
        fontSize={theme.typography.fontSize}
      >
        {key}
      </Typography>
      <Box
        sx={{
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          width: "100%",
          p: theme.spacing(0.5, 1),
          borderRadius: theme.shape.borderRadius * 0.2,
          display: "flex",
          alignItems: "center",
        }}
      >
        {value}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ width: "100%", padding: theme.spacing(2, 2, 0, 2) }}>
      <Typography
        variant="h4"
        sx={{
          marginBottom: theme.spacing(2),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        Study {study.study_id} (study_id={study.study_id})
      </Typography>
      <Box
        sx={{
          marginBottom: theme.spacing(2),
          display: "flex",
          flexDirection: "column",
        }}
      >
        {info.map(([key, value]) => renderInfo(key, value))}
      </Box>
    </Box>
  )
}

export const StudiesDetail: FC<null> = () => {
  const theme = useTheme()

  const action = actionCreator()
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  const selected = studies
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const openFilterMenu = Boolean(filterMenuAnchorEl)

  const trialListWidth = 200

  const showDetailTrials =
    selected.length > 0 ? selected : studies.length > 0 ? [studies[0]] : []

  return (
    <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
      <Box
        sx={{
          minWidth: trialListWidth,
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
            <IconButton
              aria-label="Filter"
              aria-controls={openFilterMenu ? "filter-trials" : undefined}
              aria-haspopup="true"
              aria-expanded={openFilterMenu ? "true" : undefined}
              onClick={(e) => {
                setFilterMenuAnchorEl(e.currentTarget)
              }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={filterMenuAnchorEl}
              id="filter-trials"
              open={openFilterMenu}
              onClose={() => {
                setFilterMenuAnchorEl(null)
              }}
            >
            </Menu>
          </ListSubheader>
          <Divider />
          {studies.map((study, i) => {
            return (
              <ListItem key={study.study_id} disablePadding>
                <ListItemButton>
                  <ListItemText primary={`Study ${study.study_id}`} />
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
          {showDetailTrials.length === 0
            ? null
            : showDetailTrials.map((s) => (
                <StudyListDetail
                  key={s.study_id}
                  study={s}
                />
              ))}
        </Box>
      </Box>
    </Box>
  )
}
