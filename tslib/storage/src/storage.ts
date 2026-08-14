import * as Optuna from "@optuna/types"

export type OptunaStorage = {
  getStudies: () => Promise<Optuna.StudySummary[]>
  getStudy: (studyId: number) => Promise<Optuna.Study | null>
  close: () => Promise<void>
}
