import * as Optuna from "@optuna/types"
import { StudyDetail } from "./types/optuna"

export const studyDetailToStudy = (
  studyDetail: StudyDetail | null
): Optuna.Study | null => {
  const study: Optuna.Study | null = studyDetail
    ? {
        id: studyDetail.id,
        name: studyDetail.name,
        directions: studyDetail.directions,
        union_search_space: studyDetail.union_search_space,
        intersection_search_space: studyDetail.intersection_search_space,
        union_user_attrs: studyDetail.union_user_attrs,
        datetime_start: studyDetail.datetime_start,
        trials: studyDetail.trials,
        metric_names: studyDetail.metric_names,
      }
    : null

  return study
}
