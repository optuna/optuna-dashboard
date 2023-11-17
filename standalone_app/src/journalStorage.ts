import { SetterOrUpdater } from "recoil"

export const loadJournalStorage = (
  arrayBuffer: ArrayBuffer,
  setter: SetterOrUpdater<Study[]>
): void => {
  const decoder = new TextDecoder("utf-8")
  console.log(decoder.decode(arrayBuffer))
}
