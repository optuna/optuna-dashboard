import { useRecoilState } from "recoil"
import { useSnackbar } from "notistack"
import {
  getStudyDetailAPI,
  getStudySummariesAPI,
  createNewStudyAPI,
  deleteStudyAPI,
  saveNoteAPI,
} from "./apiClient"
import { studyDetailsState, studySummariesState } from "./state"

export const actionCreator = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [studySummaries, setStudySummaries] =
    useRecoilState<StudySummary[]>(studySummariesState)
  const [studyDetails, setStudyDetails] =
    useRecoilState<StudyDetails>(studyDetailsState)

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
        study.trials = study.trials.concat(currentFixedTrials)
        const newVal = Object.assign({}, studyDetails)
        newVal[studyId] = study
        setStudyDetails(newVal)
      })
      .catch((err) => {
        const reason = err.response?.data.reason
        enqueueSnackbar(`Failed to fetch study (reason=${reason})`, {
          variant: "error",
        })
        console.log(err)
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
      .then((study) => {
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

  const saveNote = (studyId: number, note: Note) => {
    saveNoteAPI(studyId, note)
      .then(() => {
        const newStudy = Object.assign({}, studyDetails[studyId])
        newStudy.note = note
        const newStudies = Object.assign({}, studyDetails)
        newStudies[studyId] = newStudy
        setStudyDetails(newStudies)
        enqueueSnackbar(`Success to save the note`, {
          variant: "success",
        })
      })
      .catch((err) => {
        const reason = err.response?.data.reason
        enqueueSnackbar(`Failed: ${reason}`, {
          variant: "error",
        })
      })
  }

  return {
    updateStudyDetail,
    updateStudySummaries,
    createNewStudy,
    deleteStudy,
    saveNote,
  }
}

export type Action = ReturnType<typeof actionCreator>
