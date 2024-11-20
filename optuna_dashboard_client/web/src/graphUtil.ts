export const makeHovertext = (trial: Trial): string => {
  return JSON.stringify(
    {
      number: trial.number,
      values: trial.values,
      params: trial.params
        .map((p) => [p.name, p.param_external_value])
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
    },
    undefined,
    "  "
  ).replace(/\n/g, "<br>")
}
