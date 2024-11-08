import * as Optuna from "@optuna/types"

const PADDING_RATIO = 0.05

export type AxisInfo = {
  name: string
  isLog: boolean
  isCat: boolean
  indices: (string | number)[]
  values: (string | number | boolean | null)[]
}

// biome-ignore lint/suspicious/noExplicitAny: Accept any array.
const unique = (array: any[]) => {
  const knownElements = new Map()
  for (const e of someArray) {
    knownElements.set(e, true)
  }
  return Array.from(knownElements.keys())
}

export const makeHovertext = (trial: Optuna.Trial): string => {
  return JSON.stringify(
    {
      number: trial.number,
      values: trial.values,
      params: trial.params.reduce<{
        [key: string]: Optuna.CategoricalChoiceType
      }>((obj, p) => {
        obj[p.name] = p.param_external_value
        return obj
      }, {}),
    },
    undefined,
    "  "
  ).replace(/\n/g, "<br>")
}

export const getAxisInfo = (
  trials: Optuna.Trial[],
  param: Optuna.SearchSpaceItem
): AxisInfo => {
  if (param.distribution.type === "CategoricalDistribution") {
    return getAxisInfoForCategoricalParams(
      trials,
      param.name,
      param.distribution
    )
  }

  return getAxisInfoForNumericalParams(trials, param.name, param.distribution)
}

const getAxisInfoForCategoricalParams = (
  trials: Optuna.Trial[],
  paramName: string,
  distribution: Optuna.CategoricalDistribution
): AxisInfo => {
  const values = trials.map(
    (trial) =>
      trial.params.find((p) => p.name === paramName)?.param_external_value ||
      null
  )

  const indices = distribution.choices
    .map((c) => c?.toString() ?? "null")
    .sort((a, b) =>
      a.toLowerCase() < b.toLowerCase()
        ? -1
        : a.toLowerCase() > b.toLowerCase()
          ? 1
          : 0
    )
  return {
    name: paramName,
    isLog: false,
    isCat: true,
    indices,
    values,
  }
}

const getAxisInfoForNumericalParams = (
  trials: Optuna.Trial[],
  paramName: string,
  distribution: Optuna.FloatDistribution | Optuna.IntDistribution
): AxisInfo => {
  let min = 0
  let max = 0
  if (distribution.log) {
    const padding =
      (Math.log10(distribution.high) - Math.log10(distribution.low)) *
      PADDING_RATIO
    min = 10 ** (Math.log10(distribution.low) - padding)
    max = 10 ** (Math.log10(distribution.high) + padding)
  } else {
    const padding = (distribution.high - distribution.low) * PADDING_RATIO
    min = distribution.low - padding
    max = distribution.high + padding
  }

  const values = trials.map(
    (trial) =>
      trial.params.find((p) => p.name === paramName)?.param_internal_value ||
      null
  )
  const indices = unique(values)
    .filter((v) => v !== null)
    .sort((a, b) => a - b)
  if (indices.length >= 2) {
    indices.unshift(min)
    indices.push(max)
  }
  return {
    name: paramName,
    isLog: distribution.log,
    isCat: false,
    indices,
    values,
  }
}
