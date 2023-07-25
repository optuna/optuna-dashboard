import axios from "axios"

const axiosInstance = axios.create({ baseURL: API_ENDPOINT })

type APIMeta = {
  artifact_is_available: boolean
}

export const getMetaInfoAPI = (): Promise<APIMeta> => {
  return axiosInstance
    .get<APIMeta>(`/api/meta`)
    .then<APIMeta>((res) => res.data)
}

interface TrialResponse {
  trial_id: number
  study_id: number
  number: number
  state: TrialState
  values?: TrialValueNumber[]
  intermediate_values: TrialIntermediateValue[]
  datetime_start?: string
  datetime_complete?: string
  params: TrialParam[]
  fixed_params: {
    name: string
    param_external_value: string
  }[]
  user_attrs: Attribute[]
  system_attrs: Attribute[]
  note: Note
  artifacts: Artifact[]
  constraints: number[]
}

const convertTrialResponse = (res: TrialResponse): Trial => {
  return {
    trial_id: res.trial_id,
    study_id: res.study_id,
    number: res.number,
    state: res.state,
    values: res.values,
    intermediate_values: res.intermediate_values,
    datetime_start: res.datetime_start
      ? new Date(res.datetime_start)
      : undefined,
    datetime_complete: res.datetime_complete
      ? new Date(res.datetime_complete)
      : undefined,
    params: res.params,
    fixed_params: res.fixed_params,
    user_attrs: res.user_attrs,
    system_attrs: res.system_attrs,
    note: res.note,
    artifacts: res.artifacts,
    constraints: res.constraints,
  }
}

interface StudyDetailResponse {
  name: string
  datetime_start: string
  directions: StudyDirection[]
  trials: TrialResponse[]
  best_trials: TrialResponse[]
  intersection_search_space: SearchSpaceItem[]
  union_search_space: SearchSpaceItem[]
  union_user_attrs: AttributeSpec[]
  has_intermediate_values: boolean
  note: Note
  objective_names?: string[]
  form_widgets?: FormWidgets
}

export const getStudyDetailAPI = (
  studyId: number,
  nLocalTrials: number
): Promise<StudyDetail> => {
  return axiosInstance
    .get<StudyDetailResponse>(`/api/studies/${studyId}`, {
      params: {
        after: nLocalTrials,
      },
    })
    .then((res) => {
      const trials = res.data.trials.map((trial): Trial => {
        return convertTrialResponse(trial)
      })
      const best_trials = res.data.best_trials.map((trial): Trial => {
        return convertTrialResponse(trial)
      })
      return {
        id: studyId,
        name: res.data.name,
        datetime_start: new Date(res.data.datetime_start),
        directions: res.data.directions,
        trials: trials,
        best_trials: best_trials,
        union_search_space: res.data.union_search_space,
        intersection_search_space: res.data.intersection_search_space,
        union_user_attrs: res.data.union_user_attrs,
        has_intermediate_values: res.data.has_intermediate_values,
        note: res.data.note,
        objective_names: res.data.objective_names,
        form_widgets: res.data.form_widgets,
      }
    })
}

interface StudySummariesResponse {
  study_summaries: {
    study_id: number
    study_name: string
    directions: StudyDirection[]
    user_attrs: Attribute[]
    system_attrs: Attribute[]
    datetime_start?: string
  }[]
}

export const getStudySummariesAPI = (): Promise<StudySummary[]> => {
  return axiosInstance
    .get<StudySummariesResponse>(`/api/studies`, {})
    .then((res) => {
      return res.data.study_summaries.map((study): StudySummary => {
        return {
          study_id: study.study_id,
          study_name: study.study_name,
          directions: study.directions,
          user_attrs: study.user_attrs,
          system_attrs: study.system_attrs,
          datetime_start: study.datetime_start
            ? new Date(study.datetime_start)
            : undefined,
        }
      })
    })
}

