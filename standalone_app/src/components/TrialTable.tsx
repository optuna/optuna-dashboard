import React, { FC } from "react"

import { DataGridColumn, DataGrid } from "./DataGrid"

export const TrialTable: FC<{
  study: Study
  initialRowsPerPage?: number
}> = ({ study, initialRowsPerPage }) => {
  const trials: Trial[] = study.trials

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

  study.union_search_space.forEach((s) => {
    columns.push({
      field: "params",
      label: `Param ${s.name}`,
      toCellValue: (i) =>
        trials[i].params.find((p) => p.name === s.name)?.param_internal_value ||
        null,
      sortable: true,
      filterable: false,
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

  if (study === null || study.directions.length == 1) {
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
    const objectiveColumns: DataGridColumn<Trial>[] = study.directions.map(
      (s, objectiveId) => ({
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
      })
    )
    columns.push(...objectiveColumns)
  }

  return (
    <DataGrid<Trial>
      columns={columns}
      rows={trials}
      keyField={"trial_id"}
      dense={false}
      initialRowsPerPage={initialRowsPerPage}
    />
  )
}
