import { useRecoilState } from "recoil"
import { useSnackbar } from "notistack"
import {
  getStudyDetailAPI,
  getStudySummariesAPI,
  createNewStudyAPI,
  deleteStudyAPI,
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
      for (const trial of studyDetails[studyId].trials) {
        if (!["Running", "Waiting"].includes(trial.state)) {
          nLocalFixedTrials += 1
        } else {
          break
        }
      }
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
        enqueueSnackbar(`Failed to fetch study (id=${studyId})`, {
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

  return {
    updateStudyDetail,
    updateStudySummaries,
    createNewStudy,
    deleteStudy,
  }
}

export type Action = ReturnType<typeof actionCreator>
