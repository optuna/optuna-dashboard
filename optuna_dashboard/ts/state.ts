import * as Optuna from "@optuna/types"
import { atom, useRecoilValue } from "recoil"
import { useLocalStorage } from "usehooks-ts"
import {
  DarkColorTemplates,
  LightColorTemplates,
} from "./components/PlotlyColorTemplates"
import {
  Artifact,
  PlotlyColorTheme,
  StudyDetail,
  StudyDetails,
  StudySummary,
} from "./types/optuna"

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

// TODO(c-bata): Consider representing the state as boolean.
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

export const plotlypyIsAvailableState = atom<boolean>({
  key: "plotlypyIsAvailable",
  default: false,
})

export const studySummariesLoadingState = atom<boolean>({
  key: "studySummariesLoadingState",
  default: false,
})

export const studyDetailLoadingState = atom<Record<number, boolean>>({
  key: "studyDetailLoading",
  default: {},
})

export const usePlotBackendRendering = () => {
  return useLocalStorage<boolean>("plotBackendRendering", false)
}

export const useShowExperimentalFeature = () => {
  return useLocalStorage<boolean>("showExperimentalFeature", false)
}

export const usePlotlyColorThemeState = () => {
  return useLocalStorage<PlotlyColorTheme>("plotlyColorTheme", {
    dark: "default",
    light: "default",
  })
}

export const useStudyDetailValue = (studyId: number): StudyDetail | null => {
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)
  return studyDetails[studyId] || null
}

export const useStudySummaryValue = (studyId: number): StudySummary | null => {
  const studySummaries = useRecoilValue<StudySummary[]>(studySummariesState)
  return studySummaries.find((s) => s.study_id === studyId) || null
}

export const useTrialUpdatingValue = (trialId: number): boolean => {
  const updating = useRecoilValue(trialsUpdatingState)
  return updating[trialId] || false
}

export const useStudyDirections = (
  studyId: number
): Optuna.StudyDirection[] | null => {
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

export const usePlotlyColorTheme = (mode: string): Partial<Plotly.Template> => {
  const [theme] = usePlotlyColorThemeState()
  if (mode === "dark") {
    return DarkColorTemplates[theme.dark]
  } else {
    return LightColorTemplates[theme.light]
  }
}

export const useBackendRender = (): boolean => {
  const [plotBackendRendering] = usePlotBackendRendering()
  const plotlypyIsAvailable = useRecoilValue(plotlypyIsAvailableState)

  if (plotBackendRendering) {
    if (plotlypyIsAvailable) {
      return true
    }
  }
  return false
}
