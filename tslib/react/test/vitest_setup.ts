import "@testing-library/jest-dom/vitest"
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import './setup_studies'

// Cleanup DOM after each test
afterEach(() => {
  cleanup()
})

// Ensure global cleanup of async operations
afterEach(() => {
  // Cancel any pending timers or intervals
  if (typeof window !== 'undefined') {
    // Clear any pending timeouts/intervals
    const highestTimeoutId = Number(setTimeout(() => {}))
    clearTimeout(highestTimeoutId)
    for (let i = 1; i < highestTimeoutId; i++) {
      clearTimeout(i)
      clearInterval(i)
    }
  }
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
    }
  }
}
