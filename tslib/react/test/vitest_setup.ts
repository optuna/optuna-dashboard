import "@testing-library/jest-dom/vitest"

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
    }
  }
}
