declare module "*.css"
declare module "*.png"
declare module "*.jpg"
declare module "*.svg"

declare const APP_BAR_TITLE: string
declare const API_ENDPOINT: string
declare const URL_PREFIX: string

type TrialState = "Running" | "Complete" | "Pruned" | "Fail" | "Waiting"
type StudyDirection = "maximize" | "minimize" | "not_set"
type Distribution =
  | "UniformDistribution"
  | "LogUniformDistribution"
  | "DiscreteUniformDistribution"
  | "IntUniformDistribution"
  | "IntLogUniformDistribution"
  | "CategoricalDistribution"

declare interface TrialIntermediateValue {
  step: number
  value: number
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

declare interface Attribute {
  key: string
  value: string
}

declare interface Trial {
  trial_id: number
  study_id: number
  number: number
  state: TrialState
  values?: number[]
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
  best_trial?: Trial
  user_attrs: Attribute[]
  system_attrs: Attribute[]
  datetime_start?: Date
}

declare interface StudyDetail {
  name: string
  directions: StudyDirection[]
  datetime_start: Date
  best_trial?: Trial
  trials: Trial[]
}

declare interface StudyDetails {
  [study_id: string]: StudyDetail
}

declare interface ParamImportances {
  target_name: string
  param_importances: ParamImportance[]
}
