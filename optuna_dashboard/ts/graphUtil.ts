const PADDING_RATIO = 0.05

export type AxisInfo = {
  name: string
  min: number
  max: number
  isLog: boolean
  isCat: boolean
  indices: (string | number)[]
  values: (string | number | null)[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unique = (array: any[]) => {
  const knownElements = new Map()
  array.forEach((elem) => knownElements.set(elem, true))
  return Array.from(knownElements.keys())
}

export const getAxisInfo = (
  trials: Trial[],
  param: SearchSpaceItem
): AxisInfo => {
  if (param.distribution.type === "CategoricalDistribution") {
    return getAxisInfoForCategoricalParams(
      trials,
      param.name,
      param.distribution
    )
  } else {
    return getAxisInfoForNumericalParams(trials, param.name, param.distribution)
  }
}

const getAxisInfoForCategoricalParams = (
  trials: Trial[],
  paramName: string,
  distribution: CategoricalDistribution
): AxisInfo => {
  const values = trials.map(
    (trial) =>
      trial.params.find((p) => p.name === paramName)?.param_external_value ||
      null
  )
  const isDynamic = values.some((v) => v === null)
  const span = distribution.choices.length - (isDynamic ? 2 : 1)
  const padding = span * PADDING_RATIO
  const min = -padding
  const max = span + padding

  const indices = distribution.choices
    .map((c) => c.value)
    .sort((a, b) =>
      a.toLowerCase() < b.toLowerCase()
        ? -1
        : a.toLowerCase() > b.toLowerCase()
        ? 1
        : 0
    )
  return {
    name: paramName,
    min,
    max,
    isLog: false,
    isCat: true,
    indices,
    values,
  }
}

const getAxisInfoForNumericalParams = (
  trials: Trial[],
  paramName: string,
  distribution: FloatDistribution | IntDistribution
): AxisInfo => {
  let min = 0
  let max = 0
  if (distribution.log) {
    const padding =
      (Math.log10(distribution.high) - Math.log10(distribution.low)) *
      PADDING_RATIO
    min = Math.pow(10, Math.log10(distribution.low) - padding)
    max = Math.pow(10, Math.log10(distribution.high) + padding)
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
    min,
    max,
    isLog: distribution.log,
    isCat: false,
    indices,
    values,
  }
}

export const makeHovertext = (trial: Trial): string => {
  return JSON.stringify(
    {
      number: trial.number,
      values: trial.values,
      params: trial.params
        .map((p) => [p.name, p.param_external_value])
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
    },
    undefined,
    "  "
  ).replace(/\n/g, "<br>")
}
