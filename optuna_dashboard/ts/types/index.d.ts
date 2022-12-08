declare module "*.css"
declare module "*.png"
declare module "*.jpg"
declare module "*.svg"

declare const APP_BAR_TITLE: string
declare const API_ENDPOINT: string
declare const URL_PREFIX: string

type TrialValueNumber = number | "inf" | "-inf"
type TrialIntermediateValueNumber = number | "inf" | "-inf" | "nan"
type TrialState = "Running" | "Complete" | "Pruned" | "Fail" | "Waiting"
type StudyDirection = "maximize" | "minimize" | "not_set"
type Distribution =
  | "FloatDistribution"
  | "IntDistribution"
  | "UniformDistribution"
  | "LogUniformDistribution"
  | "DiscreteUniformDistribution"
  | "IntUniformDistribution"
  | "IntLogUniformDistribution"
  | "CategoricalDistribution"

type GraphVisibility = {
  history: boolean
  paretoFront: boolean
  parallelCoordinate: boolean
  intermediateValues: boolean
  edf: boolean
  contour: boolean
  importances: boolean
  slice: boolean
}

declare interface TrialIntermediateValue {
  step: number
  value: TrialIntermediateValueNumber
}

declare interface TrialParam {
  name: string
  value: string
}

declare interface ParamImportance {
  name: string
  importance: number
  distribution: Distribution
}

declare interface SearchSpace {
  name: string
  distribution: Distribution
}

declare interface Attribute {
  key: string
  value: string
}

declare interface AttributeSpec {
  key: string
  sortable: boolean
}

declare interface Note {
  version: number
  body: string
}

declare interface Trial {
  trial_id: number
  study_id: number
  number: number
  state: TrialState
  values?: TrialValueNumber[]
  intermediate_values: TrialIntermediateValue[]
  datetime_start?: Date
  datetime_complete?: Date
  params: TrialParam[]
  user_attrs: Attribute[]
  system_attrs: Attribute[]
}

declare interface StudySummary {
  study_id: number
  study_name: string
  directions: StudyDirection[]
  user_attrs: Attribute[]
  system_attrs: Attribute[]
  datetime_start?: Date
}

declare interface StudyDetail {
  id: number
  name: string
  directions: StudyDirection[]
  datetime_start: Date
  best_trial?: Trial
  trials: Trial[]
  intersection_search_space: SearchSpace[]
  union_search_space: SearchSpace[]
  union_user_attrs: AttributeSpec[]
  has_intermediate_values: boolean
  note: Note
}

declare interface StudyDetails {
  [study_id: string]: StudyDetail
}

declare interface ParamImportances {
  target_name: string
  param_importances: ParamImportance[]
}
