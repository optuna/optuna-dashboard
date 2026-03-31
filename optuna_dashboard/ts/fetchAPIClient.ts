import * as Optuna from "@optuna/types"
import {
  APIClient,
  APIMeta,
  CompareStudiesPlotType,
  CreateNewStudyResponse,
  FetchAPIClientError,
  GeneratePlotlyGraphQueryRequest,
  GeneratePlotlyGraphQueryResponse,
  ParamImportancesResponse,
  PlotResponse,
  PlotType,
  ReGeneratePlotlyGraphQueryRequest,
  ReGeneratePlotlyGraphQueryResponse,
  RenameStudyResponse,
  StudyDetailResponse,
  StudySummariesResponse,
  TrialFilterQueryRequest,
  TrialFilterQueryResponse,
  UploadArtifactAPIResponse,
} from "./apiClient"
import {
  FeedbackComponentType,
  StudyDetail,
  StudySummary,
  Trial,
} from "./types/optuna"

const JSON_HEADERS = { "Content-Type": "application/json" }

export class FetchAPIClient extends APIClient {
  private baseURL: string

  constructor(apiEndpoint: string | undefined) {
    super()
    this.baseURL = (apiEndpoint ?? "").replace(/\/+$/, "")
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json()

    if (!response.ok) {
      const reason =
        typeof data.reason === "string" ? data.reason : response.statusText
      throw new FetchAPIClientError<{ reason: string }>(
        reason || `Request failed with status ${response.status}`,
        response.status,
        data as { reason: string }
      )
    }

    return data as T
  }

  getMetaInfo = async (): Promise<APIMeta> => {
    const res = await fetch(`${this.baseURL}/api/meta`)
    return this.handleResponse<APIMeta>(res)
  }

