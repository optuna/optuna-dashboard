import * as Optuna from "@optuna/types"

export const makeHovertext = (trial: Optuna.Trial): string => {
  return JSON.stringify(
    {
      number: trial.number,
      values: trial.values,
      params: trial.params
        .map((p) => [p.name, p.param_external_value])
        .reduce(
          (obj, [key, value]) => {
            obj[key as string] = value
            return obj
          },
          {} as Record<string, Optuna.CategoricalChoiceType>
        ),
    },
    undefined,
    "  "
  ).replace(/\n/g, "<br>")
}
