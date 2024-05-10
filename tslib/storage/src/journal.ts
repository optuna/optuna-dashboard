import * as Optuna from "@optuna/types"
import { OptunaStorage } from "./storage"

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

interface JournalOpSetStudySystemAttr extends JournalOpBase {
  study_id: number
  system_attr: {
    "study:metric_names": string[]
  }
}

interface JournalOpCreateTrial extends JournalOpBase {
  study_id: number
  datetime_start?: string
  datetime_complete?: string
  distributions?: { [key: string]: string }
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  params?: { [key: string]: any }
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  user_attrs?: { [key: string]: any }
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  system_attrs?: { [key: string]: any }
  state?: number
  intermediate_values?: { [key: string]: number }
  value?: number
  values?: number[]
}

interface JournalOpSetTrialParam extends JournalOpBase {
  trial_id: number
  param_name: string
  param_value_internal: number
  distribution: string
}

interface JournalOpSetTrialStateValue extends JournalOpBase {
  trial_id: number
  state: number
  values?: number[]
  datetime_start?: string
  datetime_complete?: string
}

interface JournalOpSetTrialIntermediateValue extends JournalOpBase {
  trial_id: number
  step: number
  intermediate_value: number
}

interface JournalOpSetTrialUserAttr extends JournalOpBase {
  trial_id: number
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  user_attr: { [key: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
}

const trialStateNumToTrialState = (state: number): Optuna.TrialState => {
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

const parseDistribution = (distribution: string): Optuna.Distribution => {
  const distributionJson = JSON.parse(distribution)
  if (distributionJson.name === "IntDistribution") {
    return {
      ...distributionJson.attributes,
      type: "IntDistribution",
    }
  }
  if (distributionJson.name === "FloatDistribution") {
    return {
      ...distributionJson.attributes,
      type: "FloatDistribution",
    }
  }
  if (distributionJson.name === "CategoricalDistribution") {
    return {
      type: "CategoricalDistribution",
      choices: distributionJson.attributes.choices,
    }
  }
  throw new Error(`Unexpected distribution: ${distribution}`)
}

class JournalStorage {
  private studies: Optuna.Study[] = []
  private nextStudyId = 0
  private studyIdToTrialIDs: Map<number, number[]> = new Map()
  private trialIdToStudyId: Map<number, number> = new Map()
  private trialID = 0

  public getStudies(): Optuna.Study[] {
    for (const study of this.studies) {
      const unionUserAttrs: Set<string> = new Set()
      const unionSearchSpace: Set<string> = new Set()
      let intersectionSearchSpace: string[] = []

      study.trials.forEach((trial, index) => {
        for (const userAttr of trial.user_attrs) {
          unionUserAttrs.add(userAttr.key)
        }
        for (const param of trial.params) {
          unionSearchSpace.add(param.name)
        }
        if (index === 0) {
          intersectionSearchSpace = Array.from(unionSearchSpace)
        } else {
          intersectionSearchSpace = intersectionSearchSpace.filter((name) => {
            return trial.params.some((param) => param.name === name)
          })
        }
      })
      study.union_user_attrs = Array.from(unionUserAttrs).map((key) => {
        return {
          key: key,
          sortable: false,
        }
      })
      study.union_search_space = Array.from(unionSearchSpace).map((name) => {
        return {
          name: name,
        }
      })
      study.intersection_search_space = intersectionSearchSpace.map((name) => {
        return {
          name: name,
        }
      })
    }

    return this.studies
  }

  public applyCreateStudy(log: JournalOpCreateStudy): void {
    this.studies.push({
      id: this.nextStudyId,
      name: log.study_name,
      directions: [log.directions[0] === 1 ? "minimize" : "maximize"],
      union_search_space: [],
      intersection_search_space: [],
      union_user_attrs: [],
      trials: [],
    })
    this.nextStudyId++
  }

  public applyDeleteStudy(log: JournalOpDeleteStudy): void {
    this.studies = this.studies.filter((item) => item.id !== log.study_id)
  }

  public applyStudySystemAttr(log: JournalOpSetStudySystemAttr): void {
    const thisStudy = this.studies.find((item) => item.id === log.study_id)
    if (thisStudy === undefined) {
      return
    }
    thisStudy.metric_names = log.system_attr["study:metric_names"]
  }

  public applyCreateTrial(log: JournalOpCreateTrial): void {
    const thisStudy = this.studies.find((item) => item.id === log.study_id)
    if (thisStudy === undefined) {
      return
    }

    const params: Optuna.TrialParam[] =
      log.params === undefined || log.distributions === undefined
        ? []
        : Object.entries(log.params).map(([name, value]) => {
            const distribution = parseDistribution(
              log.distributions?.[name] || ""
            )
            return {
              name: name,
              param_internal_value: value,
              param_external_type: distribution.type,
              param_external_value: (() => {
                if (distribution.type === "FloatDistribution") {
                  return value.toString()
                }
                if (distribution.type === "IntDistribution") {
                  return value.toString()
                }
                return distribution.choices[value]
              })(),
              distribution: distribution,
            }
          })

    const userAtter = log.user_attrs
      ? Object.entries(log.user_attrs).map(([key, value]) => {
          return {
            key: key,
            value: value,
          }
        })
      : []

    thisStudy.trials.push({
      trial_id: this.trialID,
      number: this.studyIdToTrialIDs.get(log.study_id)?.length ?? 0,
      study_id: log.study_id,
      state: trialStateNumToTrialState(log.state ?? 0),
      values: (() => {
        if (log.value !== undefined) {
          return [log.value]
        }
        if (log.values !== undefined) {
          return log.values
        }
        return undefined
      })(),
      params: params,
      intermediate_values: [],
      user_attrs: userAtter,
      datetime_start: log.datetime_start
        ? new Date(log.datetime_start)
        : undefined,
      datetime_complete: log.datetime_complete
        ? new Date(log.datetime_complete)
        : undefined,
    })
    this.studyIdToTrialIDs.set(
      log.study_id,
      this.studyIdToTrialIDs.get(log.study_id)?.concat([this.trialID]) ?? [
        this.trialID,
      ]
    )
    this.trialIdToStudyId.set(this.trialID, log.study_id)
    this.trialID++
  }

  private getStudyAndTrial(trial_id: number): [Optuna.Study?, Optuna.Trial?] {
    const study = this.studies.find(
      (item) => item.id === this.trialIdToStudyId.get(trial_id)
    )
    if (study === undefined) {
      return [undefined, undefined]
    }

    const trial = study.trials.find((item) => item.trial_id === trial_id)
    if (trial === undefined) {
      return [study, undefined]
    }
    return [study, trial]
  }

  public applySetTrialParam(log: JournalOpSetTrialParam) {
    const [thisStudy, thisTrial] = this.getStudyAndTrial(log.trial_id)
    if (thisStudy === undefined || thisTrial === undefined) {
      return
    }
    thisTrial.params.push({
      name: log.param_name,
      param_internal_value: log.param_value_internal,
      param_external_type: "FloatDistribution",
      param_external_value: log.param_value_internal.toString(),
      distribution: parseDistribution(log.distribution),
    })
  }

  public applySetTrialStateValues(log: JournalOpSetTrialStateValue): void {
    const [thisStudy, thisTrial] = this.getStudyAndTrial(log.trial_id)
    if (thisStudy === undefined || thisTrial === undefined) {
      return
    }
    thisTrial.state = trialStateNumToTrialState(log.state)
    thisTrial.values = log.values === null ? undefined : log.values
    thisTrial.datetime_start = log.datetime_start
      ? new Date(log.datetime_start)
      : undefined
    thisTrial.datetime_complete = log.datetime_complete
      ? new Date(log.datetime_complete)
      : undefined
  }

  public applySetTrialIntermediateValue(
    log: JournalOpSetTrialIntermediateValue
  ) {
    const [thisStudy, thisTrial] = this.getStudyAndTrial(log.trial_id)
    if (thisStudy === undefined || thisTrial === undefined) {
      return
    }
    thisTrial.intermediate_values.push({
      step: log.step,
      value: log.intermediate_value,
    })
  }

  public applySetTrialUserAttr(log: JournalOpSetTrialUserAttr) {
    const [thisStudy, thisTrial] = this.getStudyAndTrial(log.trial_id)
    if (thisStudy === undefined || thisTrial === undefined) {
      return
    }
    for (const [key, value] of Object.entries(log.user_attr)) {
      const index = thisTrial.user_attrs.findIndex((item) => item.key === key)
      if (index !== -1) {
        thisTrial.user_attrs[index].value = value.toString()
      } else {
        thisTrial.user_attrs.push({
          key: key,
          value: value.toString(),
        })
      }
    }
  }
}

const loadJournalStorage = (
  arrayBuffer: ArrayBuffer
): {
  studies: Optuna.Study[]
  errors: { log: string; message: string }[]
} => {
  const decoder = new TextDecoder("utf-8")
  const logs = decoder.decode(arrayBuffer).split("\n")

  const journalStorage = new JournalStorage()
  const errors: { log: string; message: string }[] = []

  for (const log of logs) {
    if (log === "") {
      continue
    }

    const parsedLog: JournalOpBase = (() => {
      try {
        try {
          return JSON.parse(log)
        } catch (error) {
          if (error instanceof SyntaxError) {
            let escapedLog: string = log.replace(/NaN/g, '"***nan***"')
            escapedLog = escapedLog.replace(/-Infinity/g, '"***-inf***"')
            escapedLog = escapedLog.replace(/Infinity/g, '"***inf***"')
            return JSON.parse(escapedLog, (_key, value) => {
              switch (value) {
                case "***nan***":
                  return NaN
                case "***-inf***":
                  return -Infinity
                case "***inf***":
                  return Infinity
                default:
                  return value
              }
            })
          }
          throw error
        }
      } catch (error) {
        if (error instanceof Error) {
          errors.push({ log: log, message: error.message })
        } else {
          errors.push({ log: log, message: "Unknown error" })
        }
      }
    })()

    if (parsedLog === undefined) {
      continue
    }

    switch (parsedLog.op_code) {
      case JournalOperation.CREATE_STUDY:
        journalStorage.applyCreateStudy(parsedLog as JournalOpCreateStudy)
        break
      case JournalOperation.DELETE_STUDY:
        journalStorage.applyDeleteStudy(parsedLog as JournalOpDeleteStudy)
        break
      case JournalOperation.SET_STUDY_USER_ATTR:
        // Unsupported
        break
      case JournalOperation.SET_STUDY_SYSTEM_ATTR:
        journalStorage.applyStudySystemAttr(
          parsedLog as JournalOpSetStudySystemAttr
        )
        break
      case JournalOperation.CREATE_TRIAL:
        journalStorage.applyCreateTrial(parsedLog as JournalOpCreateTrial)
        break
      case JournalOperation.SET_TRIAL_PARAM:
        journalStorage.applySetTrialParam(parsedLog as JournalOpSetTrialParam)
        break
      case JournalOperation.SET_TRIAL_STATE_VALUES:
        journalStorage.applySetTrialStateValues(
          parsedLog as JournalOpSetTrialStateValue
        )
        break
      case JournalOperation.SET_TRIAL_INTERMEDIATE_VALUE:
        journalStorage.applySetTrialIntermediateValue(
          parsedLog as JournalOpSetTrialIntermediateValue
        )
        break
      case JournalOperation.SET_TRIAL_USER_ATTR:
        journalStorage.applySetTrialUserAttr(
          parsedLog as JournalOpSetTrialUserAttr
        )
        break
      case JournalOperation.SET_TRIAL_SYSTEM_ATTR:
        // Unsupported
        break
    }
  }

  return {
    studies: journalStorage.getStudies(),
    errors,
  }
}

export class JournalFileStorage implements OptunaStorage {
  studies: Optuna.Study[]
  errors: { log: string; message: string }[]
  constructor(arrayBuffer: ArrayBuffer) {
    const { studies: studiesFromStorage, errors: errorsFromStorage } =
      loadJournalStorage(arrayBuffer)
    this.studies = studiesFromStorage
    this.errors = errorsFromStorage
  }
  getStudies = async (): Promise<Optuna.StudySummary[]> => {
    return this.studies
  }
  getStudy = async (idx: number): Promise<Optuna.Study | null> => {
    return this.studies[idx] || null
  }
  getErrors = (): { log: string; message: string }[] => {
    return this.errors
  }
}
