import React, { FC } from "react"
import { IconButton } from "@mui/material"
import LinkIcon from "@mui/icons-material/Link"

import { DataGridColumn, DataGrid } from "./DataGrid"
import { Link } from "react-router-dom"

export const TrialTable: FC<{
  studyDetail: StudyDetail | null
  initialRowsPerPage?: number
}> = ({ studyDetail, initialRowsPerPage }) => {
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []
  const objectiveNames: string[] = studyDetail?.objective_names || []

  const columns: DataGridColumn<Trial>[] = [
    { field: "number", label: "Number", sortable: true, padding: "none" },
    {
      field: "state",
      label: "State",
      sortable: true,
      filterChoices: ["Complete", "Pruned", "Fail", "Running", "Waiting"],
      padding: "none",
      toCellValue: (i) => trials[i].state.toString(),
    },
  ]
  if (studyDetail === null || studyDetail.directions.length == 1) {
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
    const objectiveColumns: DataGridColumn<Trial>[] =
      studyDetail.directions.map((s, objectiveId) => ({
        field: "values",
        label:
          objectiveNames.length === studyDetail?.directions.length
            ? objectiveNames[objectiveId]
            : `Objective ${objectiveId}`,
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
      }))
    columns.push(...objectiveColumns)
  }
  if (
    studyDetail?.union_search_space.length ===
    studyDetail?.intersection_search_space.length
  ) {
    studyDetail?.intersection_search_space.forEach((s) => {
      const sortable = s.distribution.type !== "CategoricalDistribution"
      const filterChoices =
        s.distribution.type === "CategoricalDistribution"
          ? s.distribution.choices.map((c) => c.value)
          : undefined
      columns.push({
        field: "params",
        label: `Param ${s.name}`,
        toCellValue: (i) =>
          trials[i].params.find((p) => p.name === s.name)
            ?.param_external_value || null,
        sortable: sortable,
        filterChoices: filterChoices,
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
          return Number(firstVal) < Number(secondVal) ? 1 : -1
        } else if (firstVal) {
          return -1
        } else {
          return 1
        }
      },
    })
  })
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

  return (
    <DataGrid<Trial>
      columns={columns}
      rows={trials}
      keyField={"trial_id"}
      dense={true}
      initialRowsPerPage={initialRowsPerPage}
    />
  )
}
