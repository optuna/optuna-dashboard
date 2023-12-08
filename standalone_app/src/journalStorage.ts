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

interface JournalOpSetTrialParam extends JournalOpBase {
  trial_id: number
  param_name: string
  param_value_internal: number
  distribution: string
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

class JournalStorage {
  private studies: Study[] = []
  private nextStudyId = 0
  private studyIdToTrialIDs: Map<number, number[]> = new Map()
  private trialIdToStudyId: Map<number,number> = new Map()
  private trialNumber = 0

  public getStudies(): Study[] {
    return this.studies
  }

  public applyCreateStudy(log: JournalOpCreateStudy): void {
    this.studies.push({
      study_id: this.nextStudyId,
      study_name: log.study_name,
      directions: [log.directions[0] === 1 ? "minimize" : "maximize"],
      union_search_space: [],
      intersection_search_space: [],
      union_user_attrs: [],
      trials: [],
    })
    this.nextStudyId++
  }

  public applyDeleteStudy(log: JournalOpDeleteStudy): void {
    this.studies = this.studies.filter((item) => item.study_id != log.study_id)
  }

  public applyCreateTrial(log: JournalOpCreateTrial): void {
    let thisStudy = this.studies.find((item) => item.study_id == log.study_id)
    if (thisStudy === undefined) {
      return
    }

    let paramItems = Object.entries(log.params).map(([name, _]) => {
      return name
    })

    paramItems.forEach((name) => {
      if (!thisStudy!.union_search_space.find((item) => item.name === name)) {
        thisStudy!.union_search_space = thisStudy!.union_search_space.concat({
          name: name,
        })
      }
    })

    if (thisStudy.trials.length === 0) {
      thisStudy.intersection_search_space = paramItems.map((value) => {
        return {
          name: value,
        }
      })
    } else {
      thisStudy.intersection_search_space =
        thisStudy.intersection_search_space.filter((value) => {
          return paramItems.includes(value.name)
        })
    }

    let params: TrialParam[] = Object.entries(log.params).map(
      ([name, value]) => {
        const distribution = parseDistribution(log.distributions[name])

        return {
          name: name,
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

    const userAtter = Object.entries(log.user_attrs).map(([key, value]) => {
      if (!thisStudy!.union_user_attrs.find((item) => item.key === key)) {
        thisStudy!.union_user_attrs = thisStudy!.union_user_attrs.concat({
          key: key,
          sortable: false,
        })
      }
      return {
        key: key,
        value: value,
      }
    })

    // append trial id to studyIdToTrialIDs
    this.studyIdToTrialIDs.set(
      log.study_id,
      this.studyIdToTrialIDs
        .get(log.study_id)
        ?.concat([this.trialNumber]) ?? [this.trialNumber]
    )

    this.trialIdToStudyId.set(this.trialNumber, log.study_id)

    thisStudy.trials.push({
      trial_id: this.trialNumber++,
      number: this.studyIdToTrialIDs.get(log.study_id)?.length ?? 0,
      study_id: log.study_id,
      state: trialStateNumToTrialState(log.state),
      values: (() => {
        if (log.value !== undefined) {
          return [log.value]
        } else if (log.values !== undefined) {
          return log.values
        } else {
          return undefined
        }
      })(),
      params: params,
      intermediate_values: [],
      user_attrs: userAtter,
      datetime_start: new Date(log.datetime_start),
    })

  }

  public applySetTrialParam(log: JournalOpSetTrialParam) {
    let thisStudy = this.studies.find((item) => item.study_id == this.trialIdToStudyId.get(log.trial_id))
    if (thisStudy === undefined) {
      return
    }

    let thisTrial = thisStudy.trials.find((item) => item.trial_id == log.trial_id)
    if (thisTrial === undefined) {
      return
    }




  }

}

export const loadJournalStorage = (
  arrayBuffer: ArrayBuffer,
  setter: SetterOrUpdater<Study[]>
): void => {
  const decoder = new TextDecoder("utf-8")
  const logs = decoder.decode(arrayBuffer).split("\n")

  let journalStorage = new JournalStorage()

  for (let log of logs) {
    if (log === "") {
      continue
    }
    let parsedLog: JournalOpBase = JSON.parse(log)
    switch (parsedLog.op_code) {
      case JournalOperation.CREATE_STUDY:
        journalStorage.applyCreateStudy(parsedLog as JournalOpCreateStudy)
        break
      case JournalOperation.DELETE_STUDY:
        journalStorage.applyDeleteStudy(parsedLog as JournalOpDeleteStudy)
        break
      case JournalOperation.SET_STUDY_USER_ATTR:
        // Unsupported set for study user_attr
        break
      case JournalOperation.SET_STUDY_SYSTEM_ATTR:
        // Unsupported set for study system_attr
        break
      case JournalOperation.CREATE_TRIAL:
        journalStorage.applyCreateTrial(parsedLog as JournalOpCreateTrial)
        break
    }
  }

  console.log(journalStorage.getStudies())
  setter((prev) => [...prev, ...journalStorage.getStudies()])
}
