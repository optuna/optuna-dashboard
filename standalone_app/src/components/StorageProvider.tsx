import { SQLite3Storage } from "@optuna/storage"
import type { OptunaStorage } from "@optuna/storage"
import { type StorageWorkerFactory, openStorage } from "@optuna/storage"
import React, {
  FC,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

export const StorageContext = createContext<{
  storage: OptunaStorage | null
  loadStorage: (
    arrayBuffer: ArrayBuffer,
    workerFactory?: StorageWorkerFactory
  ) => Promise<void>
  closeStorage: () => Promise<void>
  loading: boolean
  error: Error | null
  reportError: (error: unknown) => void
}>({
  storage: null,
  loadStorage: async () => {},
  closeStorage: async () => {},
  loading: false,
  error: null,
  reportError: () => {},
})

export const getStorage = async (
  arrayBuffer: ArrayBuffer,
  workerFactory: StorageWorkerFactory
): Promise<OptunaStorage> => {
  const header = new Uint8Array(
    arrayBuffer,
    0,
    Math.min(arrayBuffer.byteLength, 16)
  )
  const headerString = new TextDecoder().decode(header)
  if (headerString === "SQLite format 3\u0000") {
    return new SQLite3Storage(arrayBuffer)
  }
  return openStorage(arrayBuffer, workerFactory)
}

export const StorageProvider: FC<{
  children: React.ReactNode
  workerFactory?: StorageWorkerFactory
}> = ({ children, workerFactory }) => {
  const [storage, setStorage] = useState<OptunaStorage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const storageRef = useRef<OptunaStorage | null>(null)
  const loadingRef = useRef(false)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)

  const reportError = useCallback((loadError: unknown) => {
    const normalizedError =
      loadError instanceof Error
        ? loadError
        : new Error("Storage request failed")
    if (mountedRef.current) {
      setError(normalizedError)
    }
  }, [])

  const closeStorage = useCallback(async () => {
    generationRef.current += 1
    const currentStorage = storageRef.current
    storageRef.current = null
    if (mountedRef.current) {
      setStorage(null)
      setLoading(false)
    }
    if (currentStorage !== null) {
      try {
        await currentStorage.close()
      } catch (closeError) {
        reportError(closeError)
      }
    }
  }, [reportError])

  const loadStorage = useCallback(
    async (
      arrayBuffer: ArrayBuffer,
      overrideWorkerFactory?: StorageWorkerFactory
    ) => {
      if (!mountedRef.current || loadingRef.current) {
        return
      }
      if (storageRef.current !== null) {
        reportError(new Error("Storage is already open"))
        return
      }

      loadingRef.current = true
      const generation = ++generationRef.current
      setLoading(true)
      setError(null)
      try {
        const factory = overrideWorkerFactory ?? workerFactory
        if (factory === undefined) {
          throw new Error("A storage worker factory is required")
        }
        const nextStorage = await getStorage(arrayBuffer, factory)

        if (!mountedRef.current || generation !== generationRef.current) {
          await nextStorage.close()
          return
        }

        storageRef.current = nextStorage
        setStorage(nextStorage)
      } catch (loadError) {
        if (mountedRef.current && generation === generationRef.current) {
          reportError(loadError)
        }
      } finally {
        loadingRef.current = false
        if (mountedRef.current && generation === generationRef.current) {
          setLoading(false)
        }
      }
    },
    [reportError, workerFactory]
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      generationRef.current += 1
      loadingRef.current = false
      const currentStorage = storageRef.current
      storageRef.current = null
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
      }}
    >
      {children}
    </StorageContext.Provider>
  )
}
