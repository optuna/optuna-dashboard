import fs from "node:fs"
import * as Optuna from "@optuna/types"
import { loadStorageFromFile } from "../src/utils/loadStorageFromFile"

declare global {
  interface Window {
    mockStudies: Optuna.Study[]
    mockImportances: Record<string, Optuna.ParamImportance[][]>
  }
}

const journalData = fs.readFileSync("./test/asset/journal.log")
const journalBlob = new Blob([journalData])
const journalFile = new File([journalBlob], "journal.log")
const mockStudies: Optuna.Study[] = []
await loadStorageFromFile(journalFile, (value) => {
  if (Array.isArray(value)) {
    mockStudies.push(...value)
  } else {
    mockStudies.push(...value([]))
  }
})
window.mockStudies = mockStudies

const importancesData = fs.readFileSync("./test/asset/params_importances.json")
const importancesJson = JSON.parse(importancesData.toString())
const mockImportances: Record<string, Optuna.ParamImportance[][]> = {}
for (const key in importancesJson) {
  mockImportances[key] = importancesJson[key].map(
    (importance: Record<string, number>) => {
      const importanceArray: Optuna.ParamImportance[] = []
      for (const name in importance) {
        importanceArray.push({ name, importance: importance[name] })
      }
      return importanceArray
    }
  )
}
window.mockImportances = mockImportances

// mock window.URL.createObjectURL in JSDOM
window.HTMLCanvasElement.prototype.getContext = () => null
window.URL.createObjectURL = () => ""
