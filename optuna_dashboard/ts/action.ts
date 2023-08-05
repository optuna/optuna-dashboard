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
  tellTrialAPI,
  saveTrialUserAttrsAPI,
  renameStudyAPI,
  uploadArtifactAPI,
  getMetaInfoAPI,
  deleteArtifactAPI,
} from "./apiClient"
import {
  graphVisibilityState,
  studyDetailsState,
  studySummariesState,
  paramImportanceState,
  isFileUploading,
  artifactIsAvailable,
  reloadIntervalState,
  trialsUpdatingState,
} from "./state"
import { getDominatedTrials } from "./dominatedTrials"

const localStorageGraphVisibility = "graphVisibility"
const localStorageReloadInterval = "reloadInterval"

type LocalStorageReloadInterval = {
  reloadInterval?: number
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const actionCreator = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [studySummaries, setStudySummaries] =
    useRecoilState<StudySummary[]>(studySummariesState)
  const [studyDetails, setStudyDetails] =
    useRecoilState<StudyDetails>(studyDetailsState)
  const [graphVisibility, setGraphVisibility] =
    useRecoilState<GraphVisibility>(graphVisibilityState)
  const setReloadInterval = useSetRecoilState<number>(reloadIntervalState)
  const [paramImportance, setParamImportance] =
    useRecoilState<StudyParamImportance>(paramImportanceState)
  const setUploading = useSetRecoilState<boolean>(isFileUploading)
  const setTrialsUpdating = useSetRecoilState(trialsUpdatingState)
  const setArtifactIsAvailable = useSetRecoilState<boolean>(artifactIsAvailable)

  const setStudyDetailState = (studyId: number, study: StudyDetail) => {
    setStudyDetails((prevVal) => {
      const newVal = Object.assign({}, prevVal)
      newVal[studyId] = study
      return newVal
    })
  }

  const setTrial = (studyId: number, trialIndex: number, trial: Trial) => {
    const newTrials: Trial[] = [...studyDetails[studyId].trials]
    newTrials[trialIndex] = trial
    const newStudy: StudyDetail = Object.assign({}, studyDetails[studyId])
    newStudy.trials = newTrials
    setStudyDetailState(studyId, newStudy)
  }
  const setTrialUpdating = (trialId: number, updating: boolean) => {
    setTrialsUpdating((prev) => {
      const newVal = Object.assign({}, prev)
      newVal[trialId] = updating
      return newVal
    })
  }

  const setTrialNote = (studyId: number, index: number, note: Note) => {
    const newTrial: Trial = Object.assign(
      {},
      studyDetails[studyId].trials[index]
    )
    newTrial.note = note
    setTrial(studyId, index, newTrial)
  }

  const setTrialArtifacts = (
    studyId: number,
    trialIndex: number,
    artifacts: Artifact[]
  ) => {
    const newTrial: Trial = Object.assign(
      {},
      studyDetails[studyId].trials[trialIndex]
    )
    newTrial.artifacts = artifacts
    setTrial(studyId, trialIndex, newTrial)
  }

  const deleteTrialArtifact = (
    studyId: number,
    trialId: number,
    artifact_id: string
  ) => {
    const index = studyDetails[studyId].trials.findIndex(
      (t) => t.trial_id === trialId
    )
    if (index === -1) {
      return
    }
    const artifacts = studyDetails[studyId].trials[index].artifacts
    const artifactIndex = artifacts.findIndex(
      (a) => a.artifact_id === artifact_id
    )
    const newArtifacts = [
      ...artifacts.slice(0, artifactIndex),
      ...artifacts.slice(artifactIndex + 1, artifacts.length),
    ]
    setTrialArtifacts(studyId, index, newArtifacts)
  }

  const setTrialStateValues = (
    studyId: number,
    index: number,
    state: TrialState,
    values?: TrialValueNumber[]
  ) => {
    const newTrial: Trial = Object.assign(
      {},
      studyDetails[studyId].trials[index]
    )
    newTrial.state = state
    newTrial.values = values
    const newTrials: Trial[] = [...studyDetails[studyId].trials]
    newTrials[index] = newTrial
    const newStudy: StudyDetail = Object.assign({}, studyDetails[studyId])
    newStudy.trials = newTrials

    // Update Best Trials
    if (state === "Complete" && newStudy.directions.length === 1) {
      // Single objective optimization
      const bestValue = newStudy.best_trials.at(0)?.values?.at(0)
      const currentValue = values?.at(0)
      if (newStudy.best_trials.length === 0) {
        newStudy.best_trials = [newTrial]
      } else if (bestValue !== undefined && currentValue !== undefined) {
        if (newStudy.directions[0] === "minimize" && currentValue < bestValue) {
          newStudy.best_trials = [newTrial]
        } else if (
          newStudy.directions[0] === "maximize" &&
          currentValue > bestValue
        ) {
          newStudy.best_trials = [newTrial]
        } else if (currentValue == bestValue) {
          newStudy.best_trials = [...newStudy.best_trials, newTrial]
        }
      }
    } else if (state === "Complete") {
      // Multi objective optimization
      newStudy.best_trials = getDominatedTrials(
        newStudy.trials,
        newStudy.directions
      )
    }

    setStudyDetailState(studyId, newStudy)
  }

  const setTrialUserAttrs = (
    studyId: number,
    index: number,
    user_attrs: { [key: string]: number | string }
  ) => {
    const newTrial: Trial = Object.assign(
      {},
      studyDetails[studyId].trials[index]
    )
    newTrial.user_attrs = Object.keys(user_attrs).map((key) => ({
      key: key,
      value: user_attrs[key].toString(),
    }))
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

  const updateAPIMeta = () => {
    getMetaInfoAPI().then((r) => {
      setArtifactIsAvailable(r.artifact_is_available)
    })
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

  const loadReloadInterval = () => {
    const reloadIntervalJSON = localStorage.getItem(localStorageReloadInterval)
    if (reloadIntervalJSON === null) {
      return
    }
    const gp = JSON.parse(reloadIntervalJSON) as LocalStorageReloadInterval
    if (gp.reloadInterval !== undefined) {
      setReloadInterval(gp.reloadInterval)
    }
  }

  const saveReloadInterval = (interval: number) => {
    setReloadInterval(interval)
    const value: LocalStorageReloadInterval = {
      reloadInterval: interval,
    }
    localStorage.setItem(localStorageReloadInterval, JSON.stringify(value))
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
    reader.onload = (upload: ProgressEvent<FileReader>) => {
      uploadArtifactAPI(
        studyId,
        trialId,
        file.name,
        upload.target?.result as string
      )
        .then((res) => {
          setUploading(false)
          const index = studyDetails[studyId].trials.findIndex(
            (t) => t.trial_id === trialId
          )
          if (index === -1) {
            return
          }
          setTrialArtifacts(studyId, index, res.artifacts)
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

  const deleteArtifact = (
    studyId: number,
    trialId: number,
    artifactId: string
  ): void => {
    deleteArtifactAPI(studyId, trialId, artifactId)
      .then(() => {
        deleteTrialArtifact(studyId, trialId, artifactId)
        enqueueSnackbar(`Success to delete an artifact.`, {
          variant: "success",
        })
      })
      .catch((err) => {
        const reason = err.response?.data.reason
        enqueueSnackbar(`Failed to delete ${reason}.`, {
          variant: "error",
        })
      })
  }

  const makeTrialFail = (studyId: number, trialId: number): void => {
    const message = `id=${trialId}, state=Fail`
    setTrialUpdating(trialId, true)
    tellTrialAPI(trialId, "Fail")
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
        setTrialStateValues(studyId, index, "Fail")
        enqueueSnackbar(`Successfully updated trial (${message})`, {
          variant: "success",
        })
      })
      .catch((err) => {
        setTrialUpdating(trialId, false)
        const reason = err.response?.data.reason
        enqueueSnackbar(
          `Failed to update trial (${message}). Reason: ${reason}`,
          {
            variant: "error",
          }
        )
        console.log(err)
      })
  }

  const makeTrialComplete = (
    studyId: number,
    trialId: number,
    values: number[]
  ): void => {
    const message = `id=${trialId}, state=Complete, values=${values}`
    setTrialUpdating(trialId, true)
    tellTrialAPI(trialId, "Complete", values)
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
        setTrialStateValues(studyId, index, "Complete", values)
      })
      .catch((err) => {
        setTrialUpdating(trialId, false)
        const reason = err.response?.data.reason
        enqueueSnackbar(
          `Failed to update trial (${message}). Reason: ${reason}`,
          {
            variant: "error",
          }
        )
        console.log(err)
      })
  }

  const saveTrialUserAttrs = (
    studyId: number,
    trialId: number,
    user_attrs: { [key: string]: string | number }
  ): void => {
    const message = `id=${trialId}, user_attrs=${JSON.stringify(user_attrs)}`
    setTrialUpdating(trialId, true)
    saveTrialUserAttrsAPI(trialId, user_attrs)
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
        setTrialUserAttrs(studyId, index, user_attrs)
        enqueueSnackbar(`Successfully updated trial (${message})`, {
          variant: "success",
        })
      })
      .catch((err) => {
        setTrialUpdating(trialId, false)
        const reason = err.response?.data.reason
        enqueueSnackbar(
          `Failed to update trial (${message}). Reason: ${reason}`,
          {
            variant: "error",
          }
        )
        console.log(err)
      })
  }
  return {
    updateAPIMeta,
    updateStudyDetail,
    updateStudySummaries,
    updateParamImportance,
    createNewStudy,
    deleteStudy,
    renameStudy,
    getGraphVisibility,
    saveGraphVisibility,
    loadReloadInterval,
    saveReloadInterval,
    saveStudyNote,
    saveTrialNote,
    uploadArtifact,
    deleteArtifact,
    makeTrialComplete,
    makeTrialFail,
    saveTrialUserAttrs,
  }
}

export type Action = ReturnType<typeof actionCreator>
