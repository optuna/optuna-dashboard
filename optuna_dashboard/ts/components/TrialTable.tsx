import React, { FC } from "react"
import { IconButton, Button, useTheme } from "@mui/material"
import LinkIcon from "@mui/icons-material/Link"
import DownloadIcon from "@mui/icons-material/Download"
import LinkIcon from "@mui/icons-material/Link"
import { Button, IconButton, useTheme } from "@mui/material"
import React, { FC } from "react"

import { DataGrid } from "./DataGrid"
import { Link } from "react-router-dom"
import { StudyDetail, Trial } from "ts/types/optuna"
import { DataGrid, DataGridColumn } from "./DataGrid"

import {
  ColumnDef,
  createColumnHelper,
  Row,
  IdType,
  FilterFn,
} from "@tanstack/react-table"

const multiValueFilter: FilterFn<Trial> = <D extends object>(
  row: Row<D>,
  columnId: IdType<D>,
  filterValue: string[]
) => {
  const rowValue = row.getValue(columnId) as string
  return !filterValue.includes(rowValue)
}

export const TrialTable: FC<{
  studyDetail: StudyDetail | null
  initialRowsPerPage?: number
}> = ({ studyDetail, initialRowsPerPage }) => {
  const theme = useTheme()
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []
  // TODO: const objectiveNames: string[] = studyDetail?.objective_names || []

  const columnHelper = createColumnHelper<Trial>()
  const tcolumns: ColumnDef<Trial>[] = [
    columnHelper.accessor("number", {
      header: "Number",
      footer: (info) => info.column.id,
      enableColumnFilter: false,
    }),
    columnHelper.accessor("state", {
      header: "State",
      footer: (info) => info.column.id,
      enableSorting: false,
      enableColumnFilter: true,
      filterFn: multiValueFilter,
    }),
  ]
  if (studyDetail === null || studyDetail.directions.length === 1) {
    tcolumns.push(
      columnHelper.accessor("values", {
        header: "Value",
        footer: (info) => info.column.id,
        enableSorting: true,
        enableColumnFilter: false,
        sortUndefined: "last",
      })
    )
  } else {
    tcolumns.push(
      ...studyDetail.directions.map((s, objectiveId) =>
        columnHelper.accessor((row) => row["values"]?.[objectiveId], {
          id: `values_${objectiveId}`,
          header: `Objective ${objectiveId}`,
          footer: (info) => info.column.id,
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
    tcolumns.push(
      columnHelper.accessor(
        (row) =>
          row["params"].find((p) => p.name === s.name)?.param_external_value ||
          null,
        {
          id: `params_${s.name}`,
          header: `Param ${s.name}`,
          footer: (info) => info.column.id,
          enableSorting: sortable,
          sortUndefined: "last",
          enableColumnFilter: filterChoices !== undefined,
          filterFn: multiValueFilter,
        }
      )
    )
  })

  studyDetail?.union_user_attrs.forEach((attr_spec) => {
    tcolumns.push(
      columnHelper.accessor(
        (row) =>
          row["user_attrs"].find((a) => a.key === attr_spec.key)?.value || null,
        {
          id: `user_attrs_${attr_spec.key}`,
          header: `UserAttribute ${attr_spec.key}`,
          footer: (info) => info.column.id,
          enableSorting: attr_spec.sortable,
          enableColumnFilter: false,
          sortUndefined: "last",
        }
      )
    )
  })
  tcolumns.push(
    columnHelper.accessor((row) => row, {
      header: "Detail",
      cell: (info) => (
        <IconButton
          component={Link}
          to={
            URL_PREFIX +
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
      footer: (info) => info.column.id,
      enableSorting: false,
      enableColumnFilter: false,
    })
  )

  return (
    <>
      <DataGrid data={trials} columns={tcolumns} />
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
