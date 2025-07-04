import * as Optuna from "@optuna/types"
import axios, { AxiosInstance } from "axios"
import {
  APIClient,
  APIMeta,
  CompareStudiesPlotType,
  CreateNewStudyResponse,
  ParamImportancesResponse,
  PlotResponse,
  PlotType,
  RenameStudyResponse,
  StudyDetailResponse,
  StudySummariesResponse,
  UploadArtifactAPIResponse,
} from "./apiClient"
import {
  FeedbackComponentType,
  StudyDetail,
  StudySummary,
  Trial,
} from "./types/optuna"

export class AxiosClient extends APIClient {
  private axiosInstance: AxiosInstance

  constructor(API_ENDPOINT: string | undefined) {
    super()
    this.axiosInstance = axios.create({ baseURL: API_ENDPOINT })
  }

  getMetaInfo = () =>
    this.axiosInstance
      .get<APIMeta>(`/api/meta`)
      .then<APIMeta>((res) => res.data)
  getStudyDetail = (
    studyId: number,
    nLocalTrials: number
  ): Promise<StudyDetail> =>
    this.axiosInstance
      .get<StudyDetailResponse>(`/api/studies/${studyId}`, {
        params: {
          after: nLocalTrials,
        },
      })
      .then((res) => {
        const trials = res.data.trials.map((trial): Trial => {
          return this.convertTrialResponse(trial)
        })
        const best_trials = res.data.best_trials.map((trial): Trial => {
          return this.convertTrialResponse(trial)
        })
        return {
          id: studyId,
          name: res.data.name,
          datetime_start: new Date(res.data.datetime_start),
          directions: res.data.directions,
          user_attrs: res.data.user_attrs,
          trials: trials,
          best_trials: best_trials,
          union_search_space: res.data.union_search_space,
          intersection_search_space: res.data.intersection_search_space,
          union_user_attrs: res.data.union_user_attrs,
          has_intermediate_values: res.data.has_intermediate_values,
          note: res.data.note,
          metric_names: res.data.objective_names,
          form_widgets: res.data.form_widgets,
          is_preferential: res.data.is_preferential,
          feedback_component_type: res.data.feedback_component_type,
          preferences: res.data.preferences,
          preference_history: res.data.preference_history?.map(
            this.convertPreferenceHistory
          ),
          plotly_graph_objects: res.data.plotly_graph_objects,
          artifacts: res.data.artifacts,
          skipped_trial_numbers: res.data.skipped_trial_numbers ?? [],
        }
      })
  getStudySummaries = (): Promise<StudySummary[]> =>
    this.axiosInstance
      .get<StudySummariesResponse>(`/api/studies`, {})
      .then((res) => {
        return res.data.study_summaries.map((study): StudySummary => {
          return {
            study_id: study.study_id,
            study_name: study.study_name,
            directions: study.directions,
            user_attrs: study.user_attrs,
            is_preferential: study.is_preferential,
            datetime_start: study.datetime_start
              ? new Date(study.datetime_start)
              : undefined,
          }
        })
      })
  createNewStudy = (
    studyName: string,
    directions: Optuna.StudyDirection[]
  ): Promise<StudySummary> =>
    this.axiosInstance
      .post<CreateNewStudyResponse>(`/api/studies`, {
        study_name: studyName,
        directions,
      })
      .then((res) => {
        const study_summary = res.data.study_summary
        return {
          study_id: study_summary.study_id,
          study_name: study_summary.study_name,
          directions: study_summary.directions,
          // best_trial: undefined,
          user_attrs: study_summary.user_attrs,
          is_preferential: study_summary.is_preferential,
          datetime_start: study_summary.datetime_start
            ? new Date(study_summary.datetime_start)
            : undefined,
        }
      })
  deleteStudy = (
    studyId: number,
    removeAssociatedArtifacts: boolean
  ): Promise<void> =>
    this.axiosInstance
      .delete(`/api/studies/${studyId}`, {
        data: {
          remove_associated_artifacts: removeAssociatedArtifacts,
        },
      })
      .then(() => {
        return
      })
  renameStudy = (studyId: number, studyName: string): Promise<StudySummary> =>
    this.axiosInstance
      .post<RenameStudyResponse>(`/api/studies/${studyId}/rename`, {
        study_name: studyName,
      })
      .then((res) => {
        return {
          study_id: res.data.study_id,
          study_name: res.data.study_name,
          directions: res.data.directions,
          user_attrs: res.data.user_attrs,
          is_preferential: res.data.is_prefential,
          datetime_start: res.data.datetime_start
            ? new Date(res.data.datetime_start)
            : undefined,
        }
      })
  saveStudyNote = (
    studyId: number,
    note: { version: number; body: string }
  ): Promise<void> =>
    this.axiosInstance
      .put<void>(`/api/studies/${studyId}/note`, note)
      .then(() => {
        return
      })
  saveTrialNote = (
    studyId: number,
    trialId: number,
    note: { version: number; body: string }
  ): Promise<void> =>
    this.axiosInstance
      .put<void>(`/api/studies/${studyId}/${trialId}/note`, note)
      .then(() => {
        return
      })
  uploadTrialArtifact = (
    studyId: number,
    trialId: number,
    fileName: string,
    dataUrl: string
  ): Promise<UploadArtifactAPIResponse> =>
    this.axiosInstance
      .post<UploadArtifactAPIResponse>(`/api/artifacts/${studyId}/${trialId}`, {
        file: dataUrl,
        filename: fileName,
      })
      .then((res) => {
        return res.data
      })
  uploadStudyArtifact = (
    studyId: number,
    fileName: string,
    dataUrl: string
  ): Promise<UploadArtifactAPIResponse> =>
    this.axiosInstance
      .post<UploadArtifactAPIResponse>(`/api/artifacts/${studyId}`, {
        file: dataUrl,
        filename: fileName,
      })
      .then((res) => {
        return res.data
      })
  deleteTrialArtifact = (
    studyId: number,
    trialId: number,
    artifactId: string
  ): Promise<void> =>
    this.axiosInstance
      .delete<void>(`/api/artifacts/${studyId}/${trialId}/${artifactId}`)
      .then(() => {
        return
      })
  deleteStudyArtifact = (studyId: number, artifactId: string): Promise<void> =>
    this.axiosInstance
      .delete<void>(`/api/artifacts/${studyId}/${artifactId}`)
      .then(() => {
        return
      })
  tellTrial = (
    trialId: number,
    state: Optuna.TrialStateFinished,
    values?: number[]
  ): Promise<void> =>
    this.axiosInstance
      .post<void>(`/api/trials/${trialId}/tell`, {
        state,
        values,
      })
      .then(() => {
        return
      })
  saveTrialUserAttrs = (
    trialId: number,
    user_attrs: { [key: string]: number | string }
  ): Promise<void> =>
    this.axiosInstance
      .post<void>(`/api/trials/${trialId}/user-attrs`, { user_attrs })
      .then(() => {
        return
      })
  getParamImportances = (
    studyId: number,
  ): Promise<Optuna.ParamImportance[][]> =>
    this.axiosInstance
      .get<ParamImportancesResponse>(
        `/api/studies/${studyId}/param_importances`
      )
      .then((res) => {
        return res.data.param_importances
      })
  reportPreference = (
    studyId: number,
    candidates: number[],
    clicked: number
  ): Promise<void> =>
    this.axiosInstance
      .post<void>(`/api/studies/${studyId}/preference`, {
        candidates: candidates,
        clicked: clicked,
        mode: "ChooseWorst",
      })
      .then(() => {
        return
      })
  skipPreferentialTrial = (studyId: number, trialId: number): Promise<void> =>
    this.axiosInstance
      .post<void>(`/api/studies/${studyId}/${trialId}/skip`)
      .then(() => {
        return
      })
  removePreferentialHistory = (
    studyId: number,
    historyUuid: string
  ): Promise<void> =>
    this.axiosInstance
      .delete<void>(`/api/studies/${studyId}/preference/${historyUuid}`)
      .then(() => {
        return
      })
  restorePreferentialHistory = (
    studyId: number,
    historyUuid: string
  ): Promise<void> =>
    this.axiosInstance
      .post<void>(`/api/studies/${studyId}/preference/${historyUuid}`)
      .then(() => {
        return
      })
  reportFeedbackComponent = (
    studyId: number,
    component_type: FeedbackComponentType
  ): Promise<void> =>
    this.axiosInstance
      .put<void>(
        `/api/studies/${studyId}/preference_feedback_component`,
        component_type
      )
      .then(() => {
        return
      })
  getPlot = (studyId: number, plotType: PlotType): Promise<PlotResponse> =>
    this.axiosInstance
      .get<PlotResponse>(`/api/studies/${studyId}/plot/${plotType}`)
      .then<PlotResponse>((res) => res.data)
  getCompareStudiesPlot = (
    studyIds: number[],
    plotType: CompareStudiesPlotType
  ): Promise<PlotResponse> =>
    this.axiosInstance
      .get<PlotResponse>(`/api/compare-studies/plot/${plotType}`, {
        params: { study_ids: studyIds },
      })
      .then<PlotResponse>((res) => res.data)
}