  getStudyDetail = async (
    studyId: number,
    nLocalTrials: number
  ): Promise<StudyDetail> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}?after=${nLocalTrials}`
    )
    const data = await this.handleResponse<StudyDetailResponse>(res)
    const trials = data.trials.map((trial): Trial => {
      return this.convertTrialResponse(trial)
    })
    const best_trials = data.best_trials.map((trial): Trial => {
      return this.convertTrialResponse(trial)
    })
    return {
      id: studyId,
      name: data.name,
      datetime_start: new Date(data.datetime_start),
      directions: data.directions,
      user_attrs: data.user_attrs,
      trials: trials,
      best_trials: best_trials,
      union_search_space: data.union_search_space,
      intersection_search_space: data.intersection_search_space,
      union_user_attrs: data.union_user_attrs,
      has_intermediate_values: data.has_intermediate_values,
      note: data.note,
      metric_names: data.objective_names,
      form_widgets: data.form_widgets,
      is_preferential: data.is_preferential,
      feedback_component_type: data.feedback_component_type,
      preferences: data.preferences,
      preference_history: data.preference_history?.map(
        this.convertPreferenceHistory
      ),
      plotly_graph_objects: data.plotly_graph_objects,
      artifacts: data.artifacts,
      skipped_trial_numbers: data.skipped_trial_numbers ?? [],
    }
  }

  getStudySummaries = async (): Promise<StudySummary[]> => {
    const res = await fetch(`${this.baseURL}/api/studies`)
    const data = await this.handleResponse<StudySummariesResponse>(res)
    return data.study_summaries.map(
      (study): StudySummary => ({
        study_id: study.study_id,
        study_name: study.study_name,
        directions: study.directions,
        user_attrs: study.user_attrs,
        is_preferential: study.is_preferential,
        datetime_start: study.datetime_start
          ? new Date(study.datetime_start)
          : undefined,
      })
    )
  }

  createNewStudy = async (
    studyName: string,
    directions: Optuna.StudyDirection[]
  ): Promise<StudySummary> => {
    const res = await fetch(`${this.baseURL}/api/studies`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ study_name: studyName, directions }),
    })
    const data = await this.handleResponse<CreateNewStudyResponse>(res)
    const s = data.study_summary
    return {
      study_id: s.study_id,
      study_name: s.study_name,
      directions: s.directions,
      user_attrs: s.user_attrs,
      is_preferential: s.is_preferential,
      datetime_start: s.datetime_start ? new Date(s.datetime_start) : undefined,
    }
  }

  deleteStudy = async (
    studyId: number,
    removeAssociatedArtifacts: boolean
  ): Promise<void> => {
    const res = await fetch(`${this.baseURL}/api/studies/${studyId}`, {
      method: "DELETE",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        remove_associated_artifacts: removeAssociatedArtifacts,
      }),
    })
    await this.handleResponse<void>(res)
  }

  renameStudy = async (
    studyId: number,
    studyName: string
  ): Promise<StudySummary> => {
    const res = await fetch(`${this.baseURL}/api/studies/${studyId}/rename`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ study_name: studyName }),
    })
    const data = await this.handleResponse<RenameStudyResponse>(res)
    return {
      study_id: data.study_id,
      study_name: data.study_name,
      directions: data.directions,
      user_attrs: data.user_attrs,
      is_preferential: data.is_prefential,
      datetime_start: data.datetime_start
        ? new Date(data.datetime_start)
        : undefined,
    }
  }

  saveStudyNote = async (
    studyId: number,
    note: { version: number; body: string }
  ): Promise<void> => {
    const res = await fetch(`${this.baseURL}/api/studies/${studyId}/note`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(note),
    })
    await this.handleResponse<void>(res)
  }

  saveTrialNote = async (
    studyId: number,
    trialId: number,
    note: { version: number; body: string }
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}/${trialId}/note`,
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify(note),
      }
    )
    await this.handleResponse<void>(res)
  }

  uploadTrialArtifact = async (
    studyId: number,
    trialId: number,
    fileName: string,
    dataUrl: string
  ): Promise<UploadArtifactAPIResponse> => {
    const res = await fetch(
      `${this.baseURL}/api/artifacts/${studyId}/${trialId}`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ file: dataUrl, filename: fileName }),
      }
    )
    return this.handleResponse<UploadArtifactAPIResponse>(res)
  }

  uploadStudyArtifact = async (
    studyId: number,
    fileName: string,
    dataUrl: string
  ): Promise<UploadArtifactAPIResponse> => {
    const res = await fetch(`${this.baseURL}/api/artifacts/${studyId}`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ file: dataUrl, filename: fileName }),
    })
    return this.handleResponse<UploadArtifactAPIResponse>(res)
  }

  deleteTrialArtifact = async (
    studyId: number,
    trialId: number,
    artifactId: string
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/artifacts/${studyId}/${trialId}/${artifactId}`,
      { method: "DELETE" }
    )
    await this.handleResponse<void>(res)
  }

  deleteStudyArtifact = async (
    studyId: number,
    artifactId: string
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/artifacts/${studyId}/${artifactId}`,
      { method: "DELETE" }
    )
    await this.handleResponse<void>(res)
  }

  tellTrial = async (
    trialId: number,
    state: Optuna.TrialStateFinished,
    values?: number[]
  ): Promise<void> => {
    const res = await fetch(`${this.baseURL}/api/trials/${trialId}/tell`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ state, values }),
    })
    await this.handleResponse<void>(res)
  }

  saveTrialUserAttrs = async (
    trialId: number,
    user_attrs: { [key: string]: number | string }
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/trials/${trialId}/user-attrs`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ user_attrs }),
      }
    )
    await this.handleResponse<void>(res)
  }

  getParamImportances = async (
    studyId: number
  ): Promise<Optuna.ParamImportance[][]> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}/param_importances`
    )
    const data = await this.handleResponse<ParamImportancesResponse>(res)
    return data.param_importances
  }

  reportPreference = async (
    studyId: number,
    candidates: number[],
    clicked: number
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}/preference`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          candidates,
          clicked,
          mode: "ChooseWorst",
        }),
      }
    )
    await this.handleResponse<void>(res)
  }

  skipPreferentialTrial = async (
    studyId: number,
    trialId: number
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}/${trialId}/skip`,
      { method: "POST" }
    )
    await this.handleResponse<void>(res)
  }

  removePreferentialHistory = async (
    studyId: number,
    historyUuid: string
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}/preference/${historyUuid}`,
      { method: "DELETE" }
    )
    await this.handleResponse<void>(res)
  }

  restorePreferentialHistory = async (
    studyId: number,
    historyUuid: string
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}/preference/${historyUuid}`,
      { method: "POST" }
    )
    await this.handleResponse<void>(res)
  }

  reportFeedbackComponent = async (
    studyId: number,
    component_type: FeedbackComponentType
  ): Promise<void> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}/preference_feedback_component`,
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify(component_type),
      }
    )
    await this.handleResponse<void>(res)
  }

  getPlot = async (
    studyId: number,
    plotType: PlotType
  ): Promise<PlotResponse> => {
    const res = await fetch(
      `${this.baseURL}/api/studies/${studyId}/plot/${plotType}`
    )
    return this.handleResponse<PlotResponse>(res)
  }

  getCompareStudiesPlot = async (
    studyIds: number[],
    plotType: CompareStudiesPlotType
  ): Promise<PlotResponse> => {
    const params = new URLSearchParams()
    studyIds.forEach((id) => params.append("study_ids", String(id)))
    const res = await fetch(
      `${this.baseURL}/api/compare-studies/plot/${plotType}?${params}`
    )
    return this.handleResponse<PlotResponse>(res)
  }

  callTrialFilterQuery = async (
    request: TrialFilterQueryRequest
  ): Promise<TrialFilterQueryResponse> => {
    const res = await fetch(`${this.baseURL}/api/llm/trial_filter_query`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(request),
    })
    return this.handleResponse<TrialFilterQueryResponse>(res)
  }

  callGeneratePlotlyGraphQuery = async (
    request: GeneratePlotlyGraphQueryRequest
  ): Promise<GeneratePlotlyGraphQueryResponse> => {
    const res = await fetch(
      `${this.baseURL}/api/llm/generate_plotly_graph_query`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(request),
      }
    )
    return this.handleResponse<GeneratePlotlyGraphQueryResponse>(res)
  }

  callReGeneratePlotlyGraphQuery = async (
    request: ReGeneratePlotlyGraphQueryRequest
  ): Promise<ReGeneratePlotlyGraphQueryResponse> => {
    const res = await fetch(
      `${this.baseURL}/api/llm/re_generate_plotly_graph_query`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(request),
      }
    )
    return this.handleResponse<ReGeneratePlotlyGraphQueryResponse>(res)
  }
}
