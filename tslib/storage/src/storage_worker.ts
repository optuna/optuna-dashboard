// @optuna/storage has three entry points, one per execution context:
//
//   - `@optuna/storage` (index.ts): the storage backends themselves. Importing
//     it pulls the sqlite-wasm glue into the bundle, so it belongs in the
//     Worker, or in a consumer that knowingly parses storages on its own
//     thread.
//   - `@optuna/storage/worker-client` (worker_client.ts): the client that talks
//     to the storage Worker. It runs on the UI thread and has no runtime
//     dependency of its own.
//   - storage_worker.ts: the Worker entry. It is not part of `exports` because
//     a Worker is not imported but pointed at: the app hands its path to the
//     bundler, as `new URL(..., import.meta.url)` for Vite or as an entry point
//     for webpack.
//
// This file is the third: the Worker itself.

import { JournalFileStorage } from "./journal.js"
import { SQLite3Storage } from "./sqlite.js"
import type {
  StorageWorkerRequest,
  StorageWorkerRequestType,
  StorageWorkerResponse,
  StorageWorkerResultMap,
} from "./worker_protocol.js"

// sqlite-wasm tries to install an OPFS VFS while it initializes, which starts a
// nested Worker for its async proxy. This viewer only opens an in-memory
// database, and the nested Worker cannot be resolved from a Worker that was
// started from a VS Code blob: URL. Removing the constructor keeps the OPFS
// installation from getting that far. The storage Worker never starts a Worker
// of its own, so this is scoped to the Worker instead of patching globals from
// the SQLite backend, which also runs on the main thread in other consumers.
;(globalThis as { Worker?: unknown }).Worker = undefined

type WorkerScope = {
  onmessage: (event: MessageEvent<StorageWorkerRequest>) => void
  postMessage: (message: StorageWorkerResponse) => void
}

type WorkerStorage = JournalFileStorage | SQLite3Storage

let storage: WorkerStorage | null = null

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

const postResult = <K extends StorageWorkerRequestType>(
  id: number,
  type: K,
  result: StorageWorkerResultMap[K]
): void => {
  workerScope.postMessage({
    id,
    type,
    ok: true,
    result,
  } as StorageWorkerResponse)
}

const postError = (id: number, type: string, error: unknown): void => {
  workerScope.postMessage({
    id,
    type,
    ok: false,
    error: createError(error),
  })
}

const isSQLiteFile = (buffer: ArrayBuffer): boolean => {
  const headerLength = Math.min(buffer.byteLength, 16)
  const header = new TextDecoder().decode(
    new Uint8Array(buffer, 0, headerLength)
  )
  return header === "SQLite format 3\u0000"
}

const closeStorage = async (): Promise<void> => {
  const currentStorage = storage
  storage = null
  if (currentStorage !== null) {
    await currentStorage.close()
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
        // Neither format can say anything about a file with no bytes, and
        // creating a storage does leave one behind, so name that case rather
        // than opening it as a storage with nothing in it.
        if (request.buffer.byteLength === 0) {
          throw new WorkerRequestError("empty_file", "This file is empty")
        }
        if (isSQLiteFile(request.buffer)) {
          if (
            request.sqliteWasmUrl === undefined &&
            request.sqliteWasmBuffer === undefined
          ) {
            throw new WorkerRequestError(
              "missing_sqlite_wasm",
              "SQLite wasm URL or buffer is required"
            )
          }
          const sqliteStorage = new SQLite3Storage(request.buffer, {
            sqliteWasmUrl: request.sqliteWasmUrl,
            sqliteWasmBuffer: request.sqliteWasmBuffer,
          })
          try {
            await sqliteStorage.waitUntilReady()
            if (!(await sqliteStorage.hasOptunaSchema())) {
              throw new WorkerRequestError(
                "unsupported_format",
                "Not an Optuna storage: this SQLite database has no Optuna tables"
              )
            }
          } catch (error) {
            await sqliteStorage.close()
            throw error
          }
          storage = sqliteStorage
          postResult(request.id, "open", {
            format: "sqlite3",
            warnings: [],
          })
          break
        }

        const journalStorage = new JournalFileStorage(request.buffer)
        const warnings = journalStorage.getErrors()
        // A Journal file is read line by line, and a line that cannot be read is
        // collected as a warning rather than raised, which is what keeps a
        // partially written file usable. A file that is not a storage at all
        // would then open as an empty one, so require at least one record. A
        // Journal storage whose studies were all deleted still has records.
        if (journalStorage.appliedRecords === 0) {
          throw new WorkerRequestError(
            "unsupported_format",
            "Not an Optuna storage: no SQLite header and no Journal record",
            { unreadableLines: warnings.length }
          )
        }
        storage = journalStorage
        postResult(request.id, "open", {
          format: "journal",
          warnings,
        })
        break
      }
      case "getStudies": {
        if (storage === null) {
          throw new WorkerRequestError("invalid_state", "Storage is not open")
        }
        postResult(request.id, "getStudies", await storage.getStudies())
        break
      }
      case "getStudy": {
        if (storage === null) {
          throw new WorkerRequestError("invalid_state", "Storage is not open")
        }
        postResult(
          request.id,
          "getStudy",
          await storage.getStudy(request.studyId)
        )
        break
      }
      case "close": {
        await closeStorage()
        postResult(request.id, "close", null)
        break
      }
      default: {
        // `request` is never here as long as every request type is handled.
        // Answering keeps a client of a different version from waiting forever.
        const unsupported = request as { id: number; type: string }
        throw new WorkerRequestError(
          "unsupported_request",
          `Unsupported request: ${unsupported.type}`
        )
      }
    }
  } catch (error) {
    postError(request.id, request.type, error)
  }
}
