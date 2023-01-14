import React, { FC, ReactNode, useMemo } from "react"
import {
  Typography,
  Box,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
  Card,
  CardContent,
  CardMedia,
} from "@mui/material"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"
import FilterListIcon from "@mui/icons-material/FilterList"
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank"
import CheckBoxIcon from "@mui/icons-material/CheckBox"

import { TrialNote } from "./Note"
import { useHistory, useLocation } from "react-router-dom"
import ListItemIcon from "@mui/material/ListItemIcon"
import { useRecoilValue } from "recoil"
import { artifactIsAvailable } from "../state"

const states: TrialState[] = [
  "Complete",
  "Pruned",
  "Fail",
  "Running",
  "Waiting",
]

type Color =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning"

const getChipColor = (state: TrialState): Color => {
  if (state === "Complete") {
    return "primary"
  } else if (state === "Running") {
    return "default"
  } else if (state === "Waiting") {
    return "default"
  } else if (state === "Pruned") {
    return "warning"
  } else if (state === "Fail") {
    return "error"
  }
  return "default"
}

const useQuery = (): URLSearchParams => {
  const { search } = useLocation()

  return useMemo(() => new URLSearchParams(search), [search])
}

const useExcludedStates = (query: URLSearchParams): TrialState[] => {
  return useMemo(() => {
    const exclude = query.get("exclude")
    if (exclude === null) {
      return []
    }
    const excluded: TrialState[] = exclude
      .split(",")
      .map((s): TrialState | undefined => {
        return states.find((state) => state.toUpperCase() === s.toUpperCase())
      })
      .filter((s): s is TrialState => s !== undefined)
    return excluded
  }, [query])
}

const useTrials = (
  studyDetail: StudyDetail | null,
  excludedStates: TrialState[]
): Trial[] => {
  return useMemo(() => {
    let result = studyDetail !== null ? studyDetail.trials : []
    if (excludedStates.length === 0) {
      return result
    }
    excludedStates.forEach((s) => {
      result = result.filter((t) => t.state !== s)
    })
    return result
  }, [studyDetail, excludedStates])
}

const useSelectedTrials = (
  trials: Trial[],
  query: URLSearchParams
): Trial[] => {
  return useMemo(() => {
    const selected = query.get("numbers")
    if (selected === null) {
      return []
    }
    const numbers = selected
      .split(",")
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n))
    return trials.filter((t) => numbers.findIndex((n) => n === t.number) !== -1)
  }, [trials, query])
}

const useIsBestTrial = (
  studyDetail: StudyDetail | null
): ((trialId: number) => boolean) => {
  return useMemo(() => {
    const bestTrialIDs = studyDetail?.best_trials.map((t) => t.trial_id) || []
    return (trialId: number): boolean =>
      bestTrialIDs.findIndex((a) => a === trialId) != -1
  }, [studyDetail])
}

