export type TrialState = "Running" | "Complete" | "Pruned" | "Fail" | "Waiting"
export type TrialStateFinished = "Complete" | "Fail" | "Pruned"
export type StudyDirection = "maximize" | "minimize"

export type FloatDistribution = {
  type: "FloatDistribution"
  low: number
  high: number
  step: number | null
  log: boolean
}

export type IntDistribution = {
  type: "IntDistribution"
  low: number
  high: number
  step: number
  log: boolean
}

export type CategoricalChoiceType = null | boolean | number | string

export type CategoricalDistribution = {
  type: "CategoricalDistribution"
  choices: CategoricalChoiceType[]
}

export type TrialIntermediateValue = {
  step: number
  value: number
}

export type Distribution =
  | FloatDistribution
  | IntDistribution
  | CategoricalDistribution

export type Attribute = {
  key: string
  value: string
}

export type AttributeSpec = {
  key: string
  sortable: boolean
}

export type StudySummary = {
  id: number
  name: string
  directions: StudyDirection[]
}

export type Study = {
  id: number
  name: string
  directions: StudyDirection[]
  union_search_space: SearchSpaceItem[]
  intersection_search_space: SearchSpaceItem[]
  union_user_attrs: AttributeSpec[]
  datetime_start?: Date
  trials: Trial[]
  metric_names?: string[]
}

export type Trial = {
  trial_id: number
  study_id: number
  number: number
  state: TrialState
  values?: number[]
  params: TrialParam[]
  intermediate_values: TrialIntermediateValue[]
  user_attrs: Attribute[]
  datetime_start?: Date
  datetime_complete?: Date
  constraints: number[]
}

export type TrialParam = {
  name: string
  param_internal_value: number
  param_external_value: CategoricalChoiceType
  param_external_type: string
  distribution: Distribution
}

export type SearchSpaceItem = {
  name: string
  distribution: Distribution
}

export type ParamImportance = {
  name: string
  importance: number
  distribution: Distribution
}
