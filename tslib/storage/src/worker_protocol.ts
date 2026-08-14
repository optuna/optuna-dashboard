import type * as Optuna from "@optuna/types"

export type StorageWarning = {
  log: string
  message: string
}

export type OpenStorageResult = {
  format: "journal" | "sqlite3"
  warnings: StorageWarning[]
}

export type StorageWorkerRequestWithoutId =
  | {
      type: "open"
      buffer: ArrayBuffer
      sqliteWasmUrl?: string
      sqliteWasmBuffer?: ArrayBuffer
    }
  | { type: "getStudies" }
  | { type: "getStudy"; studyId: number }
  | { type: "close" }

export type StorageWorkerRequest = StorageWorkerRequestWithoutId & {
  id: number
}

export type StorageWorkerRequestType = StorageWorkerRequestWithoutId["type"]

export type StorageWorkerRequestOf<K extends StorageWorkerRequestType> =
  Extract<StorageWorkerRequestWithoutId, { type: K }>

// The result each request answers with. Both ends derive their types from this
// map, so adding a request type cannot leave the two sides disagreeing.
export type StorageWorkerResultMap = {
  open: OpenStorageResult
  getStudies: Optuna.StudySummary[]
  getStudy: Optuna.Study | null
  close: null
}

export type StorageWorkerErrorPayload = {
  code: string
  message: string
  details?: unknown
}

type SuccessResponse<K extends StorageWorkerRequestType> =
  K extends StorageWorkerRequestType
    ? { id: number; type: K; ok: true; result: StorageWorkerResultMap[K] }
    : never

export type StorageWorkerResponse =
  | SuccessResponse<StorageWorkerRequestType>
  // The type of a failed request is not narrowed: a request the Worker does not
  // know about is reported back with the type it was sent with.
  | { id: number; type: string; ok: false; error: StorageWorkerErrorPayload }
