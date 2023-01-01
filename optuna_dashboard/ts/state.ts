import { atom } from "recoil"

export const studySummariesState = atom<StudySummary[]>({
  key: "studySummaries",
  default: [],
})

export const studyDetailsState = atom<StudyDetails>({
  key: "studyDetails",
  default: {},
})

export const paramImportanceState = atom<StudyParamImportance>({
  key: "paramImportance",
  default: {},
})

export const graphVisibilityState = atom<GraphVisibility>({
  key: "graphVisibility",
  default: {
    history: true,
    paretoFront: true,
    parallelCoordinate: true,
    intermediateValues: true,
    edf: true,
    contour: true,
    importances: true,
    slice: true,
  },
})

export const reloadIntervalState = atom<number>({
  key: "reloadInterval",
  default: 10,
})
