import * as Optuna from "@optuna/types"
import { useAtom, useSetAtom } from "jotai"
import { useSnackbar } from "notistack"
import { useAPIClient } from "./apiClientProvider"
import { getDominatedTrials } from "./dominatedTrials"
import {
  isFileUploading,
  reloadIntervalState,
  studyDetailLoadingState,
  studyDetailsState,
  studySummariesLoadingState,
  studySummariesState,
  trialsUpdatingState,
} from "./state"
import {
  Artifact,
  FeedbackComponentType,
  Note,
  StudyDetail,
  StudySummary,
  Trial,
} from "./types/optuna"

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const actionCreator = () => {
  const { apiClient } = useAPIClient()
  const { enqueueSnackbar } = useSnackbar()
  const [studySummaries, setStudySummaries] = useAtom(studySummariesState)
  const [studyDetails, setStudyDetails] = useAtom(studyDetailsState)
  const setReloadInterval = useSetAtom(reloadIntervalState)
  const setUploading = useSetAtom(isFileUploading)
  const setTrialsUpdating = useSetAtom(trialsUpdatingState)
  const setStudySummariesLoading = useSetAtom(studySummariesLoadingState)
  const [studyDetailLoading, setStudyDetailLoading] = useAtom(
    studyDetailLoadingState
  )

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

  const setStudyArtifacts = (studyId: number, artifacts: Artifact[]) => {
    const newStudy: StudyDetail = Object.assign({}, studyDetails[studyId])
    newStudy.artifacts = artifacts
    setStudyDetailState(studyId, newStudy)
  }

  const deleteTrialArtifactState = (
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

  const deleteStudyArtifactState = (studyId: number, artifact_id: string) => {
    const artifacts = studyDetails[studyId].artifacts
    const artifactIndex = artifacts.findIndex(
      (a) => a.artifact_id === artifact_id
    )
    const newArtifacts = [
      ...artifacts.slice(0, artifactIndex),
      ...artifacts.slice(artifactIndex + 1, artifacts.length),
    ]
    setStudyArtifacts(studyId, newArtifacts)
  }

  const setTrialStateValues = (
    studyId: number,
    index: number,
    state: Optuna.TrialState,
    values?: number[]
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
        } else if (currentValue === bestValue) {
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

  const updateStudySummaries = (successMsg?: string) => {
    setStudySummariesLoading(true)
    apiClient
      .getStudySummaries()
      .then((studySummaries: StudySummary[]) => {
        setStudySummariesLoading(false)
        setStudySummaries(studySummaries)

        if (successMsg) {
          enqueueSnackbar(successMsg, { variant: "success" })
        }
      })
      .catch((err) => {
        setStudySummariesLoading(false)
        enqueueSnackbar(`Failed to fetch study list.`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  const updateStudyDetail = (studyId: number) => {
    if (studyDetailLoading[studyId]) {
      return
    }
    setStudyDetailLoading({ ...studyDetailLoading, [studyId]: true })
    let nLocalFixedTrials = 0
    if (studyId in studyDetails) {
      const currentTrials = studyDetails[studyId].trials
      const firstUpdatable = currentTrials.findIndex((trial) =>
        ["Running", "Waiting"].includes(trial.state)
      )
      nLocalFixedTrials =
        firstUpdatable === -1 ? currentTrials.length : firstUpdatable
    }
    apiClient
      .getStudyDetail(studyId, nLocalFixedTrials)
      .then((study) => {
        setStudyDetailLoading({ ...studyDetailLoading, [studyId]: false })
        const currentFixedTrials =
          studyId in studyDetails
            ? studyDetails[studyId].trials.slice(0, nLocalFixedTrials)
            : []
        study.trials = currentFixedTrials.concat(study.trials)
        setStudyDetailState(studyId, study)
      })
      .catch((err) => {
        setStudyDetailLoading({ ...studyDetailLoading, [studyId]: false })
        const reason = err.response?.data.reason
        if (reason !== undefined) {
          enqueueSnackbar(`Failed to fetch study (reason=${reason})`, {
            variant: "error",
          })
        }
        console.log(err)
      })
  }

  const createNewStudy = (
    studyName: string,
    directions: Optuna.StudyDirection[]
  ) => {
    apiClient
      .createNewStudy(studyName, directions)
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

  const deleteStudy = (studyId: number, removeAssociatedArtifacts: boolean) => {
    apiClient
      .deleteStudy(studyId, removeAssociatedArtifacts)
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
    apiClient
      .renameStudy(studyId, studyName)
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

  const saveReloadInterval = (interval: number) => {
    setReloadInterval(interval)
  }

  const saveStudyNote = (studyId: number, note: Note): Promise<void> => {
    return apiClient
      .saveStudyNote(studyId, note)
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
    return apiClient
      .saveTrialNote(studyId, trialId, note)
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

  const uploadTrialArtifact = (
    studyId: number,
    trialId: number,
    file: File
  ): void => {
    const reader = new FileReader()
    setUploading(true)
    reader.readAsDataURL(file)
    reader.onload = (upload: ProgressEvent<FileReader>) => {
      apiClient
        .uploadTrialArtifact(
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

  const uploadStudyArtifact = (studyId: number, file: File): void => {
    const reader = new FileReader()
    setUploading(true)
    reader.readAsDataURL(file)
    reader.onload = (upload: ProgressEvent<FileReader>) => {
      apiClient
        .uploadStudyArtifact(
          studyId,
          file.name,
          upload.target?.result as string
        )
        .then((res) => {
          setUploading(false)
          setStudyArtifacts(studyId, res.artifacts)
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

  const deleteTrialArtifact = (
    studyId: number,
    trialId: number,
    artifactId: string
  ): void => {
    apiClient
      .deleteTrialArtifact(studyId, trialId, artifactId)
      .then(() => {
        deleteTrialArtifactState(studyId, trialId, artifactId)
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

  const deleteStudyArtifact = (studyId: number, artifactId: string): void => {
    apiClient
      .deleteStudyArtifact(studyId, artifactId)
      .then(() => {
        deleteStudyArtifactState(studyId, artifactId)
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
    apiClient
      .tellTrial(trialId, "Fail")
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
    apiClient
      .tellTrial(trialId, "Complete", values)
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
    apiClient
      .saveTrialUserAttrs(trialId, user_attrs)
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

  const updatePreference = (
    studyId: number,
    candidates: number[],
    clicked: number
  ) => {
    apiClient.reportPreference(studyId, candidates, clicked).catch((err) => {
      const reason = err.response?.data.reason
      enqueueSnackbar(`Failed to report preference. Reason: ${reason}`, {
        variant: "error",
      })
      console.log(err)
    })
  }

  const skipPreferentialTrial = (studyId: number, trialId: number) => {
    apiClient.skipPreferentialTrial(studyId, trialId).catch((err) => {
      const reason = err.response?.data.reason
      enqueueSnackbar(`Failed to skip trial. Reason: ${reason}`, {
        variant: "error",
      })
      console.log(err)
    })
  }
  const updateFeedbackComponent = (
    studyId: number,
    compoennt_type: FeedbackComponentType
  ) => {
    apiClient
      .reportFeedbackComponent(studyId, compoennt_type)
      .then(() => {
        const newStudy = Object.assign({}, studyDetails[studyId])
        newStudy.feedback_component_type = compoennt_type
        setStudyDetailState(studyId, newStudy)
      })
      .catch((err) => {
        const reason = err.response?.data.reason
        enqueueSnackbar(
          `Failed to report feedback component. Reason: ${reason}`,
          {
            variant: "error",
          }
        )
        console.log(err)
      })
  }

  const removePreferentialHistory = (studyId: number, historyId: string) => {
    apiClient
      .removePreferentialHistory(studyId, historyId)
      .then(() => {
        const newStudy = Object.assign({}, studyDetails[studyId])
        newStudy.preference_history = newStudy.preference_history?.map((h) =>
          h.id === historyId ? { ...h, is_removed: true } : h
        )
        const removed = newStudy.preference_history
          ?.filter((h) => h.id === historyId)
          .pop()?.preferences
        newStudy.preferences = newStudy.preferences?.filter(
          (p) => !removed?.some((r) => r[0] === p[0] && r[1] === p[1])
        )
        setStudyDetailState(studyId, newStudy)
      })
      .catch((err) => {
        const reason = err.response?.data.reason

        enqueueSnackbar(`Failed to switch history. Reason: ${reason}`, {
          variant: "error",
        })
        console.log(err)
      })
  }
  const restorePreferentialHistory = (studyId: number, historyId: string) => {
    apiClient
      .restorePreferentialHistory(studyId, historyId)
      .then(() => {
        const newStudy = Object.assign({}, studyDetails[studyId])
        newStudy.preference_history = newStudy.preference_history?.map((h) =>
          h.id === historyId ? { ...h, is_removed: false } : h
        )
        const restored = newStudy.preference_history
          ?.filter((h) => h.id === historyId)
          .pop()?.preferences
        newStudy.preferences = newStudy.preferences?.concat(restored ?? [])
        setStudyDetailState(studyId, newStudy)
      })
      .catch((err) => {
        const reason = err.response?.data.reason
        enqueueSnackbar(`Failed to switch history. Reason: ${reason}`, {
          variant: "error",
        })
        console.log(err)
      })
  }

  return {
    updateStudyDetail,
    updateStudySummaries,
    createNewStudy,
    deleteStudy,
    renameStudy,
    saveReloadInterval,
    saveStudyNote,
    saveTrialNote,
    uploadTrialArtifact,
    uploadStudyArtifact,
    deleteTrialArtifact,
    deleteStudyArtifact,
    makeTrialComplete,
    makeTrialFail,
    saveTrialUserAttrs,
    updatePreference,
    skipPreferentialTrial,
    removePreferentialHistory,
    restorePreferentialHistory,
    updateFeedbackComponent,
  }
}

export type Action = ReturnType<typeof actionCreator>
