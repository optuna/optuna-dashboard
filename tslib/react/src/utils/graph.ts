import * as Optuna from "@optuna/types"

export const makeHovertext = (trial: Optuna.Trial): string => {
  return JSON.stringify(
    {
      number: trial.number,
      values: trial.values,
      params: trial.params.reduce<{
        [key: string]: string
      }>((obj, p) => {
        obj[p.name] = p.param_external_value
        return obj
      }, {}),
    },
    undefined,
    "  "
  ).replace(/\n/g, "<br>")
}
