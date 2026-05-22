import { useEffect, useRef, useState } from "react"
import { Dispatch, SetStateAction } from "react"

type UseLocalStorageReturn<T> = [T, Dispatch<SetStateAction<T>>, () => void]

const LOCAL_STORAGE_CHANGE_EVENT = "local-storage"

function readValue<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") {
    return initialValue
  }

  try {
    const item = window.localStorage.getItem(key)
    return item === null ? initialValue : (JSON.parse(item) as T)
  } catch {
    return initialValue
  }
}

const dispatchLocalStorageChange = (key: string): void => {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(
    new CustomEvent(LOCAL_STORAGE_CHANGE_EVENT, { detail: { key } })
  )
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  const initialValueRef = useRef(initialValue)
  const [storedValue, setStoredValue] = useState<T>(() =>
    readValue(key, initialValueRef.current)
  )
  const storedValueRef = useRef(storedValue)

  const updateStoredValue = (value: T) => {
    storedValueRef.current = value
    setStoredValue(value)
  }

  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    const nextValue =
      typeof value === "function"
        ? (value as (current: T) => T)(storedValueRef.current)
        : value

    try {
      window.localStorage.setItem(key, JSON.stringify(nextValue))
    } catch {
      // Keep the React state usable even when localStorage is unavailable.
    }
    updateStoredValue(nextValue)
    dispatchLocalStorageChange(key)
  }

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Keep the React state usable even when localStorage is unavailable.
    }
    updateStoredValue(initialValueRef.current)
    dispatchLocalStorageChange(key)
  }

  useEffect(() => {
    updateStoredValue(readValue(key, initialValueRef.current))

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        updateStoredValue(readValue(key, initialValueRef.current))
      }
    }
    const handleSameTabStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string }>
      if (customEvent.detail?.key === key) {
        updateStoredValue(readValue(key, initialValueRef.current))
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener(
      LOCAL_STORAGE_CHANGE_EVENT,
      handleSameTabStorageChange
    )

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener(
        LOCAL_STORAGE_CHANGE_EVENT,
        handleSameTabStorageChange
      )
    }
  }, [key])

  return [storedValue, setValue, removeValue]
}
