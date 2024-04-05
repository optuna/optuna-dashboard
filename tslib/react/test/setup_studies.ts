import fs from "node:fs"
import * as Optuna from "@optuna/types"
import { loadStorageFromFile } from "../src/utils/loadStorageFromFile"

declare global {
  interface Window {
    mockStudies: Optuna.Study[]
  }
}

const data = fs.readFileSync("./test/asset/journal.log")
const blob = new Blob([data])
const file = new File([blob], "journal.log")
const mockStudies: Optuna.Study[] = []
await loadStorageFromFile(file, (value) => {
  if (Array.isArray(value)) {
    mockStudies.push(...value)
  } else {
    mockStudies.push(...value([]))
  }
})
window.mockStudies = mockStudies

// mock window.URL.createObjectURL in JSDOM
window.HTMLCanvasElement.prototype.getContext = () => null
window.URL.createObjectURL = () => ""