interface CreateNewStudyResponse {
  study_summary: {
    study_id: number
    study_name: string
    directions: StudyDirection[]
    user_attrs: Attribute[]
    system_attrs: Attribute[]
    datetime_start?: string
  }
}

export const createNewStudyAPI = (
  studyName: string,
  directions: StudyDirection[]
): Promise<StudySummary> => {
  return axiosInstance
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
        system_attrs: study_summary.system_attrs,
        datetime_start: study_summary.datetime_start
          ? new Date(study_summary.datetime_start)
          : undefined,
      }
    })
}

export const deleteStudyAPI = (studyId: number): Promise<void> => {
  return axiosInstance.delete(`/api/studies/${studyId}`).then((res) => {
    return
  })
}

type RenameStudyResponse = {
  study_id: number
  study_name: string
  directions: StudyDirection[]
  user_attrs: Attribute[]
  system_attrs: Attribute[]
  datetime_start?: string
}

export const renameStudyAPI = (
  studyId: number,
  studyName: string
): Promise<StudySummary> => {
  return axiosInstance
    .post<RenameStudyResponse>(`/api/studies/${studyId}/rename`, {
      study_name: studyName,
    })
    .then((res) => {
      return {
        study_id: res.data.study_id,
        study_name: res.data.study_name,
        directions: res.data.directions,
        user_attrs: res.data.user_attrs,
        system_attrs: res.data.system_attrs,
        datetime_start: res.data.datetime_start
          ? new Date(res.data.datetime_start)
          : undefined,
      }
    })
}

export const saveStudyNoteAPI = (
  studyId: number,
  note: { version: number; body: string }
): Promise<void> => {
  return axiosInstance
    .put<void>(`/api/studies/${studyId}/note`, note)
    .then((res) => {
      return
    })
}

export const saveTrialNoteAPI = (
  studyId: number,
  trialId: number,
  note: { version: number; body: string }
): Promise<void> => {
  return axiosInstance
    .put<void>(`/api/studies/${studyId}/${trialId}/note`, note)
    .then((res) => {
      return
    })
}

type UploadArtifactAPIResponse = {
  artifact_id: string
  artifacts: Artifact[]
}

export const uploadArtifactAPI = (
  studyId: number,
  trialId: number,
  fileName: string,
  dataUrl: string
): Promise<UploadArtifactAPIResponse> => {
  return axiosInstance
    .post<UploadArtifactAPIResponse>(`/api/artifacts/${studyId}/${trialId}`, {
      file: dataUrl,
      filename: fileName,
    })
    .then((res) => {
      return res.data
    })
}

export const deleteArtifactAPI = (
  studyId: number,
  trialId: number,
  artifactId: string
): Promise<void> => {
  return axiosInstance
    .delete<void>(`/api/artifacts/${studyId}/${trialId}/${artifactId}`)
    .then((res) => {
      return
    })
}

export const tellTrialAPI = (
  trialId: number,
  state: TrialStateFinished,
  values?: number[]
): Promise<void> => {
  const req: { state: TrialState; values?: number[] } = {
    state: state,
    values: values,
  }

  return axiosInstance
    .post<void>(`/api/trials/${trialId}/tell`, req)
    .then((res) => {
      return
    })
}

export const saveTrialUserAttrsAPI = (
  trialId: number,
  user_attrs: { [key: string]: number | string }
): Promise<void> => {
  const req = { user_attrs: user_attrs }

  return axiosInstance
    .post<void>(`/api/trials/${trialId}/user-attrs`, req)
    .then((res) => {
      return
    })
}

interface ParamImportancesResponse {
  param_importances: ParamImportance[][]
}

export const getParamImportances = (
  studyId: number
): Promise<ParamImportance[][]> => {
  return axiosInstance
    .get<ParamImportancesResponse>(`/api/studies/${studyId}/param_importances`)
    .then((res) => {
      return res.data.param_importances
    })
}
