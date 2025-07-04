import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import {
  Artifact,
  FeedbackComponentType,
  FormWidgets,
  Note,
  PlotlyGraphObject,
  PreferenceFeedbackMode,
  PreferenceHistory,
  StudyDetail,
  StudySummary,
  Trial,
} from "./types/optuna"

export type APIMeta = {
  artifact_is_available: boolean
  plotlypy_is_available: boolean
  jupyterlab_extension_context?: {
    base_url: string
  }
}

export interface TrialResponse {
  trial_id: number
  study_id: number
  number: number
  state: Optuna.TrialState
  values?: number[]
  intermediate_values: Optuna.TrialIntermediateValue[]
  datetime_start?: string
  datetime_complete?: string
  params: Optuna.TrialParam[]
  fixed_params: {
    name: string
    param_external_value: string
  }[]
  user_attrs: Optuna.Attribute[]
  note: Note
  artifacts: Artifact[]
  constraints: number[]
}

export interface PreferenceHistoryResponse {
  history: {
    id: string
    candidates: number[]
    clicked: number
    mode: PreferenceFeedbackMode
    timestamp: string
    preferences: [number, number][]
  }
  is_removed: boolean
}

export interface StudyDetailResponse {
  name: string
  datetime_start: string
  directions: Optuna.StudyDirection[]
  user_attrs: Optuna.Attribute[]
  trials: TrialResponse[]
  best_trials: TrialResponse[]
  intersection_search_space: Optuna.SearchSpaceItem[]
  union_search_space: Optuna.SearchSpaceItem[]
  union_user_attrs: Optuna.AttributeSpec[]
  has_intermediate_values: boolean
  note: Note
  is_preferential: boolean
  // TODO(c-bata): Rename this to metric_names after releasing the new Jupyter Lab extension.
  objective_names?: string[]
  form_widgets?: FormWidgets
  preferences?: [number, number][]
  preference_history?: PreferenceHistoryResponse[]
  plotly_graph_objects: PlotlyGraphObject[]
  artifacts: Artifact[]
  feedback_component_type: FeedbackComponentType
  skipped_trial_numbers?: number[]
}

export interface StudySummariesResponse {
  study_summaries: {
    study_id: number
    study_name: string
    directions: Optuna.StudyDirection[]
    user_attrs: Optuna.Attribute[]
    is_preferential: boolean
    datetime_start?: string
  }[]
}

export interface CreateNewStudyResponse {
  study_summary: {
    study_id: number
    study_name: string
    directions: Optuna.StudyDirection[]
    user_attrs: Optuna.Attribute[]
    is_preferential: boolean
    datetime_start?: string
  }
}

export type RenameStudyResponse = {
  study_id: number
  study_name: string
  directions: Optuna.StudyDirection[]
  user_attrs: Optuna.Attribute[]
  is_prefential: boolean // TODO(porink0424): Fix typo
  datetime_start?: string
}

export type UploadArtifactAPIResponse = {
  artifact_id: string
  artifacts: Artifact[]
}

export interface ParamImportancesResponse {
  param_importances: Optuna.ParamImportance[][]
}

export type PlotResponse = {
  data: plotly.Data[]
  layout: plotly.Layout
}

export enum PlotType {
  Contour = "contour",
  Slice = "slice",
  ParallelCoordinate = "parallel_coordinate",
  Rank = "rank",
  EDF = "edf",
  Timeline = "timeline",
  ParamImportances = "param_importances",
  ParetoFront = "pareto_front",
}

export enum CompareStudiesPlotType {
  EDF = "edf",
}

export abstract class APIClient {
  constructor() {}

  convertTrialResponse(response: TrialResponse): Trial {
    return {
      trial_id: response.trial_id,
      study_id: response.study_id,
      number: response.number,
      state: response.state,
      values: response.values,
      intermediate_values: response.intermediate_values,
      datetime_start: response.datetime_start
        ? new Date(response.datetime_start)
        : undefined,
      datetime_complete: response.datetime_complete
        ? new Date(response.datetime_complete)
        : undefined,
      params: response.params,
      fixed_params: response.fixed_params,
      user_attrs: response.user_attrs,
      note: response.note,
      artifacts: response.artifacts,
      constraints: response.constraints,
    }
  }
  convertPreferenceHistory(
    response: PreferenceHistoryResponse
  ): PreferenceHistory {
    return {
      id: response.history.id,
      candidates: response.history.candidates,
      clicked: response.history.clicked,
      feedback_mode: response.history.mode,
      timestamp: new Date(response.history.timestamp),
      preferences: response.history.preferences,
      is_removed: response.is_removed,
    }
  }

  abstract getMetaInfo(): Promise<APIMeta>
  abstract getStudyDetail(
    studyId: number,
    nLocalTrials: number
  ): Promise<StudyDetail>
  abstract getStudySummaries(): Promise<StudySummary[]>
  abstract createNewStudy(
    studyName: string,
    directions: Optuna.StudyDirection[]
  ): Promise<StudySummary>
  abstract deleteStudy(
    studyId: number,
    removeAssociatedArtifacts: boolean
  ): Promise<void>
  abstract renameStudy(
    studyId: number,
    studyName: string
  ): Promise<StudySummary>
  abstract saveStudyNote(studyId: number, note: Note): Promise<void>
  abstract saveTrialNote(
    studyId: number,
    trialId: number,
    note: Note
  ): Promise<void>
  abstract uploadTrialArtifact(
    studyId: number,
    trialId: number,
    fileName: string,
    dataUrl: string
  ): Promise<UploadArtifactAPIResponse>
  abstract uploadStudyArtifact(
    studyId: number,
    fileName: string,
    dataUrl: string
  ): Promise<UploadArtifactAPIResponse>
  abstract deleteTrialArtifact(
    studyId: number,
    trialId: number,
    artifactId: string
  ): Promise<void>
  abstract deleteStudyArtifact(
    studyId: number,
    artifactId: string
  ): Promise<void>
  abstract tellTrial(
    trialId: number,
    state: Optuna.TrialStateFinished,
    values?: number[]
  ): Promise<void>
  abstract saveTrialUserAttrs(
    trialId: number,
    user_attrs: { [key: string]: number | string }
  ): Promise<void>
  abstract getParamImportances(
    studyId: number
  ): Promise<Optuna.ParamImportance[][]>
  abstract reportPreference(
    studyId: number,
    candidates: number[],
    clicked: number
  ): Promise<void>
  abstract skipPreferentialTrial(
    studyId: number,
    trialId: number
  ): Promise<void>
  abstract removePreferentialHistory(
    studyId: number,
    historyUuid: string
  ): Promise<void>
  abstract restorePreferentialHistory(
    studyId: number,
    historyUuid: string
  ): Promise<void>
  abstract reportFeedbackComponent(
    studyId: number,
    component_type: FeedbackComponentType
  ): Promise<void>
  abstract getPlot(studyId: number, plotType: PlotType): Promise<PlotResponse>
  abstract getCompareStudiesPlot(
    studyIds: number[],
    plotType: CompareStudiesPlotType
  ): Promise<PlotResponse>
}
