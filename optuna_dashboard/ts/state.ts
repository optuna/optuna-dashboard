import { atom, useRecoilValue } from "recoil"

export const studySummariesState = atom<StudySummary[]>({
  key: "studySummaries",
  default: [],
})

export const studyDetailsState = atom<StudyDetails>({
  key: "studyDetails",
  default: {},
})

export const trialsUpdatingState = atom<{
  [trialId: string]: boolean
}>({
  key: "trialsUpdating",
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

export const drawerOpenState = atom<boolean>({
  key: "drawerOpen",
  default: false,
})

export const isFileUploading = atom<boolean>({
  key: "isFileUploading",
  default: false,
})

export const artifactIsAvailable = atom<boolean>({
  key: "artifactIsAvailable",
  default: false,
})

export const plotlyColorTheme = atom<PlotlyColorTheme>({
  key: "plotlyDarkColorScale",
  default: {
    dark: "default",
    light: "default",
  },
})

export const useStudyDetailValue = (studyId: number): StudyDetail | null => {
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)
  return studyDetails[studyId] || null
}

export const useStudySummaryValue = (studyId: number): StudySummary | null => {
  const studySummaries = useRecoilValue<StudySummary[]>(studySummariesState)
  return studySummaries.find((s) => s.study_id == studyId) || null
}

export const useTrialUpdatingValue = (trialId: number): boolean => {
  const updating = useRecoilValue(trialsUpdatingState)
  return updating[trialId] || false
}

export const useParamImportanceValue = (
  studyId: number
): ParamImportance[][] | null => {
  const studyParamImportance =
    useRecoilValue<StudyParamImportance>(paramImportanceState)
  return studyParamImportance[studyId] || null
}

export const useStudyDirections = (
  studyId: number
): StudyDirection[] | null => {
  const studyDetail = useStudyDetailValue(studyId)
  const studySummary = useStudySummaryValue(studyId)
  return studyDetail?.directions || studySummary?.directions || null
}

export const useStudyIsPreferential = (studyId: number): boolean | null => {
  const studyDetail = useStudyDetailValue(studyId)
  const studySummary = useStudySummaryValue(studyId)
  return studyDetail?.is_preferential || studySummary?.is_preferential || null
}

export const useStudyName = (studyId: number): string | null => {
  const studyDetail = useStudyDetailValue(studyId)
  const studySummary = useStudySummaryValue(studyId)
  return studyDetail?.name || studySummary?.study_name || null
}

export const useArtifacts = (studyId: number, trialId: number): Artifact[] => {
  const study = useStudyDetailValue(studyId)
  const trial = study?.trials.find((t) => t.trial_id === trialId)
  if (trial === undefined) {
    return []
  }
  return trial.artifacts
}
