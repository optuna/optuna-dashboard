import * as Optuna from "@optuna/types"

const filterFunc = (trial: Trial, directions: Optuna.StudyDirection[]): boolean => {
  return (
    trial.state === "Complete" &&
    trial.values !== undefined &&
    trial.values.length === directions.length
  )
}

export const getDominatedTrials = (
  trials: Trial[],
  directions: Optuna.StudyDirection[]
): Trial[] => {
  // TODO(c-bata): Use log-linear algorithm like Optuna.
  // TODO(c-bata): Use this function at GraphParetoFront.
  const filteredTrials = trials.filter((t: Trial) => filterFunc(t, directions))

  const normalizedValues: number[][] = []
  filteredTrials.forEach((t) => {
    if (t.values && t.values.length === directions.length) {
      const trialValues = t.values.map((v, i) => {
        return directions[i] === "minimize" ? (v as number) : (-v as number)
      })
      normalizedValues.push(trialValues)
    }
  })
  const dominatedTrials: boolean[] = []
  normalizedValues.forEach((values0: number[], i: number) => {
    const dominated = normalizedValues.some((values1: number[], j: number) => {
      if (i === j || values0.every((v, i) => v === values1[i])) {
        return false
      }
      return values0.every((value0: number, k: number) => {
        return values1[k] <= value0
      })
    })
    dominatedTrials.push(dominated)
  })
  return filteredTrials.filter((_, i) => !dominatedTrials.at(i))
}
