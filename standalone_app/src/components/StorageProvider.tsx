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
}>({
  storage: null,
  loadStorage: async () => {},
  closeStorage: async () => {},
  loading: false,
  error: null,
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

  const closeStorage = useCallback(async () => {
    const currentStorage = storageRef.current
    storageRef.current = null
    setStorage(null)
    if (currentStorage !== null) {
      await currentStorage.close()
    }
  }, [])

  const loadStorage = useCallback(
    async (
      arrayBuffer: ArrayBuffer,
      overrideWorkerFactory?: StorageWorkerFactory
    ) => {
      setLoading(true)
      setError(null)
      try {
        if (storageRef.current !== null) {
          throw new Error("Storage is already open")
        }
        const factory = overrideWorkerFactory ?? workerFactory
        if (factory === undefined) {
          throw new Error("A storage worker factory is required")
        }
        const nextStorage = await getStorage(arrayBuffer, factory)
        storageRef.current = nextStorage
        setStorage(nextStorage)
      } catch (loadError) {
        const normalizedError =
          loadError instanceof Error
            ? loadError
            : new Error("Failed to load storage")
        setError(normalizedError)
      } finally {
        setLoading(false)
      }
    },
    [workerFactory]
  )

  useEffect(() => {
    return () => {
      const currentStorage = storageRef.current
      storageRef.current = null
      if (currentStorage !== null) {
        void currentStorage.close()
      }
    }
  }, [])

  return (
    <StorageContext.Provider
      value={{ storage, loadStorage, closeStorage, loading, error }}
    >
      {children}
    </StorageContext.Provider>
  )
}