const TrialListDetail: FC<{
  studyId: number
  trial: Trial
  isBestTrial: (trialId: number) => boolean
}> = ({ studyId, trial, isBestTrial }) => {
  const theme = useTheme()
  const artifactEnabled = useRecoilValue<boolean>(artifactIsAvailable)
  const startMs = trial.datetime_start?.getTime()
  const completeMs = trial.datetime_complete?.getTime()
  let duration = ""
  if (startMs !== undefined && completeMs !== undefined) {
    duration = (completeMs - startMs).toString()
  }

  const params = trial.state === "Waiting" ? trial.fixed_params : trial.params
  const info: [string, string | null | ReactNode][] = [
    ["Value", trial.values?.map((v) => v.toString()).join(" ") || "None"],
    [
      "Intermediate Values",
      <Box>
        {trial.intermediate_values.map((v) => (
          <Typography key={v.step}>
            {v.step} {v.value}
          </Typography>
        ))}
      </Box>,
    ],
    [
      "Parameter",
      <Box>
        {params.map((p) => (
          <Typography key={p.name}>
            {p.name} {p.param_external_value}
          </Typography>
        ))}
      </Box>,
    ],
    [
      "Started At",
      trial?.datetime_start ? trial?.datetime_start.toString() : null,
    ],
    [
      "Completed At",
      trial?.datetime_complete ? trial?.datetime_complete.toString() : null,
    ],
    ["Duration", `${duration} ms`],
    [
      "User Attributes",
      <Box>
        {trial.user_attrs.map((t) => (
          <Typography key={t.key}>
            {t.key} {t.value}
          </Typography>
        ))}
      </Box>,
    ],
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
        Trial {trial.number} (trial_id={trial.trial_id})
      </Typography>
      <Box sx={{ marginBottom: theme.spacing(1) }}>
        <Chip
          color={getChipColor(trial.state)}
          label={trial.state}
          sx={{ marginRight: theme.spacing(1) }}
          variant="outlined"
        />
        {isBestTrial(trial.trial_id) ? (
          <Chip label={"Best Trial"} color="secondary" variant="outlined" />
        ) : null}
      </Box>
      <Box
        sx={{
          marginBottom: theme.spacing(2),
          display: "flex",
          flexDirection: "column",
        }}
      >
        {info.map(([key, value]) => renderInfo(key, value))}
      </Box>
      <TrialNote
        studyId={trial.study_id}
        trialId={trial.trial_id}
        latestNote={trial.note}
        cardSx={{ marginBottom: theme.spacing(2) }}
      />
      {artifactEnabled && (
        <>
          <Typography
            variant="h5"
            sx={{ fontWeight: theme.typography.fontWeightBold }}
          >
            Artifacts
          </Typography>
          <Box
            sx={{ display: "flex", flexWrap: "wrap", p: theme.spacing(1, 0) }}
          >
            {trial.artifacts.map((a) => {
              if (a.mimetype.startsWith("image")) {
                return (
                  <Card
                    sx={{
                      marginBottom: theme.spacing(2),
                      width: "280px",
                      margin: theme.spacing(0, 1, 1, 0),
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="210"
                      image={`/artifacts/${studyId}/${trial.trial_id}/${a.artifact_id}`}
                      alt={a.filename}
                    />
                    <CardContent>
                      <Typography>{a.filename}</Typography>
                    </CardContent>
                  </Card>
                )
              } else {
                return (
                  <Card sx={{
                    marginBottom: theme.spacing(2),
                    width: "280px",
                    margin: theme.spacing(0, 1, 1, 0),
                  }}>
                    <CardContent>
                      <Typography>{a.filename}</Typography>
                    </CardContent>
                  </Card>
                )
              }
            })}
            <Card sx={{
              marginBottom: theme.spacing(2),
              width: "280px",
              minHeight: "210px",
              margin: theme.spacing(0, 1, 1, 0),
              border: `1px dashed ${"white"}`
            }}>
              <CardContent>
                <Typography>Upload a new artifact</Typography>
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Box>
  )
}

const getTrialListLink = (
  studyId: number,
  exclude: TrialState[],
  numbers: number[]
): string => {
  const base = URL_PREFIX + `/studies/${studyId}/trials`
  if (exclude.length > 0 && numbers.length > 0) {
    return (
      base +
      `?exclude=${exclude.join(",")}&numbers=${numbers
        .map((n) => n.toString())
        .join(",")}`
    )
  } else if (exclude.length > 0) {
    return base + "?exclude=" + exclude.join(",")
  } else if (numbers.length > 0) {
    return base + "?numbers=" + numbers.map((n) => n.toString()).join(",")
  }
  return base
}

export const TrialList: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const theme = useTheme()
  const query = useQuery()
  const history = useHistory()
  const excludedStates = useExcludedStates(query)
  const trials = useTrials(studyDetail, excludedStates)
  const isBestTrial = useIsBestTrial(studyDetail)
  const selected = useSelectedTrials(trials, query)
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const openFilterMenu = Boolean(filterMenuAnchorEl)
  const trialCounts = useMemo<number[]>(() => {
    const allTrials = studyDetail?.trials || []
    return states.map(
      (state) => allTrials.filter((t) => t.state === state).length
    )
  }, [studyDetail?.trials])

  const trialListWidth = 200

  const showDetailTrials =
    selected.length > 0 ? selected : trials.length > 0 ? [trials[0]] : []

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
              {trials.length} Trials
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
              {states.map((state, i) => (
                <MenuItem
                  key={state}
                  onClick={(e) => {
                    if (studyDetail === null) {
                      return
                    }
                    const index = excludedStates.findIndex((s) => s === state)
                    if (index === -1) {
                      excludedStates.push(state)
                    } else {
                      excludedStates.splice(index, 1)
                    }
                    const numbers = selected.map((t) => t.number)
                    history.push(
                      getTrialListLink(studyDetail.id, excludedStates, numbers)
                    )
                  }}
                  disabled={trialCounts[i] === 0}
                >
                  <ListItemIcon>
                    {excludedStates.find((s) => s === state) !== undefined ? (
                      <CheckBoxOutlineBlankIcon color="primary" />
                    ) : (
                      <CheckBoxIcon color="primary" />
                    )}
                  </ListItemIcon>
                  {state} ({trialCounts[i]})
                </MenuItem>
              ))}
            </Menu>
          </ListSubheader>
          <Divider />
          {trials.map((trial, i) => {
            return (
              <ListItem key={trial.trial_id} disablePadding>
                <ListItemButton
                  onClick={(e) => {
                    if (e.shiftKey) {
                      let next: number[]
                      const selectedNumbers = selected.map((t) => t.number)
                      if (selectedNumbers.length === 0) {
                        selectedNumbers.push(trials[0].number)
                      }
                      const alreadySelected =
                        selectedNumbers.findIndex((n) => n === trial.number) >=
                        0
                      if (alreadySelected) {
                        next = selectedNumbers.filter((n) => n !== trial.number)
                      } else {
                        next = [...selectedNumbers, trial.number]
                      }
                      history.push(
                        getTrialListLink(trial.study_id, excludedStates, next)
                      )
                    } else {
                      history.push(
                        getTrialListLink(trial.study_id, excludedStates, [
                          trial.number,
                        ])
                      )
                    }
                  }}
                  selected={
                    selected.findIndex((t) => t.number === trial.number) !== -1
                  }
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <ListItemText primary={`Trial ${trial.number}`} />
                  <Box>
                    <Chip
                      color={getChipColor(trial.state)}
                      label={trial.state}
                      sx={{ margin: theme.spacing(0) }}
                      size="small"
                      variant="outlined"
                    />
                    {isBestTrial(trial.trial_id) ? (
                      <Chip
                        label={"Best Trial"}
                        color="secondary"
                        sx={{ marginLeft: theme.spacing(1) }}
                        size="small"
                        variant="outlined"
                      />
                    ) : null}
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
          {studyDetail === null || showDetailTrials.length === 0
            ? null
            : showDetailTrials.map((t) => (
                <TrialListDetail
                  key={t.trial_id}
                  studyId={studyDetail.id}
                  trial={t}
                  isBestTrial={isBestTrial}
                />
              ))}
        </Box>
      </Box>
    </Box>
  )
}
