import * as Optuna from "@optuna/types"
import { useMemo } from "react"

const mergeUnionSearchSpace = (
  unionSearchSpace: Optuna.SearchSpaceItem[]
): Optuna.SearchSpaceItem[] => {
  const knownElements = new Map<string, Optuna.Distribution>()
  for (const s of unionSearchSpace) {
    const d = knownElements.get(s.name)
    if (d === undefined) {
      knownElements.set(s.name, s.distribution)
      continue
    }
    if (
      d.type === "CategoricalDistribution" ||
      s.distribution.type === "CategoricalDistribution"
    ) {
      // CategoricalDistribution.choices will never be changed
      continue
    }
    const updated: Optuna.Distribution = {
      ...d,
      low: Math.min(d.low, s.distribution.low),
      high: Math.max(d.high, s.distribution.high),
    }
    knownElements.set(s.name, updated)
  }
  return Array.from(knownElements.keys())
    .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
    .map((name) => ({
      name: name,
      distribution: knownElements.get(name) as Optuna.Distribution,
    }))
}

export const useMergedUnionSearchSpace = (
  unionSearchSpaces?: Optuna.SearchSpaceItem[]
): Optuna.SearchSpaceItem[] =>
  useMemo(() => {
    return mergeUnionSearchSpace(unionSearchSpaces || [])
  }, [unionSearchSpaces])
