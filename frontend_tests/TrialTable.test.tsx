import React from "react"
global.URL.createObjectURL = jest.fn()

import { cleanup, render, within, fireEvent } from "@testing-library/react"
import { TrialTable } from "../optuna_dashboard/static/components/StudyDetail"

afterEach(cleanup)

const trials = [
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
      { name: "x", value: "1" },
      { name: "y", value: "2" },
    ],
    user_attrs: [],
    system_attrs: [],
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
      { name: "x", value: "2" },
      { name: "y", value: "1" },
    ],
    user_attrs: [],
    system_attrs: [],
  },
]

const study_direction: StudyDirection = "minimize" as StudyDirection

const study_detail = {
  name: "study_0",
  directions: [study_direction],
  datetime_start: new Date("2021-06-15T00:00:00"),
  best_trial: trials[1],
  trials: trials,
  intersection_search_space: [
    {
      name: "x",
      distribution: "FloatDistribution" as Distribution,
      attributes: { low: -3, high: 3 },
    },
    {
      name: "y",
      distribution: "FloatDistribution" as Distribution,
      attributes: { low: -3, high: 3 },
    },
  ],
  union_search_space: [
    {
      name: "x",
      distribution: "FloatDistribution" as Distribution,
      attributes: { low: -3, high: 3 },
    },
    {
      name: "y",
      distribution: "FloatDistribution" as Distribution,
      attributes: { low: -3, high: 3 },
    },
  ],
  has_intermediate_values: false,
}

it("Sort TrialTable by trial number", () => {
  const { getAllByRole, getByText } = render(
    <TrialTable studyDetail={study_detail} />
  )
  const rows = getAllByRole("row")
  expect(within(rows[1]).getByText("0")).toBeTruthy()
  expect(within(rows[3]).getByText("1")).toBeTruthy()

  fireEvent.click(getByText("Number"))

  const rows_updated = getAllByRole("row")
  expect(within(rows_updated[1]).getByText("1")).toBeTruthy()
  expect(within(rows_updated[3]).getByText("0")).toBeTruthy()
})

it("Sort TrialTable by value", () => {
  const { getAllByRole, getByText } = render(
    <TrialTable studyDetail={study_detail} />
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
    <TrialTable studyDetail={study_detail} />
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
    <TrialTable studyDetail={study_detail} />
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
  const { queryAllByText } = render(<TrialTable studyDetail={study_detail} />)
  expect(queryAllByText("Fail").length).toBe(1)

  // Click 'Complete' state
  const completedRows = queryAllByText("Complete")
  expect(completedRows.length).toBe(1)
  fireEvent.click(completedRows[0])

  expect(queryAllByText("Fail").length).toBe(0)
})
