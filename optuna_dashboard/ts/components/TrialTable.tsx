import React, { createRef, FC, FormEvent, MouseEvent } from "react"
import {
  Typography,
  Grid,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
} from "@mui/material"
import LinkIcon from "@mui/icons-material/Link"

import { DataGridColumn, DataGrid } from "./DataGrid"
import { Link } from "react-router-dom"

import { actionCreator } from "../action"

export const TrialTable: FC<{
  studyDetail: StudyDetail | null
  isBeta: boolean
  initialRowsPerPage?: number
}> = ({ studyDetail, isBeta, initialRowsPerPage }) => {
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []
  const objectiveNames: string[] = studyDetail?.objective_names || []
  const action = actionCreator()

  const columns: DataGridColumn<Trial>[] = [
    { field: "number", label: "Number", sortable: true, padding: "none" },
    {
      field: "state",
      label: "State",
      sortable: true,
      filterable: true,
      padding: "none",
      toCellValue: (i) => trials[i].state.toString(),
    },
  ]
  if (studyDetail === null || studyDetail.directions.length == 1) {
    columns.push({
      field: "values",
      label: "Value",
      sortable: true,
      less: (firstEl, secondEl): number => {
        const firstVal = firstEl.values?.[0]
        const secondVal = secondEl.values?.[0]

        if (firstVal === secondVal) {
          return 0
        }
        if (firstVal === undefined) {
          return -1
        } else if (secondVal === undefined) {
          return 1
        }
        if (firstVal === "-inf" || secondVal === "inf") {
          return 1
        } else if (secondVal === "-inf" || firstVal === "inf") {
          return -1
        }
        return firstVal < secondVal ? 1 : -1
      },
      toCellValue: (i) => {
        if (trials[i].values === undefined) {
          return null
        }
        return trials[i].values?.[0]
      },
    })
  } else {
    const objectiveColumns: DataGridColumn<Trial>[] =
      studyDetail.directions.map((s, objectiveId) => ({
        field: "values",
        label:
          objectiveNames.length === studyDetail?.directions.length
            ? objectiveNames[objectiveId]
            : `Objective ${objectiveId}`,
        sortable: true,
        less: (firstEl, secondEl): number => {
          const firstVal = firstEl.values?.[objectiveId]
          const secondVal = secondEl.values?.[objectiveId]

          if (firstVal === secondVal) {
            return 0
          }
          if (firstVal === undefined) {
            return -1
          } else if (secondVal === undefined) {
            return 1
          }
          if (firstVal === "-inf" || secondVal === "inf") {
            return 1
          } else if (secondVal === "-inf" || firstVal === "inf") {
            return -1
          }
          return firstVal < secondVal ? 1 : -1
        },
        toCellValue: (i) => {
          if (trials[i].values === undefined) {
            return null
          }
          return trials[i].values?.[objectiveId]
        },
      }))
    columns.push(...objectiveColumns)
  }
  if (!isBeta) {
    columns.push({
      field: "datetime_start",
      label: "Duration(ms)",
      toCellValue: (i) => {
        const startMs = trials[i].datetime_start?.getTime()
        const completeMs = trials[i].datetime_complete?.getTime()
        if (startMs !== undefined && completeMs !== undefined) {
          return (completeMs - startMs).toString()
        }
        return null
      },
      sortable: true,
      less: (firstEl, secondEl): number => {
        const firstStartMs = firstEl.datetime_start?.getTime()
        const firstCompleteMs = firstEl.datetime_complete?.getTime()
        const firstDurationMs =
          firstStartMs !== undefined && firstCompleteMs !== undefined
            ? firstCompleteMs - firstStartMs
            : undefined
        const secondStartMs = secondEl.datetime_start?.getTime()
        const secondCompleteMs = secondEl.datetime_complete?.getTime()
        const secondDurationMs =
          secondStartMs !== undefined && secondCompleteMs !== undefined
            ? secondCompleteMs - secondStartMs
            : undefined

        if (firstDurationMs === secondDurationMs) {
          return 0
        } else if (
          firstDurationMs !== undefined &&
          secondDurationMs !== undefined
        ) {
          return firstDurationMs < secondDurationMs ? 1 : -1
        } else if (firstDurationMs !== undefined) {
          return -1
        } else {
          return 1
        }
      },
    })
  }
  if (
    studyDetail?.union_search_space.length ===
    studyDetail?.intersection_search_space.length
  ) {
    studyDetail?.intersection_search_space.forEach((s) => {
      const sortable = s.distribution.type !== "CategoricalDistribution"
      const filterable = s.distribution.type === "CategoricalDistribution"
      columns.push({
        field: "params",
        label: `Param ${s.name}`,
        toCellValue: (i) =>
          trials[i].params.find((p) => p.name === s.name)
            ?.param_external_value || null,
        sortable: sortable,
        filterable: filterable,
        less: (firstEl, secondEl): number => {
          const firstVal = firstEl.params.find(
            (p) => p.name === s.name
          )?.param_internal_value
          const secondVal = secondEl.params.find(
            (p) => p.name === s.name
          )?.param_internal_value

          if (firstVal === secondVal) {
            return 0
          } else if (firstVal && secondVal) {
            return firstVal < secondVal ? 1 : -1
          } else if (firstVal) {
            return -1
          } else {
            return 1
          }
        },
      })
    })
  } else {
    columns.push({
      field: "params",
      label: "Params",
      toCellValue: (i) =>
        trials[i].params
          .map((p) => p.name + ": " + p.param_external_value)
          .join(", "),
    })
  }

  studyDetail?.union_user_attrs.forEach((attr_spec) => {
    columns.push({
      field: "user_attrs",
      label: `UserAttribute ${attr_spec.key}`,
      toCellValue: (i) =>
        trials[i].user_attrs.find((attr) => attr.key === attr_spec.key)
          ?.value || null,
      sortable: attr_spec.sortable,
      filterable: !attr_spec.sortable,
      less: (firstEl, secondEl): number => {
        const firstVal = firstEl.user_attrs.find(
          (attr) => attr.key === attr_spec.key
        )?.value
        const secondVal = secondEl.user_attrs.find(
          (attr) => attr.key === attr_spec.key
        )?.value

        if (firstVal === secondVal) {
          return 0
        } else if (firstVal && secondVal) {
          return firstVal < secondVal ? 1 : -1
        } else if (firstVal) {
          return -1
        } else {
          return 1
        }
      },
    })
  })
  if (isBeta) {
    columns.push({
      field: "trial_id",
      label: "Detail",
      toCellValue: (i) => (
        <IconButton
          component={Link}
          to={
            URL_PREFIX +
            `/studies/${trials[i].study_id}/trials?numbers=${trials[i].number}`
          }
          color="inherit"
          title="Go to the trial's detail page"
          size="small"
        >
          <LinkIcon />
        </IconButton>
      ),
    })
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

  const collapseBody = (index: number) => {
    const objectiveFormRefs = studyDetail?.directions.map((d) =>
      createRef<HTMLInputElement>()
    )
    const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
      if (objectiveFormRefs === undefined) {
        return
      }
      if (studyDetail === null) {
        return
      }

      e.preventDefault()
      const studyId = studyDetail.id
      const trialId = trials[index].trial_id
      const objectiveValues = objectiveFormRefs.map((ref) =>
        ref.current ? Number(ref.current.value) : NaN
      )
      if (objectiveValues.includes(NaN)) {
        return
      }

      action.tellTrial(studyId, trialId, "Complete", objectiveValues)
    }

    const handleFailTrial = (e: MouseEvent<HTMLButtonElement>): void => {
      if (studyDetail === null) {
        return
      }
      const studyId = studyDetail.id
      const trialId = trials[index].trial_id
      action.tellTrial(studyId, trialId, "Fail")
    }

    return (
      <Grid container direction="row">
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Intermediate values
            </Typography>
            <DataGrid<TrialIntermediateValue>
              columns={collapseIntermediateValueColumns}
              rows={trials[index].intermediate_values}
              keyField={"step"}
              dense={true}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Trial system attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={trials[index].system_attrs}
              keyField={"key"}
              dense={true}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
        {trials[index].state === "Running" ? (
          <Grid item xs={12}>
            <Box margin={1}>
              <Typography variant="h6" gutterBottom component="div">
                Trial tell operations
              </Typography>
              <form onSubmit={handleSubmit}>
                <Box margin={1}>
                  <Stack direction="row" spacing={1}>
                    {objectiveFormRefs !== undefined &&
                      objectiveFormRefs.map((ref, i) => (
                        <TextField
                          required
                          id={`objective-${i}`}
                          key={`objective-${i}`}
                          label={
                            objectiveNames.length ===
                            studyDetail?.directions.length
                              ? objectiveNames[i]
                              : `Objective ${i}`
                          }
                          inputProps={{
                            inputMode: "numeric",
                            pattern:
                              "[+-]?([0-9]+(.[0-9]*)?|.[0-9]+)([eE][+-]?[0-9]+)?",
                            title: "Please input a float number",
                          }}
                          inputRef={ref}
                        />
                      ))}
                  </Stack>
                </Box>
                <Box margin={1}>
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" type="submit">
                      Submit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleFailTrial}
                    >
                      Fail Trial
                    </Button>
                  </Stack>
                </Box>
              </form>
            </Box>
          </Grid>
        ) : null}
      </Grid>
    )
  }

  return (
    <DataGrid<Trial>
      columns={columns}
      rows={trials}
      keyField={"trial_id"}
      dense={true}
      collapseBody={isBeta ? undefined : collapseBody}
      initialRowsPerPage={initialRowsPerPage}
    />
  )
}
