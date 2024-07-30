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
  detailButtonGenerator?: (studyId: number, trialNumber: number) => JSX.Element
}> = ({ study, initialRowsPerPage, detailButtonGenerator }) => {
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
  if (detailButtonGenerator) {
    columns.push(
      columnHelper.accessor((row) => row, {
        header: "Detail",
        cell: (info) =>
          detailButtonGenerator(
            info.getValue().study_id,
            info.getValue().number
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
