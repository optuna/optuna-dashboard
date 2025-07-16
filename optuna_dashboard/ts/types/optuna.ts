import * as Optuna from "@optuna/types"

export type PreferenceFeedbackMode = "ChooseWorst"

export type GraphVisibility = {
  history: boolean
  paretoFront: boolean
  parallelCoordinate: boolean
  intermediateValues: boolean
  edf: boolean
  contour: boolean
  importances: boolean
  slice: boolean
}

export type Note = {
  version: number
  body: string
}

export type Artifact = {
  artifact_id: string
  filename: string
  mimetype: string
  encoding: string
}

export type Trial = Optuna.Trial & {
  fixed_params: {
    name: string
    param_external_value: string
  }[]
  note: Note
  artifacts: Artifact[]
}

export type StudySummary = {
  study_id: number
  study_name: string
  directions: Optuna.StudyDirection[]
  user_attrs: Optuna.Attribute[]
  is_preferential: boolean
  datetime_start?: Date
}

export type ObjectiveChoiceWidget = {
  type: "choice"
  description: string
  user_attr_key?: string
  choices: string[]
  values: number[]
}

export type ObjectiveSliderWidget = {
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

export type ObjectiveTextInputWidget = {
  type: "text"
  description: string
  optional: boolean
  user_attr_key?: string
}

export type ObjectiveUserAttrRef = {
  type: "user_attr"
  key: string
}

export type ObjectiveFormWidget =
  | ObjectiveChoiceWidget
  | ObjectiveSliderWidget
  | ObjectiveTextInputWidget
  | ObjectiveUserAttrRef

export type UserAttrFormWidget =
  | ObjectiveChoiceWidget
  | ObjectiveSliderWidget
  | ObjectiveTextInputWidget

export type FormWidgets =
  | {
      output_type: "objective"
      widgets: ObjectiveFormWidget[]
    }
  | {
      output_type: "user_attr"
      widgets: UserAttrFormWidget[]
    }

export type PlotlyGraphObject = {
  id: string
  graph_object: string
}

export type FeedbackComponentNote = {
  output_type: "note"
}

export type FeedbackComponentArtifact = {
  output_type: "artifact"
  artifact_key: string
}

export type FeedbackComponentType =
  | FeedbackComponentArtifact
  | FeedbackComponentNote

export type StudyDetail = {
  id: number
  name: string
  directions: Optuna.StudyDirection[]
  user_attrs: Optuna.Attribute[]
  datetime_start: Date
  best_trials: Trial[]
  trials: Trial[]
  intersection_search_space: Optuna.SearchSpaceItem[]
  union_search_space: Optuna.SearchSpaceItem[]
  union_user_attrs: Optuna.AttributeSpec[]
  has_intermediate_values: boolean
  note: Note
  is_preferential: boolean
  metric_names?: string[]
  form_widgets?: FormWidgets
  feedback_component_type: FeedbackComponentType
  preferences?: [number, number][]
  preference_history?: PreferenceHistory[]
  plotly_graph_objects: PlotlyGraphObject[]
  artifacts: Artifact[]
  skipped_trial_numbers: number[]
}

export type StudyDetails = {
  [study_id: string]: StudyDetail
}

export type PreferenceHistory = {
  id: string
  candidates: number[]
  clicked: number
  feedback_mode: PreferenceFeedbackMode
  timestamp: Date
  preferences: [number, number][]
  is_removed: boolean
}

export type PlotlyColorThemeDark = "default"
export type PlotlyColorThemeLight =
  | "default"
  | "seaborn"
  | "presentation"
  | "ggplot2"

export type PlotlyColorTheme = {
  dark: PlotlyColorThemeDark
  light: PlotlyColorThemeLight
}
