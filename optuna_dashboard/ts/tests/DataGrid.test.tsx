import React from "react"
global.URL.createObjectURL = jest.fn()

import { cleanup, render } from "@testing-library/react"
import {
  DataGrid,
  DataGridColumn,
} from "../optuna_dashboard/ts/components/DataGrid"

afterEach(cleanup)

// TODO(c-bata): Add tests to check filterChoices option
it("Filter rows of DataGrid", () => {
  interface DummyAttribute {
    id: number
    key: string
    value: number
  }
  const dummyAttributes = [
    { id: 1, key: "foo", value: 1 },
    { id: 2, key: "bar", value: 1 },
    { id: 3, key: "bar", value: 2 },
    { id: 4, key: "foo", value: 2 },
    { id: 5, key: "foo", value: 3 },
  ]
  const columns: DataGridColumn<DummyAttribute>[] = [
    { field: "key", label: "Key" },
    {
      field: "value",
      label: "Value",
      sortable: true,
    },
  ]

  const { queryAllByText } = render(
    <DataGrid<DummyAttribute>
      columns={columns}
      rows={dummyAttributes}
      keyField={"id"}
    />
  )
  expect(queryAllByText("bar").length).toBe(2)
})
