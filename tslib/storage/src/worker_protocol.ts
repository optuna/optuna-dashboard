import type * as Optuna from "@optuna/types"

export type StorageWarning = {
  log: string
  message: string
}

export type OpenStorageResult = {
  format: "journal"
  warnings: StorageWarning[]
}

export type StorageWorkerRequestWithoutId =
  | { type: "open"; buffer: ArrayBuffer }
  | { type: "getStudies" }
  | { type: "getStudy"; studyId: number }
  | { type: "close" }

export type StorageWorkerRequest = StorageWorkerRequestWithoutId & {
  id: number
}

export type StorageWorkerResponse =
  | { id: number; ok: true; result: OpenStorageResult }
  | { id: number; ok: true; result: Optuna.StudySummary[] }
  | { id: number; ok: true; result: Optuna.Study | null }
  | { id: number; ok: true; result: null }
  | {
      id: number
      ok: false
      error: {
        code: string
        message: string
        details?: unknown
      }
    }
