import React, { FC, createContext, useState } from "react"
import { JournalFileStorage } from "@optuna/storage-loader"
import { SQLite3Storage } from "@optuna/storage-loader"

export const StorageContext = createContext<{
  storage: OptunaStorage | null
  setStorage: (storage: OptunaStorage) => void
}>({
  storage: null,
  setStorage: () => {},
})

export const getStorage = (arrayBuffer: ArrayBuffer): OptunaStorage => {
  const header = new Uint8Array(arrayBuffer, 0, 16)
  const headerString = new TextDecoder().decode(header)
  if (headerString === "SQLite format 3\u0000") {
    return new SQLite3Storage(arrayBuffer)
  }
  return new JournalFileStorage(arrayBuffer)
}

export const StorageProvider: FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [storage, setStorage] = useState<OptunaStorage | null>(null)
  return (
    <StorageContext.Provider value={{ storage, setStorage }}>
      {children}
    </StorageContext.Provider>
  )
}
