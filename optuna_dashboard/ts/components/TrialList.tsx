import CheckBoxIcon from "@mui/icons-material/CheckBox"
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank"
import FilterListIcon from "@mui/icons-material/FilterList"
import StopCircleIcon from "@mui/icons-material/StopCircle"

import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  TextField,
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
import React, {
  FC,
  ReactNode,
  useMemo,
  useState,
  useEffect,
  useDeferredValue,
} from "react"

import ListItemIcon from "@mui/material/ListItemIcon"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useAtom, useAtomValue } from "jotai"
import { useNavigate } from "react-router-dom"
import { FormWidgets, StudyDetail, Trial } from "ts/types/optuna"
import { actionCreator } from "../action"
import { useConstants } from "../constantsProvider"
import { useTrialFilterQuery } from "../hooks/useTrialFilterQuery"
import {
  artifactIsAvailable,
  llmIsAvailable,
  trialListDurationTimeUnitState,
} from "../state"
import { useQuery } from "../urlQuery"
import { ArtifactCards } from "./Artifact/ArtifactCards"
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
  excludedStates: Optuna.TrialState[],
  trialFilter: (trials: Trial[], query: string) => Promise<Trial[]>,
  trialFilterQuery: string
): Trial[] => {
  const [filteredTrials, setFilteredTrials] = useState<Trial[]>([])
  useEffect(() => {
    let result = studyDetail !== null ? studyDetail.trials : []
    if (excludedStates.length !== 0) {
      excludedStates.forEach((s) => {
        result = result.filter((t) => t.state !== s)
      })
    }
    console.log(trialFilterQuery)
    if (trialFilterQuery !== "") {
      trialFilter(result, trialFilterQuery)
        .then((filtered) => {
          console.log("Filtered trials:", filtered)
          setFilteredTrials(filtered)
        })
        .catch((error) => {
          console.error("Failed to filter trials:", error)
          setFilteredTrials(result) // Fallback to unfiltered trials on error
        })
    } else {
      setFilteredTrials(result)
    }
  }, [studyDetail, excludedStates, trialFilter, trialFilterQuery])
  return filteredTrials
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
  const artifactEnabled = useAtomValue(artifactIsAvailable)
  const startMs = trial.datetime_start?.getTime()
  const completeMs = trial.datetime_complete?.getTime()
  const [durationTimeUnit, setDurationTimeUnit] = useAtom(
    trialListDurationTimeUnitState
  )
  const duration = useMemo(
    () =>
      startMs !== undefined && completeMs !== undefined
        ? (completeMs - startMs) /
          (durationTimeUnit === "ms"
            ? 1
            : durationTimeUnit === "s"
              ? 10 ** 3
              : durationTimeUnit === "min"
                ? 60 * 10 ** 3
                : 60 * 60 * 10 ** 3)
        : null,
    [startMs, completeMs, durationTimeUnit]
  )

  const params = trial.state === "Waiting" ? trial.fixed_params : trial.params
  const info: [string, string | ReactNode, string | null | ReactNode][] = [
    [
      "value",
      "Value",
      trial.values?.map((v) => v.toString()).join(", ") || "None",
    ],
    [
      "intermediate_values",
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
      "parameter",
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
      "started_at",
      "Started At",
      trial?.datetime_start ? trial?.datetime_start.toString() : null,
    ],
    [
      "completed_at",
      "Completed At",
      trial?.datetime_complete ? trial?.datetime_complete.toString() : null,
    ],
    [
      "duration",
      <Box
        component="div"
        sx={{ display: "flex", alignItems: "center", minWidth: "200px" }}
      >
        <Typography
          sx={{ p: theme.spacing(1) }}
          color="text.secondary"
          fontWeight={theme.typography.fontWeightLight}
          fontSize={theme.typography.fontSize}
        >
          Duration
        </Typography>
        <FormControl sx={{ width: 80 }} size="small">
          <InputLabel id="trial-list-duration-select-label">
            Time Unit
          </InputLabel>
          <Select
            labelId="trial-list-duration-select-label"
            label="Time Unit"
            value={durationTimeUnit}
            onChange={(e) =>
              setDurationTimeUnit(e.target.value as "ms" | "s" | "min" | "h")
            }
          >
            <MenuItem value="ms">ms</MenuItem>
            <MenuItem value="s">s</MenuItem>
            <MenuItem value="min">min</MenuItem>
            <MenuItem value="h">h</MenuItem>
          </Select>
        </FormControl>
      </Box>,
      duration,
    ],
    [
      "user_attrs",
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
    attribute: string | ReactNode,
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
      {typeof attribute === "string" ? (
        <Typography
          sx={{ p: theme.spacing(1) }}
          color="text.secondary"
          minWidth={"200px"}
          fontWeight={theme.typography.fontWeightLight}
          fontSize={theme.typography.fontSize}
        >
          {attribute}
        </Typography>
      ) : (
        attribute
      )}
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
        {info.map(([key, attribute, value]) =>
          value !== null ? renderInfo(key, attribute, value) : null
        )}
      </Box>
      {artifactEnabled && (
        <>
          <Typography
            variant="h5"
            sx={{ fontWeight: theme.typography.fontWeightBold }}
          >
            Artifacts
          </Typography>
          <ArtifactCards
            studyOrTrial={{
              type: "trial",
              trial,
            }}
            isArtifactModifiable={
              trial.state === "Running" || trial.state === "Waiting"
            }
          />
        </>
      )}
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
  const [_trialFilterQuery, setTrialFilterQuery] = useState<string>("")
  const trialFilterQuery = useDeferredValue(_trialFilterQuery)
  const [trialFilter, renderIframe] = useTrialFilterQuery(5)
  const llmEnabled = useAtomValue(llmIsAvailable)
  const trials = useTrials(
    studyDetail,
    excludedStates,
    trialFilter,
    trialFilterQuery
  )
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
  const [filterInput, setFilterInput] = useState(trialFilterQuery)

  const trialListWidth = 200

  const selected =
    queried.length > 0 ? queried : trials.length > 0 ? [trials[0]] : []

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      {llmEnabled && (
        <Box
          component="div"
          sx={{
            height: theme.spacing(8),
            p: theme.spacing(1),
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextField
            id="trial-filter-query"
            variant="outlined"
            placeholder="Filter trials. Enter query and press Enter."
            fullWidth
            size="small"
            sx={{
              maxWidth: "400px",
            }}
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setTrialFilterQuery(filterInput)
              }
            }}
          />
        </Box>
      )}
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
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
      {renderIframe()}
    </Box>
  )
}
