import React from "react"
global.URL.createObjectURL = jest.fn()

import { cleanup, render, fireEvent } from "@testing-library/react"
import {
  DataGrid,
  DataGridColumn,
} from "../optuna_dashboard/static/components/DataGrid"

afterEach(cleanup)

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
    { field: "key", label: "Key", filterable: true },
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

  // Filter rows by "foo"
  fireEvent.click(queryAllByText("foo")[0])
  expect(queryAllByText("foo").length).toBe(3)
  expect(queryAllByText("bar").length).toBe(0)
})

it("Filter rows after sorted", () => {
  interface DummyAttribute {
    id: number
    key: string
    value: number
  }
  const dummyAttributes = [
    { id: 1, key: "foo", value: 4000 },
    { id: 2, key: "bar", value: 1000 },
    { id: 3, key: "bar", value: 2000 },
    { id: 4, key: "foo", value: 3000 },
    { id: 5, key: "foo", value: 5000 },
  ]
  const columns: DataGridColumn<DummyAttribute>[] = [
    { field: "key", label: "Key", filterable: true },
    {
      field: "value",
      label: "Value",
      sortable: true,
    },
  ]

  const { getByText, queryAllByText } = render(
    <DataGrid<DummyAttribute>
      columns={columns}
      rows={dummyAttributes}
      keyField={"id"}
    />
  )
  // Sort and filter rows
  fireEvent.click(getByText("Value"))
  fireEvent.click(queryAllByText("bar")[0])

  expect(queryAllByText("1000").length).toBe(1)
  expect(queryAllByText("2000").length).toBe(1)
})
