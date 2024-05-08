import * as Optuna from "@optuna/types"
import { useEffect, useState } from "react"
import { loadStorageFromFile } from "./utils/loadStorageFromFile"

const fetchMockStudies = async () => {
  const filePath = "sample_db.sqlite3"
  const res = await fetch(filePath)
  const blob = await res.blob()
  const file = new File([blob], filePath)
  const mockStudies: Optuna.Study[] = []
  await loadStorageFromFile(file, (value) => {
    if (Array.isArray(value)) {
      mockStudies.push(...value)
    } else {
      mockStudies.push(...value([]))
    }
  })
  return mockStudies
}

const useMockStudies = () => {
  const [mockStudies, setMockStudies] = useState<Optuna.Study[]>([])
  useEffect(() => {
    fetchMockStudies().then((studies) => setMockStudies(studies))
  }, [])
  return mockStudies
}

export const useMockStudy = (studyId: number | undefined) => {
  const mockStudies = useMockStudies()
  const mockStudy = mockStudies.find((study) => study.id === studyId)
  const mockImportance: Optuna.ParamImportance[][] = [
    [
      { name: "dropout_l0", importance: 0.07990265450296263 },
      { name: "lr", importance: 0.07328545409147895 },
      { name: "n_layers", importance: 0.028260844392780343 },
      { name: "n_units_l0", importance: 0.1600821009129565 },
      { name: "optimizer", importance: 0.3296378694329876 },
    ],
  ]
  return { study: mockStudy, importance: mockImportance }
}
