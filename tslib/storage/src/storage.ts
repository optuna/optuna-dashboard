import * as Optuna from "@optuna/types"

export type OptunaStorage = {
  getStudies: () => Promise<Optuna.StudySummary[]>
  getStudy: (idx: number) => Promise<Optuna.Study | null>
}
