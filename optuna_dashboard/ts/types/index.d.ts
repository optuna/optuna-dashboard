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
type TrialStateFinished = "Complete" | "Fail" | "Pruned"
type StudyDirection = "maximize" | "minimize" | "not_set"
type PreferenceFeedbackMode = "ChooseWorst"

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
  param_internal_value: number
  param_external_value: string
  param_external_type: string
  distribution: Distribution
}

type ParamImportance = {
  name: string
  importance: number
  distribution: Distribution
}

type SearchSpaceItem = {
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

type Artifact = {
  artifact_id: string
  filename: string
  mimetype: string
  encoding: string
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
  fixed_params: {
    name: string
    param_external_value: string
  }[]
  user_attrs: Attribute[]
  constraints: number[]
  note: Note
  artifacts: Artifact[]
}

type StudySummary = {
  study_id: number
  study_name: string
  directions: StudyDirection[]
  user_attrs: Attribute[]
  is_preferential: boolean
  datetime_start?: Date
}

type ObjectiveChoiceWidget = {
  type: "choice"
  description: string
  user_attr_key?: string
  choices: string[]
  values: number[]
}

type ObjectiveSliderWidget = {
  type: "slider"
  description: string
  user_attr_key?: string
  min: number
  max: number
  step: number | null
  labels:
    | {
        value: number
        label: string
      }[]
    | null
}

type ObjectiveTextInputWidget = {
  type: "text"
  description: string
  optional: boolean
  user_attr_key?: string
}

type ObjectiveUserAttrRef = {
  type: "user_attr"
  key: string
}

type ObjectiveFormWidget =
  | ObjectiveChoiceWidget
  | ObjectiveSliderWidget
  | ObjectiveTextInputWidget
  | ObjectiveUserAttrRef

type UserAttrFormWidget =
  | ObjectiveChoiceWidget
  | ObjectiveSliderWidget
  | ObjectiveTextInputWidget

type FormWidgets =
  | {
      output_type: "objective"
      widgets: ObjectiveFormWidget[]
    }
  | {
      output_type: "user_attr"
      widgets: UserAttrFormWidget[]
    }

type PlotlyGraphObject = {
  id: string
  graph_object: string
}

type FeedbackComponentNote = {
  output_type: "note"
}

type FeedbackComponentArtifact = {
  output_type: "artifact"
  artifact_key: string
}

type FeedbackComponentType = FeedbackComponentArtifact | FeedbackComponentNote

type StudyDetail = {
  id: number
  name: string
  directions: StudyDirection[]
  user_attrs: Attribute[]
  datetime_start: Date
  best_trials: Trial[]
  trials: Trial[]
  intersection_search_space: SearchSpaceItem[]
  union_search_space: SearchSpaceItem[]
  union_user_attrs: AttributeSpec[]
  has_intermediate_values: boolean
  note: Note
  is_preferential: boolean
  objective_names?: string[]
  form_widgets?: FormWidgets
  feedback_component_type: FeedbackComponentType
  preferences?: [number, number][]
  preference_history?: PreferenceHistory[]
  plotly_graph_objects: PlotlyGraphObject[]
  skipped_trial_numbers: number[]
}

type StudyDetails = {
  [study_id: string]: StudyDetail
}

type StudyParamImportance = {
  [study_id: string]: ParamImportance[][]
}
type PreferenceHistory = {
  id: string
  candidates: number[]
  clicked: number
  feedback_mode: PreferenceFeedbackMode
  timestamp: Date
  preferences: [number, number][]
  is_removed: boolean
}
