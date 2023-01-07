import { mergeUnionSearchSpace } from "../optuna_dashboard/ts/searchSpace"

global.URL.createObjectURL = jest.fn()

it("Aggregate SearchSpaceItem", () => {
  const aggregated = mergeUnionSearchSpace([
    {
      name: "float1",
      distribution: {
        type: "FloatDistribution",
        low: 0,
        high: 5,
        step: 1,
        log: true,
      },
    },
    {
      name: "float1",
      distribution: {
        type: "FloatDistribution",
        low: 5,
        high: 10,
        step: 1,
        log: true,
      },
    },
  ])

  expect(aggregated.length).toBe(1)
  // @ts-ignore
  expect(aggregated[0].distribution.low as number).toBe(0)
  // @ts-ignore
  expect(aggregated[0].distribution.high as number).toBe(10)
})
