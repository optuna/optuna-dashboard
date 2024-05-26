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
}> = ({ study }) => {
  const trials: Optuna.Trial[] = study.trials

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
          header: `Objective ${objectiveId}`,
          enableSorting: true,
          enableColumnFilter: false,
          sortUndefined: "last",
        })
      )
    )
  }

  if (study?.union_search_space != null) {
    for (const s of study.union_search_space) {
      columns.push(
        columnHelper.accessor(
          (row) =>
            row.params.find((p) => p.name === s.name)?.param_external_value ||
            null,
          {
            id: `params_${s.name}`,
            header: `Param ${s.name}`,
            enableSorting: true,
            sortUndefined: "last",
            enableColumnFilter: false,
            filterFn: multiValueFilter,
          }
        )
      )
    }
  }

  if (study?.union_search_space != null) {
    for (const attr_spec of study.union_user_attrs) {
      columns.push(
        columnHelper.accessor(
          (row) =>
            row.user_attrs.find((a) => a.key === attr_spec.key)?.value || null,
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

  return <DataGrid data={trials} columns={columns} />
}
