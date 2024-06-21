import * as Optuna from "@optuna/types"
// @ts-ignore
import sqlite3InitModule from "@sqlite.org/sqlite-wasm"
import { OptunaStorage } from "./storage"

type SQLite3DB = {
  exec(options: {
    sql: string
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    callback: (...args: any[]) => void
  }): void
  close(): void
}

export class SQLite3Storage implements OptunaStorage {
  db: Promise<SQLite3DB>
  summaries_cache: Optuna.StudySummary[] | null
  constructor(arrayBuffer: ArrayBuffer) {
    this.db = this.initDB(arrayBuffer)
    this.summaries_cache = null
  }

  async initDB(arrayBuffer: ArrayBuffer): Promise<SQLite3DB> {
    return sqlite3InitModule({
      print: console.log,
      printErr: console.log,
      // @ts-ignore
    }).then((sqlite3) => {
      const p = sqlite3.wasm.allocFromTypedArray(arrayBuffer)
      const db = new sqlite3.oo1.DB()
      const rc = sqlite3.capi.sqlite3_deserialize(
        // @ts-ignore
        db.pointer,
        "main",
        p,
        arrayBuffer.byteLength,
        arrayBuffer.byteLength,
        sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
      )
      db.checkRc(rc)
      return db
    })
  }

  getStudies = async (): Promise<Optuna.StudySummary[]> => {
    const db = await this.db
    this.summaries_cache = getStudySummaries(db)
    return this.summaries_cache
  }

  getStudy = async (idx: number): Promise<Optuna.Study | null> => {
    const db = await this.db
    const schemaVersion = getSchemaVersion(db)
    if (!isSupportedSchema(schemaVersion)) {
      return null
    }
    if (this.summaries_cache === null) {
      this.summaries_cache = getStudySummaries(db)
    }
    const summary = this.summaries_cache[idx]
    if (summary === undefined) {
      return null
    }
    return getStudy(db, schemaVersion, summary)
  }
}

const getSchemaVersion = (db: SQLite3DB): string => {
  let schemaVersion = ""
  db.exec({
    sql: "SELECT version_num FROM alembic_version LIMIT 1",
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    callback: (vals: any[]) => {
      schemaVersion = vals[0]
    },
  })
  return schemaVersion
}

const isSupportedSchema = (schemaVersion: string): boolean => {
  const lowestVersion = "v2.6.0.a" // supported: "v3.2.0.a", "v3.0.0.{a,b,c,d}", "v2.6.0.a"
  if (schemaVersion === lowestVersion) return true
  return isGreaterSchemaVersion(schemaVersion, lowestVersion)
}

const isGreaterSchemaVersion = (
  leftVersion: string,
  rightVersion: string
): boolean => {
  // return leftVersion > rightVersion
  const leftSuffix = leftVersion.split(".").reverse()[0]
  const rightSuffix = rightVersion.split(".").reverse()[0]
  const leftVersion_ = leftVersion.replace(/\D/g, "")
  const rightVersion_ = rightVersion.replace(/\D/g, "")

  const left = Number(leftVersion_)
  const right = Number(rightVersion_)
  if (left === right) return leftSuffix > rightSuffix
  return left > right
}

const getStudySummaries = (db: SQLite3DB): Optuna.StudySummary[] => {
  const summaries: Optuna.StudySummary[] = []
  db.exec({
    sql:
      "SELECT s.study_id, s.study_name, sd.direction, sd.objective" +
      " FROM studies AS s INNER JOIN study_directions AS sd" +
      " ON s.study_id = sd.study_id ORDER BY sd.study_direction_id",
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    callback: (vals: any[]) => {
      const studyId = vals[0]
      const studyName = vals[1]
      const direction: Optuna.StudyDirection =
        vals[2] === "MINIMIZE" ? "minimize" : "maximize"
      const objective = vals[3]

      if (objective === 0) {
        summaries.push({
          id: studyId,
          name: studyName,
          directions: [direction],
        })
        return
      }
      const index = summaries.findIndex((s) => s.id === studyId)
      summaries[index].directions.push(direction)
    },
  })
  return summaries
}

