import { SetterOrUpdater } from "recoil"

enum JournalOperation {
  CREATE_STUDY = 0,
  DELETE_STUDY = 1,
  SET_STUDY_USER_ATTR = 2,
  SET_STUDY_SYSTEM_ATTR = 3,
  CREATE_TRIAL = 4,
  SET_TRIAL_PARAM = 5,
  SET_TRIAL_STATE_VALUES = 6,
  SET_TRIAL_INTERMEDIATE_VALUE = 7,
  SET_TRIAL_USER_ATTR = 8,
  SET_TRIAL_SYSTEM_ATTR = 9,
}

export const loadJournalStorage = (
  arrayBuffer: ArrayBuffer,
  setter: SetterOrUpdater<Study[]>
): void => {
  const decoder = new TextDecoder("utf-8")
  console.log(decoder.decode(arrayBuffer))
}
