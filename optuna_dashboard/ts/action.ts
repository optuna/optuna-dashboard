import { useRecoilState, useSetRecoilState } from "recoil"
import { useSnackbar } from "notistack"
import {
  getStudyDetailAPI,
  getStudySummariesAPI,
  getParamImportances,
  createNewStudyAPI,
  deleteStudyAPI,
  saveStudyNoteAPI,
  saveTrialNoteAPI,
  renameStudyAPI,
  uploadArtifactAPI,
} from "./apiClient"
import {
  graphVisibilityState,
  studyDetailsState,
  studySummariesState,
  paramImportanceState,
  isFileUploading,
} from "./state"

const localStorageGraphVisibility = "graphVisibility"

export const actionCreator = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [studySummaries, setStudySummaries] =
    useRecoilState<StudySummary[]>(studySummariesState)
  const [studyDetails, setStudyDetails] =
    useRecoilState<StudyDetails>(studyDetailsState)
  const [graphVisibility, setGraphVisibility] =
    useRecoilState<GraphVisibility>(graphVisibilityState)
  const [paramImportance, setParamImportance] =
    useRecoilState<StudyParamImportance>(paramImportanceState)
  const setUploading = useSetRecoilState<boolean>(isFileUploading)

  const setStudyDetailState = (studyId: number, study: StudyDetail) => {
    const newVal = Object.assign({}, studyDetails)
    newVal[studyId] = study
    setStudyDetails(newVal)
  }

  const setTrialNote = (studyId: number, index: number, note: Note) => {
    const newTrial: Trial = Object.assign(
      {},
      studyDetails[studyId].trials[index]
    )
    newTrial.note = note
    const newTrials: Trial[] = [...studyDetails[studyId].trials]
    newTrials[index] = newTrial
    const newStudy: StudyDetail = Object.assign({}, studyDetails[studyId])
    newStudy.trials = newTrials
    setStudyDetailState(studyId, newStudy)
  }

  const setStudyParamImportanceState = (
    studyId: number,
    importance: ParamImportance[][]
  ) => {
    const newVal = Object.assign({}, paramImportance)
    newVal[studyId] = importance
    setParamImportance(newVal)
  }

  const updateStudySummaries = (successMsg?: string) => {
    getStudySummariesAPI()
      .then((studySummaries: StudySummary[]) => {
        setStudySummaries(studySummaries)

        if (successMsg) {
          enqueueSnackbar(successMsg, { variant: "success" })
        }
      })
      .catch((err) => {
        enqueueSnackbar(`Failed to fetch study list.`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  const updateStudyDetail = (studyId: number) => {
    let nLocalFixedTrials = 0
    if (studyId in studyDetails) {
      const currentTrials = studyDetails[studyId].trials
      const firstUpdatable = currentTrials.findIndex((trial) =>
        ["Running", "Waiting"].includes(trial.state)
      )
      nLocalFixedTrials =
        firstUpdatable === -1 ? currentTrials.length : firstUpdatable
    }
    getStudyDetailAPI(studyId, nLocalFixedTrials)
      .then((study) => {
        const currentFixedTrials =
          studyId in studyDetails
            ? studyDetails[studyId].trials.slice(0, nLocalFixedTrials)
            : []
        study.trials = currentFixedTrials.concat(study.trials)
        setStudyDetailState(studyId, study)
      })
      .catch((err) => {
        const reason = err.response?.data.reason
        if (reason !== undefined) {
          enqueueSnackbar(`Failed to fetch study (reason=${reason})`, {
            variant: "error",
          })
        }
        console.log(err)
      })
  }

  const updateParamImportance = (studyId: number) => {
    getParamImportances(studyId)
      .then((importance) => {
        setStudyParamImportanceState(studyId, importance)
      })
      .catch((err) => {
        const reason = err.response?.data.reason
        enqueueSnackbar(
          `Failed to load hyperparameter importance (reason=${reason})`,
          {
            variant: "error",
          }
        )
      })
  }

  const createNewStudy = (studyName: string, directions: StudyDirection[]) => {
    createNewStudyAPI(studyName, directions)
      .then((study_summary) => {
        const newVal = [...studySummaries, study_summary]
        setStudySummaries(newVal)
        enqueueSnackbar(`Success to create a study (study_name=${studyName})`, {
          variant: "success",
        })
      })
      .catch((err) => {
        enqueueSnackbar(`Failed to create a study (study_name=${studyName})`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  const deleteStudy = (studyId: number) => {
    deleteStudyAPI(studyId)
      .then(() => {
        setStudySummaries(studySummaries.filter((s) => s.study_id !== studyId))
        enqueueSnackbar(`Success to delete a study (id=${studyId})`, {
          variant: "success",
        })
      })
      .catch((err) => {
        enqueueSnackbar(`Failed to delete study (id=${studyId})`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  const renameStudy = (studyId: number, studyName: string) => {
    renameStudyAPI(studyId, studyName)
      .then((study) => {
        const newStudySummaries = [
          ...studySummaries.filter((s) => s.study_id !== studyId),
          study,
        ]
        setStudySummaries(newStudySummaries)
        enqueueSnackbar(`Success to delete a study (id=${studyId})`, {
          variant: "success",
        })
      })
      .catch((err) => {
        enqueueSnackbar(`Failed to rename study (id=${studyId})`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  const getGraphVisibility = () => {
    const localStoragePreferences = localStorage.getItem(
      localStorageGraphVisibility
    )
    if (localStoragePreferences !== null) {
      const merged = {
        ...graphVisibility,
        ...JSON.parse(localStoragePreferences),
      }
      setGraphVisibility(merged)
    }
  }

  const saveGraphVisibility = (value: GraphVisibility) => {
    setGraphVisibility(value)
    localStorage.setItem(localStorageGraphVisibility, JSON.stringify(value))
  }

  const saveStudyNote = (studyId: number, note: Note): Promise<void> => {
    return saveStudyNoteAPI(studyId, note)
      .then(() => {
        const newStudy = Object.assign({}, studyDetails[studyId])
        newStudy.note = note
        setStudyDetailState(studyId, newStudy)
        enqueueSnackbar(`Success to save the note`, {
          variant: "success",
        })
      })
      .catch((err) => {
        if (err.response.status === 409) {
          const newStudy = Object.assign({}, studyDetails[studyId])
          newStudy.note = err.response.data.note
          setStudyDetailState(studyId, newStudy)
        }
        const reason = err.response?.data.reason
        if (reason !== undefined) {
          enqueueSnackbar(`Failed: ${reason}`, {
            variant: "error",
          })
        }
        throw err
      })
  }

  const saveTrialNote = (
    studyId: number,
    trialId: number,
    note: Note
  ): Promise<void> => {
    return saveTrialNoteAPI(studyId, trialId, note)
      .then(() => {
        const index = studyDetails[studyId].trials.findIndex(
          (t) => t.trial_id === trialId
        )
        if (index === -1) {
          enqueueSnackbar(`Unexpected error happens. Please reload the page.`, {
            variant: "error",
          })
          return
        }
        setTrialNote(studyId, index, note)
        enqueueSnackbar(`Success to save the note`, {
          variant: "success",
        })
      })
      .catch((err) => {
        if (err.response.status === 409) {
          const index = studyDetails[studyId].trials.findIndex(
            (t) => t.trial_id === trialId
          )
          if (index === -1) {
            enqueueSnackbar(
              `Unexpected error happens. Please reload the page.`,
              {
                variant: "error",
              }
            )
            return
          }
          setTrialNote(studyId, index, err.response.data.note)
        }
        const reason = err.response?.data.reason
        if (reason !== undefined) {
          enqueueSnackbar(`Failed: ${reason}`, {
            variant: "error",
          })
        }
        throw err
      })
  }

  const uploadArtifact = (
    studyId: number,
    trialId: number,
    file: File
  ): void => {
    const reader = new FileReader()
    setUploading(true)
    reader.readAsDataURL(file)
    reader.onload = (upload: any) => {
      uploadArtifactAPI(studyId, trialId, file.name, upload.target.result)
        .then((artifact) => {
          setUploading(false)
          // TODO: update global state
          console.dir(artifact)
        })
        .catch((err) => {
          setUploading(false)
          const reason = err.response?.data.reason
          enqueueSnackbar(`Failed to upload ${reason}`, { variant: "error" })
        })
    }
    reader.onerror = (error) => {
      enqueueSnackbar(`Failed to read the file ${error}`, { variant: "error" })
      console.log(error)
    }
  }

  return {
    updateStudyDetail,
    updateStudySummaries,
    updateParamImportance,
    createNewStudy,
    deleteStudy,
    renameStudy,
    getGraphVisibility,
    saveGraphVisibility,
    saveStudyNote,
    saveTrialNote,
    uploadArtifact,
  }
}

export type Action = ReturnType<typeof actionCreator>
