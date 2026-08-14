import type * as Optuna from "@optuna/types"

export type StorageWarning = {
  log: string
  message: string
}

export type OpenStorageResult = {
  format: "journal" | "sqlite3"
  warnings: StorageWarning[]
}

export type StorageWorkerRequestBody =
  | {
      type: "open"
      buffer: ArrayBuffer
      sqliteWasmUrl?: string
      sqliteWasmBuffer?: ArrayBuffer
    }
  | { type: "getStudies" }
  | { type: "getStudy"; studyId: number }
  | { type: "close" }

// The body plus its correlation ID. The two are separate types because Omit<>
// over a discriminated union collapses it into a single object type.
export type StorageWorkerRequest = StorageWorkerRequestBody & {
  id: number
}

export type StorageWorkerRequestType = StorageWorkerRequestBody["type"]

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
