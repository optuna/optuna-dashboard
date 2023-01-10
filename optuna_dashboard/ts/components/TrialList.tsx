import React, { FC, useMemo } from "react"
import {
  Typography,
  Box,
  Card,
  CardContent,
  useTheme,
  CardHeader,
  Grid,
} from "@mui/material"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"

import { TrialNote } from "./Note"
import { DataGrid, DataGridColumn } from "./DataGrid"
import { useHistory, useLocation } from "react-router-dom"

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

const useTrials = (
  studyDetail: StudyDetail | null,
  query: URLSearchParams
): Trial[] => {
  return useMemo(() => {
    let result = studyDetail !== null ? studyDetail.trials : []

    const exclude = query.get("exclude")
    if (exclude === null) {
      return result
    }
    const states = exclude.split(",").map((s) => s.toUpperCase())
    states.forEach((s) => {
      result = result.filter((t) => t.state.toUpperCase() !== s)
    })
    return result
  }, [studyDetail, query])
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
  trial: Trial
  isBestTrial: (trialId: number) => boolean
}> = ({ trial, isBestTrial }) => {
  const theme = useTheme()
  const startMs = trial.datetime_start?.getTime()
  const completeMs = trial.datetime_complete?.getTime()
  let duration = ""
  if (startMs !== undefined && completeMs !== undefined) {
    duration = (completeMs - startMs).toString()
  }
  const collapseIntermediateValueColumns: DataGridColumn<TrialIntermediateValue>[] =
    [
      { field: "step", label: "Step", sortable: true },
      {
        field: "value",
        label: "Value",
        sortable: true,
        less: (firstEl, secondEl): number => {
          const firstVal = firstEl.value
          const secondVal = secondEl.value
          if (firstVal === secondVal) {
            return 0
          }
          if (firstVal === "nan") {
            return -1
          } else if (secondVal === "nan") {
            return 1
          }
          if (firstVal === "-inf" || secondVal === "inf") {
            return 1
          } else if (secondVal === "-inf" || firstVal === "inf") {
            return -1
          }
          return firstVal < secondVal ? 1 : -1
        },
      },
    ]
  const collapseAttrColumns: DataGridColumn<Attribute>[] = [
    { field: "key", label: "Key", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]

  return (
    <Box sx={{ width: "100%" }}>
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardHeader
          title={`Trial ${trial.number} (trial_id=${trial.trial_id})`}
        />
        <CardContent sx={{ paddingTop: 0 }}>
          <Box sx={{ marginBottom: theme.spacing(1) }}>
            <Chip
              color={getChipColor(trial.state)}
              label={trial.state}
              sx={{ marginRight: theme.spacing(1) }}
            />
            {isBestTrial(trial.trial_id) ? (
              <Chip label={"Best Trial"} color="secondary" />
            ) : null}
          </Box>
          <Typography>
            Values = [
            {trial.values?.map((v) => v.toString()).join(" ") || "None"}]
          </Typography>
          {trial.state !== "Waiting" ? (
            <Typography>
              Params = [
              {trial.params
                .map((p) => `${p.name}: ${p.param_external_value}`)
                .join(", ")}
              ]
            </Typography>
          ) : (
            <Typography>
              Params = [
              {trial.fixed_params
                .map((p) => `${p.name}: ${p.param_external_value}`)
                .join(", ")}
              ]
            </Typography>
          )}
          <Typography>
            Started At ={" "}
            {trial?.datetime_start ? trial?.datetime_start.toString() : null}
          </Typography>
          <Typography>
            Completed At ={" "}
            {trial?.datetime_complete
              ? trial?.datetime_complete.toString()
              : null}
          </Typography>
          <Typography>Duration = {duration} ms</Typography>
        </CardContent>
      </Card>
      <TrialNote
        studyId={trial.study_id}
        trialId={trial.trial_id}
        latestNote={trial.note}
      />
      <Grid
        container
        direction="row"
        spacing={2}
        sx={{ p: theme.spacing(0, 2) }}
      >
        <Grid item xs={6}>
          <Card>
            <CardHeader title="Intermediate Values" />
            <CardContent>
              <DataGrid<TrialIntermediateValue>
                columns={collapseIntermediateValueColumns}
                rows={trial.intermediate_values}
                keyField={"step"}
                dense={true}
                rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardHeader title="User Attributes" />
            <CardContent>
              <DataGrid<Attribute>
                columns={collapseAttrColumns}
                rows={trial.user_attrs}
                keyField={"key"}
                dense={true}
                rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export const TrialList: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const theme = useTheme()
  const query = useQuery()
  const history = useHistory()
  const trials = useTrials(studyDetail, query)
  const isBestTrial = useIsBestTrial(studyDetail)
  const selected = useSelectedTrials(trials, query)

  const trialListWidth = 240

  const showDetailTrials =
    selected.length > 0 ? selected : trials.length > 0 ? [trials[0]] : []

  return (
    <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
      <Box
        sx={{
          width: trialListWidth,
          overflow: "auto",
          height: `calc(100vh - ${theme.spacing(8)})`,
        }}
      >
        <List>
          <ListSubheader>{`${trials.length} Trials`}</ListSubheader>
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
                      const trialNumbers = next
                        .map((n) => n.toString())
                        .join(",")

                      if (trialNumbers.length > 0) {
                        history.push(
                          URL_PREFIX +
                            `/studies/${trial.study_id}/trials?numbers=${trialNumbers}`
                        )
                      } else {
                        history.push(
                          URL_PREFIX + `/studies/${trial.study_id}/trials`
                        )
                      }
                    } else {
                      history.push(
                        URL_PREFIX +
                          `/studies/${trial.study_id}/trials?numbers=${trial.number}`
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
                      sx={{ margin: theme.spacing(1, 0) }}
                      size="small"
                    />
                    {isBestTrial(trial.trial_id) ? (
                      <Chip
                        label={"Best Trial"}
                        color="secondary"
                        sx={{ marginLeft: theme.spacing(1) }}
                        size="small"
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
          {showDetailTrials.length === 0
            ? null
            : showDetailTrials.map((t) => (
                <TrialListDetail
                  key={t.trial_id}
                  trial={t}
                  isBestTrial={isBestTrial}
                />
              ))}
        </Box>
      </Box>
    </Box>
  )
}
