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

interface JournalOpCreateTrial extends JournalOpBase {
  study_id: number
  datetime_start: string
  datetime_complete: string
  distributions: { [key: string]: string }
  params: { [key: string]: any }
  user_attrs: { [key: string]: any }
  system_attrs: { [key: string]: any }
  state: number
  intermediate_values: { [key: string]: number }
  value?: number
  values?: number[]
}

const trialStateNumToTrialState = (state: number): TrialState => {
  switch (state) {
    case 0:
      return "Running"
    case 1:
      return "Complete"
    case 2:
      return "Pruned"
    case 3:
      return "Fail"
    case 4:
      return "Waiting"
    default:
      return "Running"
  }
}

const parseDistribution = (distribution: string): Distribution => {
  const distributionJson = JSON.parse(distribution)
  if (distributionJson["name"] === "IntDistribution") {
    return {
      ...distributionJson["attributes"],
      type: "IntDistribution",
    }
  } else if (distributionJson["name"] === "FloatDistribution") {
    return {
      ...distributionJson["attributes"],
      type: "FloatDistribution",
    }
  } else {
    return {
      // TODO(gen740): support other types
      type: "CategoricalDistribution",
      choices: distributionJson["attributes"]["choices"].map((choice: any) => {
        return {
          pytype: "str",
          value: choice.toString(),
        }
      }),
    }
  }
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
        // Unsupported set for study user_attr
        break
      case JournalOperation.SET_STUDY_SYSTEM_ATTR:
        // Unsupported set for study system_attr
        break
      case JournalOperation.CREATE_TRIAL:
        const createTrialLog = parsedLog as JournalOpCreateTrial
        let trials = studies.find(
          (item) => item.study_id == createTrialLog.study_id
        )?.trials
        if (trials === undefined) {
          return
        }

        let params: TrialParam[] = Object.entries(createTrialLog.params).map(
          ([key, value]) => {
            const distribution = parseDistribution(
              createTrialLog.distributions[key]
            )
            return {
              name: key,
              param_internal_value: value,
              param_external_type: distribution.type,
              param_external_value: (() => {
                if (distribution.type === "FloatDistribution") {
                  return value.toString()
                } else if (distribution.type === "IntDistribution") {
                  return value.toString()
                } else {
                  return distribution.choices[value].value
                }
              })(),
              distribution: distribution,
            }
          }
        )

        console.log(params);

        trials.push({
          trial_id: trials.length,
          number: 0,
          study_id: createTrialLog.study_id,
          state: trialStateNumToTrialState(createTrialLog.state),
          values: (() => {
            if (createTrialLog.value !== undefined) {
              return [createTrialLog.value]
            } else if (createTrialLog.values !== undefined) {
              return createTrialLog.values
            } else {
              return undefined
            }
          })(),
          params: params,
          intermediate_values: [],
          user_attrs: [],
          datetime_start: new Date(createTrialLog.datetime_start),
        })
        break
    }
  }

  setter((prev) => [...prev, ...studies])
}
