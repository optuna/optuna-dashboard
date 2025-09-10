import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { actionCreator } from "../action"
import { reloadIntervalState, useStudyDetailValue } from "../state"
import { StudyDetail } from "../types/optuna"

export const useLatestStudyDetail = ({
  studyId,
  shortInterval,
}: {
  studyId: number
  shortInterval: boolean
}): StudyDetail | null => {
  const action = actionCreator()
  const reloadInterval = useAtomValue(reloadIntervalState)
  const studyDetail = useStudyDetailValue(studyId)

  useEffect(() => {
    action.updateStudyDetail(studyId)
  }, [])

  useEffect(() => {
    if (reloadInterval < 0) {
      return
    }
    const nTrials = studyDetail ? studyDetail.trials.length : 0
    let interval = reloadInterval * 1000

    if (shortInterval) {
      if (nTrials < 100) {
        interval = 2000
      } else if (nTrials < 500) {
        interval = 5000
      }
    }

    const intervalId = setInterval(() => {
      action.updateStudyDetail(studyId)
    }, interval)
    return () => clearInterval(intervalId)
  }, [reloadInterval, studyDetail])

  return studyDetail
}
