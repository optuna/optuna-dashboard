import { Link as LinkIcon } from "@mui/icons-material"
import { IconButton } from "@mui/material"
import { FC } from "react"

import * as Optuna from "@optuna/types"
import { DataGrid } from "./DataGrid"

import {
  ColumnDef,
  FilterFn,
  Row,
  createColumnHelper,
} from "@tanstack/react-table"

const multiValueFilter: FilterFn<Optuna.Trial> = <D extends object>(
  row: Row<D>,
  columnId: string,
  filterValue: string[]
) => {
  const rowValue = row.getValue(columnId) as string
  return !filterValue.includes(rowValue)
}

export const TrialTable: FC<{
  study: Optuna.Study
  initialRowsPerPage?: number
  // biome-ignore lint/suspicious/noExplicitAny: Any react component.
  linkComponent?: React.ComponentType<any>
  linkURL?: (studyId: number, trialNumber: number) => string
}> = ({ study, initialRowsPerPage, linkComponent, linkURL }) => {
  const trials: Optuna.Trial[] = study.trials
  const metricNames: string[] = study.metric_names || []

  const columnHelper = createColumnHelper<Optuna.Trial>()
  // biome-ignore lint/suspicious/noExplicitAny: It is difficult to specify this type.
  const columns: ColumnDef<Optuna.Trial, any>[] = [
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
  if (study.directions.length === 1) {
    columns.push(
      columnHelper.accessor("values", {
        header: "Value",
        enableSorting: true,
        enableColumnFilter: false,
        sortUndefined: "last",
        sortingFn: (a, b) => {
          const aVal = Number(a.original.values?.[0] ?? 0)
          const bVal = Number(b.original.values?.[0] ?? 0)
          return aVal - bVal
        },
        cell: (info) => {
          const val = info.getValue()?.[0] ?? null
          // Display in exponential notation if the value is too large or too small.
          if (val >= 10000 || val < 1e-4) {
            return val.toExponential()
          }
          return val
        },
      })
    )
  } else {
    columns.push(
      ...study.directions.map((_s, objectiveId) =>
        columnHelper.accessor((row) => row.values?.[objectiveId], {
          id: `values_${objectiveId}`,
          header:
            metricNames.length === study.directions.length
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
    study.union_search_space.length !== study.intersection_search_space.length

  if (study.union_search_space != null) {
    for (const s of study.union_search_space) {
      const sortable = s.distribution.type !== "CategoricalDistribution"
      const filterChoices: (string | null)[] | undefined =
        s.distribution.type === "CategoricalDistribution"
          ? s.distribution.choices.map((c) => c?.value ?? "null")
          : undefined
      const hasMissingValue = trials.some(
        (t) => !t.params.some((p) => p.name === s.name)
      )
      if (filterChoices !== undefined && isDynamicSpace && hasMissingValue) {
        filterChoices.push(null)
      }
      columns.push(
        columnHelper.accessor(
          (row) => {
            const param_external_value = row.params.find(
              (p) => p.name === s.name
            )?.param_external_value
            return param_external_value === undefined
              ? null
              : param_external_value
          },
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
    }
  }

  if (study.union_search_space != null) {
    for (const attr_spec of study.union_user_attrs) {
      columns.push(
        columnHelper.accessor(
          (row) => {
            const value = row.user_attrs.find(
              (a) => a.key === attr_spec.key
            )?.value
            return value === undefined ? null : value
          },
          {
            id: `user_attrs_${attr_spec.key}`,
            header: `UserAttribute ${attr_spec.key}`,
            enableSorting: attr_spec.sortable,
            sortUndefined: "last",
            enableColumnFilter: false,
          }
        )
      )
    }
  }
  if (linkComponent !== undefined && linkURL !== undefined) {
    columns.push(
      columnHelper.accessor((row) => row, {
        header: "Detail",
        cell: (info) => (
          <IconButton
            component={linkComponent}
            to={linkURL(info.getValue().study_id, info.getValue().number)}
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
  }

  return (
    <DataGrid
      data={trials}
      columns={columns}
      initialRowsPerPage={initialRowsPerPage}
    />
  )
}
