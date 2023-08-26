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

type TrialIntermediateValue = {
  step: number
  value: TrialIntermediateValueNumber
}

type Distribution =
  | FloatDistribution
  | IntDistribution
  | CategoricalDistribution

type Attribute = {
  key: string
  value: string
}

type AttributeSpec = {
  key: string
  sortable: boolean
}

type Study = {
  study_id: number
  study_name: string
  directions: StudyDirection[]
  union_search_space: SearchSpaceItem[]
  intersection_search_space: SearchSpaceItem[]
  union_user_attrs: AttributeSpec[]
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
  user_attrs: Attribute[]
  datetime_start?: Date
  datetime_complete?: Date
}

type TrialParam = {
  name: string
  param_internal_value: number
  param_external_value: string
  param_external_type: string
  distribution: Distribution
}

type SearchSpaceItem = {
  name: string
}

type ParamImportance = {
  name: string
  importance: number
}
