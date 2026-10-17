import * as Optuna from "@optuna/types"
import { describe, expect, test } from "vitest"
import { MAX_PARAMS_IN_HOVERTEXT, makeHovertext } from "../src/utils/graph"

const makeTrial = (nParams: number): Optuna.Trial => ({
  trial_id: 0,
  study_id: 0,
  number: 0,
  state: "Complete",
  values: [1.0],
  params: Array.from({ length: nParams }, (_, i) => ({
    name: `param_${i}`,
    param_internal_value: i,
    param_external_value: `${i}`,
    param_external_type: "float",
    distribution: {
      type: "FloatDistribution",
      low: 0,
      high: 100,
      step: null,
      log: false,
    },
  })),
  intermediate_values: [],
  user_attrs: [],
  constraints: [],
})

describe("makeHovertext", () => {
  test("shows all params when there are only a few", () => {
    const hovertext = makeHovertext(makeTrial(3))
    for (let i = 0; i < 3; i++) {
      expect(hovertext).toContain(`"param_${i}"`)
    }
    expect(hovertext).not.toContain("more params")
  })

  test("limits the number of params shown", () => {
    const nParams = MAX_PARAMS_IN_HOVERTEXT + 20
    const hovertext = makeHovertext(makeTrial(nParams))
    for (let i = 0; i < MAX_PARAMS_IN_HOVERTEXT; i++) {
      expect(hovertext).toContain(`"param_${i}"`)
    }
    expect(hovertext).not.toContain(`"param_${MAX_PARAMS_IN_HOVERTEXT}"`)
    expect(hovertext).toContain("... and 20 more params")
  })
})
