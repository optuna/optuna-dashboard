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
  test.each([0, 3, MAX_PARAMS_IN_HOVERTEXT])(
    "shows all params when there are %i params",
    (nParams) => {
      const trial = makeTrial(nParams)
      const hovertext = makeHovertext(trial)
      expect(hovertext).toContain('"number": 0')
      expect(hovertext).toContain('"values": [<br>    1<br>  ]')
      for (let i = 0; i < nParams; i++) {
        expect(hovertext).toContain(`"param_${i}"`)
      }
      expect(hovertext).not.toContain("more params")
    }
  )

  test.each([1, 20])("summarizes %i hidden params", (nHiddenParams) => {
    const nParams = MAX_PARAMS_IN_HOVERTEXT + nHiddenParams
    const trial = makeTrial(nParams)
    const originalParams = structuredClone(trial.params)
    const hovertext = makeHovertext(trial)
    for (let i = 0; i < MAX_PARAMS_IN_HOVERTEXT; i++) {
      expect(hovertext).toContain(`"param_${i}"`)
    }
    expect(hovertext).not.toContain(`"param_${MAX_PARAMS_IN_HOVERTEXT}"`)
    expect(hovertext).toContain(`... and ${nHiddenParams} more params`)
    expect(trial.params).toEqual(originalParams)
  })
})
