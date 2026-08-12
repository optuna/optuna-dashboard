import type * as Optuna from "@optuna/types"
import type { OptunaStorage } from "./storage"
import type {
  OpenStorageResult,
  StorageWorkerRequest,
  StorageWorkerRequestWithoutId,
  StorageWorkerResponse,
} from "./worker_protocol"

export type StorageWorker = {
  postMessage: (message: StorageWorkerRequest, transfer: Transferable[]) => void
  addEventListener: (type: string, listener: (event: Event) => void) => void
  removeEventListener: (type: string, listener: (event: Event) => void) => void
  terminate: () => void
}

export type StorageWorkerHandle = {
  worker: StorageWorker
  dispose: () => void
}

export type StorageWorkerFactory = () => Promise<StorageWorkerHandle>

export class StorageWorkerError extends Error {
  readonly code: string
  readonly details: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = "StorageWorkerError"
    this.code = code
    this.details = details
  }
}

type ClientState = "opening" | "ready" | "closing" | "closed" | "failed"

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

export class StorageWorkerClient implements OptunaStorage {
  private state: ClientState = "opening"
  private nextRequestId = 0
  private readonly pending = new Map<number, PendingRequest>()
  private readonly handle: StorageWorkerHandle
  private openPromise!: Promise<OpenStorageResult>
  private closePromise: Promise<void> | null = null
  private openResult: OpenStorageResult | null = null
  private disposed = false

  private readonly handleMessage = (event: Event): void => {
    const response = (event as MessageEvent<StorageWorkerResponse>).data
    const pending = this.pending.get(response.id)
    if (pending === undefined) {
      return
    }
    this.pending.delete(response.id)
    if (response.ok) {
      pending.resolve(response.result)
    } else {
      pending.reject(
        new StorageWorkerError(
          response.error.code,
          response.error.message,
          response.error.details
        )
      )
    }
  }

  private readonly handleWorkerFailure = (event: Event): void => {
    const errorEvent = event as ErrorEvent
    const message = errorEvent.message || "Storage worker failed"
    this.fail(new StorageWorkerError("worker_failed", message))
  }

  private constructor(handle: StorageWorkerHandle) {
    this.handle = handle
    handle.worker.addEventListener("message", this.handleMessage)
    handle.worker.addEventListener("error", this.handleWorkerFailure)
    handle.worker.addEventListener("messageerror", this.handleWorkerFailure)
  }

  public static async open(
    buffer: ArrayBuffer,
    workerFactory: StorageWorkerFactory
  ): Promise<StorageWorkerClient> {
    const client = new StorageWorkerClient(await workerFactory())
    const openPromise = client.request<OpenStorageResult>(
      { type: "open", buffer },
      [buffer]
    )
    client.openPromise = openPromise

    try {
      client.openResult = await openPromise
      client.state = "ready"
      return client
    } catch (error) {
      client.fail(error)
      throw error
    }
  }

  public getWarnings(): OpenStorageResult["warnings"] {
    return this.openResult?.warnings ?? []
  }

  public getStudies = async (): Promise<Optuna.StudySummary[]> => {
    await this.waitUntilReady()
    return this.request<Optuna.StudySummary[]>({ type: "getStudies" })
  }

  public getStudy = async (studyId: number): Promise<Optuna.Study | null> => {
    await this.waitUntilReady()
    return this.request<Optuna.Study | null>({ type: "getStudy", studyId })
  }

  public close = async (): Promise<void> => {
    if (this.state === "closed") {
      return
    }
    if (this.closePromise !== null) {
      return this.closePromise
    }

    this.closePromise = (async () => {
      if (this.state === "opening") {
        try {
          await this.openPromise
        } catch {
          // The failure path below releases the worker resources.
        }
      }
      if (this.state === "ready") {
        this.state = "closing"
        try {
          await this.request<null>({ type: "close" })
        } catch {
          // close must release the client even if the worker already failed.
        }
      }
      this.dispose()
      this.state = "closed"
    })()
    return this.closePromise
  }

  private waitUntilReady = async (): Promise<void> => {
    if (this.state === "opening") {
      await this.openPromise
    }
    if (this.state !== "ready") {
      throw new StorageWorkerError(
        "invalid_state",
        `Storage worker is ${this.state}`
      )
    }
  }

  private request<T>(
    request: StorageWorkerRequestWithoutId,
    transfer: Transferable[] = []
  ): Promise<T> {
    if (this.state === "closed" || this.state === "failed") {
      return Promise.reject(
        new StorageWorkerError(
          "invalid_state",
          `Storage worker is ${this.state}`
        )
      )
    }

    const id = this.nextRequestId++
    const message = { ...request, id } as StorageWorkerRequest
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      })
      try {
        this.handle.worker.postMessage(message, transfer)
      } catch (error) {
        this.pending.delete(id)
        reject(error)
      }
    })
  }

  private fail(error: unknown): void {
    if (this.state === "closed" || this.state === "failed") {
      return
    }
    this.state = "failed"
    for (const pending of this.pending.values()) {
      pending.reject(error)
    }
    this.pending.clear()
    this.dispose()
  }

  private dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.handle.worker.removeEventListener("message", this.handleMessage)
    this.handle.worker.removeEventListener("error", this.handleWorkerFailure)
    this.handle.worker.removeEventListener(
      "messageerror",
      this.handleWorkerFailure
    )
    this.handle.worker.terminate()
    this.handle.dispose()
  }
}

export const openStorage = async (
  buffer: ArrayBuffer,
  workerFactory: StorageWorkerFactory
): Promise<StorageWorkerClient> => {
  return StorageWorkerClient.open(buffer, workerFactory)
}
