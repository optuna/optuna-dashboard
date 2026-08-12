import { JournalFileStorage } from "./journal"
import type {
  StorageWorkerRequest,
  StorageWorkerResponse,
} from "./worker_protocol"

type WorkerScope = {
  onmessage: (event: MessageEvent<StorageWorkerRequest>) => void
  postMessage: (message: StorageWorkerResponse) => void
}

let storage: JournalFileStorage | null = null

const workerScope = self as unknown as WorkerScope

class WorkerRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
  }
}

const createError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      code: error instanceof WorkerRequestError ? error.code : "request_failed",
      message: error.message,
      details: error instanceof WorkerRequestError ? error.details : undefined,
    }
  }
  return {
    code: "request_failed",
    message: "Unknown worker error",
  }
}

const postError = (id: number, error: unknown): void => {
  workerScope.postMessage({
    id,
    ok: false,
    error: createError(error),
  })
}

const ensureJournal = (buffer: ArrayBuffer): void => {
  const headerLength = Math.min(buffer.byteLength, 16)
  const header = new TextDecoder().decode(
    new Uint8Array(buffer, 0, headerLength)
  )
  if (header === "SQLite format 3\u0000") {
    throw new WorkerRequestError(
      "unsupported_format",
      "SQLite storage is not supported by this worker"
    )
  }
}

workerScope.onmessage = async (event) => {
  const request = event.data

  try {
    switch (request.type) {
      case "open": {
        if (storage !== null) {
          throw new WorkerRequestError(
            "invalid_state",
            "Storage is already open"
          )
        }
        ensureJournal(request.buffer)
        storage = new JournalFileStorage(request.buffer)
        workerScope.postMessage({
          id: request.id,
          ok: true,
          result: {
            format: "journal",
            warnings: storage.getErrors(),
          },
        })
        break
      }
      case "getStudies": {
        if (storage === null) {
          throw new WorkerRequestError("invalid_state", "Storage is not open")
        }
        workerScope.postMessage({
          id: request.id,
          ok: true,
          result: await storage.getStudies(),
        })
        break
      }
      case "getStudy": {
        if (storage === null) {
          throw new WorkerRequestError("invalid_state", "Storage is not open")
        }
        workerScope.postMessage({
          id: request.id,
          ok: true,
          result: await storage.getStudy(request.studyId),
        })
        break
      }
      case "close": {
        storage = null
        workerScope.postMessage({ id: request.id, ok: true, result: null })
        break
      }
    }
  } catch (error) {
    postError(request.id, error)
  }
}
