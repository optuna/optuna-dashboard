// @ts-ignore
import sqlite3InitModule from "@sqlite.org/sqlite-wasm"
import { SetterOrUpdater } from "recoil"

type SQLite3DB = {
  exec(options: {
    sql: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (...args: any[]) => void
  }): void
}

export const loadStorage = (
  arrayBuffer: ArrayBuffer,
  setter: SetterOrUpdater<Study[]>
): void => {
  sqlite3InitModule({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    print: (...args: any): void => {
      console.log(args)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    printErr: (...args: any): void => {
      console.log(args)
    },
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
    try {
      if (!isSupportedSchema(db)) {
        return
      }
      const studies = getStudies(db)
      setter((prev) => [...prev, ...studies])
    } finally {
      db.close()
    }
  })
}

const isSupportedSchema = (db: SQLite3DB): boolean => {
  let supported = true
  let supportedVersions = ["v3.2.0.a"]
  db.exec({
    sql: "SELECT version_num FROM alembic_version LIMIT 1",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (vals: any[]) => {
      supported = supportedVersions.includes(vals[0])
    },
  })
  return supported
}

const getStudies = (db: SQLite3DB): Study[] => {
  const studies: Study[] = []
  db.exec({
    sql:
      "SELECT s.study_id, s.study_name, sd.direction, sd.objective" +
      " FROM studies AS s INNER JOIN study_directions AS sd" +
      " ON s.study_id = sd.study_id ORDER BY sd.study_direction_id",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (vals: any[]) => {
      const studyId = vals[0]
      const studyName = vals[1]
      const direction: StudyDirection =
        vals[2] === "MINIMIZE" ? "minimize" : "maximize"
      const objective = vals[3]

      const trials = getTrials(db, studyId)
      const union_search_space: SearchSpaceItem[] = []
      const union_user_attrs: AttributeSpec[] = []
      let intersection_search_space: Set<SearchSpaceItem> = new Set()
      trials.forEach((trial) => {
        const userAttrs = getTrialUserAttributes(db, trial.trial_id)
        userAttrs.forEach((attr) => {
          if (union_user_attrs.findIndex((s) => s.key === attr.key) == -1) {
            union_user_attrs.push({ key: attr.key, sortable: false })
          }
        })

        const params = getTrialParams(db, trial.trial_id)
        const param_names = new Set<string>()
        params.forEach((param) => {
          param_names.add(param.name)
          if (
            union_search_space.findIndex((s) => s.name === param.name) == -1
          ) {
            union_search_space.push({ name: param.name })
          }
        })
        if (intersection_search_space.size === 0) {
          param_names.forEach((s) => {
            intersection_search_space.add({
              name: s,
            })
          })
        } else {
          intersection_search_space = new Set(
            Array.from(intersection_search_space).filter((s) =>
              param_names.has(s.name)
            )
          )
        }
        trial.params = params
        trial.user_attrs = userAttrs
      })

      if (objective === 0) {
        studies.push({
          study_id: studyId,
          study_name: studyName,
          directions: [direction],
          union_search_space: union_search_space,
          intersection_search_space: Array.from(intersection_search_space),
          union_user_attrs: union_user_attrs,
          trials: trials,
        })
        return
      }
      const index = studies.findIndex((s) => s.study_id === studyId)
      studies[index].directions.push(direction)
    },
  })
  return studies
}

const getTrials = (db: SQLite3DB, studyId: number): Trial[] => {
  const trials: Trial[] = []
  db.exec({
    sql:
      "SELECT trial_id, number, state, datetime_start, datetime_complete FROM trials" +
      ` WHERE study_id = ${studyId} ORDER BY number`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (vals: any[]) => {
      const trialId = vals[0]
      const state: TrialState =
        vals[2] === "COMPLETE"
          ? "Complete"
          : vals[2] === "PRUNED"
          ? "Pruned"
          : vals[2] === "RUNNING"
          ? "Running"
          : vals[2] === "WAITING"
          ? "Waiting"
          : "Fail"
      const trial: Trial = {
        trial_id: trialId,
        number: vals[1],
        study_id: studyId,
        state: state,
        values: getTrialValues(db, trialId),
        intermediate_values: getTrialIntermediateValues(db, trialId),
        params: [], // Set this column later
        user_attrs: [], // Set this column later
        datetime_start: vals[3],
        datetime_complete: vals[4],
      }
      trials.push(trial)
    },
  })
  return trials
}

const getTrialValues = (db: SQLite3DB, trialId: number): TrialValueNumber[] => {
  const values: TrialValueNumber[] = []
  db.exec({
    sql:
      "SELECT value, value_type" +
      ` FROM trial_values WHERE trial_id = ${trialId}` +
      " ORDER BY objective",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (vals: any[]) => {
      values.push(
        vals[1] === "INF_NEG"
          ? "-inf"
          : vals[1] === "INF_POS"
          ? "+inf"
          : vals[0]
      )
    },
  })
  return values
}

const getTrialParams = (db: SQLite3DB, trialId: number): TrialParam[] => {
  const params: TrialParam[] = []
  db.exec({
    sql:
      "SELECT param_name, param_value, distribution_json" +
      ` FROM trial_params WHERE trial_id = ${trialId}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  distribution: Distribution,
  internalValue: number
): string => {
  if (distribution.type === "FloatDistribution") {
    return internalValue.toString()
  } else if (distribution.type === "IntDistribution") {
    return internalValue.toString()
  } else {
    return distribution.choices[internalValue].value
  }
}

const parseDistributionJSON = (t: string): Distribution => {
  const parsed = JSON.parse(t)
  if (parsed.name === "FloatDistribution") {
    return {
      type: "FloatDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: parsed.attributes.step as number,
      log: parsed.attributes.log as boolean,
    }
  } else if (parsed.name === "IntDistribution") {
    return {
      type: "IntDistribution",
      low: parsed.attributes.low as number,
      high: parsed.attributes.high as number,
      step: parsed.attributes.step as number,
      log: parsed.attributes.log as boolean,
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const choices = parsed.attributes.choices.map((value: any) => {
      // TODO(c-bata): Support other types
      return {
        pytype: "str",
        value: value.toString(),
      }
    })
    return {
      type: "CategoricalDistribution",
      choices: choices,
    }
  }
}

const getTrialUserAttributes = (
  db: SQLite3DB,
  trialId: number
): Attribute[] => {
  const attrs: Attribute[] = []
  db.exec({
    sql:
      "SELECT key, value_json" +
      ` FROM trial_user_attributes WHERE trial_id = ${trialId}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (vals: any[]) => {
      attrs.push({
        key: vals[0],
        value: vals[1],
      })
    },
  })
  return attrs
}

const getTrialIntermediateValues = (
  db: SQLite3DB,
  trialId: number
): TrialIntermediateValue[] => {
  const values: TrialIntermediateValue[] = []
  db.exec({
    sql:
      "SELECT step, intermediate_value, intermediate_value_type" +
      ` FROM trial_intermediate_values WHERE trial_id = ${trialId}` +
      " ORDER BY step",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (vals: any[]) => {
      values.push({
        step: vals[0],
        value:
          vals[2] === "INF_NEG"
            ? "-inf"
            : vals[2] === "INF_POS"
            ? "+inf"
            : vals[1],
      })
    },
  })
  return values
}
