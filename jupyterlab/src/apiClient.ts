import {
  APIClient,
  APIMeta,
  CompareStudiesPlotType,
  CreateNewStudyResponse,
  FeedbackComponentType,
  ParamImportancesResponse,
  PlotResponse,
  PlotType,
  RenameStudyResponse,
  StudyDetail,
  StudyDetailResponse,
  StudySummariesResponse,
  StudySummary,
  Trial,
  TrialFilterQueryLastResponse,
  TrialFilterQueryResponse,
  UploadArtifactAPIResponse,
} from "@optuna/optuna-dashboard"
import * as Optuna from "@optuna/types"
import { requestAPI } from "./handler"

export class JupyterlabAPIClient extends APIClient {
  // biome-ignore lint/complexity/noUselessConstructor: <explanation>
  constructor() {
    super()
  }

  getMetaInfo = () =>
    requestAPI<APIMeta>("/api/meta").then<APIMeta>((res) => res)
  getStudyDetail = (
    studyId: number,
    nLocalTrials: number
  ): Promise<StudyDetail> =>
    requestAPI<StudyDetailResponse>(
      `/api/studies/${studyId}/?after=${nLocalTrials}`,
      {
        method: "GET",
      }
    ).then((res) => {
      const trials = res.trials.map((trial): Trial => {
        return this.convertTrialResponse(trial)
      })
      const best_trials = res.best_trials.map((trial): Trial => {
        return this.convertTrialResponse(trial)
      })
      return {
        id: studyId,
        name: res.name,
        datetime_start: new Date(res.datetime_start),
        directions: res.directions,
        user_attrs: res.user_attrs,
        trials: trials,
        best_trials: best_trials,
        union_search_space: res.union_search_space,
        intersection_search_space: res.intersection_search_space,
        union_user_attrs: res.union_user_attrs,
        has_intermediate_values: res.has_intermediate_values,
        note: res.note,
        objective_names: res.objective_names,
        form_widgets: res.form_widgets,
        is_preferential: res.is_preferential,
        feedback_component_type: res.feedback_component_type,
        preferences: res.preferences,
        preference_history: res.preference_history?.map(
          this.convertPreferenceHistory
        ),
        plotly_graph_objects: res.plotly_graph_objects,
        artifacts: res.artifacts,
        skipped_trial_numbers: res.skipped_trial_numbers ?? [],
      }
    })
  getStudySummaries = (): Promise<StudySummary[]> =>
    requestAPI<StudySummariesResponse>("/api/studies").then((res) => {
      return res.study_summaries.map((study): StudySummary => {
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
    requestAPI<CreateNewStudyResponse>("/api/studies", {
      body: JSON.stringify({
        study_name: studyName,
        directions,
      }),
      method: "POST",
    }).then((res) => {
      const study_summary = res.study_summary
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
    requestAPI<void>(`/api/studies/${studyId}`, {
      method: "DELETE",
      body: JSON.stringify({
        remove_associated_artifacts: removeAssociatedArtifacts,
      }),
    }).then(() => {
      return
    })
  renameStudy = (studyId: number, studyName: string): Promise<StudySummary> =>
    requestAPI<RenameStudyResponse>(`/api/studies/${studyId}/rename`, {
      body: JSON.stringify({ study_name: studyName }),
      method: "POST",
    }).then((res) => {
      return {
        study_id: res.study_id,
        study_name: res.study_name,
        directions: res.directions,
        user_attrs: res.user_attrs,
        is_preferential: res.is_prefential,
        datetime_start: res.datetime_start
          ? new Date(res.datetime_start)
          : undefined,
      }
    })
  saveStudyNote = (
    studyId: number,
    note: { version: number; body: string }
  ): Promise<void> =>
    requestAPI<void>(`/api/studies/${studyId}/note`, {
      body: JSON.stringify(note),
      method: "PUT",
    }).then(() => {
      return
    })
  saveTrialNote = (
    studyId: number,
    trialId: number,
    note: { version: number; body: string }
  ): Promise<void> =>
    requestAPI<void>(`/api/studies/${studyId}/${trialId}/note`, {
      body: JSON.stringify(note),
      method: "PUT",
    }).then(() => {
      return
    })
  uploadTrialArtifact = (
    studyId: number,
    trialId: number,
    fileName: string,
    dataUrl: string
  ): Promise<UploadArtifactAPIResponse> =>
    requestAPI<UploadArtifactAPIResponse>(
      `/api/artifacts/${studyId}/${trialId}`,
      {
        body: JSON.stringify({
          file: dataUrl,
          filename: fileName,
        }),
        method: "POST",
      }
    ).then((res) => {
      return res
    })
  uploadStudyArtifact = (
    studyId: number,
    fileName: string,
    dataUrl: string
  ): Promise<UploadArtifactAPIResponse> =>
    requestAPI<UploadArtifactAPIResponse>(`/api/artifacts/${studyId}`, {
      body: JSON.stringify({
        file: dataUrl,
        filename: fileName,
      }),
      method: "POST",
    }).then((res) => {
      return res
    })
  deleteTrialArtifact = (
    studyId: number,
    trialId: number,
    artifactId: string
  ): Promise<void> =>
    requestAPI<void>(`/api/artifacts/${studyId}/${trialId}/${artifactId}`, {
      method: "DELETE",
    }).then(() => {
      return
    })
  deleteStudyArtifact = (studyId: number, artifactId: string): Promise<void> =>
    requestAPI<void>(`/api/artifacts/${studyId}/${artifactId}`, {
      method: "DELETE",
    }).then(() => {
      return
    })
  tellTrial = async (
    trialId: number,
    state: Optuna.TrialStateFinished,
    values?: number[]
  ): Promise<void> => {
    const req: { state: Optuna.TrialState; values?: number[] } = {
      state: state,
      values: values,
    }

    await requestAPI<void>(`/api/trials/${trialId}/tell`, {
      body: JSON.stringify(req),
      method: "POST",
    })
  }
  saveTrialUserAttrs = async (
    trialId: number,
    user_attrs: { [key: string]: number | string }
  ): Promise<void> => {
    const req = { user_attrs: user_attrs }

    await requestAPI<void>(`/api/trials/${trialId}/user-attrs`, {
      body: JSON.stringify(req),
      method: "POST",
    })
    return
  }
  getParamImportances = (
    studyId: number
  ): Promise<Optuna.ParamImportance[][]> =>
    requestAPI<ParamImportancesResponse>(
      `/api/studies/${studyId}/param_importances`
    ).then((res) => {
      return res.param_importances
    })
  reportPreference = (
    studyId: number,
    candidates: number[],
    clicked: number
  ): Promise<void> =>
    requestAPI<void>(`/api/studies/${studyId}/preference`, {
      body: JSON.stringify({
        candidates: candidates,
        clicked: clicked,
        mode: "ChooseWorst",
      }),
      method: "POST",
    }).then(() => {
      return
    })
  skipPreferentialTrial = (studyId: number, trialId: number): Promise<void> =>
    requestAPI<void>(`/api/studies/${studyId}/${trialId}/skip`, {
      method: "POST",
    }).then(() => {
      return
    })
  removePreferentialHistory = (
    studyId: number,
    historyUuid: string
  ): Promise<void> =>
    requestAPI<void>(`/api/studies/${studyId}/preference/${historyUuid}`, {
      method: "DELETE",
    }).then(() => {
      return
    })
  restorePreferentialHistory = (
    studyId: number,
    historyUuid: string
  ): Promise<void> =>
    requestAPI<void>(`/api/studies/${studyId}/preference/${historyUuid}`, {
      method: "POST",
    }).then(() => {
      return
    })
  reportFeedbackComponent = (
    studyId: number,
    component_type: FeedbackComponentType
  ): Promise<void> =>
    requestAPI<void>(`/api/studies/${studyId}/preference_feedback_component`, {
      body: JSON.stringify({ component_type: component_type }),
      method: "POST",
    }).then(() => {
      return
    })
  getPlot = (studyId: number, plotType: PlotType): Promise<PlotResponse> =>
    requestAPI<PlotResponse>(
      `/api/studies/${studyId}/plot/${plotType}`
    ).then<PlotResponse>((res) => res)
  getCompareStudiesPlot = (
    studyIds: number[],
    plotType: CompareStudiesPlotType
  ): Promise<PlotResponse> => {
    return requestAPI<PlotResponse>(`/api/compare-studies/plot/${plotType}`, {
      body: JSON.stringify({ study_ids: studyIds }),
    }).then<PlotResponse>((res) => res)
  }
  callTrialFilterQuery(
    user_query: string,
    last_response?: TrialFilterQueryLastResponse
  ): Promise<TrialFilterQueryResponse> {
    throw new Error(
      "Trial filter query is not implemented in JupyterLab API client."
    )
  }
}
