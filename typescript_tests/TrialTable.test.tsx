import React from "react"
global.URL.createObjectURL = jest.fn()

import { cleanup, render, within, fireEvent } from "@testing-library/react"
import { TrialTable } from "../optuna_dashboard/ts/components/TrialTable"

afterEach(cleanup)

const dummyDistribution: FloatDistribution = {
  type: "FloatDistribution",
  low: 0,
  high: 10,
  step: 1,
  log: false,
}
const trials: Trial[] = [
  {
    trial_id: 1,
    study_id: 0,
    number: 0,
    state: "Complete" as TrialState,
    values: [-1],
    intermediate_values: [],
    datetime_start: new Date("2021-06-15T00:00:00"),
    datetime_complete: new Date("2021-06-15T00:00:01"),
    params: [
      {
        name: "x",
        param_internal_value: 1,
        param_external_value: "1",
        param_external_type: "float",
        distribution: dummyDistribution,
      },
      {
        name: "y",
        param_internal_value: 2,
        param_external_value: "2",
        param_external_type: "float",
        distribution: dummyDistribution,
      },
    ],
    fixed_params: [],
    user_attrs: [],
    system_attrs: [],
    note: {
      body: "",
      version: 0,
    },
    artifacts: [],
  },
  {
    trial_id: 2,
    study_id: 0,
    number: 1,
    state: "Fail" as TrialState,
    values: [-2],
    intermediate_values: [],
    datetime_start: new Date("2021-06-15T00:00:01"),
    datetime_complete: new Date("2021-06-15T00:00:03"),
    params: [
      {
        name: "x",
        param_internal_value: 1,
        param_external_value: "1",
        param_external_type: "float",
        distribution: dummyDistribution,
      },
      {
        name: "y",
        param_internal_value: 2,
        param_external_value: "2",
        param_external_type: "float",
        distribution: dummyDistribution,
      },
    ],
    fixed_params: [],
    user_attrs: [],
    system_attrs: [],
    note: {
      body: "",
      version: 0,
    },
    artifacts: [],
  },
]

const study_direction: StudyDirection = "minimize" as StudyDirection

const studyDetail: StudyDetail = {
  id: 1,
  name: "study_0",
  directions: [study_direction],
  datetime_start: new Date("2021-06-15T00:00:00"),
  best_trials: [trials[1]],
  trials: trials,
  intersection_search_space: [
    {
      name: "x",
      distribution: dummyDistribution,
    },
    {
      name: "y",
      distribution: dummyDistribution,
    },
  ],
  union_search_space: [
    {
      name: "x",
      distribution: dummyDistribution,
    },
    {
      name: "y",
      distribution: dummyDistribution,
    },
  ],
  union_user_attrs: [
    { key: "foo", sortable: false },
    { key: "bar", sortable: false },
  ],
  has_intermediate_values: false,
  note: {
    version: 0,
    body: "",
  },
}

it("Sort TrialTable by trial number", () => {
  const { getAllByRole, getByText } = render(
    <TrialTable studyDetail={studyDetail} isBeta={false} />
  )
  const rows = getAllByRole("row")

  expect(within(rows[1]).getByText("0")).toBeTruthy()
  expect(within(rows[3]).getAllByText("1")[0]).toBeTruthy()

  fireEvent.click(getByText("Number"))

  const rows_updated = getAllByRole("row")
  expect(within(rows_updated[1]).getAllByText("1")[0]).toBeTruthy()
  expect(within(rows_updated[3]).getByText("0")).toBeTruthy()
})

it("Sort TrialTable by value", () => {
  const { getAllByRole, getByText } = render(
    <TrialTable studyDetail={studyDetail} isBeta={false} />
  )
  fireEvent.click(getByText("Value"))
  const rows = getAllByRole("row")
  expect(within(rows[1]).getByText("-2")).toBeTruthy()
  expect(within(rows[3]).getByText("-1")).toBeTruthy()

  fireEvent.click(getByText("Value"))
  const rows_updated = getAllByRole("row")
  expect(within(rows_updated[1]).getByText("-1")).toBeTruthy()
  expect(within(rows_updated[3]).getByText("-2")).toBeTruthy()
})

it("Sort TrialTable by duration", () => {
  const { getAllByRole, getByText } = render(
    <TrialTable studyDetail={studyDetail} isBeta={false} />
  )
  fireEvent.click(getByText("Duration(ms)"))
  const rows = getAllByRole("row")
  expect(within(rows[1]).getByText("1000")).toBeTruthy()
  expect(within(rows[3]).getByText("2000")).toBeTruthy()

  fireEvent.click(getByText("Duration(ms)"))
  const rows_updated = getAllByRole("row")
  expect(within(rows_updated[1]).getByText("2000")).toBeTruthy()
  expect(within(rows_updated[3]).getByText("1000")).toBeTruthy()
})

it("Sort TrialTable by state", () => {
  const { getAllByRole, getByText } = render(
    <TrialTable studyDetail={studyDetail} isBeta={false} />
  )
  fireEvent.click(getByText("State"))
  const rows = getAllByRole("row")
  expect(within(rows[1]).getByText("Complete")).toBeTruthy()
  expect(within(rows[3]).getByText("Fail")).toBeTruthy()

  fireEvent.click(getByText("State"))
  const rows_updated = getAllByRole("row")
  expect(within(rows_updated[1]).getByText("Fail")).toBeTruthy()
  expect(within(rows_updated[3]).getByText("Complete")).toBeTruthy()
})

it("Filter trials by state", () => {
  const { queryAllByText } = render(
    <TrialTable studyDetail={studyDetail} isBeta={false} />
  )
  expect(queryAllByText("Fail").length).toBe(1)

  // Click 'Complete' state
  const completedRows = queryAllByText("Complete")
  expect(completedRows.length).toBe(1)
  fireEvent.click(completedRows[0])

  expect(queryAllByText("Fail").length).toBe(0)
})
