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

type TrialIntermediateValue = {
  step: number
  value: TrialIntermediateValueNumber
}

type TrialParam = {
  name: string
  value: string
}

type ParamImportance = {
  name: string
  importance: number
  distribution: Distribution
}

type SearchSpace = {
  name: string
  distribution: Distribution
}

type Attribute = {
  key: string
  value: string
}

type AttributeSpec = {
  key: string
  sortable: boolean
}

type Note = {
  version: number
  body: string
}

type Trial = {
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
  note: Note
}

type StudySummary = {
  study_id: number
  study_name: string
  directions: StudyDirection[]
  user_attrs: Attribute[]
  system_attrs: Attribute[]
  datetime_start?: Date
}

type StudyDetail = {
  id: number
  name: string
  directions: StudyDirection[]
  datetime_start: Date
  best_trials: Trial[]
  trials: Trial[]
  intersection_search_space: SearchSpace[]
  union_search_space: SearchSpace[]
  union_user_attrs: AttributeSpec[]
  has_intermediate_values: boolean
  note: Note
  objective_names?: string[]
}

type StudyDetails = {
  [study_id: string]: StudyDetail
}

type StudyParamImportance = {
  [study_id: string]: ParamImportance[][]
}
