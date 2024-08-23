import DownloadIcon from "@mui/icons-material/Download"
import LinkIcon from "@mui/icons-material/Link"
import { Button, IconButton, useTheme } from "@mui/material"
import React, { FC } from "react"

import { DataGrid } from "@optuna/react"

import { Link } from "react-router-dom"
import { StudyDetail, Trial } from "ts/types/optuna"

import {
  ColumnDef,
  FilterFn,
  Row,
  createColumnHelper,
} from "@tanstack/react-table"
import { useConstants } from "../constantsProvider"

const multiValueFilter: FilterFn<Trial> = <D extends object>(
  row: Row<D>,
  columnId: string,
  filterValue: string[]
) => {
  const rowValue = row.getValue(columnId) as string
  return !filterValue.includes(rowValue)
}

export const TrialTable: FC<{
  studyDetail: StudyDetail | null
}> = ({ studyDetail }) => {
  const { url_prefix } = useConstants()

  const theme = useTheme()
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []
  const metricNames: string[] = studyDetail?.metric_names || []

  const columnHelper = createColumnHelper<Trial>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: ColumnDef<Trial, any>[] = [
    columnHelper.accessor("number", {
      header: "Number",
      enableColumnFilter: false,
    }),
    columnHelper.accessor("state", {
      header: "State",
      enableSorting: false,
      enableColumnFilter: true,
      filterFn: multiValueFilter,
    }),
  ]
  if (studyDetail === null || studyDetail.directions.length === 1) {
    columns.push(
      columnHelper.accessor("values", {
        header: "Value",
        enableSorting: true,
        enableColumnFilter: false,
        sortUndefined: "last",
      })
    )
  } else {
    columns.push(
      ...studyDetail.directions.map((s, objectiveId) =>
        columnHelper.accessor((row) => row["values"]?.[objectiveId], {
          id: `values_${objectiveId}`,
          header:
            metricNames.length === studyDetail?.directions.length
              ? metricNames[objectiveId]
              : `Objective ${objectiveId}`,
          enableSorting: true,
          enableColumnFilter: false,
          sortUndefined: "last",
        })
      )
    )
  }
  const isDynamicSpace =
    studyDetail?.union_search_space.length !==
    studyDetail?.intersection_search_space.length
  studyDetail?.union_search_space.forEach((s) => {
    const sortable = s.distribution.type !== "CategoricalDistribution"
    const filterChoices: (string | null)[] | undefined =
      s.distribution.type === "CategoricalDistribution"
        ? s.distribution.choices.map((c) => c?.toString() ?? "null")
        : undefined
    const hasMissingValue = trials.some(
      (t) => !t.params.some((p) => p.name === s.name)
    )
    if (filterChoices !== undefined && isDynamicSpace && hasMissingValue) {
      filterChoices.push(null)
    }
    columns.push(
      columnHelper.accessor(
        (row) =>
          row["params"].find((p) => p.name === s.name)?.param_external_value ||
          null,
        {
          id: `params_${s.name}`,
          header: `Param ${s.name}`,
          enableSorting: sortable,
          sortUndefined: "last",
          enableColumnFilter: filterChoices !== undefined,
          filterFn: multiValueFilter,
        }
      )
    )
  })

  studyDetail?.union_user_attrs.forEach((attr_spec) => {
    columns.push(
      columnHelper.accessor(
        (row) =>
          row["user_attrs"].find((a) => a.key === attr_spec.key)?.value || null,
        {
          id: `user_attrs_${attr_spec.key}`,
          header: `UserAttribute ${attr_spec.key}`,
          enableSorting: attr_spec.sortable,
          enableColumnFilter: false,
          sortUndefined: "last",
        }
      )
    )
  })
  columns.push(
    columnHelper.accessor((row) => row, {
      header: "Detail",
      cell: (info) => (
        <IconButton
          component={Link}
          to={
            url_prefix +
            `/studies/${info.getValue().study_id}/trials?numbers=${
              info.getValue().number
            }`
          }
          color="inherit"
          title="Go to the trial's detail page"
          size="small"
        >
          <LinkIcon />
        </IconButton>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    })
  )

  return (
    <>
      <DataGrid data={trials} columns={columns} />
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        download
        href={`/csv/${studyDetail?.id}`}
        sx={{ marginRight: theme.spacing(2), minWidth: "120px" }}
      >
        Download CSV File
      </Button>
    </>
  )
}