const getStudy = (
  db: SQLite3DB,
  schemaVersion: string,
  summary: Optuna.StudySummary
): Optuna.Study => {
  const study: Optuna.Study = {
    id: summary.id,
    name: summary.name,
    directions: summary.directions,
    union_search_space: [],
    intersection_search_space: [],
    union_user_attrs: [],
    trials: [],
  }

  const studySystemAttrs = getStudySystemAttributes(db, summary.id)
  if (studySystemAttrs !== undefined) {
    study.metric_names = studySystemAttrs.metric_names
  }

  let intersection_search_space: Set<Optuna.SearchSpaceItem> = new Set()
  study.trials = getTrials(db, summary.id, schemaVersion)
  for (const trial of study.trials) {
    const userAttrs = getTrialUserAttributes(db, trial.trial_id)
    for (const attr of userAttrs) {
      if (study.union_user_attrs.findIndex((s) => s.key === attr.key) === -1) {
        study.union_user_attrs.push({ key: attr.key, sortable: false })
      }
    }

    const systemAttrs = getTrialSystemAttributes(db, trial.trial_id)
    if (systemAttrs !== undefined) {
      trial.constraints = systemAttrs.constraints
    }

    const params = getTrialParams(db, trial.trial_id)
    const paramNames = new Set<string>()
    const paramNameToSearchSpaceItem = new Map<string, Optuna.SearchSpaceItem>()
    for (const param of params) {
      paramNames.add(param.name)
      if (paramNameToSearchSpaceItem.has(param.name)) {
        paramNameToSearchSpaceItem.set(param.name, {
          name: param.name,
          distribution: param.distribution,
        })
      }
      if (
        study.union_search_space.findIndex((s) => s.name === param.name) === -1
      ) {
        study.union_search_space.push({
          name: param.name,
          distribution: param.distribution,
        })
      }
    }
    if (intersection_search_space.size === 0) {
      for (const s of paramNames) {
        intersection_search_space.add(
          paramNameToSearchSpaceItem.get(s) as Optuna.SearchSpaceItem
        )
      }
    } else {
      intersection_search_space = new Set(
        Array.from(intersection_search_space).filter((s) =>
          paramNames.has(s.name)
        )
      )
    }
    trial.params = params
    trial.user_attrs = userAttrs
  }
  study.intersection_search_space = Array.from(intersection_search_space)
  return study
}

const getTrials = (
  db: SQLite3DB,
  studyId: number,
  schemaVersion: string
): Optuna.Trial[] => {
  const trials: Optuna.Trial[] = []
  db.exec({
    sql: `SELECT trial_id, number, state, datetime_start, datetime_complete FROM trials WHERE study_id = ${studyId} ORDER BY number`,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    callback: (vals: any[]) => {
      const trialId = vals[0]
      const state: Optuna.TrialState =
        vals[2] === "COMPLETE"
          ? "Complete"
          : vals[2] === "PRUNED"
            ? "Pruned"
            : vals[2] === "RUNNING"
              ? "Running"
              : vals[2] === "WAITING"
                ? "Waiting"
                : "Fail"
      const trial: Optuna.Trial = {
        trial_id: trialId,
        number: vals[1],
        study_id: studyId,
        state: state,
        values: getTrialValues(db, trialId, schemaVersion),
        intermediate_values: getTrialIntermediateValues(
          db,
          trialId,
          schemaVersion
        ),
        params: [], // Set this column later
        user_attrs: [], // Set this column later
        constraints: [],
        datetime_start: vals[3],
        datetime_complete: vals[4],
      }
      trials.push(trial)
    },
  })
  return trials
}

const getTrialValues = (
  db: SQLite3DB,
  trialId: number,
  schemaVersion: string
): number[] => {
  const values: number[] = []
  if (isGreaterSchemaVersion(schemaVersion, "v3.0.0.c")) {
    db.exec({
      sql: `SELECT value, value_type FROM trial_values WHERE trial_id = ${trialId} ORDER BY objective`,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      callback: (vals: any[]) => {
        values.push(
          vals[1] === "INF_NEG"
            ? -Infinity
            : vals[1] === "INF_POS"
              ? Infinity
              : vals[0]
        )
      },
    })
  } else {
    db.exec({
      sql: `SELECT value FROM trial_values WHERE trial_id = ${trialId} ORDER BY objective`,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      callback: (vals: any[]) => {
        values.push(vals[0])
      },
    })
  }
  return values
}

