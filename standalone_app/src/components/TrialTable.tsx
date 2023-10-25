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

  if (study === null || study.directions.length == 1) {
    columns.push({
      field: "values",
      label: "Value",
      sortable: true,
      less: (firstEl, secondEl, ascending): number => {
        const firstVal = firstEl.values?.[0]
        const secondVal = secondEl.values?.[0]

        if (firstVal === secondVal) {
          return 0
        }
        if (firstVal === undefined) {
          return ascending ? -1 : 1
        } else if (secondVal === undefined) {
          return ascending ? 1 : -1
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
        less: (firstEl, secondEl, ascending): number => {
          const firstVal = firstEl.values?.[objectiveId]
          const secondVal = secondEl.values?.[objectiveId]

          if (firstVal === secondVal) {
            return 0
          }
          if (firstVal === undefined) {
            return ascending ? -1 : 1 
          } else if (secondVal === undefined) {
            return ascending ? 1 : -1
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

  study.union_search_space.forEach((s) => {
    columns.push({
      field: "params",
      label: `Param ${s.name}`,
      toCellValue: (i) =>
        trials[i].params.find((p) => p.name === s.name)?.param_external_value ??
        null,
      sortable: true,
      filterable: false,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      less: (firstEl, secondEl, _): number => {
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

  study.union_user_attrs.forEach((attr_spec) => {
    columns.push({
      field: "user_attrs",
      label: `UserAttribute ${attr_spec.key}`,
      toCellValue: (i) =>
        trials[i].user_attrs.find((attr) => attr.key === attr_spec.key)
          ?.value || null,
      sortable: attr_spec.sortable,
      filterable: false,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      less: (firstEl, secondEl, _): number => {
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
