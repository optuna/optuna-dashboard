import CheckBoxIcon from "@mui/icons-material/CheckBox"
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank"
import FilterListIcon from "@mui/icons-material/FilterList"
import StopCircleIcon from "@mui/icons-material/StopCircle"
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from "@mui/material"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"
import * as Optuna from "@optuna/types"
import React, { FC, ReactNode, useMemo } from "react"

import ListItemIcon from "@mui/material/ListItemIcon"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useNavigate } from "react-router-dom"
import { useRecoilValue } from "recoil"
import { FormWidgets, StudyDetail, Trial } from "ts/types/optuna"
import { actionCreator } from "../action"
import { useConstants } from "../constantsProvider"
import { artifactIsAvailable } from "../state"
import { useQuery } from "../urlQuery"
import { TrialArtifactCards } from "./Artifact/TrialArtifactCards"
import { TrialNote } from "./Note"
import { TrialFormWidgets } from "./TrialFormWidgets"

const states: Optuna.TrialState[] = [
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

const getChipColor = (state: Optuna.TrialState): Color => {
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

const useExcludedStates = (query: URLSearchParams): Optuna.TrialState[] => {
  return useMemo(() => {
    const exclude = query.get("exclude")
    if (exclude === null) {
      return []
    }
    const excluded: Optuna.TrialState[] = exclude
      .split(",")
      .map((s): Optuna.TrialState | undefined => {
        return states.find((state) => state.toUpperCase() === s.toUpperCase())
      })
      .filter((s): s is Optuna.TrialState => s !== undefined)
    return excluded
  }, [query])
}

const useTrials = (
  studyDetail: StudyDetail | null,
  excludedStates: Optuna.TrialState[]
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

const useQueriedTrials = (trials: Trial[], query: URLSearchParams): Trial[] => {
  return useMemo(() => {
    const queried = query.get("numbers")
    if (queried === null) {
      return []
    }
    const numbers = queried
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
      bestTrialIDs.findIndex((a) => a === trialId) !== -1
  }, [studyDetail])
}

export const TrialListDetail: FC<{
  trial: Trial
  isBestTrial: (trialId: number) => boolean
  directions: Optuna.StudyDirection[]
  metricNames: string[]
  formWidgets?: FormWidgets
}> = ({ trial, isBestTrial, directions, metricNames, formWidgets }) => {
  const theme = useTheme()
  const action = actionCreator()
  const artifactEnabled = useRecoilValue<boolean>(artifactIsAvailable)
  const startMs = trial.datetime_start?.getTime()
  const completeMs = trial.datetime_complete?.getTime()

  const params = trial.state === "Waiting" ? trial.fixed_params : trial.params
  const info: [string, string | null | ReactNode][] = [
    ["Value", trial.values?.map((v) => v.toString()).join(", ") || "None"],
    [
      "Intermediate Values",
      <Box component="div">
        {trial.intermediate_values.map((v) => (
          <Typography key={v.step}>
            {v.step} {v.value}
          </Typography>
        ))}
      </Box>,
    ],
    [
      "Parameter",
      <Box component="div">
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
    [
      "Duration (ms)",
      startMs !== undefined && completeMs !== undefined
        ? (completeMs - startMs).toString()
        : null,
    ],
    [
      "User Attributes",
      <Box component="div">
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
      component="div"
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
        component="div"
        sx={{
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          width: "100%",
          maxHeight: "150px",
          overflow: "auto",
          p: theme.spacing(0.5, 1),
          borderRadius: theme.shape.borderRadius * 0.2,
          display: "flex",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Box>
    </Box>
  )

  return (
    <Box
      component="div"
      sx={{ width: "100%", padding: theme.spacing(2, 2, 0, 2) }}
    >
      <Typography
        variant="h4"
        sx={{
          marginBottom: theme.spacing(2),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        Trial {trial.number} (trial_id={trial.trial_id})
      </Typography>
      <Box
        component="div"
        sx={{
          marginBottom: theme.spacing(1),
          display: "flex",
          flexDirection: "row",
        }}
      >
        <Chip
          color={getChipColor(trial.state)}
          label={trial.state}
          sx={{ marginRight: theme.spacing(1) }}
          variant="outlined"
        />
        {isBestTrial(trial.trial_id) ? (
          <Chip label={"Best Trial"} color="secondary" variant="outlined" />
        ) : null}
        <Box component="div" sx={{ flexGrow: 1 }} />
        {trial.state === "Running" ? (
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<StopCircleIcon />}
            onClick={() => {
              action.makeTrialFail(trial.study_id, trial.trial_id)
            }}
          >
            Fail Trial
          </Button>
        ) : null}
      </Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: theme.typography.fontWeightBold,
          marginBottom: theme.spacing(1),
        }}
      >
        Note
      </Typography>
      <TrialNote
        studyId={trial.study_id}
        trialId={trial.trial_id}
        latestNote={trial.note}
        cardSx={{ marginBottom: theme.spacing(2) }}
      />
      <TrialFormWidgets
        trial={trial}
        directions={directions}
        metricNames={metricNames}
        formWidgets={formWidgets}
      />
      <Box
        component="div"
        sx={{
          marginBottom: theme.spacing(2),
          display: "flex",
          flexDirection: "column",
        }}
      >
        {info.map(([key, value]) =>
          value !== null ? renderInfo(key, value) : null
        )}
      </Box>
      {artifactEnabled && <TrialArtifactCards trial={trial} />}
    </Box>
  )
}

const getTrialListLink = (
  studyId: number,
  exclude: Optuna.TrialState[],
  numbers: number[],
  URL_PREFIX: string
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
  const { url_prefix } = useConstants()

  const theme = useTheme()
  const query = useQuery()
  const navigate = useNavigate()
  const excludedStates = useExcludedStates(query)
  const trials = useTrials(studyDetail, excludedStates)
  const isBestTrial = useIsBestTrial(studyDetail)
  const queried = useQueriedTrials(trials, query)
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const openFilterMenu = Boolean(filterMenuAnchorEl)
  const trialCounts = useMemo<number[]>(() => {
    const allTrials = studyDetail?.trials || []
    return states.map(
      (state) => allTrials.filter((t) => t.state === state).length
    )
  }, [studyDetail?.trials])
  const listParentRef = React.useRef(null)

  const rowVirtualizer = useVirtualizer({
    count: trials.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 73.31,
    overscan: 10,
  })

  const trialListWidth = 200

  const selected =
    queried.length > 0 ? queried : trials.length > 0 ? [trials[0]] : []

  return (
    <Box
      component="div"
      sx={{ display: "flex", flexDirection: "row", width: "100%" }}
    >
      <Box
        component="div"
        ref={listParentRef}
        sx={{
          minWidth: trialListWidth,
          overflow: "auto",
          height: `calc(100vh - ${theme.spacing(8)})`,
        }}
      >
        <List sx={{ position: "relative" }}>
          <ListSubheader sx={{ display: "flex", flexDirection: "row" }}>
            <Typography sx={{ p: theme.spacing(1, 0) }}>
              {trials.length} Trials
            </Typography>
            <Box component="div" sx={{ flexGrow: 1 }} />
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
                  onClick={() => {
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
                    navigate(
                      getTrialListLink(
                        studyDetail.id,
                        excludedStates,
                        numbers,
                        url_prefix
                      )
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
          <Box
            component="div"
            sx={{
              width: "100%",
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const trial = trials[virtualItem.index]
              return (
                <ListItem
                  key={trial.trial_id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  disablePadding
                >
                  <ListItemButton
                    onClick={(e) => {
                      if (e.shiftKey) {
                        let next: number[]
                        const selectedNumbers = selected.map((t) => t.number)
                        const alreadySelected =
                          selectedNumbers.findIndex(
                            (n) => n === trial.number
                          ) >= 0
                        if (alreadySelected) {
                          next = selectedNumbers.filter(
                            (n) => n !== trial.number
                          )
                        } else {
                          next = [...selectedNumbers, trial.number]
                        }
                        navigate(
                          getTrialListLink(
                            trial.study_id,
                            excludedStates,
                            next,
                            url_prefix
                          )
                        )
                      } else {
                        navigate(
                          getTrialListLink(
                            trial.study_id,
                            excludedStates,
                            [trial.number],
                            url_prefix
                          )
                        )
                      }
                    }}
                    selected={
                      selected.findIndex((t) => t.number === trial.number) !==
                      -1
                    }
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <ListItemText primary={`Trial ${trial.number}`} />
                    <Box component="div">
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
          </Box>
        </List>
      </Box>
      <Divider orientation="vertical" flexItem />
      <Box
        component="div"
        sx={{
          flexGrow: 1,
          overflow: "auto",
          height: `calc(100vh - ${theme.spacing(8)})`,
        }}
      >
        <Box
          component="div"
          sx={{ display: "flex", flexDirection: "row", width: "100%" }}
        >
          {selected.length === 0
            ? null
            : selected.map((t) => (
                <TrialListDetail
                  key={t.trial_id}
                  trial={t}
                  isBestTrial={isBestTrial}
                  directions={studyDetail?.directions || []}
                  metricNames={studyDetail?.metric_names || []}
                  formWidgets={studyDetail?.form_widgets}
                />
              ))}
        </Box>
      </Box>
    </Box>
  )
}