const getTrialParams = (
  db: SQLite3DB,
  trialId: number
): Optuna.TrialParam[] => {
  const params: Optuna.TrialParam[] = []
  db.exec({
    sql: `SELECT param_name, param_value, distribution_json FROM trial_params WHERE trial_id = ${trialId}`,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    callback: (vals: any[]) => {
      const distribution = parseDistributionJSON(vals[2])
      params.push({
        name: vals[0],
        param_internal_value: vals[1],
        param_external_type: distribution.type,
        param_external_value: paramInternalValueToExternalValue(
          distribution,
          vals[1]
        ),
        distribution: distribution,
      })
    },
  })
  return params
}

const paramInternalValueToExternalValue = (
  distribution: Optuna.Distribution,
  internalValue: number
): Optuna.CategoricalChoiceType => {
  if (distribution.type === "FloatDistribution") {
    return internalValue.toString()
  }
  if (distribution.type === "IntDistribution") {
    return internalValue.toString()
  }
  return distribution.choices[internalValue]
}

const parseDistributionJSON = (t: string): Optuna.Distribution => {
  const parsed = JSON.parse(t)
  if (parsed.name === "FloatDistribution") {
    return {
      type: "FloatDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: parsed.attributes.step as number,
      log: parsed.attributes.log as boolean,
    }
  }
  if (parsed.name === "UniformDistribution") {
    return {
      type: "FloatDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: null,
      log: false,
    }
  }
  if (parsed.name === "LogUniformDistribution") {
    return {
      type: "FloatDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: null,
      log: true,
    }
  }
  if (parsed.name === "DiscreteUniformDistribution") {
    return {
      type: "FloatDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: parsed.attributes.q,
      log: false,
    }
  }
  if (parsed.name === "IntDistribution") {
    return {
      type: "IntDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: parsed.attributes.step as number,
      log: parsed.attributes.log as boolean,
    }
  }
  if (parsed.name === "IntUniformDistribution") {
    return {
      type: "IntDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: parsed.attributes.step as number,
      log: false,
    }
  }
  if (parsed.name === "IntLogUniformDistribution") {
    return {
      type: "IntDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: parsed.attributes.step as number,
      log: true,
    }
  }
  return {
    type: "CategoricalDistribution",
    choices: parsed.attributes.choices,
  }
}

const getStudySystemAttributes = (db: SQLite3DB, studyId: number) => {
  let attrs: { metric_names: string[] } | undefined
  db.exec({
    sql: `SELECT key, value_json FROM study_system_attributes WHERE study_id = ${studyId} AND key = 'dashboard:objective_names'`,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    callback: (vals: any[]) => {
      attrs = {
        metric_names: JSON.parse(vals[1]),
      }
    },
  })
  return attrs
}

const getTrialUserAttributes = (
  db: SQLite3DB,
  trialId: number
): Optuna.Attribute[] => {
  const attrs: Optuna.Attribute[] = []
  db.exec({
    sql: `SELECT key, value_json FROM trial_user_attributes WHERE trial_id = ${trialId}`,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    callback: (vals: any[]) => {
      attrs.push({
        key: vals[0],
        value: vals[1],
      })
    },
  })
  return attrs
}

const getTrialSystemAttributes = (db: SQLite3DB, trialId: number) => {
  let attrs: { constraints: number[] } | undefined
  db.exec({
    sql: `SELECT key, value_json FROM trial_system_attributes WHERE trial_id = ${trialId} AND key = 'constraints'`,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    callback: (vals: any[]) => {
      attrs = {
        constraints: JSON.parse(vals[1]),
      }
    },
  })
  return attrs
}

const getTrialIntermediateValues = (
  db: SQLite3DB,
  trialId: number,
  schemaVersion: string
): Optuna.TrialIntermediateValue[] => {
  const values: Optuna.TrialIntermediateValue[] = []
  if (isGreaterSchemaVersion(schemaVersion, "v3.0.0.c")) {
    db.exec({
      sql: `SELECT step, intermediate_value, intermediate_value_type FROM trial_intermediate_values WHERE trial_id = ${trialId} ORDER BY step`,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      callback: (vals: any[]) => {
        values.push({
          step: vals[0],
          value:
            vals[2] === "INF_NEG"
              ? -Infinity
              : vals[2] === "INF_POS"
                ? Infinity
                : vals[2] === "NAN"
                  ? NaN
                  : vals[1],
        })
      },
    })
  } else {
    db.exec({
      sql: `SELECT step, intermediate_value FROM trial_intermediate_values WHERE trial_id = ${trialId} ORDER BY step`,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      callback: (vals: any[]) => {
        values.push({
          step: vals[0],
          value: vals[1],
        })
      },
    })
  }
  return values
}
