import { useMemo } from "react"

export class Target {
  kind: "objective" | "user_attr"
  key: number | string

  constructor(kind: "objective" | "user_attr", key: number | string) {
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
    } else {
      return false
    }
    return true
  }

  toLabel(objectiveNames: string[]): string {
    if (this.kind === "objective") {
      const objectiveId: number = this.key as number
      if (objectiveNames.length > objectiveId) {
        return objectiveNames[objectiveId]
      }
      return `Objective ${objectiveId}`
    } else {
      return `User Attribute ${this.key}`
    }
  }

  getObjectiveId(): number | null {
    return this.key as number
  }

  getTargetValue(trial: Trial): number | null {
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
      if (value === "inf" || value === "-inf") {
        return null
      }
      return value
    } else if (this.kind === "user_attr") {
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
    return null
  }
}

export const useFilteredTrials = (
  study: StudyDetail | null,
  target: Target,
  filterComplete: boolean,
  filterPruned: boolean
): Trial[] =>
  useMemo<Trial[]>(() => {
    if (study === null) {
      return []
    }
    return study.trials.filter((t) => {
      if (t.state !== "Complete" && t.state !== "Pruned") {
        return false
      }
      if (t.state === "Complete" && filterComplete) {
        return false
      }
      if (t.state === "Pruned" && filterPruned) {
        return false
      }
      return target.getTargetValue(t) !== null
    })
  }, [study?.trials, target, filterComplete, filterPruned])

export const useTargetList = (study: StudyDetail | null): Target[] =>
  useMemo<Target[]>(() => {
    if (study !== null) {
      return [
        ...study.directions.map((v, i) => new Target("objective", i)),
        ...study.union_user_attrs
          .filter((attr) => attr.sortable)
          .map((attr) => new Target("user_attr", attr.key)),
      ]
    } else {
      return [new Target("objective", 0)]
    }
  }, [study?.directions, study?.union_user_attrs])
