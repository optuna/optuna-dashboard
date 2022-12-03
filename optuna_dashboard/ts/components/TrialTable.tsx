import React, { FC } from "react"
import { Typography, Grid, Box } from "@mui/material"

import { DataGridColumn, DataGrid } from "./DataGrid"

export const TrialTable: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

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
        label: `Objective ${objectiveId}`,
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
  if (
    studyDetail?.union_search_space.length ===
    studyDetail?.intersection_search_space.length
  ) {
    studyDetail?.intersection_search_space.forEach((s) => {
      const sortable = s.distribution !== "CategoricalDistribution"
      const filterable = s.distribution === "CategoricalDistribution"
      columns.push({
        field: "params",
        label: `Param ${s.name}`,
        toCellValue: (i) =>
          trials[i].params.find((p) => p.name === s.name)?.value || null,
        sortable: sortable,
        filterable: filterable,
        less: (firstEl, secondEl): number => {
          const firstVal = firstEl.params.find((p) => p.name === s.name)?.value
          const secondVal = secondEl.params.find(
            (p) => p.name === s.name
          )?.value

          if (firstVal === secondVal) {
            return 0
          } else if (firstVal && secondVal) {
            return Number(firstVal) < Number(secondVal) ? 1 : -1
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
        trials[i].params.map((p) => p.name + ": " + p.value).join(", "),
    })
  }

  studyDetail?.union_user_attrs.forEach((attr_name) => {
    columns.push({
      field: "user_attrs",
      label: `User attribute ${attr_name}`,
      toCellValue: (i) =>
        trials[i].user_attrs.find((attr) => attr.key === attr_name)?.value ||
        null,
      sortable: true,
      filterable: true,
      less: (firstEl, secondEl): number => {
        const firstVal = firstEl.user_attrs.find(
          (attr) => attr.key === attr_name
        )?.value
        const secondVal = secondEl.user_attrs.find(
          (attr) => attr.key === attr_name
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

  const collapseParamColumns: DataGridColumn<TrialParam>[] = [
    { field: "name", label: "Name", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]
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
    return (
      <Grid container direction="row">
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Parameters
            </Typography>
            <DataGrid<TrialParam>
              columns={collapseParamColumns}
              rows={trials[index].params}
              keyField={"name"}
              dense={true}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
            <Typography variant="h6" gutterBottom component="div">
              Trial user attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={trials[index].user_attrs}
              keyField={"key"}
              dense={true}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
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
      </Grid>
    )
  }

  return (
    <DataGrid<Trial>
      columns={columns}
      rows={trials}
      keyField={"trial_id"}
      dense={true}
      collapseBody={collapseBody}
    />
  )
}
