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
  selectedTrials: number[] = []
): Optuna.Trial[] => {
  if (study === null) {
    return []
  }
  return study.trials.filter((t) => {
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

export const useFilteredTrials = (
  study: Optuna.Study | null,
  targets: Target[],
  filterPruned: boolean
): Optuna.Trial[] =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useMemo<Optuna.Trial[]>(() => {
    return filterTrials(study, targets, filterPruned)
  }, [study?.trials, targets, filterPruned])

export const useFilteredTrialsFromStudies = (
  studies: Optuna.Study[],
  targets: Target[],
  filterPruned: boolean,
  selectedTrials: number[]
): Optuna.Trial[][] =>
  useMemo<Optuna.Trial[][]>(() => {
    return studies.map((s) =>
      filterTrials(s, targets, filterPruned, selectedTrials)
    )
  }, [studies, targets, filterPruned, selectedTrials])

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
