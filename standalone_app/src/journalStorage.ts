import { SetterOrUpdater } from "recoil"

// JournalStorage
enum JournalOperation {
  CREATE_STUDY = 0,
  DELETE_STUDY = 1,
  SET_STUDY_USER_ATTR = 2,
  SET_STUDY_SYSTEM_ATTR = 3,
  CREATE_TRIAL = 4,
  SET_TRIAL_PARAM = 5,
  SET_TRIAL_STATE_VALUES = 6,
  SET_TRIAL_INTERMEDIATE_VALUE = 7,
  SET_TRIAL_USER_ATTR = 8,
  SET_TRIAL_SYSTEM_ATTR = 9,
}

interface JournalOpBase {
  op_code: JournalOperation
  workor_id: string
}

interface JournalOpCreateStudy extends JournalOpBase {
  study_name: string
  directions: number[] // TODO(gen740): introduce Study Direction enum
}

interface JournalOpDeleteStudy extends JournalOpBase {
  study_id: number
}

interface JournalOpSetStudyUserAttr extends JournalOpBase {
  study_id: number
  user_attr: { [key: string]: any }
}

interface JournalOpCreateTrial extends JournalOpBase {
  study_id: number
  datetime_start: string
  params: TrialParam[]
}

export const loadJournalStorage = (
  arrayBuffer: ArrayBuffer,
  setter: SetterOrUpdater<Study[]>
): void => {
  const decoder = new TextDecoder("utf-8")
  const logs = decoder.decode(arrayBuffer).split("\n")
  let studies: Study[] = []
  let nextStudyId = 0
  for (let log of logs) {
    if (log === "") {
      continue
    }
    let parsedLog: JournalOpBase = JSON.parse(log)
    switch (parsedLog.op_code) {
      case JournalOperation.CREATE_STUDY:
        const createStudyLog = parsedLog as JournalOpCreateStudy
        studies.push({
          study_id: nextStudyId,
          study_name: createStudyLog.study_name,
          directions: [
            createStudyLog.directions[0] === 1 ? "minimize" : "maximize",
          ],
          union_search_space: [],
          intersection_search_space: [],
          union_user_attrs: [],
          trials: [],
        })
        nextStudyId++
        break
      case JournalOperation.DELETE_STUDY:
        const deleteStudyLog = parsedLog as JournalOpDeleteStudy
        studies = studies.filter(
          (item) => item.study_id != deleteStudyLog.study_id
        )
        break
      case JournalOperation.SET_STUDY_USER_ATTR:
        // const setStudyUserAttrLog = parsedLog as JournalOpSetStudyUserAttr
        // studies = studies.map((item) => {
        //   if (item.study_id === setStudyUserAttrLog.study_id) {
        //     return {
        //       ...item,
        //       union_user_attrs: Object.entries(
        //         setStudyUserAttrLog.user_attr
        //       ).map(([key, value]) => {
        //         return {
        //           key: key,
        //           value: value,
        //         }
        //       }),
        //     }
        //   } else {
        //     return item
        //   }
        // })
        break
      case JournalOperation.SET_STUDY_SYSTEM_ATTR:
        break
      case JournalOperation.CREATE_TRIAL:
        const createTrialLog = parsedLog as JournalOpCreateTrial
        let trials = studies.find(
          (item) => item.study_id == createTrialLog.study_id
        )?.trials
        if (trials === undefined) {
          return
        }
        trials.push({
          trial_id: trials.length,
          number: 0,
          study_id: createTrialLog.study_id,
          state: "Running",
          values: [],
          params: [],
          intermediate_values: [],
          user_attrs: [],
          datetime_start: new Date(createTrialLog.datetime_start),
        })
        break
    }
  }

  setter((prev) => [...prev, ...studies])
}
