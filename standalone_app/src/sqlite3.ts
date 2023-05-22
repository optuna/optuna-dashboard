// @ts-ignore
import sqlite3InitModule from "@sqlite.org/sqlite-wasm"
import { SetterOrUpdater } from "recoil"

export const loadStorage = (
  arrayBuffer: ArrayBuffer,
  setter: SetterOrUpdater<Study[]>
): void => {
  sqlite3InitModule({
    print: (...args: any): void => {
      console.log(args)
    },
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
      // Check version_info table
      let supported = true
      db.exec({
        sql: "SELECT schema_version FROM version_info LIMIT 1",
        callback: (vals: any[]) => {
          if (vals[0] != 12) {
            supported = false
          }
        },
      })
      if (!supported) {
        return
      }

      // Get studies
      const studies: Study[] = []
      db.exec({
        sql:
          "SELECT s.study_id, s.study_name, sd.direction, sd.objective" +
          " FROM studies AS s INNER JOIN study_directions AS sd" +
          " ON s.study_id = sd.study_id ORDER BY sd.study_direction_id",
        callback: (vals: any[]) => {
          const study_id = vals[0]
          const study_name = vals[1]
          const direction: StudyDirection = vals[2].toLowerCase()
          const objective = vals[3]
          let index = 0

          if (objective === 0) {
            studies.push({
              study_id: study_id,
              study_name: study_name,
              directions: [direction],
              union_search_space: [],
              intersection_search_space: [],
              user_attrs: [],
              system_attrs: [],
              trials: [],
            })
          } else {
            index = studies.findIndex((s) => s.study_id === study_id)
            studies[index].directions.push(direction)
          }
        },
      })

      studies.forEach((s) => {
        db.exec({
          sql:
            "SELECT t.trial_id, t.number, t.study_id, t.state, t.datetime_start, t.datetime_complete," +
            " tv.objective, tv.value, tv.value_type" +
            " FROM trials AS t LEFT JOIN trial_values AS tv ON tv.trial_id = t.trial_id" +
            ` WHERE t.study_id = ${s.study_id}` +
            " ORDER BY t.number",
          callback: (vals: any[]) => {
            const state: TrialState =
              vals[3] === "COMPLETE"
                ? "Complete"
                : vals[3] === "PRUNED"
                ? "Pruned"
                : vals[3] === "RUNNING"
                ? "Running"
                : vals[3] === "WAITING"
                ? "Waiting"
                : "Fail"
            const trial: Trial = {
              trial_id: vals[0],
              number: vals[1],
              study_id: vals[2],
              state: state,
              params: [],
              intermediate_values: [],
              user_attrs: [],
              system_attrs: [],
            }
            s.trials.push(trial)
          },
        })
        const union_search_space: SearchSpaceItem[] = []
        let intersection_search_space: Set<SearchSpaceItem> = new Set()
        s.trials.forEach((trial) => {
          const params: TrialParam[] = []
          const param_names = new Set<string>()
          db.exec({
            sql:
              "SELECT param_name, param_value" +
              ` FROM trial_params WHERE trial_id = ${trial.trial_id}`,
            callback: (vals: any[]) => {
              const param_name = vals[0]
              params.push({
                name: param_name,
                param_internal_value: vals[1],
              })

              param_names.add(param_name)
              if (
                union_search_space.findIndex((s) => s.name === param_name) == -1
              ) {
                union_search_space.push({ name: param_name })
              }
            },
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
          const values: TrialValueNumber[] = []
          db.exec({
            sql:
              "SELECT value, value_type" +
              ` FROM trial_values WHERE trial_id = ${trial.trial_id}` +
              " ORDER BY objective",
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
          if (s.directions.length === values.length) {
            trial.values = values
          }
        })
        s.union_search_space = union_search_space
        s.intersection_search_space = Array.from(intersection_search_space)
      })

      setter((prev) => [...prev, ...studies])
    } finally {
      db.close()
    }
  })
}
