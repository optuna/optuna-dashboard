import {
  type OptunaStorage,
  type SQLiteWasmSource,
  type StorageWorkerFactory,
  openStorage,
} from "@optuna/storage/worker-client"
import React, {
  FC,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

export type StorageOpenOptions = {
  workerFactory?: StorageWorkerFactory
  sqliteWasm?: SQLiteWasmSource
}

export const StorageContext = createContext<{
  storage: OptunaStorage | null
  loadStorage: (
    arrayBuffer: ArrayBuffer,
    options?: StorageOpenOptions
  ) => Promise<void>
  closeStorage: () => Promise<void>
  loading: boolean
  error: Error | null
  reportError: (error: unknown) => void
  // Transitional: the VS Code Webview still builds a backend on the UI thread
  // and hands it over, because its Worker needs asset plumbing that the Webview
  // build does not have yet. It goes away once the Webview opens storages the
  // way the standalone app now does.
  setStorage: (storage: OptunaStorage) => void
}>({
  storage: null,
  loadStorage: async () => {},
  closeStorage: async () => {},
  loading: false,
  error: null,
  reportError: () => {},
  setStorage: () => {},
})

// A viewer owns at most one storage session at a time. The session is kept in a
// ref because every transition has to read the current one without waiting for
// a re-render: a second drop must be rejected before React commits `loading`.
//
// `generation` invalidates work in flight. Closing, unmounting, or starting
// another load bumps it, and a load that finds its generation stale closes the
// storage it just opened instead of publishing it.
type StorageSession = {
  generation: number
  storage: OptunaStorage | null
  loading: boolean
}

export const StorageProvider: FC<{
  children: React.ReactNode
  workerFactory?: StorageWorkerFactory
  sqliteWasm?: SQLiteWasmSource
}> = ({ children, workerFactory, sqliteWasm }) => {
  const [storage, setActiveStorage] = useState<OptunaStorage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const sessionRef = useRef<StorageSession>({
    generation: 0,
    storage: null,
    loading: false,
  })

  const reportError = useCallback((loadError: unknown) => {
    const normalizedError =
      loadError instanceof Error
        ? loadError
        : new Error("Storage request failed")
    // StorageErrorNotifier only shows the message; keep the original error
    // around for the Webview developer tools.
    console.error("Optuna storage error", loadError)
    setError(normalizedError)
  }, [])

  const closeStorage = useCallback(async () => {
    const session = sessionRef.current
    session.generation += 1
    const currentStorage = session.storage
    session.storage = null
    setActiveStorage(null)
    setLoading(false)
    setError(null)
    if (currentStorage !== null) {
      try {
        await currentStorage.close()
      } catch (closeError) {
        reportError(closeError)
      }
    }
  }, [reportError])

  const loadStorage = useCallback(
    async (arrayBuffer: ArrayBuffer, options: StorageOpenOptions = {}) => {
      const session = sessionRef.current
      if (session.loading) {
        return
      }
      if (session.storage !== null) {
        reportError(new Error("Storage is already open"))
        return
      }

      session.loading = true
      const generation = ++session.generation
      setLoading(true)
      setError(null)
      try {
        const factory = options.workerFactory ?? workerFactory
        if (factory === undefined) {
          throw new Error("A storage worker factory is required")
        }
        const nextStorage = await openStorage(
          arrayBuffer,
          factory,
          options.sqliteWasm ?? sqliteWasm
        )

        if (generation !== session.generation) {
          await nextStorage.close()
          return
        }

        session.storage = nextStorage
        setActiveStorage(nextStorage)
      } catch (loadError) {
        if (generation === session.generation) {
          reportError(loadError)
        }
      } finally {
        session.loading = false
        if (generation === session.generation) {
          setLoading(false)
        }
      }
    },
    [reportError, sqliteWasm, workerFactory]
  )

  const setStorage = useCallback((nextStorage: OptunaStorage) => {
    const session = sessionRef.current
    session.generation += 1
    const currentStorage = session.storage
    session.storage = nextStorage
    setActiveStorage(nextStorage)
    setError(null)
    if (currentStorage !== null) {
      void currentStorage.close().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const session = sessionRef.current
    return () => {
      session.generation += 1
      session.loading = false
      const currentStorage = session.storage
      session.storage = null
      if (currentStorage !== null) {
        void currentStorage.close().catch(() => {})
      }
    }
  }, [])

  return (
    <StorageContext.Provider
      value={{
        storage,
        loadStorage,
        closeStorage,
        loading,
        error,
        reportError,
        setStorage,
      }}
    >
      {children}
    </StorageContext.Provider>
  )
}
