import * as Optuna from "@optuna/types"
import { useMemo, useState } from "react"

type TargetKind = "objective" | "user_attr" | "params"

export class Target {
  kind: TargetKind
  key: number | string

  constructor(kind: TargetKind, key: number | string) {
    this.kind = kind
    this.key = key
  }

  validate(): boolean {
    if (this.kind === "objective") {
      if (typeof this.key !== "number") {
        return false
      }
    } else if (this.kind === "user_attr") {
      if (typeof this.key !== "string") {
        return false
      }
    } else if (this.kind === "params") {
      if (typeof this.key !== "string") {
        return false
      }
    }
    return true
  }

  identifier(): string {
    return `${this.kind}:${this.key}`
  }

  toLabel(objectiveNames?: string[]): string {
    if (this.kind === "objective") {
      const objectiveId: number = this.key as number
      if (objectiveNames !== undefined && objectiveNames.length > objectiveId) {
        return objectiveNames[objectiveId]
      }
      return `Objective ${objectiveId}`
    }
    if (this.kind === "user_attr") {
      return `User Attribute ${this.key}`
    }
    return `Param ${this.key}`
  }

  getObjectiveId(): number | null {
    if (this.kind !== "objective") {
      return null
    }
    return this.key as number
  }

  getTargetValue(trial: Optuna.Trial): number | null {
    if (!this.validate()) {
      return null
    }
    if (this.kind === "objective") {
      const objectiveId = this.getObjectiveId()
      if (
        objectiveId === null ||
        trial.values === undefined ||
        trial.values.length <= objectiveId
      ) {
        return null
      }
      const value = trial.values[objectiveId]
      if (value === Infinity || value === -Infinity) {
        return null
      }
      return value
    }
    if (this.kind === "user_attr") {
      const attr = trial.user_attrs.find((attr) => attr.key === this.key)
      if (attr === undefined) {
        return null
      }
      const value = Number(attr.value)
      if (value === undefined) {
        return null
      }
      return value
    }
    if (this.kind === "params") {
      const param = trial.params.find((p) => p.name === this.key)
      if (param === undefined) {
        return null
      }
      return param.param_internal_value
    }
    return null
  }
}

const filterTrials = (
  study: Optuna.Study | null,
  targets: Target[],
  filterPruned: boolean,
  includeInfeasible = true,
  includeDominated = true,
  selectedTrials: number[] = []
): Optuna.Trial[] => {
  if (study === null) {
    return []
  }
  let trials: Optuna.Trial[] = study.trials
  let isDominated: boolean[] = []
  if (!includeInfeasible && includeDominated) {
    trials = getFeasibleTrials(trials, study).feasibleTrials
  }
  if (!includeDominated) {
    trials = getFeasibleTrials(trials, study).feasibleTrials
    isDominated = getIsDominatedFromStudy(study)
  }

  return trials.filter((t, i) => {
    if (isDominated.length > 0 && isDominated[i]) {
      return false
    }
    if (selectedTrials.length !== 0 && !selectedTrials.includes(t.number)) {
      return false
    }
    if (t.state !== "Complete" && t.state !== "Pruned") {
      return false
    }
    if (t.state === "Pruned" && filterPruned) {
      return false
    }
    return targets.every((target) => target.getTargetValue(t) !== null)
  })
}

const filterFunc = (
  trial: Optuna.Trial,
  directions: Optuna.StudyDirection[]
): boolean => {
  return (
    trial.state === "Complete" &&
    trial.values !== undefined &&
    trial.values.length === directions.length
  )
}

export const useFilteredTrials = (
  study: Optuna.Study | null,
  targets: Target[],
  filterPruned: boolean,
  includeInfeasible = true,
  includeDominated = true
): Optuna.Trial[] =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useMemo<Optuna.Trial[]>(() => {
    return filterTrials(
      study,
      targets,
      filterPruned,
      includeInfeasible,
      includeDominated
    )
  }, [
    study?.trials,
    targets,
    filterPruned,
    includeInfeasible,
    includeDominated,
  ])

