declare const IS_VSCODE: boolean

type TrialValueNumber = number | "inf" | "-inf"
type TrialIntermediateValueNumber = number | "inf" | "-inf" | "nan"
type TrialState = "Running" | "Complete" | "Pruned" | "Fail" | "Waiting"
type TrialStateFinished = "Complete" | "Fail" | "Pruned"
type StudyDirection = "maximize" | "minimize" | "not_set"

type FloatDistribution = {
  type: "FloatDistribution"
  low: number
  high: number
  step: number
  log: boolean
}

type IntDistribution = {
  type: "IntDistribution"
  low: number
  high: number
  step: number
  log: boolean
}

type CategoricalDistribution = {
  type: "CategoricalDistribution"
  choices: { pytype: string; value: string }[]
}

type Distribution =
  | FloatDistribution
  | IntDistribution
  | CategoricalDistribution

type Attribute = {
  key: string
  value: string
}

type Study = {
  study_id: number
  study_name: string
  directions: StudyDirection[]
  user_attrs: Attribute[]
  union_search_space: SearchSpaceItem[]
  intersection_search_space: SearchSpaceItem[]
  system_attrs: Attribute[]
  datetime_start?: Date
  trials: Trial[]
}

type Trial = {
  trial_id: number
  number: number
  study_id: number
  state: TrialState
  values?: TrialValueNumber[]
  params: TrialParam[]
  intermediate_values: TrialIntermediateValue[]
  datetime_start?: Date
  datetime_complete?: Date
  user_attrs: Attribute[]
  system_attrs: Attribute[]
}

type TrialParam = {
  name: string
  param_internal_value: number
}

type SearchSpaceItem = {
  name: string
}

type ParamImportance = {
  name: string
  importance: number
}