export const useFilteredTrialsFromStudies = (
  studies: Optuna.Study[],
  targets: Target[],
  filterPruned: boolean,
  selectedTrials: number[] = [],
  includeInfeasible = true,
  includeDominated = true
): Optuna.Trial[][] =>
  useMemo<Optuna.Trial[][]>(() => {
    return studies.map((s) =>
      filterTrials(
        s,
        targets,
        filterPruned,
        includeInfeasible,
        includeDominated,
        selectedTrials
      )
    )
  }, [
    studies,
    targets,
    filterPruned,
    includeInfeasible,
    includeDominated,
    selectedTrials,
  ])

export const useObjectiveTargets = (
  study: Optuna.Study | null
): [Target[], Target, (ident: string) => void] => {
  const defaultTarget = new Target("objective", 0)
  const [selected, setTargetIdent] = useState<string>(
    defaultTarget.identifier()
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const targetList = useMemo<Target[]>(() => {
    if (study !== null) {
      return study.directions.map((_v, i) => new Target("objective", i))
    }
    return [defaultTarget]
  }, [study?.directions])
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const selectedTarget = useMemo<Target>(
    () => targetList.find((t) => t.identifier() === selected) || defaultTarget,
    [targetList, selected]
  )
  return [targetList, selectedTarget, setTargetIdent]
}

export const useParamTargets = (
  searchSpace: Optuna.SearchSpaceItem[]
): [Target[], Target | null, (ident: string) => void] => {
  const [selected, setTargetIdent] = useState<string>("")
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const targetList = useMemo<Target[]>(() => {
    const targets = searchSpace.map((s) => new Target("params", s.name))
    if (selected === "" && targets.length > 0)
      setTargetIdent(targets[0].identifier())
    return targets
  }, [searchSpace])
  const selectedTarget = useMemo<Target | null>(
    () => targetList.find((t) => t.identifier() === selected) || null,
    [targetList, selected]
  )
  return [targetList, selectedTarget, setTargetIdent]
}

export const useObjectiveAndUserAttrTargets = (
  study: Optuna.Study | null
): [Target[], Target, (ident: string) => void] => {
  const defaultTarget = new Target("objective", 0)
  const [selected, setTargetIdent] = useState<string>(
    defaultTarget.identifier()
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const targetList = useMemo<Target[]>(() => {
    if (study !== null) {
      return [
        ...study.directions.map((_v, i) => new Target("objective", i)),
        ...study.union_user_attrs
          .filter((attr) => attr.sortable)
          .map((attr) => new Target("user_attr", attr.key)),
      ]
    }
    return [defaultTarget]
  }, [study?.directions, study?.union_user_attrs])
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const selectedTarget = useMemo<Target>(
    () => targetList.find((t) => t.identifier() === selected) || defaultTarget,
    [targetList, selected]
  )
  return [targetList, selectedTarget, setTargetIdent]
}

export const useObjectiveAndUserAttrTargetsFromStudies = (
  studies: Optuna.Study[]
): [Target[], Target, (ident: string) => void] => {
  const defaultTarget = new Target("objective", 0)
  const [selected, setTargetIdent] = useState<string>(
    defaultTarget.identifier()
  )
  const minDirections = useMemo<number>(() => {
    if (studies.length === 0) {
      return 0
    }
    return studies.reduce((acc, study) => {
      return Math.min(acc, study.directions.length)
    }, Number.MAX_VALUE)
  }, [studies])

  const intersect = (arrays: Optuna.AttributeSpec[][]) => {
    const atrEqual = (
      obj1: Optuna.AttributeSpec,
      obj2: Optuna.AttributeSpec
    ) => {
      return obj1.key === obj2.key
    }
    return arrays.reduce((a, b) =>
      a.filter((c) => b.some((d) => atrEqual(c, d)))
    )
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const attrTargets = useMemo<Target[]>(() => {
    if (studies.length === 0) {
      return []
    }
    const intersection = intersect(
      studies.map((study) => study.union_user_attrs)
    )
    return intersection
      .filter((attr) => attr.sortable)
      .map((attr) => new Target("user_attr", attr.key))
  }, [studies])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const targetList = useMemo<Target[]>(() => {
    if (studies !== null) {
      return [
        ...Array.from(
          { length: minDirections },
          (_, i) => new Target("objective", i)
        ),
        ...attrTargets,
      ]
    }
    return [defaultTarget]
  }, [minDirections, attrTargets])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const selectedTarget = useMemo<Target>(
    () => targetList.find((t) => t.identifier() === selected) || defaultTarget,
    [targetList, selected]
  )
  return [targetList, selectedTarget, setTargetIdent]
}

const getIsDominatedND = (normalizedValues: number[][]) => {
  // Fallback for straight-forward pareto front algorithm (O(N^2) complexity).
  const isDominated: boolean[] = []
  for (const values0 of normalizedValues) {
    const dominated = normalizedValues.some((values1) => {
      if (values0.every((value0, k) => values1[k] === value0)) {
        return false
      }
      return values0.every((value0, k) => values1[k] <= value0)
    })
    isDominated.push(dominated)
  }
  return isDominated
}

const getIsDominated2D = (normalizedValues: number[][]) => {
  // Fast pareto front algorithm (O(N log N) complexity).
  const sorted = normalizedValues
    .map((values, i) => [values[0], values[1], i])
    .sort((a, b) =>
      a[0] > b[0]
        ? 1
        : a[0] < b[0]
          ? -1
          : a[1] > b[1]
            ? 1
            : a[1] < b[1]
              ? -1
              : 0
    )
  let maxValueSeen0 = sorted[0][0]
  let minValueSeen1 = sorted[0][1]

  const isDominated: boolean[] = new Array(normalizedValues.length).fill(false)
  for (const values of sorted) {
    if (
      values[1] > minValueSeen1 ||
      (values[1] === minValueSeen1 && values[0] > maxValueSeen0)
    ) {
      isDominated[values[2]] = true
    } else {
      minValueSeen1 = values[1]
    }
    maxValueSeen0 = values[0]
  }
  return isDominated
}

const getIsDominated1D = (normalizedValues: number[][]) => {
  const best_value = Math.min(...normalizedValues.map((values) => values[0]))
  return normalizedValues.map((values) => values[0] !== best_value)
}

export const getIsDominated = (normalizedValues: number[][]) => {
  if (normalizedValues.length === 0) {
    return []
  }
  if (normalizedValues[0].length === 1) {
    return getIsDominated1D(normalizedValues)
  }
  if (normalizedValues[0].length === 2) {
    return getIsDominated2D(normalizedValues)
  }
  return getIsDominatedND(normalizedValues)
}

function getIsDominatedFromStudy(study: Optuna.Study): boolean[] {
  const trials: Optuna.Trial[] = study ? study.trials : []
  const feasibleTrials = getFeasibleTrials(trials, study).feasibleTrials

  const normalizedValues: number[][] = []
  for (const t of feasibleTrials) {
    if (t.values && t.values.length === study.directions.length) {
      const trialValues = t.values.map((v, i) => {
        return study.directions[i] === "minimize"
          ? (v as number)
          : (-v as number)
      })
      normalizedValues.push(trialValues)
    }
  }

  return getIsDominated(normalizedValues)
}

export function getFeasibleTrials(trials: Optuna.Trial[], study: Optuna.Study) {
  const filteredTrials = trials.filter((t: Optuna.Trial) =>
    filterFunc(t, study.directions)
  )
  const feasibleTrials: Optuna.Trial[] = []
  const infeasibleTrials: Optuna.Trial[] = []
  for (const t of filteredTrials) {
    if (t.constraints.every((c) => c <= 0)) {
      feasibleTrials.push(t)
    } else {
      infeasibleTrials.push(t)
    }
  }
  return { feasibleTrials, infeasibleTrials }
}
